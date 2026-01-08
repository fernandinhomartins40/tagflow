import { Hono } from "hono";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { db } from "../db";
import { bookings, locations } from "../schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { ensureUploadDir } from "../utils/uploads";
import { getTenantId } from "../utils/tenant";
import { paginationSchema } from "../utils/pagination";

const locationSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  name: z.string().min(2),
  type: z.string().min(2),
  description: z.string().optional().nullable(),
  capacity: z.coerce.number().int().min(1).optional().nullable(),
  price: z.coerce.number().positive(),
  priceUnit: z.enum(["hour", "day", "month", "period"]).default("hour"),
  active: z.boolean().optional().nullable(),
  imageUrl: z.string().optional().nullable()
});

export const locationsRoutes = new Hono();

locationsRoutes.get("/", async (c) => {
  const tenantId = getTenantId(c);
  const { page, pageSize } = paginationSchema.parse(c.req.query());
  const offset = (page - 1) * pageSize;

  const data = await db
    .select()
    .from(locations)
    .where(eq(locations.companyId, tenantId))
    .limit(pageSize)
    .offset(offset);

  return c.json({ data, meta: { page, pageSize } });
});

locationsRoutes.post("/", async (c) => {
  const tenantId = getTenantId(c);
  const body = locationSchema.parse(await c.req.json());
  const [created] = await db.insert(locations).values({ ...body, companyId: tenantId }).returning();
  return c.json(created, 201);
});

locationsRoutes.put("/:id", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const body = locationSchema.partial().parse(await c.req.json());
  const [updated] = await db
    .update(locations)
    .set(body)
    .where(and(eq(locations.id, id), eq(locations.companyId, tenantId)))
    .returning();

  return c.json(updated ?? { id, updated: false });
});

locationsRoutes.delete("/:id", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const [deleted] = await db
    .delete(locations)
    .where(and(eq(locations.id, id), eq(locations.companyId, tenantId)))
    .returning();

  return c.json({ id, deleted: Boolean(deleted) });
});

locationsRoutes.post("/:id/upload-image", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const contentType = c.req.header("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return c.json({ error: "Arquivo invalido" }, 400);
    }

    const buffer = await file.arrayBuffer();
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const dir = await ensureUploadDir(tenantId);
    const filePath = join(dir, filename);
    await Bun.write(filePath, Buffer.from(buffer));

    const imageUrl = `/uploads/${tenantId}/${filename}`;
    const [updated] = await db
      .update(locations)
      .set({ imageUrl })
      .where(and(eq(locations.id, id), eq(locations.companyId, tenantId)))
      .returning();

    return c.json(updated ?? { id, updated: false });
  }

  const body = z.object({ imageUrl: z.string().url() }).parse(await c.req.json());
  const [updated] = await db
    .update(locations)
    .set({ imageUrl: body.imageUrl })
    .where(and(eq(locations.id, id), eq(locations.companyId, tenantId)))
    .returning();

  return c.json(updated ?? { id, updated: false });
});

locationsRoutes.get("/:id/availability", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const startAt = c.req.query("startAt");
  const endAt = c.req.query("endAt");

  if (!startAt || !endAt) {
    return c.json({ error: "startAt and endAt are required" }, 400);
  }

  const data = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.companyId, tenantId),
        eq(bookings.locationId, id),
        gte(bookings.endAt, new Date(startAt)),
        lte(bookings.startAt, new Date(endAt))
      )
    );

  return c.json({ id, slots: data });
});
