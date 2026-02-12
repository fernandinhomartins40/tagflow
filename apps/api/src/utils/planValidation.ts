import type { Context } from "hono";
import {
  checkBranchLimit,
  checkUserLimit,
  checkCustomerLimit,
  checkBookingLimit,
  checkFeatureAccess
} from "../services/planLimits";

export const validateBranchLimit = async (c: Context, companyId: string) => {
  const check = await checkBranchLimit(companyId);
  if (!check.allowed) {
    return c.json(
      {
        error: "Limite de filiais atingido",
        message: `Seu plano permite apenas ${check.max} filial(is). Voce ja tem ${check.current}. Faca upgrade para adicionar mais.`,
        limit: check.max,
        current: check.current
      },
      403
    );
  }
  return null;
};

export const validateUserLimit = async (c: Context, companyId: string) => {
  const check = await checkUserLimit(companyId);
  if (!check.allowed) {
    return c.json(
      {
        error: "Limite de usuarios atingido",
        message: `Seu plano permite apenas ${check.max} usuario(s). Voce ja tem ${check.current}. Faca upgrade para adicionar mais.`,
        limit: check.max,
        current: check.current
      },
      403
    );
  }
  return null;
};

export const validateCustomerLimit = async (c: Context, companyId: string) => {
  try {
    const check = await checkCustomerLimit(companyId);
    if (!check.allowed) {
      return c.json(
        {
          error: "Limite de clientes atingido",
          message: `Seu plano permite apenas ${check.max} cliente(s). Você já tem ${check.current}. Faça upgrade para adicionar mais.`,
          limit: check.max,
          current: check.current
        },
        403
      );
    }
    return null;
  } catch (error) {
    console.error("[PLAN_VALIDATION] Error checking customer limit:", error);
    // Se falhar a validação, permite criar (fail-safe)
    return null;
  }
};

export const validateBookingLimit = async (c: Context, companyId: string) => {
  const check = await checkBookingLimit(companyId);
  if (!check.allowed) {
    return c.json(
      {
        error: "Limite de reservas atingido",
        message: `Seu plano permite apenas ${check.max} reserva(s) por mes. Voce ja tem ${check.current}. Faca upgrade para adicionar mais.`,
        limit: check.max,
        current: check.current
      },
      403
    );
  }
  return null;
};

export const validateFeatureAccess = async (
  c: Context,
  companyId: string,
  feature: "advancedReports" | "accountSplitting" | "apiAccess" | "prioritySupport",
  featureName: string
) => {
  const hasAccess = await checkFeatureAccess(companyId, feature);
  if (!hasAccess) {
    return c.json(
      {
        error: "Recurso indisponivel no seu plano",
        message: `${featureName} esta disponivel apenas em planos superiores. Faca upgrade para ter acesso.`,
        feature
      },
      403
    );
  }
  return null;
};


