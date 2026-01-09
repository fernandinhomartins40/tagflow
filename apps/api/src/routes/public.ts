import { Hono } from "hono";
import { db } from "../db";
import { customerIdentifiers, customers, plans, transactions } from "../schema";
import { and, desc, eq } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";

export const publicRoutes = new Hono();

publicRoutes.get("/plans", async (c) => {
  const data = await db.select().from(plans).where(eq(plans.active, true));
  return c.json({ plans: data });
});

publicRoutes.get("/balance/:identifier", async (c) => {
  const tenantId = getTenantId(c);
  const identifier = c.req.param("identifier");

  const [row] = await db
    .select({ customer: customers })
    .from(customerIdentifiers)
    .innerJoin(customers, eq(customers.id, customerIdentifiers.customerId))
    .where(and(eq(customerIdentifiers.companyId, tenantId), eq(customerIdentifiers.code, identifier), eq(customerIdentifiers.active, true)));

  return c.json({ identifier, balance: row?.customer?.credits ?? "0" });
});

publicRoutes.get("/history/:identifier", async (c) => {
  const tenantId = getTenantId(c);
  const identifier = c.req.param("identifier");

  const [row] = await db
    .select({ customer: customers })
    .from(customerIdentifiers)
    .innerJoin(customers, eq(customers.id, customerIdentifiers.customerId))
    .where(and(eq(customerIdentifiers.companyId, tenantId), eq(customerIdentifiers.code, identifier), eq(customerIdentifiers.active, true)));

  if (!row?.customer) {
    return c.json({ identifier, history: [] });
  }

  const history = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.companyId, tenantId), eq(transactions.customerId, row.customer.id)))
    .orderBy(desc(transactions.createdAt))
    .limit(20);

  return c.json({ identifier, history });
});
