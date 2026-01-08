import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import jwt from "jsonwebtoken";

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
    const tenantId = c.get("tenantId") as string | undefined;
    if (tenantId && payload.role !== "super_admin" && payload.companyId !== tenantId) {
      return c.json({ error: "Tenant mismatch" }, 403);
    }
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
};
