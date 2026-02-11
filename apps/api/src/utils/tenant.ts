import { Context } from "hono";

/**
 * Obtém o tenantId do contexto da requisição.
 *
 * O tenantId é setado pelo authMiddleware a partir do JWT cookie.
 * Se não existir, significa que a requisição não está autenticada
 * ou os middlewares não foram aplicados corretamente.
 *
 * @throws Error se tenantId não estiver disponível
 */
export const getTenantId = (c: Context): string => {
  const tenantId = c.get("tenantId") as string | undefined;
  if (!tenantId) {
    throw new Error(
      "Tenant context not found. " +
      "This route requires authentication. " +
      "Ensure authMiddleware is applied before this handler."
    );
  }
  return tenantId;
};
