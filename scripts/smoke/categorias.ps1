# Smoke test: categorias
. "$PSScriptRoot\lib.ps1"
Write-Host '[categorias]'
$script:Sessao = New-Sessao
$sufixo = Get-Random -Maximum 99999
$nome = "Smoke Cat $sufixo"

$r = Invoke-Api POST '/categorias' @{ nome = $nome; descricao = 'teste' }
Assert ($r.Status -eq 201 -and $r.Body.id -and $r.Body.ativo -eq $true) "cria categoria -> 201 ativa (veio $($r.Status))"
$id = $r.Body.id

$r = Invoke-Api POST '/categorias' @{ nome = $nome.ToUpper() }
Assert ($r.Status -eq 409) "nome duplicado (maiusculas) -> 409 (veio $($r.Status))"
$r = Invoke-Api POST '/categorias' @{ nome = '' }
Assert ($r.Status -eq 400 -and $r.Body.fieldErrors.nome) "nome vazio -> 400 com fieldErrors.nome (veio $($r.Status))"

$r = Invoke-Api GET "/categorias?busca=$([uri]::EscapeDataString($nome))"
Assert ($r.Status -eq 200 -and @($r.Body.itens).Count -eq 1 -and $r.Body.totalItens -eq 1) "lista com busca -> 1 item paginado (veio $($r.Status), $(@($r.Body.itens).Count))"
Assert ($null -ne $r.Body.ultima) 'resposta paginada traz ultima/totalPaginas'
$r = Invoke-Api GET '/categorias?tamanho=101'
Assert ($r.Status -eq 400) "tamanho > 100 -> 400 (veio $($r.Status))"

$r = Invoke-Api GET "/categorias/$id"
Assert ($r.Status -eq 200 -and $r.Body.nome -eq $nome) "obter categoria -> 200 (veio $($r.Status))"

$r = Invoke-Api PATCH "/categorias/$id" @{ nome = "$nome editada"; ativo = $false }
Assert ($r.Status -eq 200 -and $r.Body.nome -eq "$nome editada" -and $r.Body.ativo -eq $false) "edita nome e inativa -> 200 (veio $($r.Status))"
$r = Invoke-Api PATCH "/categorias/$id" @{}
Assert ($r.Status -eq 400) "patch vazio -> 400 (veio $($r.Status))"
$r = Invoke-Api GET '/categorias?ativo=false'
Assert ($r.Status -eq 200 -and (@($r.Body.itens).id -contains $id)) "filtro ativo=false contem a inativada (veio $($r.Status))"

# perfil Atendente: so leitura de estoque
$email = "cat$sufixo@valhalla.local"
$r = Invoke-Api POST '/usuario' @{ nome = 'Leitor Cat'; email = $email; senha = 'Senha@1234'; nomePerfil = 'Atendente' }
$leitor = New-Sessao $email 'Senha@1234'
$r = Invoke-Api GET '/categorias' $null $leitor
Assert ($r.Status -eq 200) "Atendente (VISUALIZAR_ESTOQUE) lista -> 200 (veio $($r.Status))"
$r = Invoke-Api POST '/categorias' @{ nome = "Nao pode $sufixo" } $leitor
Assert ($r.Status -eq 403) "Atendente sem GERENCIAR_ESTOQUE cria -> 403 (veio $($r.Status))"

$r = Invoke-Api DELETE "/categorias/$id"
Assert ($r.Status -eq 204) "exclui categoria sem produtos -> 204 (veio $($r.Status))"
$r = Invoke-Api GET "/categorias/$id"
Assert ($r.Status -eq 404) "categoria excluida -> 404 (veio $($r.Status))"

Finish 'categorias'
