#!/bin/bash
# Script para fazer backup manual do storage
# Uso: ./scripts/backup-storage.sh

set -e

echo "========================================="
echo "  TAGFLOW - BACKUP DE STORAGE"
echo "========================================="
echo ""

# Verificar se está na raiz do projeto
if [ ! -f "docker-compose.vps.yml" ]; then
  echo "ERRO: Execute este script a partir da raiz do projeto"
  exit 1
fi

# Criar diretório de backups se não existir
mkdir -p backups

# Executar backup usando o serviço do Docker Compose
echo "[1/3] Iniciando serviço de backup..."
docker compose -f docker-compose.vps.yml --profile backup up backup

echo ""
echo "[2/3] Listando backups disponíveis:"
ls -lh backups/uploads_*.tar.gz 2>/dev/null || echo "Nenhum backup encontrado"

echo ""
echo "[3/3] Backup concluído!"
echo ""
echo "========================================="
echo "  Para restaurar um backup:"
echo "  ./scripts/restore-storage.sh backups/uploads_YYYYMMDD_HHMMSS.tar.gz"
echo "========================================="
