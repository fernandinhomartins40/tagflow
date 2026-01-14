import { getApiBaseUrl } from "./config";

const baseUrl = getApiBaseUrl();

export async function customerApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    credentials: "include"
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "API error");
  }

  return res.json() as Promise<T>;
}
