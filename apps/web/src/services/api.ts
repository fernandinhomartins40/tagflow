import { useTenantStore } from "../store/tenant";
import { getApiBaseUrl } from "./config";

const baseUrl = getApiBaseUrl();

const getHeaders = () => {
  const tenantId = useTenantStore.getState().tenantId;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (tenantId) {
    headers["X-Tenant-Id"] = tenantId;
  }
  return headers;
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const doFetch = async () => {
    const headers = {
      ...getHeaders(),
      ...(options.headers || {})
    };
    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      credentials: "include"
    });
  };

  let res = await doFetch();
  if (res.status === 401) {
    const refreshHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (useTenantStore.getState().tenantId) {
      refreshHeaders["X-Tenant-Id"] = useTenantStore.getState().tenantId;
    }
    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: refreshHeaders,
      credentials: "include"
    });
    if (refreshRes.ok) {
      res = await doFetch();
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "API error");
  }

  return res.json() as Promise<T>;
}
