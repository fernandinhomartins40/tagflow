import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { companySubscriptions, companies, plans, users } from "../schema";
import { and, eq, ilike, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireStripe } from "../services/stripe";

const requireSuperAdmin = (c: { get: (key: string) => unknown }) => {
  const user = c.get("user") as { role: string } | undefined;
  if (!user || user.role !== "super_admin") {
    return false;
  }
  return true;
};

const companySchema = z.object({
  name: z.string().min(2),
  cnpj: z.string().min(10),
  plan: z.string().min(2),
  status: z.string().min(2),
  theme: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  domain: z.string().optional().nullable()
});

const superUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(["admin", "operator", "super_admin"]).default("operator"),
  companyId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  active: z.boolean().optional()
});

const planSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  priceMonthly: z.string().min(1),
  currency: z.string().min(2).default("brl"),
  stripePriceId: z.string().optional().nullable(),
  active: z.boolean().optional()
});

export const superAdminRoutes = new Hono();

superAdminRoutes.get("/companies", async (c) => {
  if (!requireSuperAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const data = await db
    .select({
      company: companies,
      subscription: companySubscriptions,
      plan: plans
    })
    .from(companies)
    .leftJoin(companySubscriptions, eq(companySubscriptions.companyId, companies.id))
    .leftJoin(plans, eq(plans.id, companySubscriptions.planId));

  const mapped = data.map((row) => ({
    ...row.company,
    subscription: row.subscription
      ? {
          id: row.subscription.id,
          status: row.subscription.status,
          currentPeriodEnd: row.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: row.subscription.cancelAtPeriodEnd,
          planId: row.subscription.planId,
          stripeCustomerId: row.subscription.stripeCustomerId,
          stripeSubscriptionId: row.subscription.stripeSubscriptionId
        }
      : null,
    planDetails: row.plan
      ? {
          id: row.plan.id,
          name: row.plan.name,
          priceMonthly: row.plan.priceMonthly,
          currency: row.plan.currency,
          stripePriceId: row.plan.stripePriceId
        }
      : null
  }));

  return c.json({ data: mapped, meta: { total: mapped.length } });
});

superAdminRoutes.post("/companies", async (c) => {
  if (!requireSuperAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const body = companySchema.parse(await c.req.json());
  const [created] = await db.insert(companies).values(body).returning();
  return c.json(created, 201);
});

superAdminRoutes.put("/companies/:id", async (c) => {
  if (!requireSuperAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const id = c.req.param("id");
  const body = companySchema.partial().parse(await c.req.json());
  const [updated] = await db.update(companies).set(body).where(eq(companies.id, id)).returning();
  return c.json(updated ?? { id, updated: false });
});

superAdminRoutes.delete("/companies/:id", async (c) => {
  if (!requireSuperAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const id = c.req.param("id");
  const [deleted] = await db.delete(companies).where(eq(companies.id, id)).returning();
  return c.json({ id, deleted: Boolean(deleted) });
});

superAdminRoutes.post("/companies/:id/checkout", async (c) => {
  if (!requireSuperAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const stripe = requireStripe();
  const id = c.req.param("id");
  const body = z.object({ planId: z.string().uuid() }).parse(await c.req.json());
  const [company] = await db.select().from(companies).where(eq(companies.id, id));
  if (!company) {
    return c.json({ error: "Company not found" }, 404);
  }
  const [plan] = await db.select().from(plans).where(eq(plans.id, body.planId));
  if (!plan || !plan.stripePriceId) {
    return c.json({ error: "Plan without Stripe price" }, 400);
  }

  const [subscription] = await db
    .select()
    .from(companySubscriptions)
    .where(eq(companySubscriptions.companyId, company.id));

  let customerId = subscription?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.name,
      metadata: { companyId: company.id }
    });
    customerId = customer.id;
  }

  const appUrl = process.env.PUBLIC_APP_URL ?? "http://localhost:8080";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl}/superadmin?checkout=success`,
    cancel_url: `${appUrl}/superadmin?checkout=cancel`,
    metadata: { companyId: company.id, planId: plan.id },
    subscription_data: { metadata: { companyId: company.id, planId: plan.id } }
  });

  await db
    .insert(companySubscriptions)
    .values({
      companyId: company.id,
      planId: plan.id,
      stripeCustomerId: customerId,
      status: "pending"
    })
    .onConflictDoUpdate({
      target: companySubscriptions.companyId,
      set: {
        planId: plan.id,
        stripeCustomerId: customerId,
        status: "pending",
        updatedAt: new Date()
      }
    });

  return c.json({ url: session.url });
});

superAdminRoutes.get("/users", async (c) => {
  if (!requireSuperAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const companyId = c.req.query("companyId");
  const search = c.req.query("search");

  const filters = [];
  if (companyId) {
    filters.push(eq(users.companyId, companyId));
  }
  if (search) {
    const term = `%${search}%`;
    filters.push(or(ilike(users.name, term), ilike(users.email, term)));
  }

  const data = filters.length
    ? await db.select().from(users).where(and(...filters))
    : await db.select().from(users);
  return c.json({ data });
});

superAdminRoutes.post("/users", async (c) => {
  if (!requireSuperAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const body = superUserSchema.parse(await c.req.json());
  const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : await bcrypt.hash("temp1234", 10);

  const [created] = await db
    .insert(users)
    .values({
      companyId: body.companyId,
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

superAdminRoutes.put("/users/:id", async (c) => {
  if (!requireSuperAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const id = c.req.param("id");
  const body = superUserSchema.partial().parse(await c.req.json());
  const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : undefined;

  const [updated] = await db
    .update(users)
    .set({
      name: body.name,
      email: body.email,
      role: body.role,
      companyId: body.companyId,
      branchId: body.branchId ?? undefined,
      active: body.active,
      ...(passwordHash ? { passwordHash } : {})
    })
    .where(eq(users.id, id))
    .returning();

  return c.json(updated ?? { id, updated: false });
});

superAdminRoutes.post("/users/:id/reset-password", async (c) => {
  if (!requireSuperAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const id = c.req.param("id");
  const body = z.object({ password: z.string().min(6) }).parse(await c.req.json());
  const passwordHash = await bcrypt.hash(body.password, 10);

  const [updated] = await db.update(users).set({ passwordHash }).where(eq(users.id, id)).returning();
  return c.json(updated ?? { id, updated: false });
});

superAdminRoutes.delete("/users/:id", async (c) => {
  if (!requireSuperAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const id = c.req.param("id");
  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
  return c.json({ id, deleted: Boolean(deleted) });
});

superAdminRoutes.get("/plans", async (c) => {
  if (!requireSuperAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const data = await db.select().from(plans);
  return c.json({ data });
});

superAdminRoutes.post("/plans", async (c) => {
  if (!requireSuperAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const body = planSchema.parse(await c.req.json());
  const [created] = await db.insert(plans).values(body).returning();
  return c.json(created, 201);
});

superAdminRoutes.put("/plans/:id", async (c) => {
  if (!requireSuperAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const id = c.req.param("id");
  const body = planSchema.partial().parse(await c.req.json());
  const [updated] = await db.update(plans).set(body).where(eq(plans.id, id)).returning();
  return c.json(updated ?? { id, updated: false });
});

superAdminRoutes.delete("/plans/:id", async (c) => {
  if (!requireSuperAdmin(c)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const id = c.req.param("id");
  const [deleted] = await db.delete(plans).where(eq(plans.id, id)).returning();
  return c.json({ id, deleted: Boolean(deleted) });
});
