#!/bin/bash
# Script para executar migrations SQL no banco de dados
# Uso: ./scripts/run-migration.sh

set -e

echo "========================================="
echo "  TAGFLOW - EXECUTAR MIGRATIONS"
echo "========================================="
echo ""

# Verificar se o container do DB está rodando
if ! docker ps | grep -q "tagflow-db"; then
  echo "ERRO: Container tagflow-db não está rodando"
  echo "Inicie o ambiente com: docker compose -f docker-compose.vps.yml up -d"
  exit 1
fi

# Listar migrations disponíveis
echo "[1/3] Migrations disponíveis:"
ls -1 apps/api/migrations/*.sql 2>/dev/null || {
  echo "Nenhuma migration encontrada em apps/api/migrations/"
  exit 1
}

echo ""
echo "[2/3] Executando migrations..."

# Executar cada migration SQL
for migration in apps/api/migrations/*.sql; do
  echo "  → Executando: $(basename "$migration")"
  docker exec -i tagflow-db psql -U postgres -d tagflow < "$migration"

  if [ $? -eq 0 ]; then
    echo "    ✓ Sucesso"
  else
    echo "    ✗ Falha"
    exit 1
  fi
done

echo ""
echo "[3/3] Verificando schema atualizado..."

# Verificar se as colunas foram criadas
docker exec tagflow-db psql -U postgres -d tagflow -c "
  SELECT
    table_name,
    column_name,
    data_type
  FROM information_schema.columns
  WHERE table_name IN ('products', 'services', 'locations')
    AND column_name LIKE 'image_url%'
  ORDER BY table_name, column_name;
"

echo ""
echo "========================================="
echo "  Migrations executadas com sucesso!"
echo "========================================="
