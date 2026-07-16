#!/usr/bin/env bash
# Start CareStickers locally (web, Android, and/or iOS).
# Usage: ./scripts/local-up.sh [web|android|ios|all] [-- extra args]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
exec node scripts/local-up.mjs "$@"
