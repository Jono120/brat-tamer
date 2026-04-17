#!/usr/bin/env bash
# Build images and start PostgreSQL + CareStickers API (production bundle).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

echo "==> Building images..."
docker compose -f "$COMPOSE_FILE" build

echo "==> Starting services (database init runs on first empty volume)..."
docker compose -f "$COMPOSE_FILE" up -d

APP_PORT="${APP_PORT:-3001}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

echo ""
echo "CareStickers is up."
echo "  Web + API:  http://localhost:${APP_PORT}"
echo "  PostgreSQL: localhost:${POSTGRES_PORT}  (user/db: care / carestickers)"
echo ""
echo "Logs: docker compose logs -f app"
echo "Stop: docker compose down"
