#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "Usage: $0 /path/to/postgres.sql" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${ROOT_DIR}"
docker compose exec -T postgres psql -U "${POSTGRES_USER:-picvault}" -d "${POSTGRES_DB:-picvault}" < "$1"
