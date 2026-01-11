import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { branches, companies, companySubscriptions, plans, users } from "../schema";
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

const signupSchema = z.object({
  companyName: z.string().min(2),
  cnpj: z.string().min(10),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

export const authRoutes = new Hono();

const accessCookieName = "tf_access";
const refreshCookieName = "tf_refresh";
const cookieSecure = process.env.COOKIE_SECURE === "true";

const setAuthCookies = (c: Context, token: string, refreshToken: string) => {
  setCookie(c, accessCookieName, token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60
  });
  setCookie(c, refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
};

const parseJsonBody = async (c: Context) => {
  const raw = await c.req.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON");
  }
};

authRoutes.post("/login", async (c) => {
  const tenantId = c.get("tenantId") as string | undefined;
  let bodyInput: Record<string, unknown>;
  try {
    bodyInput = await parseJsonBody(c);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const body = loginSchema.parse(bodyInput);

  let user: typeof users.$inferSelect | undefined;
  if (tenantId) {
    const [tenantUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.companyId, tenantId), eq(users.email, body.email)));
    user = tenantUser;
  }

  if (!user) {
    const globalUsers = await db.select().from(users).where(eq(users.email, body.email));
    if (globalUsers.length === 1) {
      user = globalUsers[0];
    } else {
      const superAdmin = globalUsers.find((candidate) => candidate.role === "super_admin");
      if (superAdmin) {
        user = superAdmin;
      }
    }
  }

  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  if (!user.active) {
    return c.json({ error: "User inactive" }, 403);
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = jwt.sign({ sub: user.id, role: user.role, companyId: user.companyId }, jwtSecret, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ sub: user.id, role: user.role, companyId: user.companyId }, jwtSecret, { expiresIn: "7d" });

  setAuthCookies(c, token, refreshToken);

  return c.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId }
  });
});

authRoutes.post("/register", async (c) => {
  const tenantId = getTenantId(c);
  let bodyInput: Record<string, unknown>;
  try {
    bodyInput = await parseJsonBody(c);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const body = registerSchema.parse(bodyInput);
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

authRoutes.post("/signup", async (c) => {
  let bodyInput: Record<string, unknown>;
  try {
    bodyInput = await parseJsonBody(c);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const body = signupSchema.parse(bodyInput);
  const existing = await db.select().from(users).where(eq(users.email, body.email));
  if (existing.length > 0) {
    return c.json({ error: "Usuario ja existe" }, 409);
  }

  const passwordHash = await bcrypt.hash(body.password, 10);

  const result = await db.transaction(async (tx) => {
    const [company] = await tx
      .insert(companies)
      .values({
        name: body.companyName,
        cnpj: body.cnpj,
        plan: "Free",
        status: "active"
      })
      .returning();

    const [branch] = await tx
      .insert(branches)
      .values({
        companyId: company.id,
        name: "Matriz"
      })
      .returning();

    const [user] = await tx
      .insert(users)
      .values({
        companyId: company.id,
        branchId: branch.id,
        name: body.name,
        email: body.email,
        passwordHash,
        role: "admin"
      })
      .returning();

    const [freePlan] = await tx.select().from(plans).where(eq(plans.name, "Free"));
    if (freePlan) {
      await tx
        .insert(companySubscriptions)
        .values({
          companyId: company.id,
          planId: freePlan.id,
          status: "active"
        })
        .onConflictDoNothing();
    }

    return { company, user };
  });

  const token = jwt.sign(
    { sub: result.user.id, role: result.user.role, companyId: result.company.id },
    jwtSecret,
    { expiresIn: "1h" }
  );
  const refreshToken = jwt.sign(
    { sub: result.user.id, role: result.user.role, companyId: result.company.id },
    jwtSecret,
    { expiresIn: "7d" }
  );

  setAuthCookies(c, token, refreshToken);

  return c.json(
    {
      companyId: result.company.id,
      user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role }
    },
    201
  );
});

authRoutes.post("/refresh", async (c) => {
  const contentLength = Number(c.req.header("content-length") || "0");
  let bodyToken: string | undefined;
  if (contentLength > 0) {
    try {
      const body = await parseJsonBody(c);
      bodyToken = typeof body.refreshToken === "string" ? body.refreshToken : undefined;
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }
  }
  const refreshToken = getCookie(c, refreshCookieName) ?? bodyToken;
  if (!refreshToken) {
    return c.json({ error: "Refresh token required" }, 400);
  }

  try {
    const payload = jwt.verify(refreshToken, jwtSecret) as { sub: string; role: string; companyId: string };
    const token = jwt.sign({ sub: payload.sub, role: payload.role, companyId: payload.companyId }, jwtSecret, { expiresIn: "1h" });
    setCookie(c, accessCookieName, token, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60
    });
    return c.json({ ok: true });
  } catch {
    return c.json({ error: "Invalid refresh token" }, 401);
  }
});

authRoutes.post("/logout", async (c) => {
  deleteCookie(c, accessCookieName, { path: "/" });
  deleteCookie(c, refreshCookieName, { path: "/" });
  return c.json({ ok: true });
});

authRoutes.get("/me", async (c) => {
  const token = getCookie(c, accessCookieName);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as { sub: string; role: string; companyId: string };
    const [user] = await db.select().from(users).where(and(eq(users.companyId, payload.companyId), eq(users.id, payload.sub)));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!user.active) {
      return c.json({ error: "User inactive" }, 403);
    }
    return c.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId }
    });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});
