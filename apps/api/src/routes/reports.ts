import { Hono } from "hono";
import { db } from "../db";
import { bookings, customers, transactions } from "../schema";
import { and, eq, gte, lte, sql, desc, inArray } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";
import { validateFeatureAccess } from "../utils/planValidation";

const parseRange = (startAt?: string, endAt?: string) => {
  const start = startAt ? new Date(startAt) : new Date(new Date().setDate(new Date().getDate() - 30));
  const end = endAt ? new Date(endAt) : new Date();
  return { start, end };
};

export const reportsRoutes = new Hono();

reportsRoutes.get("/sales", async (c) => {
  const tenantId = getTenantId(c);
  const { start, end } = parseRange(c.req.query("startAt"), c.req.query("endAt"));
  const branchId = c.req.query("branchId");

  const [result] = await db
    .select({ total: sql<number>`sum(${transactions.amount})`, count: sql<number>`count(*)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.companyId, tenantId),
        gte(transactions.createdAt, start),
        lte(transactions.createdAt, end),
        branchId ? eq(transactions.branchId, branchId) : sql`true`
      )
    );

  return c.json({ total: result?.total ?? 0, count: result?.count ?? 0, startAt: start, endAt: end, branchId });
});

reportsRoutes.get("/occupancy", async (c) => {
  const tenantId = getTenantId(c);
  const featureCheck = await validateFeatureAccess(c, tenantId, "advancedReports", "Relatorios avancados");
  if (featureCheck) return featureCheck;
  const { start, end } = parseRange(c.req.query("startAt"), c.req.query("endAt"));
  const branchId = c.req.query("branchId");

  const data = await db
    .select({ locationId: bookings.locationId, total: sql<number>`count(*)` })
    .from(bookings)
    .where(
      and(
        eq(bookings.companyId, tenantId),
        gte(bookings.startAt, start),
        lte(bookings.endAt, end),
        branchId ? eq(bookings.branchId, branchId) : sql`true`
      )
    )
    .groupBy(bookings.locationId);

  return c.json({ data, startAt: start, endAt: end, branchId });
});

reportsRoutes.get("/customers", async (c) => {
  const tenantId = getTenantId(c);
  const featureCheck = await validateFeatureAccess(c, tenantId, "advancedReports", "Relatorios avancados");
  if (featureCheck) return featureCheck;
  const branchId = c.req.query("branchId");

  const data = await db
    .select({ customerId: transactions.customerId, total: sql<number>`sum(${transactions.amount})`, count: sql<number>`count(*)` })
    .from(transactions)
    .where(and(eq(transactions.companyId, tenantId), branchId ? eq(transactions.branchId, branchId) : sql`true`))
    .groupBy(transactions.customerId)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  const customerIds = data.map((row) => row.customerId).filter(Boolean) as string[];
  const customersData = customerIds.length
    ? await db.select().from(customers).where(inArray(customers.id, customerIds))
    : [];

  return c.json({ data, customers: customersData, branchId });
});
