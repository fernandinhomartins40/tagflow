import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { companies } from "../schema";
import { eq } from "drizzle-orm";

const jwtSecret = process.env.JWT_SECRET ?? "";
if (!jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

/**
 * TenantMiddleware - Simplificado
 *
 * Responsabilidades:
 * 1. Excluir rotas públicas que não precisam de tenant
 * 2. Detectar tenant por subdomain (para multi-tenant SaaS futuro)
 *
 * IMPORTANTE: O tenantId principal vem do authMiddleware via JWT cookie.
 * Este middleware apenas complementa com detecção de subdomain.
 */
export const tenantMiddleware = async (c: Context, next: Next) => {
  const path = c.req.path;

  // Rotas que NÃO precisam de tenant context
  const publicPaths = [
    "/api/superadmin",
    "/superadmin",
    "/api/stripe/webhook",
    "/api/auth",      // Todas as rotas de auth (signup, login, refresh, me, logout)
    "/auth",
    "/api/customer",  // Customer app (PWA separado)
    "/customer",
    "/api/public",    // Rotas públicas (plans, etc)
    "/public"
  ];

  if (publicPaths.some(p => path.startsWith(p))) {
    await next();
    return;
  }

  // Detecção de tenant por subdomain (opcional, para futuro multi-tenant SaaS)
  // Exemplo: empresa1.tagflow.shop, empresa2.tagflow.shop
  const host = c.req.header("host") || "";
  const subdomain = host.split(".")[0];

  // Se tem subdomain válido (não localhost, não tagflow), valida
  if (subdomain && subdomain !== "localhost" && subdomain !== "tagflow") {
    const [company] = await db.select().from(companies).where(eq(companies.domain, subdomain));

    if (!company) {
      return c.json({ error: "Tenant not found for subdomain" }, 404);
    }

    // Seta tenantId do subdomain
    // AuthMiddleware vai validar se o JWT bate com este tenant
    c.set("tenantId", company.id);
  }

  // Continua para o próximo middleware
  // AuthMiddleware vai setar tenantId do JWT se não foi setado aqui
  await next();
};
