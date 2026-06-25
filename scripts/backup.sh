#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/root/image-bed"
BACKUP_DIR="${IMAGE_BED_BACKUP_DIR:-/root/image-bed/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${BACKUP_DIR}/${STAMP}"

mkdir -p "${DEST}"
cd "${ROOT_DIR}"

docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-imagebed}" "${POSTGRES_DB:-imagebed}" > "${DEST}/postgres.sql"

if docker volume inspect image-bed_backend_storage >/dev/null 2>&1; then
  docker run --rm -v image-bed_backend_storage:/data -v "${DEST}:/backup" alpine:3.20 sh -c 'tar -C /data -czf /backup/local-storage.tar.gz .'
elif [ -d "${ROOT_DIR}/backend/storage" ]; then
  tar -C "${ROOT_DIR}/backend" -czf "${DEST}/local-storage.tar.gz" storage
fi

sha256sum "${DEST}"/* > "${DEST}/SHA256SUMS"
cat > "${DEST}/manifest.json" <<JSON
{
  "createdAt": "$(date -Is)",
  "path": "${DEST}",
  "postgresSqlBytes": $(wc -c < "${DEST}/postgres.sql"),
  "localStorageArchive": $([ -f "${DEST}/local-storage.tar.gz" ] && echo '"local-storage.tar.gz"' || echo "null"),
  "retentionDays": 14
}
JSON

find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +

echo "Backup written to ${DEST}"
