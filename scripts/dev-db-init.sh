#!/usr/bin/env bash
set -euo pipefail

for migration in /migrations/*.sql; do
  [ -e "$migration" ] || continue
  echo "Applying migration: $migration"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --file "$migration"
done

echo "Seeding local development data"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --file /seed/seed-dev.sql
