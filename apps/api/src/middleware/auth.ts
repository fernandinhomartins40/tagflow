import { Context, Next } from "hono";
import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET ?? "";

export const authMiddleware = async (c: Context, next: Next) => {
  const auth = c.req.header("authorization") ?? "";
  const token = auth.replace("Bearer ", "");
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
