import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export const getUploadPath = (tenantId: string) => join("/app/uploads", tenantId);

export const ensureUploadDir = async (tenantId: string) => {
  const dir = getUploadPath(tenantId);
  await mkdir(dir, { recursive: true });
  return dir;
};
