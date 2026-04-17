# Build images and start PostgreSQL + CareStickers API (production bundle).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$ComposeFile = if ($env:COMPOSE_FILE) { $env:COMPOSE_FILE } else { "docker-compose.yml" }

Write-Host "==> Building images..."
docker compose -f $ComposeFile build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Starting services (database init runs on first empty volume)..."
docker compose -f $ComposeFile up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$AppPort = if ($env:APP_PORT) { $env:APP_PORT } else { "3001" }
$PgPort = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5432" }

Write-Host ""
Write-Host "CareStickers is up."
Write-Host "  Web + API:  http://localhost:$AppPort"
Write-Host "  PostgreSQL: localhost:$PgPort  (user/db: care / carestickers)"
Write-Host ""
Write-Host "Logs: docker compose logs -f app"
Write-Host "Stop: docker compose down"
