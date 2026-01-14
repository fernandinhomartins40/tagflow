import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { companies, customers, globalCustomers, transactions } from "../schema";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { normalizePhone } from "../utils/customer";
import { customerAuthMiddleware } from "../middleware/customerAuth";

const jwtSecret = process.env.JWT_SECRET ?? "";
if (!jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

const cookieSecure = process.env.COOKIE_SECURE === "true";
const customerCookieName = "tf_customer";

const loginSchema = z.object({
  phone: z.string().min(8),
  password: z.string().min(3)
});

const passwordSchema = z.object({
  currentPassword: z.string().min(3),
  newPassword: z.string().min(3)
});

const parseJsonBody = async (c: Context) => {
  const raw = await c.req.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON");
  }
};

export const customerRoutes = new Hono();

customerRoutes.post("/auth/login", async (c) => {
  let bodyInput: Record<string, unknown>;
  try {
    bodyInput = await parseJsonBody(c);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const body = loginSchema.parse(bodyInput);
  const phone = normalizePhone(body.phone);

  const [customer] = await db.select().from(globalCustomers).where(eq(globalCustomers.phone, phone));
  if (!customer) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await bcrypt.compare(body.password, customer.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = jwt.sign({ sub: customer.id, type: "customer" }, jwtSecret, { expiresIn: "7d" });
  setCookie(c, customerCookieName, token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return c.json({ customer: { id: customer.id, name: customer.name, cpf: customer.cpf, phone: customer.phone } });
});

customerRoutes.post("/auth/logout", async (c) => {
  deleteCookie(c, customerCookieName, { path: "/" });
  return c.json({ ok: true });
});

customerRoutes.get("/auth/me", async (c) => {
  const token = getCookie(c, customerCookieName);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const payload = jwt.verify(token, jwtSecret) as { sub: string; type?: string };
    if (payload.type !== "customer") {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const [customer] = await db.select().from(globalCustomers).where(eq(globalCustomers.id, payload.sub));
    if (!customer) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return c.json({ customer: { id: customer.id, name: customer.name, cpf: customer.cpf, phone: customer.phone } });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

customerRoutes.use("/profile/*", customerAuthMiddleware);
customerRoutes.use("/overview", customerAuthMiddleware);

customerRoutes.put("/profile/password", async (c) => {
  const customer = c.get("customer") as { id: string };
  let bodyInput: Record<string, unknown>;
  try {
    bodyInput = await parseJsonBody(c);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const body = passwordSchema.parse(bodyInput);
  const [existing] = await db.select().from(globalCustomers).where(eq(globalCustomers.id, customer.id));
  if (!existing) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const valid = await bcrypt.compare(body.currentPassword, existing.passwordHash);
  if (!valid) {
    return c.json({ error: "Senha atual invalida" }, 400);
  }
  const newHash = await bcrypt.hash(body.newPassword, 10);
  await db
    .update(globalCustomers)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(globalCustomers.id, customer.id));
  return c.json({ ok: true });
});

customerRoutes.get("/overview", async (c) => {
  const customer = c.get("customer") as { id: string };

  const localCustomers = await db
    .select({
      id: customers.id,
      companyId: customers.companyId,
      credits: customers.credits,
      name: customers.name,
      companyName: companies.name
    })
    .from(customers)
    .innerJoin(companies, eq(customers.companyId, companies.id))
    .where(eq(customers.globalCustomerId, customer.id));

  const customerIds = localCustomers.map((row) => row.id);
  if (customerIds.length === 0) {
    const [global] = await db.select().from(globalCustomers).where(eq(globalCustomers.id, customer.id));
    return c.json({
      customer: { id: global?.id ?? customer.id, name: global?.name ?? "", cpf: global?.cpf ?? "", phone: global?.phone ?? "" },
      companies: [],
      recentTransactions: []
    });
  }

  const totals = await db
    .select({
      companyId: transactions.companyId,
      total: sql<number>`sum(${transactions.amount})`,
      count: sql<number>`count(*)`,
      lastAt: sql<Date>`max(${transactions.createdAt})`
    })
    .from(transactions)
    .where(inArray(transactions.customerId, customerIds))
    .groupBy(transactions.companyId);

  const totalsMap = new Map(totals.map((row) => [row.companyId, row]));
  const companiesData = localCustomers.map((row) => {
    const total = totalsMap.get(row.companyId);
    return {
      companyId: row.companyId,
      companyName: row.companyName,
      credits: row.credits,
      totalSpent: total?.total ?? 0,
      transactions: total?.count ?? 0,
      lastTransactionAt: total?.lastAt ?? null
    };
  });

  const recentTransactions = await db
    .select({
      id: transactions.id,
      companyId: transactions.companyId,
      amount: transactions.amount,
      type: transactions.type,
      createdAt: transactions.createdAt,
      companyName: companies.name
    })
    .from(transactions)
    .innerJoin(companies, eq(transactions.companyId, companies.id))
    .where(inArray(transactions.customerId, customerIds))
    .orderBy(desc(transactions.createdAt))
    .limit(20);

  const [global] = await db.select().from(globalCustomers).where(eq(globalCustomers.id, customer.id));

  return c.json({
    customer: { id: global?.id ?? customer.id, name: global?.name ?? "", cpf: global?.cpf ?? "", phone: global?.phone ?? "" },
    companies: companiesData,
    recentTransactions
  });
});
