# 📦 Gestão de Storage - Tagflow

Documentação completa do sistema de armazenamento de imagens.

## 🔍 Visão Geral

O sistema de storage do Tagflow implementa:

- ✅ **Thumbnails automáticos** em 3 resoluções (512x512, 256x256, 128x128)
- ✅ **Validação de arquivos** (tipo MIME e tamanho máximo 5MB)
- ✅ **Compressão otimizada** com Sharp (JPEG progressivo)
- ✅ **Isolamento multi-tenant** (cada empresa tem seu diretório)
- ✅ **Volumes persistentes** Docker
- ✅ **Backup e restore** automatizados
- ✅ **Limpeza de arquivos órfãos**
- ✅ **Healthcheck de storage**

---

## 📂 Estrutura de Diretórios

```
/app/uploads/
├── {tenant-id-1}/
│   ├── original/          # 512x512 - imagem original cropada
│   │   └── {uuid}.jpg
│   ├── medium/            # 256x256 - para cards e visualizações médias
│   │   └── {uuid}.jpg
│   └── small/             # 128x128 - para grids e listagens
│       └── {uuid}.jpg
├── {tenant-id-2}/
│   ├── original/
│   ├── medium/
│   └── small/
└── .healthcheck           # Arquivo temporário para testes
```

---

## 🚀 Como Funciona

### 1. Upload e Processamento

**Frontend (React):**
```typescript
// Usuário seleciona imagem
<input type="file" accept="image/*" />

// ImageCropper abre modal com react-easy-crop
// Usuário ajusta crop e zoom

// Confirmação gera blob otimizado
canvas.toBlob((blob) => {
  const file = new File([blob], 'produto.jpg', { type: 'image/jpeg' })
  // Upload via FormData
}, 'image/jpeg', 0.82)
```

**Backend (Hono.js + Sharp):**
```typescript
// 1. Validação
validateMimeType(file.type)  // JPEG, PNG, WebP
validateFileSize(size)        // Max 5MB

// 2. Geração de thumbnails
const thumbnails = await generateThumbnails(buffer, tenantId, filename)
// Retorna: { original, medium, small }

// 3. Salvar no banco
db.update(products).set({
  imageUrl: thumbnails.original,
  imageUrlMedium: thumbnails.medium,
  imageUrlSmall: thumbnails.small
})
```

### 2. Exibição com srcSet

**Grid de produtos (otimizado para banda):**
```tsx
<img
  src={product.imageUrlSmall}
  srcSet={`
    ${product.imageUrlSmall} 128w,
    ${product.imageUrlMedium} 256w,
    ${product.imageUrl} 512w
  `}
  sizes="(max-width: 768px) 128px, 256px"
  loading="lazy"
/>
```

**Modal de visualização:**
```tsx
<img
  src={product.imageUrlMedium}
  srcSet={`
    ${product.imageUrlSmall} 128w,
    ${product.imageUrlMedium} 256w,
    ${product.imageUrl} 512w
  `}
  sizes="(max-width: 768px) 256px, 512px"
/>
```

---

## 🛠️ Operações de Manutenção

### Backup Manual

```bash
# Criar backup dos uploads
./scripts/backup-storage.sh

# Backup será salvo em: backups/uploads_YYYYMMDD_HHMMSS.tar.gz
```

### Restore de Backup

```bash
# Restaurar backup específico
./scripts/restore-storage.sh backups/uploads_20260212_120000.tar.gz

# ATENÇÃO: Isso irá SUBSTITUIR todos os arquivos atuais!
```

### Backup Automático (Cron)

**Setup no servidor VPS:**
```bash
# Editar crontab
crontab -e

# Adicionar linha (backup diário às 3h da manhã)
0 3 * * * cd /path/to/tagflow && ./scripts/backup-storage.sh >> /var/log/tagflow-backup.log 2>&1
```

### Limpeza de Arquivos Órfãos

**Via código TypeScript:**
```typescript
import { cleanupOrphanFiles } from './jobs/cleanup-orphan-files'

// Dry-run (apenas lista, não deleta)
const result = await cleanupOrphanFiles(tenantId, true)

// Executar limpeza real
const result = await cleanupOrphanFiles(tenantId, false)

// Limpar todos os tenants
import { cleanupAllTenants } from './jobs/cleanup-orphan-files'
const results = await cleanupAllTenants(false)
```

**Estatísticas retornadas:**
```typescript
{
  totalFiles: 150,        // Total de arquivos encontrados
  orphanFiles: 12,        // Arquivos órfãos detectados
  deletedFiles: 12,       // Arquivos deletados (0 se dry-run)
  freedSpace: 2048576,    // Espaço liberado em bytes
  errors: []              // Erros encontrados
}
```

---

## 🏥 Healthcheck

### Endpoint de Storage

```bash
# Verificar saúde do storage
curl http://localhost:3000/health/storage

# Resposta sucesso (200)
{
  "status": "healthy",
  "storage": "read/write operational",
  "timestamp": "2026-02-12T10:30:00.000Z"
}

# Resposta erro (503)
{
  "status": "unhealthy",
  "storage": "read/write failed",
  "error": "EACCES: permission denied",
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

### Docker Healthcheck

O `docker-compose.vps.yml` já inclui healthcheck da API:
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 15s
```

---

## 🔐 Segurança

### Validações Implementadas

| Validação | Regra | Código de Erro |
|-----------|-------|----------------|
| **Tipo MIME** | JPEG, PNG, WebP apenas | 400 |
| **Tamanho** | Máximo 5MB | 413 |
| **Extensão** | Extraída do nome original | - |
| **Isolamento** | Por tenant (UUID) | - |
| **Nome** | UUID aleatório | - |

### Configurações de Segurança

```typescript
// apps/api/src/utils/thumbnails.ts
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
]

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
```

---

## 📊 Métricas de Performance

### Tamanhos Típicos (JPEG 80-85% qualidade)

| Resolução | Tamanho Médio | Uso |
|-----------|---------------|-----|
| **512x512** (original) | ~80 KB | Visualização full, modal |
| **256x256** (medium) | ~25 KB | Cards, preview |
| **128x128** (small) | ~15 KB | Grid, listagem |

### Economia de Banda

**Grid com 20 produtos:**
- **Antes:** 20 × 80KB = 1.6 MB
- **Depois:** 20 × 15KB = 300 KB
- **Economia:** **81%** de redução

**Tempo de carregamento (4G - 10 Mbps):**
- **Antes:** ~1.3s
- **Depois:** ~0.24s
- **Melhoria:** **82% mais rápido**

---

## 🗄️ Banco de Dados

### Schema Atualizado

```sql
-- Migration: 002_add_thumbnail_fields.sql

ALTER TABLE products
ADD COLUMN image_url_medium TEXT,
ADD COLUMN image_url_small TEXT;

ALTER TABLE services
ADD COLUMN image_url_medium TEXT,
ADD COLUMN image_url_small TEXT;

ALTER TABLE locations
ADD COLUMN image_url_medium TEXT,
ADD COLUMN image_url_small TEXT;
```

### Executar Migration

```bash
# Via Drizzle (recomendado)
cd apps/api
bun run drizzle-kit push

# Ou via psql manual
docker exec -i tagflow-db psql -U postgres -d tagflow < apps/api/migrations/002_add_thumbnail_fields.sql
```

---

## 🐳 Docker Volumes

### Configuração VPS (Produção)

```yaml
# docker-compose.vps.yml
volumes:
  uploads_data:
    name: tagflow_uploads_data  # Named volume persistente
  postgres_data:
    name: tagflow_postgres_data
```

**Comandos úteis:**
```bash
# Listar volumes
docker volume ls

# Inspecionar volume de uploads
docker volume inspect tagflow_uploads_data

# Backup manual do volume
docker run --rm \
  -v tagflow_uploads_data:/data \
  -v $(pwd)/backups:/backups \
  alpine tar czf /backups/uploads-manual.tar.gz /data

# Restore manual do volume
docker run --rm \
  -v tagflow_uploads_data:/data \
  -v $(pwd)/backups:/backups \
  alpine tar xzf /backups/uploads-manual.tar.gz -C /
```

### Configuração Dev (Local)

```yaml
# docker-compose.yml
volumes:
  - ./apps/api/uploads:/app/uploads  # Bind mount local
```

---

## 📝 Troubleshooting

### Problema: Imagens não aparecem após deploy

**Causa:** Volume não está persistente
**Solução:**
```bash
# Verificar se o volume existe
docker volume inspect tagflow_uploads_data

# Recriar volume se necessário
docker compose -f docker-compose.vps.yml down
docker volume create tagflow_uploads_data
docker compose -f docker-compose.vps.yml up -d
```

### Problema: Erro de permissão ao salvar imagem

**Causa:** Permissões do diretório
**Solução:**
```bash
# Entrar no container
docker exec -it tagflow-api sh

# Verificar permissões
ls -la /app/uploads

# Corrigir se necessário
chown -R bun:bun /app/uploads
chmod -R 755 /app/uploads
```

### Problema: Storage healthcheck falha

**Causa:** Volume não montado ou sem permissão de escrita
**Solução:**
```bash
# Verificar logs
docker logs tagflow-api

# Testar manualmente
docker exec -it tagflow-api sh
echo "test" > /app/uploads/.healthcheck
cat /app/uploads/.healthcheck
rm /app/uploads/.healthcheck
```

### Problema: Arquivos órfãos acumulando

**Causa:** Deletar registros sem deletar arquivos
**Solução:**
```typescript
// Executar job de limpeza mensalmente
import { cleanupAllTenants } from './jobs/cleanup-orphan-files'

// Dry-run primeiro para verificar
const dryRun = await cleanupAllTenants(true)
console.log(`Encontrados ${dryRun.summary.orphanFiles} arquivos órfãos`)

// Executar limpeza real
const result = await cleanupAllTenants(false)
console.log(`Liberados ${(result.summary.freedSpace / 1024 / 1024).toFixed(2)} MB`)
```

---

## 🔄 Migrations Futuras

### Conversão para WebP (opcional)

```typescript
// Implementação já disponível em thumbnails.ts
import { generateWebP } from './utils/thumbnails'

const webpUrl = await generateWebP(buffer, tenantId, filename)
// Salva em /uploads/{tenantId}/webp/{filename}.webp
```

**Benefícios:**
- 25-35% menor que JPEG
- Suporte moderno de browsers
- Fallback automático para JPEG

### CDN Integration (futuro)

```typescript
// Exemplo: Upload para S3/CloudFlare R2
const cdnUrl = await uploadToCDN(buffer, filename)
db.update(products).set({ imageUrlCdn: cdnUrl })
```

---

## 📚 Referências

- **Sharp:** https://sharp.pixelplumbing.com/
- **react-easy-crop:** https://www.npmjs.com/package/react-easy-crop
- **Docker Volumes:** https://docs.docker.com/storage/volumes/
- **srcSet/sizes:** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#sizes

---

## 📞 Suporte

Para questões sobre o sistema de storage:
1. Verificar logs: `docker logs tagflow-api`
2. Healthcheck: `curl http://localhost:3000/health/storage`
3. Verificar volumes: `docker volume inspect tagflow_uploads_data`
4. Consultar este documento

**Última atualização:** 2026-02-12
