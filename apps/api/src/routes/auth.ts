import { Hono } from "hono";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users } from "../schema";
import { and, eq } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";

const jwtSecret = process.env.JWT_SECRET ?? "";
if (!jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().default("admin")
});

export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  const tenantId = getTenantId(c);
  const body = loginSchema.parse(await c.req.json());

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.companyId, tenantId), eq(users.email, body.email)));

  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = jwt.sign({ sub: user.id, role: user.role, companyId: user.companyId }, jwtSecret, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ sub: user.id, role: user.role, companyId: user.companyId }, jwtSecret, { expiresIn: "7d" });

  return c.json({ token, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

authRoutes.post("/register", async (c) => {
  const tenantId = getTenantId(c);
  const body = registerSchema.parse(await c.req.json());
  const passwordHash = await bcrypt.hash(body.password, 10);

  const [created] = await db
    .insert(users)
    .values({
      companyId: tenantId,
      name: body.name,
      email: body.email,
      passwordHash,
      role: body.role
    })
    .onConflictDoNothing()
    .returning();

  if (!created) {
    return c.json({ error: "Usuario ja existe" }, 409);
  }

  return c.json({ id: created.id, name: created.name, email: created.email, role: created.role }, 201);
});

authRoutes.post("/refresh", async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) {
    return c.json({ error: "Refresh token required" }, 400);
  }

  try {
    const payload = jwt.verify(refreshToken, jwtSecret) as { sub: string; role: string; companyId: string };
    const token = jwt.sign({ sub: payload.sub, role: payload.role, companyId: payload.companyId }, jwtSecret, { expiresIn: "1h" });
    return c.json({ token });
  } catch {
    return c.json({ error: "Invalid refresh token" }, 401);
  }
});
