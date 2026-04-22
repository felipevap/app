param(
  [switch] $SkipMigrate
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

if (-not $SkipMigrate) {
  Write-Host "1) Migrando base de dados (precisa MySQL acessivel via DATABASE_URL no .env)..."
  npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) {
    Write-Host "   Falhou: ligue o MySQL ou corrija DATABASE_URL. Pode ignorar com: .\scripts\setup-desktop-release.ps1 -SkipMigrate"
    exit $LASTEXITCODE
  }
  Write-Host "   Migracao OK."
} else {
  Write-Host "1) Migracao ignorada (-SkipMigrate)."
}

Write-Host "2) Instalando dependencias do app desktop..."
npm run desktop:install

Write-Host "3) Build instalador Windows (defina PORTAL_GARAGE_APP_URL se nao for localhost)..."
if (-not $env:PORTAL_GARAGE_APP_URL) {
  $env:PORTAL_GARAGE_APP_URL = "http://localhost:3000"
  Write-Host "   PORTAL_GARAGE_APP_URL=$env:PORTAL_GARAGE_APP_URL (altere para producao antes de distribuir)"
}
npm run desktop:dist:win

Write-Host ""
Write-Host "Artefactos em: garage-desktop\dist\"
Write-Host "No Mac, na pasta do projeto: export PORTAL_GARAGE_APP_URL=https://SEU_DOMINIO && npm run desktop:dist:mac"
Write-Host "Depois suba os ficheiros para o CDN e defina DESKTOP_RELEASES_JSON no .env / Vercel com windowsUrl e macUrl."
