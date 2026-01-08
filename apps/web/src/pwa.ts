import { registerSW } from "virtual:pwa-register";

export function setupPwa() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
    .finally(() => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          updateSW(true);
        },
        onOfflineReady() {
          console.log("App ready to work offline");
        }
      });
    });
}
