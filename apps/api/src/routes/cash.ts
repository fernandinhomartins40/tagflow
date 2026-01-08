import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { cashRegisters, tabPayments } from "../schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";
import { paginationSchema } from "../utils/pagination";

const openSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  openingFloat: z.coerce.number().min(0),
  notes: z.string().optional().nullable()
});

const closeSchema = z.object({
  cashRegisterId: z.string().uuid(),
  closingFloat: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable()
});

export const cashRoutes = new Hono();

const buildTotals = (rows: Array<{ method: string; total: number }>) => {
  const totals = { cash: 0, debit: 0, credit: 0, pix: 0 };
  for (const row of rows) {
    const method = row.method as keyof typeof totals;
    if (totals[method] !== undefined) {
      totals[method] = row.total;
    }
  }
  return totals;
};

cashRoutes.get("/open", async (c) => {
  const tenantId = getTenantId(c);
  const branchId = c.req.query("branchId");

  const [register] = await db
    .select()
    .from(cashRegisters)
    .where(
      and(
        eq(cashRegisters.companyId, tenantId),
        eq(cashRegisters.status, "open"),
        branchId ? eq(cashRegisters.branchId, branchId) : undefined
      )
    );

  if (!register) {
    return c.json({ data: null });
  }

  const totalsRows = await db
    .select({
      method: tabPayments.method,
      total: sql<number>`coalesce(sum(${tabPayments.amount}), 0)`.mapWith(Number)
    })
    .from(tabPayments)
    .where(and(eq(tabPayments.companyId, tenantId), eq(tabPayments.cashRegisterId, register.id)))
    .groupBy(tabPayments.method);

  return c.json({ data: register, totals: buildTotals(totalsRows) });
});

cashRoutes.post("/open", async (c) => {
  const tenantId = getTenantId(c);
  const user = c.get("user") as { sub?: string } | undefined;
  const body = openSchema.parse(await c.req.json());

  const [existing] = await db
    .select()
    .from(cashRegisters)
    .where(
      and(
        eq(cashRegisters.companyId, tenantId),
        eq(cashRegisters.status, "open"),
        body.branchId ? eq(cashRegisters.branchId, body.branchId) : undefined
      )
    );

  if (existing) {
    return c.json({ error: "Caixa ja aberto" }, 409);
  }

  const [created] = await db
    .insert(cashRegisters)
    .values({
      companyId: tenantId,
      branchId: body.branchId ?? undefined,
      openedBy: user?.sub ?? undefined,
      status: "open",
      openingFloat: body.openingFloat.toString(),
      notes: body.notes ?? undefined
    })
    .returning();

  return c.json(created, 201);
});

cashRoutes.post("/close", async (c) => {
  const tenantId = getTenantId(c);
  const user = c.get("user") as { sub?: string } | undefined;
  const body = closeSchema.parse(await c.req.json());

  const [register] = await db
    .select()
    .from(cashRegisters)
    .where(and(eq(cashRegisters.companyId, tenantId), eq(cashRegisters.id, body.cashRegisterId)));

  if (!register || register.status !== "open") {
    return c.json({ error: "Caixa invalido" }, 400);
  }

  const totalsRows = await db
    .select({
      method: tabPayments.method,
      total: sql<number>`coalesce(sum(${tabPayments.amount}), 0)`.mapWith(Number)
    })
    .from(tabPayments)
    .where(and(eq(tabPayments.companyId, tenantId), eq(tabPayments.cashRegisterId, register.id)))
    .groupBy(tabPayments.method);

  const totals = buildTotals(totalsRows);

  const [updated] = await db
    .update(cashRegisters)
    .set({
      status: "closed",
      closedAt: new Date(),
      closedBy: user?.sub ?? undefined,
      closingFloat: body.closingFloat?.toString(),
      totalCash: totals.cash.toString(),
      totalDebit: totals.debit.toString(),
      totalCredit: totals.credit.toString(),
      totalPix: totals.pix.toString(),
      notes: body.notes ?? register.notes ?? undefined
    })
    .where(and(eq(cashRegisters.companyId, tenantId), eq(cashRegisters.id, register.id)))
    .returning();

  return c.json({ data: updated, totals });
});

cashRoutes.get("/history", async (c) => {
  const tenantId = getTenantId(c);
  const { page, pageSize } = paginationSchema.parse(c.req.query());
  const startAt = c.req.query("startAt");
  const endAt = c.req.query("endAt");
  const offset = (page - 1) * pageSize;

  const whereClause = and(
    eq(cashRegisters.companyId, tenantId),
    startAt ? gte(cashRegisters.openedAt, new Date(startAt)) : undefined,
    endAt ? lte(cashRegisters.openedAt, new Date(endAt)) : undefined
  );

  const data = await db
    .select()
    .from(cashRegisters)
    .where(whereClause)
    .orderBy(sql`${cashRegisters.openedAt} desc`)
    .limit(pageSize)
    .offset(offset);

  return c.json({ data, meta: { page, pageSize } });
});
