# Verificação completa de um módulo (ou de todos). Para no primeiro passo que falhar.
#   powershell -File scripts/gate.ps1            -> roda tudo (regressão completa)
#   powershell -File scripts/gate.ps1 -Modulo auth
# Pré-requisitos: Postgres, API em :8080, `npm run dev` em :5173.
# RESET_DB: caminho de um script que restaura o banco ao estado inicial (opcional, recomendado).
param([string]$Modulo = '*')
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot)

function Step([string]$Nome, [scriptblock]$Cmd) {
  Write-Host "`n== $Nome" -ForegroundColor Cyan
  & $Cmd
  if ($LASTEXITCODE -ne 0) { Write-Host "GATE REPROVADO em: $Nome" -ForegroundColor Red; exit 1 }
}

Step 'build' { npm run build --silent }
Step 'lint'  { npx oxlint src }
if ($env:RESET_DB) { Step 'reset do banco' { & $env:RESET_DB; $global:LASTEXITCODE = 0 } }
foreach ($s in Get-ChildItem "scripts/smoke/$Modulo.ps1" | Where-Object Name -ne 'lib.ps1') {
  Step "smoke API: $($s.BaseName)" { powershell -NoProfile -ExecutionPolicy Bypass -File $s.FullName }
}
if ($env:RESET_DB) { Step 'reset do banco' { & $env:RESET_DB; $global:LASTEXITCODE = 0 } }
$specs = if ($Modulo -eq '*') { @() } else { @("e2e/$Modulo.spec.js") }
Step 'E2E no navegador' { npx playwright test @specs }

Write-Host "`nGATE APROVADO" -ForegroundColor Green
