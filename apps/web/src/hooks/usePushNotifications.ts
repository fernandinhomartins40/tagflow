import { useState } from "react";
import { apiFetch } from "../services/api";

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

export function usePushNotifications() {
  const [status, setStatus] = useState("idle");

  const extractPayload = (subscription: PushSubscription) => {
    const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return null;
    }
    return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
  };

  const checkStatus = async () => {
    if (!("serviceWorker" in navigator)) {
      setStatus("SW nao suportado");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("Permissao negada");
      return;
    }
    if (Notification.permission === "default") {
      setStatus("Permissao pendente");
      return;
    }
    if (!vapidPublicKey) {
      setStatus("VAPID nao configurado");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setStatus(subscription ? "inscrito" : "nao inscrito");
  };

  const subscribe = async () => {
    if (!("serviceWorker" in navigator)) {
      setStatus("SW nao suportado");
      return;
    }

    if (!vapidPublicKey) {
      setStatus("VAPID nao configurado");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("Permissao negada");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    await apiFetch("/api/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription)
    });

    setStatus("inscrito");
  };

  const unsubscribe = async () => {
    if (!("serviceWorker" in navigator)) {
      setStatus("SW nao suportado");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      setStatus("nao inscrito");
      return;
    }
    const payload = extractPayload(subscription);
    if (payload) {
      await apiFetch("/api/notifications/unsubscribe", {
        method: "DELETE",
        body: JSON.stringify(payload)
      });
    }
    await subscription.unsubscribe();
    setStatus("removido");
  };

  const sendTest = async () => {
    await apiFetch("/api/notifications/send", {
      method: "POST",
      body: JSON.stringify({ title: "Tagflow", body: "Notificacao de teste" })
    });
    setStatus("enviado");
  };

  return { status, subscribe, unsubscribe, sendTest, checkStatus };
}
