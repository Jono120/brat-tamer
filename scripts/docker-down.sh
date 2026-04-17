#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
docker compose -f "$COMPOSE_FILE" down "$@"
