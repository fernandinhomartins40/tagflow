export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  if (!raw || raw === "undefined") {
    return "";
  }
  return raw;
}
