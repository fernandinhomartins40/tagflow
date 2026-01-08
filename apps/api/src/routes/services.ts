import { Hono } from "hono";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { db } from "../db";
import { services } from "../schema";
import { ensureUploadDir } from "../utils/uploads";
import { and, eq } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";
import { paginationSchema } from "../utils/pagination";

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  price: z.coerce.number().positive(),
  unit: z.string().min(2),
  active: z.boolean().optional().nullable(),
  imageUrl: z.string().optional().nullable()
});

export const servicesRoutes = new Hono();

servicesRoutes.get("/", async (c) => {
  const tenantId = getTenantId(c);
  const { page, pageSize } = paginationSchema.parse(c.req.query());
  const offset = (page - 1) * pageSize;

  const data = await db
    .select()
    .from(services)
    .where(eq(services.companyId, tenantId))
    .limit(pageSize)
    .offset(offset);

  return c.json({ data, meta: { page, pageSize } });
});

servicesRoutes.post("/", async (c) => {
  const tenantId = getTenantId(c);
  const body = serviceSchema.parse(await c.req.json());
  const [created] = await db.insert(services).values({ ...body, companyId: tenantId }).returning();
  return c.json(created, 201);
});

servicesRoutes.put("/:id", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const body = serviceSchema.partial().parse(await c.req.json());
  const [updated] = await db
    .update(services)
    .set(body)
    .where(and(eq(services.id, id), eq(services.companyId, tenantId)))
    .returning();

  return c.json(updated ?? { id, updated: false });
});

servicesRoutes.delete("/:id", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const [deleted] = await db
    .delete(services)
    .where(and(eq(services.id, id), eq(services.companyId, tenantId)))
    .returning();

  return c.json({ id, deleted: Boolean(deleted) });
});

servicesRoutes.post("/:id/upload-image", async (c) => {
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
      .update(services)
      .set({ imageUrl })
      .where(and(eq(services.id, id), eq(services.companyId, tenantId)))
      .returning();

    return c.json(updated ?? { id, updated: false });
  }

  const body = z.object({ imageUrl: z.string().url() }).parse(await c.req.json());
  const [updated] = await db
    .update(services)
    .set({ imageUrl: body.imageUrl })
    .where(and(eq(services.id, id), eq(services.companyId, tenantId)))
    .returning();

  return c.json(updated ?? { id, updated: false });
});
