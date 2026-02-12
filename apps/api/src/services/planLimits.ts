import { db } from "../db";
import { companies, plans, branches, users, customers, bookings } from "../schema";
import { eq, and, count, gte } from "drizzle-orm";

export interface PlanLimits {
  maxBranches: number;
  maxUsers: number;
  maxCustomers: number;
  maxBookingsPerMonth: number;
  features: {
    advancedReports: boolean;
    accountSplitting: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
}

const DEFAULT_LIMITS: Record<string, PlanLimits> = {
  Free: {
    maxBranches: 1,
    maxUsers: 2,
    maxCustomers: 100,
    maxBookingsPerMonth: 10,
    features: {
      advancedReports: false,
      accountSplitting: false,
      apiAccess: false,
      prioritySupport: false
    }
  },
  Start: {
    maxBranches: 2,
    maxUsers: 5,
    maxCustomers: 1000,
    maxBookingsPerMonth: 100,
    features: {
      advancedReports: false,
      accountSplitting: false,
      apiAccess: false,
      prioritySupport: false
    }
  },
  Prime: {
    maxBranches: 5,
    maxUsers: 20,
    maxCustomers: 10000,
    maxBookingsPerMonth: 1000,
    features: {
      advancedReports: true,
      accountSplitting: true,
      apiAccess: true,
      prioritySupport: true
    }
  }
};

const parsePlanLimits = (limits?: string | null, planName?: string): PlanLimits => {
  if (limits) {
    try {
      const parsed = JSON.parse(limits) as Partial<PlanLimits> & { features?: Partial<PlanLimits["features"]> };
      if (parsed && typeof parsed === "object") {
        const base = DEFAULT_LIMITS[planName ?? "Free"] ?? DEFAULT_LIMITS.Free;
        return {
          maxBranches: Number(parsed.maxBranches ?? base.maxBranches),
          maxUsers: Number(parsed.maxUsers ?? base.maxUsers),
          maxCustomers: Number(parsed.maxCustomers ?? base.maxCustomers),
          maxBookingsPerMonth: Number(parsed.maxBookingsPerMonth ?? base.maxBookingsPerMonth),
          features: {
            advancedReports: Boolean(parsed.features?.advancedReports ?? base.features.advancedReports),
            accountSplitting: Boolean(parsed.features?.accountSplitting ?? base.features.accountSplitting),
            apiAccess: Boolean(parsed.features?.apiAccess ?? base.features.apiAccess),
            prioritySupport: Boolean(parsed.features?.prioritySupport ?? base.features.prioritySupport)
          }
        };
      }
    } catch {
      // ignore and fallback
    }
  }
  return DEFAULT_LIMITS[planName ?? "Free"] ?? DEFAULT_LIMITS.Free;
};

export const getPlanLimits = (planName: string, limits?: string | null): PlanLimits => {
  return parsePlanLimits(limits, planName);
};

export const getCompanyPlanLimits = async (companyId: string): Promise<PlanLimits> => {
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!company) {
    throw new Error(`Empresa não encontrada (ID: ${companyId}). Verifique se o tenant está correto.`);
  }

  // Se não tiver plano definido, usa "Free" como padrão
  const planName = company.plan || "Free";

  // Validar se o planName não é undefined/null antes de fazer a query
  if (!planName || typeof planName !== 'string') {
    console.error(`[PLAN_LIMITS] Invalid plan name for company ${companyId}:`, planName);
    return DEFAULT_LIMITS.Free;
  }

  const [plan] = await db.select().from(plans).where(eq(plans.name, planName));
  return getPlanLimits(planName, plan?.limits);
};

export const checkBranchLimit = async (companyId: string): Promise<{ allowed: boolean; current: number; max: number }> => {
  const limits = await getCompanyPlanLimits(companyId);
  const [result] = await db
    .select({ count: count() })
    .from(branches)
    .where(eq(branches.companyId, companyId));

  const current = result?.count ?? 0;
  return {
    allowed: current < limits.maxBranches,
    current,
    max: limits.maxBranches
  };
};

export const checkUserLimit = async (companyId: string): Promise<{ allowed: boolean; current: number; max: number }> => {
  const limits = await getCompanyPlanLimits(companyId);
  const [result] = await db
    .select({ count: count() })
    .from(users)
    .where(and(eq(users.companyId, companyId), eq(users.active, true)));

  const current = result?.count ?? 0;
  return {
    allowed: current < limits.maxUsers,
    current,
    max: limits.maxUsers
  };
};

export const checkCustomerLimit = async (companyId: string): Promise<{ allowed: boolean; current: number; max: number }> => {
  const limits = await getCompanyPlanLimits(companyId);
  const [result] = await db
    .select({ count: count() })
    .from(customers)
    .where(and(eq(customers.companyId, companyId), eq(customers.active, true)));

  const current = result?.count ?? 0;
  return {
    allowed: current < limits.maxCustomers,
    current,
    max: limits.maxCustomers
  };
};

export const checkBookingLimit = async (companyId: string): Promise<{ allowed: boolean; current: number; max: number }> => {
  const limits = await getCompanyPlanLimits(companyId);

  // Count bookings from current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [result] = await db
    .select({ count: count() })
    .from(bookings)
    .where(and(
      eq(bookings.companyId, companyId),
      gte(bookings.createdAt, firstDayOfMonth)
    ));

  const current = result?.count ?? 0;
  return {
    allowed: current < limits.maxBookingsPerMonth,
    current,
    max: limits.maxBookingsPerMonth
  };
};

export const checkFeatureAccess = async (companyId: string, feature: keyof PlanLimits["features"]): Promise<boolean> => {
  const limits = await getCompanyPlanLimits(companyId);
  return limits.features[feature];
};
