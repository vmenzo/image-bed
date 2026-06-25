#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "Usage: $0 /path/to/postgres.sql" >&2
  exit 1
fi

cd /root/image-bed
docker compose exec -T postgres psql -U "${POSTGRES_USER:-imagebed}" -d "${POSTGRES_DB:-imagebed}" < "$1"
