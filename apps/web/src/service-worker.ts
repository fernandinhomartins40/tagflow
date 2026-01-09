/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;
import { clientsClaim } from "workbox-core";
import { createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

precacheAndRoute(self.__WB_MANIFEST);
self.skipWaiting();
clientsClaim();

const apiStrategy = new NetworkFirst({
  cacheName: "api-cache",
  networkTimeoutSeconds: 3
});

registerRoute(({ url }) => url.pathname.startsWith("/api"), async (args) => {
  try {
    const response = await apiStrategy.handle(args);
    if (response) return response;
  } catch {
    // ignore
  }
  return new Response(JSON.stringify({ error: "offline" }), {
    status: 503,
    headers: { "Content-Type": "application/json" }
  });
});

registerRoute(
  ({ request }) => request.destination === "script" || request.destination === "style" || request.destination === "image",
  new CacheFirst({
    cacheName: "asset-cache",
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })]
  })
);

const pageStrategy = new NetworkFirst({ cacheName: "page-cache", networkTimeoutSeconds: 3 });
const navigationHandler = createHandlerBoundToURL("/index.html");

registerRoute(
  new NavigationRoute(async (args) => {
    try {
      const response = await pageStrategy.handle(args);
      if (response) return response;
    } catch {
      // ignore
    }
    return navigationHandler(args);
  })
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
