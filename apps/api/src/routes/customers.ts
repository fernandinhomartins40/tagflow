import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { cashRegisters, creditPayments, customers, customerIdentifiers, transactions } from "../schema";
import { and, eq, sql } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";
import { paginationSchema } from "../utils/pagination";

const customerSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  name: z.string().min(2),
  cpf: z.string().optional().nullable(),
  birthDate: z.coerce.date().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  credits: z.coerce.number().optional().nullable(),
  creditLimit: z.coerce.number().optional().nullable(),
  active: z.boolean().optional().nullable()
});

const identifierSchema = z.object({
  type: z.enum(["nfc", "barcode", "manual", "qr"]),
  code: z.string().min(3),
  tabType: z.enum(["credit", "prepaid"]).optional()
});

const creditSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().optional().nullable(),
  paymentMethod: z.enum(["cash", "debit", "credit", "pix"])
});

export const customersRoutes = new Hono();

customersRoutes.get("/", async (c) => {
  const tenantId = getTenantId(c);
  const { page, pageSize } = paginationSchema.parse(c.req.query());
  const offset = (page - 1) * pageSize;

  const data = await db
    .select()
    .from(customers)
    .where(eq(customers.companyId, tenantId))
    .limit(pageSize)
    .offset(offset);

  return c.json({ data, meta: { page, pageSize } });
});

customersRoutes.post("/", async (c) => {
  const tenantId = getTenantId(c);
  const body = customerSchema.parse(await c.req.json());
  const [created] = await db.insert(customers).values({ ...body, companyId: tenantId }).returning();
  return c.json(created, 201);
});

customersRoutes.put("/:id", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const body = customerSchema.partial().parse(await c.req.json());
  const [updated] = await db
    .update(customers)
    .set(body)
    .where(and(eq(customers.id, id), eq(customers.companyId, tenantId)))
    .returning();

  return c.json(updated ?? { id, updated: false });
});

customersRoutes.delete("/:id", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const [deleted] = await db
    .delete(customers)
    .where(and(eq(customers.id, id), eq(customers.companyId, tenantId)))
    .returning();

  return c.json({ id, deleted: Boolean(deleted) });
});

customersRoutes.post("/:id/activate-tag", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const body = identifierSchema.parse(await c.req.json());

  const [existing] = await db
    .select()
    .from(customerIdentifiers)
    .where(and(eq(customerIdentifiers.companyId, tenantId), eq(customerIdentifiers.code, body.code)));

  if (existing) {
    const [updated] = await db
      .update(customerIdentifiers)
      .set({
        customerId: id,
        type: body.type,
        active: true,
        isMaster: true,
        tabType: body.tabType ?? existing.tabType ?? "prepaid"
      })
      .where(and(eq(customerIdentifiers.id, existing.id), eq(customerIdentifiers.companyId, tenantId)))
      .returning();
    return c.json(updated, 200);
  }

  const [created] = await db
    .insert(customerIdentifiers)
    .values({
      companyId: tenantId,
      customerId: id,
      type: body.type,
      code: body.code,
      isMaster: true,
      active: true,
      tabType: body.tabType ?? "prepaid"
    })
    .returning();

  return c.json(created, 201);
});

customersRoutes.post("/:id/add-credits", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const body = creditSchema.parse(await c.req.json());

  const [cashRegister] = await db
    .select()
    .from(cashRegisters)
    .where(and(eq(cashRegisters.companyId, tenantId), eq(cashRegisters.status, "open")));
  if (!cashRegister) {
    return c.json({ error: "Caixa fechado" }, 400);
  }

  await db
    .update(customers)
    .set({ credits: sql`${customers.credits} + ${body.amount}` })
    .where(and(eq(customers.id, id), eq(customers.companyId, tenantId)));

  await db.insert(transactions).values({
    companyId: tenantId,
    customerId: id,
    type: "credit",
    amount: body.amount.toString(),
    description: body.description ?? "Credito adicionado"
  });

  await db.insert(creditPayments).values({
    companyId: tenantId,
    customerId: id,
    cashRegisterId: cashRegister.id,
    method: body.paymentMethod,
    amount: body.amount.toString(),
    description: body.description ?? "Credito pre-pago"
  });

  return c.json({ id, added: body.amount });
});

customersRoutes.get("/by-identifier/:identifier", async (c) => {
  const tenantId = getTenantId(c);
  const identifier = c.req.param("identifier");

  const [row] = await db
    .select({ customer: customers, identifier: customerIdentifiers })
    .from(customerIdentifiers)
    .innerJoin(customers, eq(customers.id, customerIdentifiers.customerId))
    .where(and(eq(customerIdentifiers.companyId, tenantId), eq(customerIdentifiers.code, identifier), eq(customerIdentifiers.active, true)));

  return c.json({ identifier, data: row?.customer ?? null, identifierData: row?.identifier ?? null });
});
