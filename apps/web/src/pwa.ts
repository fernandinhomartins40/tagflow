import { registerSW } from "virtual:pwa-register";

export function setupPwa() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    },
    onOfflineReady() {
      console.log("App ready to work offline");
    }
  });
}
