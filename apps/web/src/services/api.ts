import { useTenantStore } from "../store/tenant";
import { getApiBaseUrl } from "./config";
import { logger } from "../utils/logger";

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
  const method = options.method || "GET";
  const requestBody = options.body ? JSON.parse(options.body as string) : undefined;

  logger.api(method, path, undefined, requestBody ? { body: requestBody } : undefined);

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

  try {
    let res = await doFetch();

    if (res.status === 401) {
      logger.warn("Unauthorized, attempting token refresh", "API");
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
        logger.info("Token refreshed successfully", "API");
        res = await doFetch();
      } else {
        logger.error("Token refresh failed", "API");
      }
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      logger.api(method, path, res.status, { error: body.error, details: body.details });

      // Traduzir erros específicos do backend
      const errorMessages: Record<number, string> = {
        400: body.error || "Dados inválidos. Verifique os campos e tente novamente.",
        401: "Sessão expirada. Faça login novamente.",
        403: body.error || "Limite do plano atingido. Faça upgrade para continuar.",
        404: "Registro não encontrado.",
        409: body.error || "Registro já existe. Verifique os dados e tente novamente.",
        422: body.error || "Dados não podem ser processados. Verifique os valores.",
        500: "Erro no servidor. Tente novamente mais tarde.",
        503: "Serviço temporariamente indisponível."
      };

      const errorMessage = errorMessages[res.status] || body.error || `Erro ${res.status}: Falha na requisição`;
      throw new Error(errorMessage);
    }

    const responseData = await res.json();
    logger.api(method, path, res.status);

    return responseData as T;
  } catch (error) {
    logger.error(`API request failed: ${method} ${path}`, "API", error);
    throw error;
  }
}

/**
 * Upload de arquivo com tratamento específico
 */
export async function apiUpload<T>(path: string, file: File, additionalData?: Record<string, string>): Promise<T> {
  logger.info(`Uploading file to ${path}`, "API", { fileName: file.name, fileSize: file.size });

  const tenantId = useTenantStore.getState().tenantId;
  const formData = new FormData();
  formData.append("file", file);

  // Adicionar dados extras se necessário
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const headers: Record<string, string> = {};
  if (tenantId) {
    headers["X-Tenant-Id"] = tenantId;
  }

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include"
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const errorMessage = body.error || "Falha ao fazer upload do arquivo";
      logger.error(`Upload failed: ${path}`, "API", { status: res.status, error: errorMessage });
      throw new Error(errorMessage);
    }

    logger.info(`Upload successful: ${path}`, "API");
    return res.json() as Promise<T>;
  } catch (error) {
    logger.error(`Upload error: ${path}`, "API", error);
    throw error;
  }
}
