import { Context } from "hono";

export const getTenantId = (c: Context): string => {
  const tenantId = c.get("tenantId") as string | undefined;
  if (!tenantId) {
    throw new Error("Tenant not provided");
  }
  return tenantId;
};
