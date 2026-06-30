#!/usr/bin/env bash
# One-shot local database setup. Safe to re-run.
#   1. Starts the Postgres container (docker-compose.yml)
#   2. Creates loon_dev and loon_test if missing
#   3. Seeds apps/backend/.env from .env.example on first run
#   4. Applies migrations to both databases
set -euo pipefail
cd "$(dirname "$0")/.."

CONTAINER=loon-pg
DEV_DB=loon_dev
TEST_DB=loon_test

docker compose up -d --wait

for db in "$DEV_DB" "$TEST_DB"; do
  if docker exec "$CONTAINER" psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1; then
    echo "✓ $db already exists"
  else
    docker exec "$CONTAINER" createdb -U postgres "$db"
    echo "✓ created $db"
  fi
done

if [ ! -f apps/backend/.env ]; then
  cp apps/backend/.env.example apps/backend/.env
  echo "✓ created apps/backend/.env from .env.example (edit in real Clerk dev keys for auth)"
fi

# prisma.config.ts loads .env via dotenv, which never overrides an already-set
# env var — so exporting DATABASE_URL here wins over the .env value for loon_test.
echo "→ migrating $DEV_DB"
npm run --silent migrate -w apps/backend
echo "→ migrating $TEST_DB"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/$TEST_DB" \
  npm run --silent migrate -w apps/backend

echo "✔ local databases ready"
