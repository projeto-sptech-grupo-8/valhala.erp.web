# Helpers dos smoke tests de API. Uso: . "$PSScriptRoot\lib.ps1"
$ErrorActionPreference = 'Stop'
$script:Base = if ($env:API_URL) { $env:API_URL } else { 'http://localhost:8080' }
$script:Origin = if ($env:FRONTEND_URL) { $env:FRONTEND_URL } else { 'http://localhost:5173' }
$script:Falhas = 0

function Invoke-Api([string]$Method, [string]$Path, $Body = $null, [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $script:Sessao) {
  $headers = @{ Origin = $script:Origin }
  $csrf = $Session.Cookies.GetCookies($script:Base) | Where-Object Name -eq 'XSRF-TOKEN'
  if ($csrf) { $headers['X-XSRF-TOKEN'] = $csrf.Value }
  $params = @{ Method = $Method; Uri = "$script:Base$Path"; WebSession = $Session; Headers = $headers; UseBasicParsing = $true }
  if ($null -ne $Body) { $params.Body = (ConvertTo-Json -InputObject $Body -Depth 10); $params.ContentType = 'application/json; charset=utf-8' }
  try {
    $r = Invoke-WebRequest @params
    $json = if ($r.Content) { try { $r.Content | ConvertFrom-Json } catch { $null } } else { $null }
    return [pscustomobject]@{ Status = [int]$r.StatusCode; Body = $json }
  } catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    if (-not $resp) { throw }
    $txt = (New-Object IO.StreamReader($resp.GetResponseStream())).ReadToEnd()
    $json = try { $txt | ConvertFrom-Json } catch { $null }
    return [pscustomobject]@{ Status = [int]$resp.StatusCode; Body = $json }
  }
}

function New-Sessao([string]$Email = 'admin@valhalla.local', [string]$Senha = 'Senha@123') {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $r = Invoke-Api POST '/auth/login' @{ email = $Email; senha = $Senha } $s
  if ($r.Status -ne 200) { throw "login falhou para $Email ($($r.Status))" }
  return $s
}

function Assert([bool]$Cond, [string]$Desc) {
  if ($Cond) { Write-Host "  OK   $Desc" -ForegroundColor Green }
  else { Write-Host "  FAIL $Desc" -ForegroundColor Red; $script:Falhas++ }
}

function Finish([string]$Modulo) {
  if ($script:Falhas -gt 0) { Write-Host "[$Modulo] $($script:Falhas) falha(s)" -ForegroundColor Red; exit 1 }
  Write-Host "[$Modulo] tudo OK" -ForegroundColor Green; exit 0
}

# Bug conhecido do backend: registra sem reprovar o modulo (rastreado em docs/integracao/achados-backend.md)
function Known([bool]$Cond, [string]$Desc) {
  if ($Cond) { Write-Host "  OK   $Desc (bug conhecido parece corrigido: remover Known)" -ForegroundColor Green }
  else { Write-Host "  KNOWN $Desc" -ForegroundColor Yellow }
}
