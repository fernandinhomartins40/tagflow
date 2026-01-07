import { registerSW } from "virtual:pwa-register";

export function setupPwa() {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log("New content available");
    },
    onOfflineReady() {
      console.log("App ready to work offline");
    }
  });
}
