import { useAuthStore } from "../store/auth";
import { useTenantStore } from "../store/tenant";

const baseUrl = import.meta.env.VITE_API_URL ?? "";

const getHeaders = () => {
  const tenantId = useTenantStore.getState().tenantId;
  const token = useAuthStore.getState().token;

  return {
    "Content-Type": "application/json",
    "X-Tenant-Id": tenantId,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const doFetch = async (tokenOverride?: string | null) => {
    const headers = {
      ...getHeaders(),
      ...(options.headers || {})
    };
    if (tokenOverride !== undefined) {
      if (tokenOverride) {
        headers.Authorization = `Bearer ${tokenOverride}`;
      } else {
        delete headers.Authorization;
      }
    }
    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers
    });
  };

  let res = await doFetch();
  if (res.status === 401) {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-Id": useTenantStore.getState().tenantId },
        body: JSON.stringify({ refreshToken })
      });
      if (refreshRes.ok) {
        const data = (await refreshRes.json()) as { token: string };
        useAuthStore.getState().setAuth(data.token, refreshToken);
        res = await doFetch(data.token);
      }
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "API error");
  }

  return res.json() as Promise<T>;
}
