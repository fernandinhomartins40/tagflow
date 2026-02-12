import { Hono } from "hono";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { ensureUploadDir } from "../utils/uploads";
import { db } from "../db";
import { products } from "../schema";
import { and, eq } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";
import { paginationSchema } from "../utils/pagination";

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  price: z.coerce.number().positive(),
  category: z.string().optional().nullable(),
  stock: z.coerce.number().int().min(0).optional().nullable(),
  active: z.boolean().optional().nullable(),
  imageUrl: z.string().optional().nullable()
});

export const productsRoutes = new Hono();

productsRoutes.get("/", async (c) => {
  const tenantId = getTenantId(c);
  const { page, pageSize } = paginationSchema.parse(c.req.query());
  const offset = (page - 1) * pageSize;

  const data = await db
    .select()
    .from(products)
    .where(eq(products.companyId, tenantId))
    .limit(pageSize)
    .offset(offset);

  return c.json({ data, meta: { page, pageSize } });
});

productsRoutes.post("/", async (c) => {
  const tenantId = getTenantId(c);
  const body = productSchema.parse(await c.req.json());

  // Remove undefined/null fields to use database defaults
  const insertData: any = {
    name: body.name,
    price: body.price,
    companyId: tenantId
  };

  if (body.description) insertData.description = body.description;
  if (body.category) insertData.category = body.category;
  if (body.stock !== undefined && body.stock !== null) insertData.stock = body.stock;
  if (body.active !== undefined && body.active !== null) insertData.active = body.active;
  if (body.imageUrl) insertData.imageUrl = body.imageUrl;

  const [created] = await db.insert(products).values(insertData).returning();
  return c.json(created, 201);
});

productsRoutes.put("/:id", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const body = productSchema.partial().parse(await c.req.json());
  const [updated] = await db
    .update(products)
    .set(body)
    .where(and(eq(products.id, id), eq(products.companyId, tenantId)))
    .returning();

  return c.json(updated ?? { id, updated: false });
});

productsRoutes.delete("/:id", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const [deleted] = await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.companyId, tenantId)))
    .returning();

  return c.json({ id, deleted: Boolean(deleted) });
});

productsRoutes.post("/:id/upload-image", async (c) => {
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
      .update(products)
      .set({ imageUrl })
      .where(and(eq(products.id, id), eq(products.companyId, tenantId)))
      .returning();

    return c.json(updated ?? { id, updated: false });
  }

  const body = z.object({ imageUrl: z.string().url() }).parse(await c.req.json());
  const [updated] = await db
    .update(products)
    .set({ imageUrl: body.imageUrl })
    .where(and(eq(products.id, id), eq(products.companyId, tenantId)))
    .returning();

  return c.json(updated ?? { id, updated: false });
});
