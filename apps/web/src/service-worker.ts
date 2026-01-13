/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;
import { clientsClaim } from "workbox-core";
import { createHandlerBoundToURL, precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

const CACHE_VERSION = "v2";

precacheAndRoute(self.__WB_MANIFEST);
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

const apiStrategy = new NetworkFirst({
  cacheName: `api-cache-${CACHE_VERSION}`,
  networkTimeoutSeconds: 10,
  plugins: [
    new ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 5 * 60 // 5 minutos
    })
  ]
});

registerRoute(({ url }) => url.pathname.startsWith("/api"), async (args) => {
  try {
    const response = await apiStrategy.handle(args);
    if (response && response.ok) return response;
  } catch (error) {
    console.warn('API request failed:', args.request.url, error);
  }

  // Retorna erro offline apenas se realmente não houver cache
  return new Response(JSON.stringify({ error: "offline" }), {
    status: 503,
    headers: { "Content-Type": "application/json" }
  });
});

registerRoute(
  ({ request }) => request.destination === "script" || request.destination === "style",
  new StaleWhileRevalidate({
    cacheName: `asset-cache-${CACHE_VERSION}`,
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 })]
  })
);

registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: `image-cache-${CACHE_VERSION}`,
    plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 })]
  })
);

const pageStrategy = new NetworkFirst({
  cacheName: `page-cache-${CACHE_VERSION}`,
  networkTimeoutSeconds: 10,
  plugins: [
    new ExpirationPlugin({
      maxEntries: 30,
      maxAgeSeconds: 24 * 60 * 60 // 24 horas
    })
  ]
});

registerRoute(
  new NavigationRoute(async (args) => {
    try {
      const response = await pageStrategy.handle(args);
      if (response && response.ok) return response;
    } catch (error) {
      console.warn('Navigation request failed:', args.request.url, error);
    }

    // Fallback para index.html se houver erro
    try {
      return await fetch("/index.html", { cache: "reload" });
    } catch {
      // Se até o fallback falhar, retorna resposta básica
      return new Response(
        '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>Offline</h1><p>Verifique sua conexao</p></body></html>',
        { headers: { "Content-Type": "text/html" } }
      );
    }
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
