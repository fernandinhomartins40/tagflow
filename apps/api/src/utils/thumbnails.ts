import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getUploadPath } from "./uploads";

export interface ThumbnailUrls {
  original: string;
  medium: string;
  small: string;
}

export interface ThumbnailSize {
  size: number;
  quality: number;
}

export const THUMBNAIL_SIZES: Record<string, ThumbnailSize> = {
  original: { size: 512, quality: 85 },
  medium: { size: 256, quality: 80 },
  small: { size: 128, quality: 75 },
};

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Valida tipo MIME do arquivo
 */
export function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * Valida tamanho do arquivo
 */
export function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

/**
 * Gera thumbnails em múltiplas resoluções
 * @param buffer - Buffer da imagem original
 * @param tenantId - ID do tenant
 * @param filename - Nome do arquivo (UUID.ext)
 * @returns URLs relativas para cada tamanho
 */
export async function generateThumbnails(
  buffer: Buffer,
  tenantId: string,
  filename: string
): Promise<ThumbnailUrls> {
  const basePath = getUploadPath(tenantId);

  // Garantir que todos os diretórios existem
  await Promise.all(
    Object.keys(THUMBNAIL_SIZES).map(async (key) => {
      const dir = join(basePath, key);
      await mkdir(dir, { recursive: true });
    })
  );

  // Gerar todas as versões em paralelo
  await Promise.all(
    Object.entries(THUMBNAIL_SIZES).map(async ([key, { size, quality }]) => {
      const dir = join(basePath, key);
      const filePath = join(dir, filename);

      await sharp(buffer)
        .resize(size, size, {
          fit: "cover",
          position: "center",
        })
        .jpeg({
          quality,
          progressive: true,
          mozjpeg: true,
        })
        .toFile(filePath);
    })
  );

  return {
    original: `/uploads/${tenantId}/original/${filename}`,
    medium: `/uploads/${tenantId}/medium/${filename}`,
    small: `/uploads/${tenantId}/small/${filename}`,
  };
}

/**
 * Gera uma versão WebP otimizada (opcional - para uso futuro)
 */
export async function generateWebP(
  buffer: Buffer,
  tenantId: string,
  filename: string
): Promise<string> {
  const basePath = getUploadPath(tenantId);
  const webpDir = join(basePath, "webp");
  await mkdir(webpDir, { recursive: true });

  const webpFilename = filename.replace(/\.(jpg|jpeg|png)$/i, ".webp");
  const filePath = join(webpDir, webpFilename);

  await sharp(buffer)
    .resize(512, 512, { fit: "cover", position: "center" })
    .webp({ quality: 80, effort: 6 })
    .toFile(filePath);

  return `/uploads/${tenantId}/webp/${webpFilename}`;
}
