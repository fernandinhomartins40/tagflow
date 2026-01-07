/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.pathname.startsWith("/api"),
  new NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 3
  })
);

registerRoute(
  ({ request }) => request.destination === "script" || request.destination === "style" || request.destination === "image",
  new CacheFirst({
    cacheName: "asset-cache",
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })]
  })
);

registerRoute(
  ({ request }) => request.destination === "document",
  new StaleWhileRevalidate({ cacheName: "page-cache" })
);

self.addEventListener("push", (event) => {
  const data = event.data?.json() as { title?: string; body?: string } | undefined;
  const title = data?.title || "Tagflow";
  const options = {
    body: data?.body || "Nova notificacao",
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
