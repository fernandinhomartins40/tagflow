# Tagflow

Plataforma SaaS multi-tenant para gestao de estabelecimentos comerciais (quadras, parques, bares e restaurantes), com PWA e API em Bun.

## Stack
- Bun + Hono + Drizzle ORM
- React + Vite + TypeScript + Tailwind + React Query + Zustand
- PostgreSQL + Docker Compose + Nginx
- Monorepo com TurboRepo

## Estrutura
- `apps/web`: frontend PWA
- `apps/api`: API REST
- `packages/shared-types`: tipos compartilhados
- `packages/utils`: utilitarios compartilhados

## Requisitos
- Bun (ultima estavel)
- Docker + Docker Compose

## Setup local
1. Copie o arquivo `.env.example` para `.env` e ajuste valores.
2. Instale dependencias:
   ```bash
   bun install
   ```
3. Suba o banco e os servicos:
   ```bash
   docker compose up -d db
   ```
4. Rode as migracoes (gera ou aplica via drizzle-kit):
   ```bash
   cd apps/api
   bun run db:generate
   bun run db:push
   ```
5. Seed demo:
   ```bash
   bun run db:seed
   ```
6. Dev mode (monorepo):
   ```bash
   bun run dev
   ```

## Variaveis de ambiente
- `EXTERNAL_PORT`: porta externa usada pelo Nginx
- `DATABASE_URL`: string de conexao com o Postgres
- `JWT_SECRET`: segredo JWT
- `VITE_API_URL`: URL base publica do backend (ex: http://localhost:8080)
- `X-Tenant-Id`: header usado para identificar a empresa (use o UUID da demo no setup)
- `VAPID_PUBLIC_KEY`: chave publica para push notifications
- `VAPID_PRIVATE_KEY`: chave privada para push notifications
- `VAPID_SUBJECT`: email/URL do responsavel pelas notificacoes

## Credenciais demo
- Tenant ID: `11111111-1111-1111-1111-111111111111`
- Email: `admin@tagflow.local`
- Senha: `admin123`

## Docker (stack completa)
```bash
docker compose up --build
```

## Deploy VPS
- Configure `EXTERNAL_PORT` e `JWT_SECRET` no arquivo `.env`.
- Aponte DNS para a VPS.
- Configure TLS no Nginx (certbot ou proxy externo). O arquivo `nginx.conf` ja esta pronto para proxy interno.

## Push notifications
- Gere as chaves VAPID (exemplo com web-push):
  ```bash
  npx web-push generate-vapid-keys
  ```
- Preencha `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VITE_VAPID_PUBLIC_KEY` no `.env`.
- No dashboard admin, clique em "Ativar push" e depois "Enviar teste".

## Observacoes MVP
- Rotas REST usam PostgreSQL com Drizzle ORM e tenant por `x-tenant-id`.
- PWA usa Workbox com cache network-first para `/api` e cache-first para assets.

## RLS (opcional)
Se quiser ativar Row Level Security, aplique a migration `apps/api/drizzle/0003_rls_optional.sql`
e configure sua camada de conexao para enviar `SET app.tenant_id = '<tenant_uuid>';` por request.
