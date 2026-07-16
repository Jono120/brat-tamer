#!/usr/bin/env bash
# Stop all local CareStickers instances.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
exec node scripts/local-down.mjs
