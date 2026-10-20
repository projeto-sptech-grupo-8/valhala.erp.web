# Smoke test: autenticação (login, me, csrf, refresh, logout)
. "$PSScriptRoot\lib.ps1"
Write-Host '[auth]'

$anon = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$r = Invoke-Api POST '/auth/login' @{ email = 'admin@valhalla.local'; senha = 'errada' } $anon
Assert ($r.Status -eq 401) "senha errada -> 401 (veio $($r.Status))"

$alias = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$r = Invoke-Api POST '/auth/login' @{ email = 'admin@valhalla.local'; password = 'Senha@123' } $alias
Assert ($r.Status -eq 200) "campo 'password' aceito via @JsonAlias (veio $($r.Status))"

$r = Invoke-Api GET '/usuario/me' $null $anon
Assert ($r.Status -eq 401) "me sem sessao -> 401 (veio $($r.Status))"

$script:Sessao = New-Sessao
Assert ($null -ne ($script:Sessao.Cookies.GetCookies($script:Base) | Where-Object Name -eq 'XSRF-TOKEN')) 'login entrega cookie XSRF-TOKEN'

$r = Invoke-Api GET '/usuario/me'
Assert ($r.Status -eq 200 -and $r.Body.email -eq 'admin@valhalla.local') "me -> 200 com email do admin (veio $($r.Status))"
Write-Host "       campos de /usuario/me: $(($r.Body.PSObject.Properties.Name) -join ', ')"

$r = Invoke-Api GET '/auth/csrf'
Assert ($r.Status -eq 200 -and $r.Body) "GET /auth/csrf -> 200 (veio $($r.Status))"

# mutacao sem header CSRF e sem Origin deve ser barrada
$r = try { Invoke-WebRequest -Method POST -Uri "$script:Base/auth/refresh" -WebSession $script:Sessao -UseBasicParsing | Out-Null; 200 } catch { [int]$_.Exception.Response.StatusCode }
Known ($r -eq 403) "[backend #1] refresh sem CSRF/Origin -> 403 (veio $r)"

$r = Invoke-Api POST '/auth/refresh'
Assert ($r.Status -eq 200) "refresh com CSRF -> 200 (veio $($r.Status))"
$r = Invoke-Api GET '/usuario/me'
Assert ($r.Status -eq 200) "me apos refresh -> 200 (veio $($r.Status))"

$r = Invoke-Api POST '/auth/logout'
Assert ($r.Status -eq 204) "logout -> 204 (veio $($r.Status))"
$r = Invoke-Api GET '/usuario/me'
Assert ($r.Status -eq 401) "me apos logout -> 401 (veio $($r.Status))"

Finish 'auth'
