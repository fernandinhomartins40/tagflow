import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "../schema";
import { and, eq } from "drizzle-orm";

const jwtSecret = process.env.JWT_SECRET ?? "";
const accessCookieName = "tf_access";

export const authMiddleware = async (c: Context, next: Next) => {
  const auth = c.req.header("authorization") ?? "";
  const headerToken = auth.replace("Bearer ", "");
  const cookieToken = getCookie(c, accessCookieName);
  const token = cookieToken || headerToken;
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as { sub: string; role: string; companyId: string };
    const [user] = await db.select().from(users).where(and(eq(users.id, payload.sub), eq(users.companyId, payload.companyId)));
    if (!user || !user.active) {
      return c.json({ error: "User inactive" }, 403);
    }

    // Verifica se tenantId já foi setado (por subdomain no tenantMiddleware)
    const existingTenantId = c.get("tenantId") as string | undefined;
    if (existingTenantId && payload.role !== "super_admin" && payload.companyId !== existingTenantId) {
      return c.json({ error: "Tenant mismatch" }, 403);
    }

    // ✅ NOVA LÓGICA: AuthMiddleware sempre seta tenantId do JWT
    // Isso garante que rotas protegidas sempre tenham tenant context
    c.set("tenantId", payload.companyId);
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
};
