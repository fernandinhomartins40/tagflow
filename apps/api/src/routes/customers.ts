import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { cashRegisters, creditPayments, customers, customerIdentifiers, transactions, globalCustomers, tabs } from "../schema";
import { and, eq, sql } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";
import { paginationSchema } from "../utils/pagination";
import { validateCustomerLimit } from "../utils/planValidation";
import { hashCustomerPassword, initialCustomerPassword, normalizeCpf, normalizePhone } from "../utils/customer";
import { logger } from "../utils/logger";

const customerSchema = z.object({
  branchId: z.string().uuid().optional(),
  name: z.string().min(2),
  cpf: z.string().min(11),
  birthDate: z.string().optional(),
  phone: z.string().min(8),
  email: z.string().email().or(z.literal("")).optional(),
  credits: z.coerce.number().optional(),
  creditLimit: z.coerce.number().optional(),
  active: z.boolean().optional()
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
  try {
    const tenantId = getTenantId(c);
    logger.request("POST", "/api/customers", { tenantId });

    // Check plan limits before creating
    logger.debug("Checking plan limits", "CUSTOMERS", { tenantId });
    const limitCheck = await validateCustomerLimit(c, tenantId);
    if (limitCheck) {
      logger.warn("Plan limit exceeded", "CUSTOMERS", { tenantId });
      return limitCheck;
    }

    // Parse and validate request body
    logger.debug("Parsing request body", "CUSTOMERS");
    const rawBody = await c.req.json();
    logger.debug("Raw body received", "CUSTOMERS", rawBody);
    logger.debug("Raw body field types", "CUSTOMERS", {
      name: typeof rawBody.name,
      cpf: typeof rawBody.cpf,
      phone: typeof rawBody.phone,
      email: typeof rawBody.email,
      birthDate: typeof rawBody.birthDate,
      creditLimit: typeof rawBody.creditLimit,
      branchId: typeof rawBody.branchId
    });

    const body = customerSchema.parse(rawBody);
    logger.debug("Body validated successfully", "CUSTOMERS", body);

    // Normalize CPF and phone
    const normalizedCpf = normalizeCpf(body.cpf);
    const normalizedPhone = normalizePhone(body.phone);
    logger.debug("Normalized data", "CUSTOMERS", { normalizedCpf, normalizedPhone });

    if (!normalizedCpf || !normalizedPhone) {
      logger.validation("cpf/phone", "Missing required fields");
      return c.json({ error: "CPF e telefone sao obrigatorios" }, 400);
    }

    // Check for existing customer
    logger.db("SELECT", "customers", { tenantId, cpf: normalizedCpf });
    const [existingLocal] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.companyId, tenantId), eq(customers.cpf, normalizedCpf)));

    if (existingLocal) {
      logger.warn("Customer already exists", "CUSTOMERS", { cpf: normalizedCpf });
      return c.json({ error: "Cliente ja cadastrado nesta empresa" }, 409);
    }

    // Ensure global customer exists
    logger.debug("Ensuring global customer", "CUSTOMERS", { cpf: normalizedCpf, phone: normalizedPhone });
    const globalCustomerId = await ensureGlobalCustomer({
      cpf: normalizedCpf,
      phone: normalizedPhone,
      name: body.name
    });
    logger.debug("Global customer ID obtained", "CUSTOMERS", { globalCustomerId });

    // Prepare data for insertion
    const insertData: any = {
      name: body.name,
      companyId: tenantId,
      cpf: normalizedCpf,
      phone: normalizedPhone,
      globalCustomerId
    };

    // Add optional fields only if they have values
    if (body.email) {
      insertData.email = body.email;
    }
    if (body.birthDate) {
      insertData.birthDate = new Date(body.birthDate);
    }
    if (body.creditLimit !== undefined && body.creditLimit !== null) {
      insertData.creditLimit = body.creditLimit;
    }
    if (body.branchId) {
      insertData.branchId = body.branchId;
    }

    logger.db("INSERT", "customers", insertData);

    // Insert customer
    const [created] = await db
      .insert(customers)
      .values(insertData)
      .returning();

    logger.info("Customer created successfully", "CUSTOMERS", { id: created.id, name: created.name });
    logger.response("POST", "/api/customers", 201, { id: created.id });

    return c.json(created, 201);
  } catch (error) {
    logger.error("Failed to create customer", "CUSTOMERS", error);

    if (error instanceof z.ZodError) {
      logger.validation("request body", error.message, error.errors);
      return c.json({
        error: "Dados inválidos",
        message: "Verifique os campos obrigatórios: nome, CPF e telefone.",
        details: error.errors
      }, 400);
    }

    // Erro específico de empresa/plano não encontrado
    if (error instanceof Error) {
      if (error.message.includes("Empresa não encontrada")) {
        return c.json({
          error: "Empresa não encontrada",
          message: error.message
        }, 404);
      }

      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        return c.json({
          error: "Cliente já existe",
          message: "Já existe um cliente com este CPF cadastrado."
        }, 409);
      }

      // Log do erro completo para debug
      logger.error("Unexpected error details", "CUSTOMERS", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      return c.json({
        error: "Erro ao criar cliente",
        message: "Ocorreu um erro inesperado. Tente novamente ou contate o suporte.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      }, 500);
    }

    return c.json({
      error: "Erro desconhecido",
      message: "Erro inesperado ao processar requisição."
    }, 500);
  }
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

  // Remove null values, keep only defined values
  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email ?? undefined;
  if (body.birthDate !== undefined) updateData.birthDate = body.birthDate ? new Date(body.birthDate) : undefined;
  if (body.creditLimit !== undefined) updateData.creditLimit = body.creditLimit ?? undefined;
  if (normalizedCpf) updateData.cpf = normalizedCpf;
  if (normalizedPhone) updateData.phone = normalizedPhone;

  const [updated] = await db
    .update(customers)
    .set(updateData)
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
