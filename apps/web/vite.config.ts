import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg"],
      manifest: {
        name: "Tagflow",
        short_name: "Tagflow",
        description: "Gestao multi-tenant para estabelecimentos comerciais",
        start_url: "/login",
        scope: "/",
        display: "standalone",
        background_color: "#fff5e9",
        theme_color: "#ff7b47",
        icons: [
          {
            src: "icons/icon.svg",
            sizes: "any",
            type: "image/svg+xml"
          }
        ]
      },
      strategies: "injectManifest",
      srcDir: "src",
      filename: "service-worker.ts"
    })
  ],
  server: {
    host: true,
    port: 5173
  }
});
