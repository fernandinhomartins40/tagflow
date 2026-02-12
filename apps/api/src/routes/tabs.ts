import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { bookings, cashRegisters, customerIdentifiers, customers, locations, tabItemParticipants, tabItems, tabPayments, tabs, transactions } from "../schema";
import { and, eq, inArray, lte, gte, or, sql } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";
import { validateFeatureAccess } from "../utils/planValidation";

const openSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  identifier: z.string().min(3)
});

const itemSchema = z.object({
  tabId: z.string().uuid(),
  productId: z.string().uuid().optional().nullable(),
  serviceId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().positive(),
  total: z.coerce.number().positive(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional()
});

const participantsSchema = z.object({
  tabItemId: z.string().uuid(),
  participants: z.array(z.object({ customerId: z.string().uuid(), amount: z.coerce.number().positive() }))
});

const paymentSchema = z.object({
  method: z.enum(["cash", "debit", "credit", "pix"]),
  amount: z.coerce.number().positive()
});

const closeSchema = z.object({
  tabId: z.string().uuid(),
  payments: z.array(paymentSchema).optional()
});

export const tabsRoutes = new Hono();

tabsRoutes.get("/", async (c) => {
  const tenantId = getTenantId(c);
  const data = await db.select().from(tabs).where(eq(tabs.companyId, tenantId));
  return c.json({ data });
});

tabsRoutes.post("/open", async (c) => {
  const tenantId = getTenantId(c);
  const body = openSchema.parse(await c.req.json());

  const [identifierRow] = await db
    .select({ customer: customers, identifier: customerIdentifiers })
    .from(customerIdentifiers)
    .innerJoin(customers, eq(customers.id, customerIdentifiers.customerId))
    .where(and(eq(customerIdentifiers.companyId, tenantId), eq(customerIdentifiers.code, body.identifier), eq(customerIdentifiers.active, true)));

  if (!identifierRow?.customer) {
    return c.json({ error: "Cliente nao encontrado" }, 404);
  }

  const [openTab] = await db
    .select()
    .from(tabs)
    .where(
      and(
        eq(tabs.companyId, tenantId),
        eq(tabs.customerId, identifierRow.customer.id),
        eq(tabs.status, "open")
      )
    );

  if (openTab) {
    return c.json(openTab);
  }

  // Sempre usar o tipo configurado no identificador
  const tabType = identifierRow.identifier.tabType ?? "prepaid";

  const [created] = await db
    .insert(tabs)
    .values({
      companyId: tenantId,
      branchId: body.branchId ?? undefined,
      customerId: identifierRow.customer.id,
      identifierId: identifierRow.identifier.id,
      identifierCode: body.identifier,
      type: tabType,
      status: "open"
    })
    .returning();

  return c.json(created, 201);
});

tabsRoutes.get("/:id", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");

  const [tab] = await db
    .select()
    .from(tabs)
    .where(and(eq(tabs.id, id), eq(tabs.companyId, tenantId)));

  if (!tab) {
    return c.json({ error: "Comanda nao encontrada" }, 404);
  }

  const items = await db.select().from(tabItems).where(and(eq(tabItems.tabId, id), eq(tabItems.companyId, tenantId)));
  const itemIds = items.map((item) => item.id);
  const participants = itemIds.length
    ? await db
        .select()
        .from(tabItemParticipants)
        .where(and(eq(tabItemParticipants.companyId, tenantId), inArray(tabItemParticipants.tabItemId, itemIds)))
    : [];

  return c.json({ tab, items, participants });
});

tabsRoutes.post("/items", async (c) => {
  const tenantId = getTenantId(c);
  const body = itemSchema.parse(await c.req.json());

  const [tab] = await db
    .select()
    .from(tabs)
    .where(and(eq(tabs.id, body.tabId), eq(tabs.companyId, tenantId)));

  if (!tab || tab.status !== "open") {
    return c.json({ error: "Comanda invalida" }, 400);
  }

  if (body.locationId && body.startAt && body.endAt) {
    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);
    const conflicts = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.companyId, tenantId),
          eq(bookings.locationId, body.locationId),
          or(eq(bookings.status, "pending"), eq(bookings.status, "in_progress")),
          lte(bookings.startAt, endAt),
          gte(bookings.endAt, startAt)
        )
      );
    if (conflicts.length) {
      const allowed = conflicts.every((booking) => booking.customerId && booking.customerId === tab.customerId);
      if (!allowed) {
        return c.json({ error: "Local reservado para este horario" }, 409);
      }
    }
  }

  const [created] = await db
    .insert(tabItems)
    .values({
      companyId: tenantId,
      tabId: body.tabId,
      productId: body.productId ?? undefined,
      serviceId: body.serviceId ?? undefined,
      locationId: body.locationId ?? undefined,
      description: body.description ?? undefined,
      quantity: body.quantity,
      unitPrice: body.unitPrice.toString(),
      total: body.total.toString(),
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt ? new Date(body.endAt) : undefined
    })
    .returning();

  return c.json(created, 201);
});

tabsRoutes.post("/items/participants", async (c) => {
  const tenantId = getTenantId(c);
  const featureCheck = await validateFeatureAccess(c, tenantId, "accountSplitting", "Divisao de contas");
  if (featureCheck) return featureCheck;
  const body = participantsSchema.parse(await c.req.json());

  await db.delete(tabItemParticipants).where(
    and(eq(tabItemParticipants.tabItemId, body.tabItemId), eq(tabItemParticipants.companyId, tenantId))
  );

  await db.insert(tabItemParticipants).values(
    body.participants.map((participant) => ({
      companyId: tenantId,
      tabItemId: body.tabItemId,
      customerId: participant.customerId,
      amount: participant.amount.toString()
    }))
  );

  return c.json({ tabItemId: body.tabItemId, participants: body.participants });
});

tabsRoutes.post("/close", async (c) => {
  const tenantId = getTenantId(c);
  const body = closeSchema.parse(await c.req.json());

  const [tab] = await db
    .select()
    .from(tabs)
    .where(and(eq(tabs.id, body.tabId), eq(tabs.companyId, tenantId)));

  if (!tab || tab.status !== "open") {
    return c.json({ error: "Comanda invalida" }, 400);
  }

  const items = await db.select().from(tabItems).where(and(eq(tabItems.tabId, body.tabId), eq(tabItems.companyId, tenantId)));
  const itemIds = items.map((item) => item.id);
  const participants = itemIds.length
    ? await db
        .select()
        .from(tabItemParticipants)
        .where(and(eq(tabItemParticipants.companyId, tenantId), inArray(tabItemParticipants.tabItemId, itemIds)))
    : [];

  const participantsByItem = new Map<string, Array<{ customerId: string; amount: number }>>();
  for (const p of participants) {
    const arr = participantsByItem.get(p.tabItemId) ?? [];
    arr.push({ customerId: p.customerId, amount: Number(p.amount) });
    participantsByItem.set(p.tabItemId, arr);
  }

  const charges = new Map<string, number>();
  for (const item of items) {
    const total = Number(item.total);
    const itemParticipants = participantsByItem.get(item.id);
    if (item.locationId && itemParticipants?.length) {
      for (const part of itemParticipants) {
        charges.set(part.customerId, (charges.get(part.customerId) ?? 0) + part.amount);
      }
    } else {
      charges.set(tab.customerId, (charges.get(tab.customerId) ?? 0) + total);
    }
  }

  const customerIds = Array.from(charges.keys());
  const customersData = await db
    .select()
    .from(customers)
    .where(and(eq(customers.companyId, tenantId), inArray(customers.id, customerIds)));
  const customersMap = new Map(customersData.map((customer) => [customer.id, customer]));

  const totalAmount = Array.from(charges.values()).reduce((sum, value) => sum + value, 0);
  if (tab.type === "credit") {
    const mainCustomer = customersMap.get(tab.customerId);
    if (!mainCustomer) {
      return c.json({ error: `Cliente ${tab.customerId} nao encontrado` }, 404);
    }
    const limit = Number(mainCustomer.creditLimit ?? 0);
    if (limit > 0 && totalAmount > limit) {
      return c.json({ error: "Limite de credito excedido" }, 400);
    }
  } else {
    for (const [customerId, amount] of charges) {
      const customer = customersMap.get(customerId);
      if (!customer) {
        return c.json({ error: `Cliente ${customerId} nao encontrado` }, 404);
      }
      const available = Number(customer.credits);
      if (available < amount) {
        const name = customer.name ?? `Cliente ${customerId.slice(0, 6)}`;
        return c.json({ error: `Saldo insuficiente para ${name}. Adicione credito pre-pago.` }, 400);
      }
    }
  }

  let openRegisterId: string | null = null;
  if (tab.type === "prepaid" && body.payments?.length) {
    return c.json({ error: "Pagamento nao permitido para comanda pre-paga" }, 400);
  }
  if (tab.type === "credit") {
    const [cashRegister] = await db
      .select()
      .from(cashRegisters)
      .where(and(eq(cashRegisters.companyId, tenantId), eq(cashRegisters.status, "open")));
    if (!cashRegister) {
      return c.json({ error: "Caixa fechado" }, 400);
    }
    const payments = body.payments ?? [];
    const paymentTotal = payments.reduce((sum, item) => sum + Number(item.amount), 0);
    const delta = Math.abs(paymentTotal - totalAmount);
    if (!payments.length || delta > 0.01) {
      return c.json({ error: "Pagamento invalido" }, 400);
    }
    openRegisterId = cashRegister.id;
  }

  await db.transaction(async (tx) => {
    if (tab.type === "prepaid") {
      for (const [customerId, amount] of charges) {
        await tx
          .update(customers)
          .set({ credits: sql`${customers.credits} - ${amount}` })
          .where(and(eq(customers.id, customerId), eq(customers.companyId, tenantId)));

        await tx.insert(transactions).values({
          companyId: tenantId,
          branchId: tab.branchId ?? undefined,
          customerId,
          type: "debit",
          amount: amount.toString(),
          description: `Comanda ${tab.id}`
        });
      }
    }

    if (tab.type === "credit") {
      const payments = body.payments ?? [];
      await tx.insert(tabPayments).values(
        payments.map((payment) => ({
          companyId: tenantId,
          tabId: tab.id,
          cashRegisterId: openRegisterId ?? undefined,
          method: payment.method,
          amount: payment.amount.toString()
        }))
      );

      for (const [customerId, amount] of charges) {
        await tx.insert(transactions).values({
          companyId: tenantId,
          branchId: tab.branchId ?? undefined,
          customerId,
          type: "debit",
          amount: amount.toString(),
          description: `Comanda ${tab.id}`
        });
      }
    }

    await tx
      .update(tabs)
      .set({ status: "closed", closedAt: new Date() })
      .where(and(eq(tabs.id, tab.id), eq(tabs.companyId, tenantId)));

    await tx
      .update(customerIdentifiers)
      .set({ active: false, isMaster: false })
      .where(and(eq(customerIdentifiers.companyId, tenantId), eq(customerIdentifiers.code, tab.identifierCode)));
  });

  const chargesList = Array.from(charges.entries()).map(([customerId, amount]) => ({ customerId, amount }));
  const total = chargesList.reduce((sum, item) => sum + item.amount, 0);

  return c.json({ id: tab.id, status: "closed", charges: chargesList, total });
});

tabsRoutes.get("/locations/:id/booking", async (c) => {
  const tenantId = getTenantId(c);
  const locationId = c.req.param("id");
  const now = new Date();
  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.companyId, tenantId),
        eq(bookings.locationId, locationId),
        or(eq(bookings.status, "pending"), eq(bookings.status, "in_progress")),
        lte(bookings.startAt, now),
        gte(bookings.endAt, now)
      )
    );

  return c.json({ data: booking ?? null });
});
