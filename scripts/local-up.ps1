# Start CareStickers locally (web, Android, and/or iOS).
# Usage: .\scripts\local-up.ps1 [web|android|ios|all] [-- extra args]
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
node scripts/local-up.mjs @args
exit $LASTEXITCODE
