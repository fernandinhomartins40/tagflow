import { readdir, unlink, stat } from "node:fs/promises";
import { join } from "node:path";
import { db } from "../db";
import { products, services, locations } from "../schema";
import { eq } from "drizzle-orm";
import { getUploadPath } from "../utils/uploads";

/**
 * Limpa arquivos órfãos (arquivos que existem no filesystem mas não estão referenciados no banco de dados)
 * @param tenantId - ID do tenant a ser limpo
 * @param dryRun - Se true, apenas lista os arquivos sem deletar (padrão: true)
 * @returns Estatísticas da limpeza
 */
export async function cleanupOrphanFiles(
  tenantId: string,
  dryRun: boolean = true
): Promise<{
  totalFiles: number;
  orphanFiles: number;
  deletedFiles: number;
  freedSpace: number; // em bytes
  errors: string[];
}> {
  const errors: string[] = [];
  let totalFiles = 0;
  let orphanFiles = 0;
  let deletedFiles = 0;
  let freedSpace = 0;

  try {
    // Buscar todas as URLs de imagens no banco de dados para este tenant
    const [productsData, servicesData, locationsData] = await Promise.all([
      db
        .select({
          imageUrl: products.imageUrl,
          imageUrlMedium: products.imageUrlMedium,
          imageUrlSmall: products.imageUrlSmall,
        })
        .from(products)
        .where(eq(products.companyId, tenantId)),
      db
        .select({
          imageUrl: services.imageUrl,
          imageUrlMedium: services.imageUrlMedium,
          imageUrlSmall: services.imageUrlSmall,
        })
        .from(services)
        .where(eq(services.companyId, tenantId)),
      db
        .select({
          imageUrl: locations.imageUrl,
          imageUrlMedium: locations.imageUrlMedium,
          imageUrlSmall: locations.imageUrlSmall,
        })
        .from(locations)
        .where(eq(locations.companyId, tenantId)),
    ]);

    // Extrair nomes de arquivos únicos das URLs
    const dbFilenames = new Set<string>();
    const allData = [...productsData, ...servicesData, ...locationsData];

    for (const item of allData) {
      // Processar cada URL e extrair o nome do arquivo
      [item.imageUrl, item.imageUrlMedium, item.imageUrlSmall]
        .filter(Boolean)
        .forEach((url) => {
          const filename = url?.split("/").pop();
          if (filename) {
            dbFilenames.add(filename);
          }
        });
    }

    const basePath = getUploadPath(tenantId);

    // Verificar cada subdiretório (original, medium, small)
    const subdirs = ["original", "medium", "small"];

    for (const subdir of subdirs) {
      const dirPath = join(basePath, subdir);

      try {
        const files = await readdir(dirPath);
        totalFiles += files.length;

        for (const file of files) {
          // Ignorar arquivos de sistema
          if (file.startsWith(".")) continue;

          // Verificar se o arquivo está no banco de dados
          if (!dbFilenames.has(file)) {
            orphanFiles++;
            const filePath = join(dirPath, file);

            try {
              // Obter tamanho do arquivo
              const stats = await stat(filePath);
              const fileSize = stats.size;

              if (!dryRun) {
                // Deletar arquivo
                await unlink(filePath);
                deletedFiles++;
                freedSpace += fileSize;
                console.log(
                  `[CLEANUP] Deleted orphan file: ${subdir}/${file} (${(fileSize / 1024).toFixed(2)} KB)`
                );
              } else {
                freedSpace += fileSize;
                console.log(
                  `[CLEANUP] [DRY-RUN] Would delete: ${subdir}/${file} (${(fileSize / 1024).toFixed(2)} KB)`
                );
              }
            } catch (error) {
              const errorMsg = `Error processing ${subdir}/${file}: ${error instanceof Error ? error.message : String(error)}`;
              errors.push(errorMsg);
              console.error(`[CLEANUP] ${errorMsg}`);
            }
          }
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          const errorMsg = `Error reading directory ${subdir}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          console.error(`[CLEANUP] ${errorMsg}`);
        }
      }
    }

    const result = {
      totalFiles,
      orphanFiles,
      deletedFiles,
      freedSpace,
      errors,
    };

    console.log("[CLEANUP] Summary:", {
      ...result,
      freedSpaceMB: (freedSpace / 1024 / 1024).toFixed(2),
      mode: dryRun ? "DRY-RUN" : "LIVE",
    });

    return result;
  } catch (error) {
    const errorMsg = `Fatal error during cleanup: ${error instanceof Error ? error.message : String(error)}`;
    errors.push(errorMsg);
    console.error(`[CLEANUP] ${errorMsg}`);

    return {
      totalFiles,
      orphanFiles,
      deletedFiles,
      freedSpace,
      errors,
    };
  }
}

/**
 * Limpa arquivos órfãos de todos os tenants
 * @param dryRun - Se true, apenas lista os arquivos sem deletar (padrão: true)
 */
export async function cleanupAllTenants(dryRun: boolean = true) {
  console.log(
    `[CLEANUP] Starting cleanup for all tenants (mode: ${dryRun ? "DRY-RUN" : "LIVE"})`
  );

  // Buscar todos os tenants únicos
  const tenantIds = new Set<string>();

  const [productsData, servicesData, locationsData] = await Promise.all([
    db.select({ companyId: products.companyId }).from(products),
    db.select({ companyId: services.companyId }).from(services),
    db.select({ companyId: locations.companyId }).from(locations),
  ]);

  [...productsData, ...servicesData, ...locationsData].forEach((item) => {
    tenantIds.add(item.companyId);
  });

  const results = [];

  for (const tenantId of tenantIds) {
    console.log(`[CLEANUP] Processing tenant: ${tenantId}`);
    const result = await cleanupOrphanFiles(tenantId, dryRun);
    results.push({ tenantId, ...result });
  }

  // Resumo geral
  const summary = results.reduce(
    (acc, curr) => ({
      totalFiles: acc.totalFiles + curr.totalFiles,
      orphanFiles: acc.orphanFiles + curr.orphanFiles,
      deletedFiles: acc.deletedFiles + curr.deletedFiles,
      freedSpace: acc.freedSpace + curr.freedSpace,
      errors: [...acc.errors, ...curr.errors],
    }),
    { totalFiles: 0, orphanFiles: 0, deletedFiles: 0, freedSpace: 0, errors: [] }
  );

  console.log("[CLEANUP] Global summary:", {
    tenants: tenantIds.size,
    ...summary,
    freedSpaceMB: (summary.freedSpace / 1024 / 1024).toFixed(2),
  });

  return { tenants: results, summary };
}
