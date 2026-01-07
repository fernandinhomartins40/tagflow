import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { bookings, bookingParticipants } from "../schema";
import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";
import { paginationSchema } from "../utils/pagination";

const bookingSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  total: z.coerce.number().positive(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  participants: z.array(z.object({ customerId: z.string().uuid(), share: z.coerce.number().positive() })).optional()
});

const splitSchema = z.object({
  participants: z.array(z.object({ customerId: z.string().uuid(), share: z.coerce.number().positive() }))
});

export const bookingsRoutes = new Hono();

bookingsRoutes.get("/", async (c) => {
  const tenantId = getTenantId(c);
  const { page, pageSize } = paginationSchema.parse(c.req.query());
  const offset = (page - 1) * pageSize;
  const startAt = c.req.query("startAt");
  const endAt = c.req.query("endAt");
  const branchId = c.req.query("branchId");
  const locationId = c.req.query("locationId");

  const data = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.companyId, tenantId),
        locationId ? eq(bookings.locationId, locationId) : sql`true`,
        branchId ? eq(bookings.branchId, branchId) : sql`true`,
        startAt ? gte(bookings.startAt, new Date(startAt)) : sql`true`,
        endAt ? lte(bookings.endAt, new Date(endAt)) : sql`true`
      )
    )
    .limit(pageSize)
    .offset(offset);

  return c.json({ data, meta: { page, pageSize } });
});

bookingsRoutes.post("/", async (c) => {
  const tenantId = getTenantId(c);
  const body = bookingSchema.parse(await c.req.json());

  if (new Date(body.endAt) <= new Date(body.startAt)) {
    return c.json({ error: "Horario invalido" }, 400);
  }

  const conflicts = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.companyId, tenantId),
        eq(bookings.locationId, body.locationId),
        or(eq(bookings.status, "pending"), eq(bookings.status, "in_progress"))
      )
    );
  const hasConflict = conflicts.some(
    (booking) =>
      new Date(booking.startAt) < new Date(body.endAt) && new Date(booking.endAt) > new Date(body.startAt)
  );
  if (hasConflict) {
    return c.json({ error: "Horario indisponivel" }, 409);
  }

  const [created] = await db
    .insert(bookings)
    .values({
      companyId: tenantId,
      branchId: body.branchId ?? undefined,
      customerId: body.customerId ?? undefined,
      locationId: body.locationId,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      total: body.total.toString(),
      status: body.status
    })
    .returning();

  if (body.participants?.length) {
    await db.insert(bookingParticipants).values(
      body.participants.map((participant) => ({
        companyId: tenantId,
        bookingId: created.id,
        customerId: participant.customerId,
        share: participant.share.toString()
      }))
    );
  }

  return c.json(created, 201);
});

bookingsRoutes.put("/:id", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const body = bookingSchema.partial().parse(await c.req.json());

  const [updated] = await db
    .update(bookings)
    .set({
      branchId: body.branchId ?? undefined,
      customerId: body.customerId ?? undefined,
      locationId: body.locationId ?? undefined,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt ? new Date(body.endAt) : undefined,
      total: body.total ? body.total.toString() : undefined,
      status: body.status
    })
    .where(and(eq(bookings.id, id), eq(bookings.companyId, tenantId)))
    .returning();

  return c.json(updated ?? { id, updated: false });
});

bookingsRoutes.delete("/:id", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const [deleted] = await db
    .delete(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.companyId, tenantId)))
    .returning();

  return c.json({ id, deleted: Boolean(deleted) });
});

bookingsRoutes.post("/:id/checkin", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const [updated] = await db
    .update(bookings)
    .set({ status: "in_progress" })
    .where(and(eq(bookings.id, id), eq(bookings.companyId, tenantId)))
    .returning();

  return c.json(updated ?? { id, status: "in_progress" });
});

bookingsRoutes.post("/:id/checkout", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const [updated] = await db
    .update(bookings)
    .set({ status: "completed" })
    .where(and(eq(bookings.id, id), eq(bookings.companyId, tenantId)))
    .returning();

  return c.json(updated ?? { id, status: "completed" });
});

bookingsRoutes.post("/:id/split-payment", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const body = splitSchema.parse(await c.req.json());

  await db.delete(bookingParticipants).where(and(eq(bookingParticipants.bookingId, id), eq(bookingParticipants.companyId, tenantId)));
  await db.insert(bookingParticipants).values(
    body.participants.map((participant) => ({
      companyId: tenantId,
      bookingId: id,
      customerId: participant.customerId,
      share: participant.share.toString()
    }))
  );

  return c.json({ id, participants: body.participants });
});
