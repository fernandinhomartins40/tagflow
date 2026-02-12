import { Hono } from "hono";
import { db } from "../db";
import { customers, users, branches, bookings, companies, companySubscriptions, plans } from "../schema";
import { eq, and, count } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";

export const planLimitsRoutes = new Hono();

/**
 * GET /api/plan/limits
 * Retorna os limites atuais vs máximo do plano da empresa
 */
planLimitsRoutes.get("/limits", async (c) => {
  const tenantId = getTenantId(c);

  // Buscar plano da empresa
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, tenantId))
    .limit(1);

  if (!company) {
    return c.json({ error: "Empresa não encontrada" }, 404);
  }

  // Buscar subscription ativa (se houver)
  const [subscription] = await db
    .select({ planId: companySubscriptions.planId })
    .from(companySubscriptions)
    .where(
      and(
        eq(companySubscriptions.companyId, tenantId),
        eq(companySubscriptions.status, "active")
      )
    )
    .limit(1);

  // Buscar limites do plano
  let planLimits: any = {
    maxCustomers: null,
    maxUsers: null,
    maxBranches: null,
    maxBookings: null
  };

  if (subscription?.planId) {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, subscription.planId))
      .limit(1);

    if (plan?.limits) {
      try {
        planLimits = JSON.parse(plan.limits);
      } catch (e) {
        console.error("Erro ao parsear limites do plano:", e);
      }
    }
  } else {
    // Plano free/basic (limites padrão hardcoded)
    planLimits = {
      maxCustomers: 100,
      maxUsers: 3,
      maxBranches: 1,
      maxBookings: 50
    };
  }

  // Contar recursos atuais
  const [customersCount] = await db
    .select({ count: count() })
    .from(customers)
    .where(eq(customers.companyId, tenantId));

  const [usersCount] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.companyId, tenantId));

  const [branchesCount] = await db
    .select({ count: count() })
    .from(branches)
    .where(eq(branches.companyId, tenantId));

  const [bookingsCount] = await db
    .select({ count: count() })
    .from(bookings)
    .where(and(
      eq(bookings.companyId, tenantId),
      eq(bookings.status, "active")
    ));

  return c.json({
    customers: {
      current: customersCount?.count || 0,
      max: planLimits.maxCustomers
    },
    users: {
      current: usersCount?.count || 0,
      max: planLimits.maxUsers
    },
    branches: {
      current: branchesCount?.count || 0,
      max: planLimits.maxBranches
    },
    bookings: {
      current: bookingsCount?.count || 0,
      max: planLimits.maxBookings
    }
  });
});
