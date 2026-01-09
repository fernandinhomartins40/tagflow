import { Context, Next } from "hono";
import { db } from "../db";
import { companies } from "../schema";
import { eq } from "drizzle-orm";

export const tenantMiddleware = async (c: Context, next: Next) => {
  const path = c.req.path;
  if (
    path.startsWith("/api/superadmin") ||
    path.startsWith("/superadmin") ||
    path.startsWith("/api/stripe/webhook") ||
    path.startsWith("/api/auth/signup") ||
    path.startsWith("/auth/signup") ||
    path.startsWith("/api/public/plans") ||
    path.startsWith("/public/plans")
  ) {
    await next();
    return;
  }

  const headerTenantId = c.req.header("x-tenant-id");
  if (headerTenantId) {
    c.set("tenantId", headerTenantId);
    await next();
    return;
  }

  const host = c.req.header("host") || "";
  const subdomain = host.split(".")[0];

  if (subdomain && subdomain !== "localhost") {
    const [company] = await db.select().from(companies).where(eq(companies.domain, subdomain));
    if (!company) {
      return c.json({ error: "Tenant not found" }, 404);
    }
    c.set("tenantId", company.id);
    await next();
    return;
  }

  return c.json({ error: "Tenant not provided" }, 400);
};
