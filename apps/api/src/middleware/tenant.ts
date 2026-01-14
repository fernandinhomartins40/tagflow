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

export const tenantMiddleware = async (c: Context, next: Next) => {
  const path = c.req.path;
  if (
    path.startsWith("/api/superadmin") ||
    path.startsWith("/superadmin") ||
    path.startsWith("/api/stripe/webhook") ||
    path.startsWith("/api/auth/signup") ||
    path.startsWith("/auth/signup") ||
    path.startsWith("/api/auth/login") ||
    path.startsWith("/auth/login") ||
    path.startsWith("/api/auth/refresh") ||
    path.startsWith("/auth/refresh") ||
    path.startsWith("/api/auth/me") ||
    path.startsWith("/auth/me") ||
    path.startsWith("/api/auth/logout") ||
    path.startsWith("/auth/logout") ||
    path.startsWith("/api/customer") ||
    path.startsWith("/customer") ||
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

  const token = getCookie(c, "tf_access");
  if (token) {
    try {
      const payload = jwt.verify(token, jwtSecret) as { companyId?: string };
      if (payload.companyId) {
        c.set("tenantId", payload.companyId);
        await next();
        return;
      }
    } catch {
      // ignore and continue to tenant detection
    }
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
