import { Hono } from "hono";
import { z } from "zod";
import webpush from "web-push";
import { db } from "../db";
import { pushSubscriptions } from "../schema";
import { and, eq } from "drizzle-orm";
import { getTenantId } from "../utils/tenant";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:admin@tagflow.local";

// Only configure VAPID if keys are properly set (not placeholder values)
const vapidConfigured = vapidPublicKey &&
                        vapidPrivateKey &&
                        vapidPublicKey !== "replace_me" &&
                        vapidPrivateKey !== "replace_me";

if (vapidConfigured) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    console.log("Push notifications configured successfully");
  } catch (err) {
    console.warn("Failed to configure push notifications:", err);
  }
} else {
  console.warn("Push notifications disabled: VAPID keys not configured");
}

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

const notificationSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(2)
});

export const notificationsRoutes = new Hono();

notificationsRoutes.post("/subscribe", async (c) => {
  const tenantId = getTenantId(c);
  const user = c.get("user") as { sub?: string } | undefined;
  const body = subscriptionSchema.parse(await c.req.json());

  const [created] = await db
    .insert(pushSubscriptions)
    .values({
      companyId: tenantId,
      userId: user?.sub,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth
    })
    .onConflictDoNothing()
    .returning();

  return c.json(created ?? { ok: true }, 201);
});

notificationsRoutes.post("/send", async (c) => {
  const tenantId = getTenantId(c);
  const body = notificationSchema.parse(await c.req.json());

  if (!vapidConfigured) {
    return c.json({ error: "Push notifications not configured. Please set VAPID keys." }, 503);
  }

  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.companyId, tenantId));
  await Promise.all(
    subs.map(async (sub) => {
      const payload = JSON.stringify({ title: body.title, body: body.body });
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        },
        payload
      );
    })
  );

  return c.json({ sent: subs.length });
});

notificationsRoutes.delete("/unsubscribe", async (c) => {
  const tenantId = getTenantId(c);
  const body = subscriptionSchema.parse(await c.req.json());

  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.companyId, tenantId), eq(pushSubscriptions.endpoint, body.endpoint)));

  return c.json({ removed: true });
});
