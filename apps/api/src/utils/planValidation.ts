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
        message: `Seu plano permite apenas ${check.max} filial(is). Você já tem ${check.current}. Faça upgrade para adicionar mais.`,
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
        error: "Limite de usuários atingido",
        message: `Seu plano permite apenas ${check.max} usuário(s). Você já tem ${check.current}. Faça upgrade para adicionar mais.`,
        limit: check.max,
        current: check.current
      },
      403
    );
  }
  return null;
};

export const validateCustomerLimit = async (c: Context, companyId: string) => {
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
};

export const validateBookingLimit = async (c: Context, companyId: string) => {
  const check = await checkBookingLimit(companyId);
  if (!check.allowed) {
    return c.json(
      {
        error: "Limite de reservas atingido",
        message: `Seu plano permite apenas ${check.max} reserva(s) por mês. Você já tem ${check.current}. Faça upgrade para adicionar mais.`,
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
        error: "Recurso indisponível no seu plano",
        message: `${featureName} está disponível apenas em planos superiores. Faça upgrade para ter acesso.`,
        feature
      },
      403
    );
  }
  return null;
};
