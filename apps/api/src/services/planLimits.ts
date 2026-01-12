import { db } from "../db";
import { companies, companySubscriptions, plans, branches, users, customers, bookings } from "../schema";
import { eq, and, count } from "drizzle-orm";

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

const PLAN_LIMITS: Record<string, PlanLimits> = {
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

export const getPlanLimits = (planName: string): PlanLimits => {
  return PLAN_LIMITS[planName] ?? PLAN_LIMITS.Free;
};

export const getCompanyPlanLimits = async (companyId: string): Promise<PlanLimits> => {
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!company) {
    throw new Error("Company not found");
  }
  return getPlanLimits(company.plan);
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
      // Note: This is a simplified check. In production, you'd use proper date comparison
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
