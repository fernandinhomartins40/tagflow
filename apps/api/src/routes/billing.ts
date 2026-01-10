import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { companies, companySubscriptions, plans } from "../schema";
import { and, eq } from "drizzle-orm";
import { requireStripe } from "../services/stripe";

const checkoutSchema = z.object({
  planId: z.string().uuid()
});

const getUser = (c: { get: (key: string) => unknown }) =>
  c.get("user") as { companyId: string; role: string };

export const billingRoutes = new Hono();

billingRoutes.get("/plans", async (c) => {
  const user = getUser(c);
  const [company] = await db.select().from(companies).where(eq(companies.id, user.companyId));
  const [subscription] = await db
    .select()
    .from(companySubscriptions)
    .where(eq(companySubscriptions.companyId, user.companyId));
  const data = await db.select().from(plans).where(eq(plans.active, true));
  return c.json({ company, subscription, plans: data });
});

billingRoutes.post("/checkout", async (c) => {
  const user = getUser(c);
  const body = checkoutSchema.parse(await c.req.json());
  const [plan] = await db.select().from(plans).where(eq(plans.id, body.planId));
  if (!plan || !plan.stripePriceId) {
    return c.json({ error: "Plano indisponivel" }, 400);
  }

  const stripe = requireStripe();
  const [subscription] = await db
    .select()
    .from(companySubscriptions)
    .where(eq(companySubscriptions.companyId, user.companyId));

  let customerId = subscription?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { companyId: user.companyId }
    });
    customerId = customer.id;
  }

  const publicUrl = process.env.PUBLIC_APP_URL ?? "http://localhost:8080";
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${publicUrl}/admin/subscriptions?success=1`,
    cancel_url: `${publicUrl}/admin/subscriptions?canceled=1`
  });

  const now = new Date();
  await db.update(companies).set({ plan: plan.name }).where(eq(companies.id, user.companyId));
  if (subscription) {
    await db
      .update(companySubscriptions)
      .set({
        planId: plan.id,
        stripeCustomerId: customerId,
        status: "pending",
        updatedAt: now
      })
      .where(eq(companySubscriptions.id, subscription.id));
  } else {
    await db
      .insert(companySubscriptions)
      .values({
        companyId: user.companyId,
        planId: plan.id,
        stripeCustomerId: customerId,
        status: "pending",
        updatedAt: now
      });
  }

  return c.json({ url: session.url });
});

billingRoutes.post("/change", async (c) => {
  const user = getUser(c);
  const body = checkoutSchema.parse(await c.req.json());
  const [plan] = await db.select().from(plans).where(eq(plans.id, body.planId));
  if (!plan) {
    return c.json({ error: "Plano nao encontrado" }, 404);
  }
  const price = Number(plan.priceMonthly || "0");
  if (price > 0) {
    return c.json({ error: "Use o checkout para planos pagos" }, 400);
  }

  const now = new Date();
  await db.update(companies).set({ plan: plan.name }).where(eq(companies.id, user.companyId));

  const [subscription] = await db
    .select()
    .from(companySubscriptions)
    .where(eq(companySubscriptions.companyId, user.companyId));

  if (subscription) {
    await db
      .update(companySubscriptions)
      .set({
        planId: plan.id,
        status: "active",
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
        updatedAt: now
      })
      .where(eq(companySubscriptions.id, subscription.id));
  } else {
    await db
      .insert(companySubscriptions)
      .values({
        companyId: user.companyId,
        planId: plan.id,
        status: "active",
        updatedAt: now
      });
  }

  return c.json({ ok: true });
});
