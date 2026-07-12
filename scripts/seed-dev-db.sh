#!/usr/bin/env bash
set -euo pipefail

docker compose up -d postgres
docker compose exec -T postgres psql \
  -v ON_ERROR_STOP=1 \
  --username "${POSTGRES_USER:-sorjordet}" \
  --dbname "${POSTGRES_DB:-sorjordet}" \
  --file /seed/seed-dev.sql
