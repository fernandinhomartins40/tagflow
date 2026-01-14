import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { globalCustomers } from "../schema";
import { eq } from "drizzle-orm";

const jwtSecret = process.env.JWT_SECRET ?? "";
const customerCookieName = "tf_customer";

export const customerAuthMiddleware = async (c: Context, next: Next) => {
  const auth = c.req.header("authorization") ?? "";
  const headerToken = auth.replace("Bearer ", "");
  const cookieToken = getCookie(c, customerCookieName);
  const token = cookieToken || headerToken;
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as { sub: string; type?: string };
    if (payload.type !== "customer") {
      return c.json({ error: "Invalid token" }, 401);
    }
    const [customer] = await db.select().from(globalCustomers).where(eq(globalCustomers.id, payload.sub));
    if (!customer) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("customer", { id: customer.id });
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
};
