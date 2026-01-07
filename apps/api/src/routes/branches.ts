import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { branches } from "../schema";
import { and, eq } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";
import { paginationSchema } from "../utils/pagination";

const branchSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  hours: z.string().optional().nullable(),
  settings: z.string().optional().nullable()
});

export const branchesRoutes = new Hono();

branchesRoutes.get("/", async (c) => {
  const tenantId = getTenantId(c);
  const { page, pageSize } = paginationSchema.parse(c.req.query());
  const offset = (page - 1) * pageSize;

  const data = await db
    .select()
    .from(branches)
    .where(eq(branches.companyId, tenantId))
    .limit(pageSize)
    .offset(offset);

  return c.json({ data, meta: { page, pageSize } });
});

branchesRoutes.post("/", async (c) => {
  const tenantId = getTenantId(c);
  const body = branchSchema.parse(await c.req.json());
  const [created] = await db.insert(branches).values({ ...body, companyId: tenantId }).returning();
  return c.json(created, 201);
});

branchesRoutes.put("/:id", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const body = branchSchema.partial().parse(await c.req.json());
  const [updated] = await db
    .update(branches)
    .set(body)
    .where(and(eq(branches.id, id), eq(branches.companyId, tenantId)))
    .returning();

  return c.json(updated ?? { id, updated: false });
});

branchesRoutes.delete("/:id", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const [deleted] = await db
    .delete(branches)
    .where(and(eq(branches.id, id), eq(branches.companyId, tenantId)))
    .returning();

  return c.json({ id, deleted: Boolean(deleted) });
});
