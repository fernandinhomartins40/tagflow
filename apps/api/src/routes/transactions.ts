import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { consumptionItems, customers, products, transactions } from "../schema";
import { and, eq, inArray, lte, gte, sql } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";
import { paginationSchema } from "../utils/pagination";

const consumeSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  description: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid().optional().nullable(),
        serviceId: z.string().uuid().optional().nullable(),
        quantity: z.coerce.number().int().min(1),
        unitPrice: z.coerce.number().positive()
      })
    )
    .optional()
});

const splitSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  participants: z.array(
    z.object({
      customerId: z.string().uuid(),
      amount: z.coerce.number().positive()
    })
  )
});

export const transactionsRoutes = new Hono();

transactionsRoutes.get("/", async (c) => {
  const tenantId = getTenantId(c);
  const { page, pageSize } = paginationSchema.parse(c.req.query());
  const type = c.req.query("type");
  const startAt = c.req.query("startAt");
  const endAt = c.req.query("endAt");
  const offset = (page - 1) * pageSize;

  const filters = [
    eq(transactions.companyId, tenantId),
    type ? eq(transactions.type, type) : undefined,
    startAt ? gte(transactions.createdAt, new Date(startAt)) : undefined,
    endAt ? lte(transactions.createdAt, new Date(endAt)) : undefined
  ].filter(Boolean);

  const whereClause = filters.length ? and(...filters) : eq(transactions.companyId, tenantId);

  const data = await db
    .select()
    .from(transactions)
    .where(whereClause)
    .orderBy(sql`${transactions.createdAt} desc`)
    .limit(pageSize)
    .offset(offset);

  const [summary] = await db
    .select({
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number)
    })
    .from(transactions)
    .where(whereClause);

  return c.json({ data, meta: { page, pageSize, total: summary?.total ?? 0, count: summary?.count ?? 0 } });
});

transactionsRoutes.post("/consume", async (c) => {
  const tenantId = getTenantId(c);
  const body = consumeSchema.parse(await c.req.json());

  return db.transaction(async (tx) => {
    const [customer] = await tx
      .select()
      .from(customers)
      .where(and(eq(customers.id, body.customerId), eq(customers.companyId, tenantId)));
    if (!customer) {
      return c.json({ error: "Cliente nao encontrado" }, 404);
    }
    if (Number(customer.credits) < body.amount) {
      return c.json({ error: "Saldo insuficiente" }, 400);
    }

    if (body.items?.length) {
      const productIds = body.items.filter((item) => item.productId).map((item) => item.productId as string);
      if (productIds.length) {
        const productRows = await tx
          .select()
          .from(products)
          .where(and(eq(products.companyId, tenantId), inArray(products.id, productIds)));
        const productMap = new Map(productRows.map((product) => [product.id, product]));

        for (const item of body.items) {
          if (!item.productId) continue;
          const product = productMap.get(item.productId);
          if (!product) {
            return c.json({ error: `Produto ${item.productId} nao encontrado` }, 404);
          }
          if (product.stock !== null && Number(product.stock) < item.quantity) {
            return c.json({ error: `Estoque insuficiente para ${product.name}` }, 400);
          }
        }

        for (const item of body.items) {
          if (!item.productId) continue;
          await tx
            .update(products)
            .set({ stock: sql`${products.stock} - ${item.quantity}` })
            .where(and(eq(products.id, item.productId), eq(products.companyId, tenantId)));
        }
      }
    }

    await tx
      .update(customers)
      .set({ credits: sql`${customers.credits} - ${body.amount}` })
      .where(and(eq(customers.id, body.customerId), eq(customers.companyId, tenantId)));

    const [created] = await tx
      .insert(transactions)
      .values({
        companyId: tenantId,
        branchId: body.branchId ?? undefined,
        customerId: body.customerId,
        type: "debit",
        amount: body.amount.toString(),
        description: body.description ?? "Consumo"
      })
      .returning();

    if (body.items?.length) {
      await tx.insert(consumptionItems).values(
        body.items.map((item) => ({
          companyId: tenantId,
          branchId: body.branchId ?? undefined,
          customerId: body.customerId,
          productId: item.productId ?? undefined,
          serviceId: item.serviceId ?? undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString()
        }))
      );
    }

    return c.json(created, 201);
  });
});

transactionsRoutes.post("/split", async (c) => {
  const tenantId = getTenantId(c);
  const body = splitSchema.parse(await c.req.json());

  const customerIds = body.participants.map((p) => p.customerId);
  const customersData = await db
    .select()
    .from(customers)
    .where(and(eq(customers.companyId, tenantId), inArray(customers.id, customerIds)));

  const customersMap = new Map(customersData.map((customer) => [customer.id, customer]));
  for (const participant of body.participants) {
    const customer = customersMap.get(participant.customerId);
    if (!customer) {
      return c.json({ error: `Cliente ${participant.customerId} nao encontrado` }, 404);
    }
    if (Number(customer.credits) < participant.amount) {
      return c.json({ error: `Saldo insuficiente para ${participant.customerId}` }, 400);
    }
  }

  const created = await Promise.all(
    body.participants.map(async (participant) => {
      await db
        .update(customers)
        .set({ credits: sql`${customers.credits} - ${participant.amount}` })
        .where(and(eq(customers.id, participant.customerId), eq(customers.companyId, tenantId)));

      const [tx] = await db
        .insert(transactions)
        .values({
          companyId: tenantId,
          branchId: body.branchId ?? undefined,
          customerId: participant.customerId,
          type: "split",
          amount: participant.amount.toString(),
          description: body.description ?? "Divisao de consumo"
        })
        .returning();

      return tx;
    })
  );

  return c.json({ data: created }, 201);
});
