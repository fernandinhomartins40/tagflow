import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { branches, companies } from "../schema";
import { eq } from "drizzle-orm";

const companySchema = z.object({
  name: z.string().min(2),
  cnpj: z.string().min(10),
  plan: z.string().min(2),
  status: z.string().min(2),
  theme: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  domain: z.string().optional().nullable()
});

const getUser = (c: { get: (key: string) => unknown }) => c.get("user") as { role: string; companyId: string };

export const companiesRoutes = new Hono();

companiesRoutes.get("/", async (c) => {
  const user = getUser(c);
  if (user.role !== "super_admin") {
    const [company] = await db.select().from(companies).where(eq(companies.id, user.companyId));
    return c.json({ data: company ? [company] : [], meta: { total: company ? 1 : 0 } });
  }

  const data = await db.select().from(companies);
  return c.json({ data, meta: { total: data.length } });
});

companiesRoutes.post("/", async (c) => {
  const user = getUser(c);
  if (user.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  const body = companySchema.parse(await c.req.json());
  const [created] = await db.insert(companies).values(body).returning();
  return c.json(created, 201);
});

companiesRoutes.put("/:id", async (c) => {
  const user = getUser(c);
  const id = c.req.param("id");
  const body = companySchema.partial().parse(await c.req.json());

  if (user.role !== "super_admin" && id !== user.companyId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const [updated] = await db.update(companies).set(body).where(eq(companies.id, id)).returning();
  return c.json(updated ?? { id, updated: false });
});

companiesRoutes.delete("/:id", async (c) => {
  const user = getUser(c);
  const id = c.req.param("id");
  if (user.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  const [deleted] = await db.delete(companies).where(eq(companies.id, id)).returning();
  return c.json({ id, deleted: Boolean(deleted) });
});

companiesRoutes.get("/:id/branches", async (c) => {
  const user = getUser(c);
  const id = c.req.param("id");
  if (user.role !== "super_admin" && id !== user.companyId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const data = await db.select().from(branches).where(eq(branches.companyId, id));
  return c.json({ data, companyId: id });
});
