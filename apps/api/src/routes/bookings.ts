import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { bookingParticipants, bookings, customers, transactions } from "../schema";
import { and, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";
import { paginationSchema } from "../utils/pagination";
import { validateBookingLimit } from "../utils/planValidation";

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

const chargeSchema = z.object({
  description: z.string().optional().nullable(),
  participants: z.array(z.object({ customerId: z.string().uuid(), amount: z.coerce.number().positive() })).optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional()
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

bookingsRoutes.get("/for-slot", async (c) => {
  const tenantId = getTenantId(c);
  const locationId = c.req.query("locationId");
  const startAt = c.req.query("startAt");
  const endAt = c.req.query("endAt");

  if (!locationId || !startAt || !endAt) {
    return c.json({ error: "locationId, startAt, endAt required" }, 400);
  }

  const start = new Date(startAt);
  const end = new Date(endAt);

  const [row] = await db
    .select({ booking: bookings, customerName: customers.name })
    .from(bookings)
    .leftJoin(customers, eq(customers.id, bookings.customerId))
    .where(
      and(
        eq(bookings.companyId, tenantId),
        eq(bookings.locationId, locationId),
        or(eq(bookings.status, "pending"), eq(bookings.status, "in_progress")),
        lte(bookings.startAt, end),
        gte(bookings.endAt, start)
      )
    );

  if (!row?.booking) {
    return c.json({ data: null });
  }

  return c.json({ data: { ...row.booking, customerName: row.customerName } });
});

bookingsRoutes.post("/", async (c) => {
  const tenantId = getTenantId(c);

  // Check plan limits before creating
  const limitCheck = await validateBookingLimit(c, tenantId);
  if (limitCheck) return limitCheck;

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

bookingsRoutes.post("/:id/charge", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const body = chargeSchema.parse(await c.req.json());

  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.companyId, tenantId)));

  if (!booking) {
    return c.json({ error: "Reserva nao encontrada" }, 404);
  }

  let participants = body.participants;
  if (!participants?.length) {
    if (booking.customerId) {
      participants = [{ customerId: booking.customerId, amount: Number(booking.total) }];
    } else {
      const rows = await db
        .select()
        .from(bookingParticipants)
        .where(and(eq(bookingParticipants.bookingId, id), eq(bookingParticipants.companyId, tenantId)));
      if (!rows.length) {
        return c.json({ error: "Sem participantes para cobrar" }, 400);
      }
      const total = Number(booking.total);
      const sum = rows.reduce((acc, row) => acc + Number(row.share), 0);
      const factor = sum ? total / sum : 0;
      participants = rows.map((row) => ({
        customerId: row.customerId,
        amount: factor ? Number(row.share) * factor : 0
      }));
    }
  }

  const customerIds = participants.map((p) => p.customerId);
  const customersData = await db
    .select()
    .from(customers)
    .where(and(eq(customers.companyId, tenantId), inArray(customers.id, customerIds)));
  const customersMap = new Map(customersData.map((customer) => [customer.id, customer]));

  for (const participant of participants) {
    const customer = customersMap.get(participant.customerId);
    if (!customer) {
      return c.json({ error: `Cliente ${participant.customerId} nao encontrado` }, 404);
    }
    if (Number(customer.credits) < participant.amount) {
      return c.json({ error: `Saldo insuficiente para ${participant.customerId}` }, 400);
    }
  }

  const description = body.description ?? `Locacao ${booking.id}`;

  const data = await db.transaction(async (tx) => {
    const created = await Promise.all(
      participants!.map(async (participant) => {
        await tx
          .update(customers)
          .set({ credits: sql`${customers.credits} - ${participant.amount}` })
          .where(and(eq(customers.id, participant.customerId), eq(customers.companyId, tenantId)));

        const [txRow] = await tx
          .insert(transactions)
          .values({
            companyId: tenantId,
            branchId: booking.branchId ?? undefined,
            customerId: participant.customerId,
            type: "debit",
            amount: participant.amount.toString(),
            description
          })
          .returning();

        return txRow;
      })
    );

    if (body.status || booking.status === "pending") {
      await tx
        .update(bookings)
        .set({ status: body.status ?? "in_progress" })
        .where(and(eq(bookings.id, id), eq(bookings.companyId, tenantId)));
    }

    return created;
  });

  return c.json({ id, data });
});
