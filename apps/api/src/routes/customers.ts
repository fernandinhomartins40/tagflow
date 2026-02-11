import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { cashRegisters, creditPayments, customers, customerIdentifiers, transactions, globalCustomers, tabs } from "../schema";
import { and, eq, sql } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";
import { paginationSchema } from "../utils/pagination";
import { validateCustomerLimit } from "../utils/planValidation";
import { hashCustomerPassword, initialCustomerPassword, normalizeCpf, normalizePhone } from "../utils/customer";

const customerSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  name: z.string().min(2),
  cpf: z.string().min(11),
  birthDate: z.coerce.date().optional().nullable(),
  phone: z.string().min(8),
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

const ensureGlobalCustomer = async (payload: { cpf: string; phone: string; name: string }) => {
  const normalizedCpf = normalizeCpf(payload.cpf);
  const normalizedPhone = normalizePhone(payload.phone);
  const [existing] = await db.select().from(globalCustomers).where(eq(globalCustomers.cpf, normalizedCpf));
  if (existing) {
    if (existing.phone !== normalizedPhone || existing.name !== payload.name) {
      await db
        .update(globalCustomers)
        .set({
          phone: normalizedPhone,
          name: payload.name,
          updatedAt: new Date()
        })
        .where(eq(globalCustomers.id, existing.id));
    }
    return existing.id;
  }

  const passwordHash = await hashCustomerPassword(initialCustomerPassword(payload.name));
  const [created] = await db
    .insert(globalCustomers)
    .values({
      cpf: normalizedCpf,
      phone: normalizedPhone,
      name: payload.name,
      passwordHash
    })
    .returning();
  return created.id;
};

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

  // Check plan limits before creating
  const limitCheck = await validateCustomerLimit(c, tenantId);
  if (limitCheck) return limitCheck;

  const body = customerSchema.parse(await c.req.json());
  const normalizedCpf = normalizeCpf(body.cpf);
  const normalizedPhone = normalizePhone(body.phone);
  if (!normalizedCpf || !normalizedPhone) {
    return c.json({ error: "CPF e telefone sao obrigatorios" }, 400);
  }

  const [existingLocal] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.companyId, tenantId), eq(customers.cpf, normalizedCpf)));
  if (existingLocal) {
    return c.json({ error: "Cliente ja cadastrado nesta empresa" }, 409);
  }

  const globalCustomerId = await ensureGlobalCustomer({
    cpf: normalizedCpf,
    phone: normalizedPhone,
    name: body.name
  });

  const [created] = await db
    .insert(customers)
    .values({
      ...body,
      companyId: tenantId,
      cpf: normalizedCpf,
      phone: normalizedPhone,
      globalCustomerId
    })
    .returning();

  return c.json(created, 201);
});

customersRoutes.put("/:id", async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param("id");
  const body = customerSchema.partial().parse(await c.req.json());
  const normalizedCpf = body.cpf ? normalizeCpf(body.cpf) : undefined;
  const normalizedPhone = body.phone ? normalizePhone(body.phone) : undefined;
  let globalCustomerId: string | undefined;

  if (normalizedCpf && normalizedPhone && body.name) {
    globalCustomerId = await ensureGlobalCustomer({
      cpf: normalizedCpf,
      phone: normalizedPhone,
      name: body.name
    });
  }

  const [updated] = await db
    .update(customers)
    .set(body)
    .where(and(eq(customers.id, id), eq(customers.companyId, tenantId)))
    .returning();

  if (updated && globalCustomerId) {
    const [linked] = await db
      .update(customers)
      .set({ cpf: normalizedCpf ?? updated.cpf, phone: normalizedPhone ?? updated.phone, globalCustomerId })
      .where(and(eq(customers.id, id), eq(customers.companyId, tenantId)))
      .returning();
    return c.json(linked ?? updated);
  }

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

    // ✅ Verificar se já existe comanda aberta para este identificador
    const [existingTab] = await db
      .select()
      .from(tabs)
      .where(and(
        eq(tabs.companyId, tenantId),
        eq(tabs.customerId, id),
        eq(tabs.status, "open")
      ));

    // Se não existe, criar comanda zerada
    if (!existingTab) {
      const [tab] = await db
        .insert(tabs)
        .values({
          companyId: tenantId,
          customerId: id,
          identifierId: updated.id,
          type: updated.tabType,
          status: "open",
          totalAmount: 0,
          paidAmount: 0
        })
        .returning();
      return c.json({ identifier: updated, tab }, 200);
    }

    return c.json({ identifier: updated, tab: existingTab }, 200);
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

  // ✅ Criar comanda zerada automaticamente
  const [tab] = await db
    .insert(tabs)
    .values({
      companyId: tenantId,
      customerId: id,
      identifierId: created.id,
      type: created.tabType,
      status: "open",
      totalAmount: 0,
      paidAmount: 0
    })
    .returning();

  return c.json({ identifier: created, tab }, 201);
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
