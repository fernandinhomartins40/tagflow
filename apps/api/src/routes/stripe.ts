import { Hono } from "hono";
import { requireStripe } from "../services/stripe";
import { db } from "../db";
import { companySubscriptions, companies, plans } from "../schema";
import { eq } from "drizzle-orm";

export const stripeRoutes = new Hono();

stripeRoutes.post("/webhook", async (c) => {
  const stripe = requireStripe();
  const signature = c.req.header("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!secret) {
    return c.json({ error: "Stripe webhook secret missing" }, 500);
  }

  const payload = await c.req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    return c.json({ error: "Invalid signature" }, 400);
  }

  const type = event.type;
  if (type === "checkout.session.completed") {
    const session = event.data.object as {
      customer?: string;
      subscription?: string;
      metadata?: { companyId?: string; planId?: string };
    };
    const companyId = session.metadata?.companyId;
    const planId = session.metadata?.planId;
    if (companyId) {
      await db
        .insert(companySubscriptions)
        .values({
          companyId,
          planId,
          stripeCustomerId: session.customer ?? null,
          stripeSubscriptionId: session.subscription ?? null,
          status: "active"
        })
        .onConflictDoUpdate({
          target: companySubscriptions.companyId,
          set: {
            planId,
            stripeCustomerId: session.customer ?? null,
            stripeSubscriptionId: session.subscription ?? null,
            status: "active",
            updatedAt: new Date()
          }
        });
    }
  }

  if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
    const subscription = event.data.object as {
      id: string;
      customer: string;
      status: string;
      cancel_at_period_end?: boolean;
      current_period_end?: number;
      items?: { data?: Array<{ price?: { id?: string } }> };
      metadata?: { companyId?: string };
    };

    const priceId = subscription.items?.data?.[0]?.price?.id;
    let planId: string | null = null;
    let planName: string | null = null;

    if (priceId) {
      const [plan] = await db.select().from(plans).where(eq(plans.stripePriceId, priceId));
      planId = plan?.id ?? null;
      planName = plan?.name ?? null;
    }

    const status = subscription.status ?? (type === "customer.subscription.deleted" ? "canceled" : "active");
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;

    const [updated] = await db
      .update(companySubscriptions)
      .set({
        stripeCustomerId: String(subscription.customer),
        stripeSubscriptionId: subscription.id,
        status,
        planId,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        currentPeriodEnd,
        updatedAt: new Date()
      })
      .where(eq(companySubscriptions.stripeSubscriptionId, subscription.id))
      .returning();

    if (updated?.companyId && planName) {
      await db.update(companies).set({ plan: planName }).where(eq(companies.id, updated.companyId));
    }
  }

  return c.json({ received: true });
});
