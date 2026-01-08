import { useTenantStore } from "../store/tenant";
import { getApiBaseUrl } from "./config";

const baseUrl = getApiBaseUrl();

const getHeaders = () => {
  const tenantId = useTenantStore.getState().tenantId;

  return {
    "Content-Type": "application/json",
    "X-Tenant-Id": tenantId
  };
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
    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tenant-Id": useTenantStore.getState().tenantId },
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
