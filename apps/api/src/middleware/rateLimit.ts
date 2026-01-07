import { Context, Next } from "hono";

const rateMap = new Map<string, { count: number; resetAt: number }>();

export const rateLimit = (limit: number, windowMs: number) => {
  return async (c: Context, next: Next) => {
    const key = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || c.req.raw?.headers.get("cf-connecting-ip") || "local";
    const now = Date.now();
    const entry = rateMap.get(key);

    if (!entry || entry.resetAt < now) {
      rateMap.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    if (entry.count >= limit) {
      return c.json({ error: "Too many requests" }, 429);
    }

    entry.count += 1;
    await next();
  };
};
