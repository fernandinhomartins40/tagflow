import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { users } from "../schema";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getTenantId } from "../utils/tenant";
import { validateUserLimit } from "../utils/planValidation";

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(["admin", "operator", "super_admin"]).default("operator"),
  branchId: z.string().uuid().optional().nullable(),
  active: z.boolean().optional().nullable()
});

const requireAdmin = (c: { get: (key: string) => unknown }) => {
  const user = c.get("user") as { role: string } | undefined;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return false;
  }
  return true;
};

export const usersRoutes = new Hono();

usersRoutes.get("/", async (c) => {
  if (!requireAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const tenantId = getTenantId(c);
  const data = await db.select().from(users).where(eq(users.companyId, tenantId));
  return c.json({ data });
});

usersRoutes.post("/", async (c) => {
  if (!requireAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const tenantId = getTenantId(c);

  // Check plan limits before creating
  const limitCheck = await validateUserLimit(c, tenantId);
  if (limitCheck) return limitCheck;

  const body = userSchema.parse(await c.req.json());
  const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : await bcrypt.hash("temp1234", 10);

  const [created] = await db
    .insert(users)
    .values({
      companyId: tenantId,
      branchId: body.branchId ?? undefined,
      name: body.name,
      email: body.email,
      passwordHash,
      role: body.role,
      active: body.active ?? true
    })
    .onConflictDoNothing()
    .returning();

  if (!created) {
    return c.json({ error: "Usuario ja existe" }, 409);
  }

  return c.json({ id: created.id, name: created.name, email: created.email, role: created.role }, 201);
});

usersRoutes.put("/:id", async (c) => {
  if (!requireAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const body = userSchema.partial().parse(await c.req.json());
  const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : undefined;

  const [updated] = await db
    .update(users)
    .set({
      name: body.name,
      email: body.email,
      role: body.role,
      branchId: body.branchId ?? undefined,
      active: body.active,
      ...(passwordHash ? { passwordHash } : {})
    })
    .where(and(eq(users.id, id), eq(users.companyId, tenantId)))
    .returning();

  return c.json(updated ?? { id, updated: false });
});

usersRoutes.delete("/:id", async (c) => {
  if (!requireAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const [deleted] = await db.delete(users).where(and(eq(users.id, id), eq(users.companyId, tenantId))).returning();
  return c.json({ id, deleted: Boolean(deleted) });
});
