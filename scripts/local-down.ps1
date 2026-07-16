# Stop all local CareStickers instances.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
node scripts/local-down.mjs
exit $LASTEXITCODE
