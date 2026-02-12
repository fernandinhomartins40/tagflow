#!/bin/bash
# Script para restaurar backup do storage
# Uso: ./scripts/restore-storage.sh backups/uploads_20260212_120000.tar.gz

set -e

BACKUP_FILE="$1"

echo "========================================="
echo "  TAGFLOW - RESTORE DE STORAGE"
echo "========================================="
echo ""

# Validar parâmetro
if [ -z "$BACKUP_FILE" ]; then
  echo "ERRO: Especifique o arquivo de backup"
  echo "Uso: ./scripts/restore-storage.sh backups/uploads_YYYYMMDD_HHMMSS.tar.gz"
  echo ""
  echo "Backups disponíveis:"
  ls -lh backups/uploads_*.tar.gz 2>/dev/null || echo "Nenhum backup encontrado"
  exit 1
fi

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERRO: Arquivo não encontrado: $BACKUP_FILE"
  exit 1
fi

# Confirmar restauração
echo "ATENÇÃO: Esta operação irá SUBSTITUIR todos os arquivos atuais do storage!"
echo "Arquivo de backup: $BACKUP_FILE"
echo "Tamanho: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""
read -p "Deseja continuar? (digite 'sim' para confirmar): " CONFIRM

if [ "$CONFIRM" != "sim" ]; then
  echo "Operação cancelada."
  exit 0
fi

echo ""
echo "[1/3] Parando serviço API..."
docker compose -f docker-compose.vps.yml stop api

echo ""
echo "[2/3] Restaurando backup..."
docker run --rm \
  -v tagflow_uploads_data:/data \
  -v "$(pwd)/$BACKUP_FILE:/backup.tar.gz:ro" \
  alpine:latest \
  sh -c 'rm -rf /data/* && tar xzf /backup.tar.gz -C / && echo "Restore completed successfully"'

echo ""
echo "[3/3] Reiniciando serviço API..."
docker compose -f docker-compose.vps.yml start api

echo ""
echo "========================================="
echo "  Restore concluído com sucesso!"
echo "  Aguarde o healthcheck da API..."
echo "========================================="
echo ""
docker compose -f docker-compose.vps.yml ps api
