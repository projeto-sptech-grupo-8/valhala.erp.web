# Smoke test: usuarios, perfis, funcionalidades e permissoes
. "$PSScriptRoot\lib.ps1"
Write-Host '[acesso]'
$script:Sessao = New-Sessao
$sufixo = Get-Random -Maximum 99999

$r = Invoke-Api GET '/autorizacoes/funcionalidades'
Assert ($r.Status -eq 200 -and @($r.Body).Count -ge 9) "funcionalidades -> 200 com >= 9 itens (veio $($r.Status), $(@($r.Body).Count))"
Assert ((@($r.Body).codigo) -contains 'USUARIOS_EDITAR') 'catalogo contem USUARIOS_EDITAR'

$r = Invoke-Api GET '/autorizacoes/perfis'
Assert ($r.Status -eq 200 -and (@($r.Body).nome -contains 'Gerente')) "perfis -> 200 com Gerente (veio $($r.Status))"

# perfil
$nomePerfil = "Smoke $sufixo"
$r = Invoke-Api POST '/autorizacoes/perfis' @{ nome = $nomePerfil; descricao = 'teste'; codigosFuncionalidades = @('VISUALIZAR_ESTOQUE') }
Assert ($r.Status -eq 201 -and $r.Body.id) "cria perfil -> 201 (veio $($r.Status))"
$perfilId = $r.Body.id
$r = Invoke-Api POST '/autorizacoes/perfis' @{ nome = $nomePerfil.ToUpper(); descricao = 'dup'; codigosFuncionalidades = @() }
Assert ($r.Status -eq 409) "perfil duplicado (maiusculas) -> 409 (veio $($r.Status))"
$r = Invoke-Api PATCH "/autorizacoes/perfis/$perfilId" @{ descricao = 'alterada' }
Assert ($r.Status -eq 200 -and $r.Body.descricao -eq 'alterada') "atualiza descricao do perfil -> 200 (veio $($r.Status))"
$r = Invoke-Api PUT "/autorizacoes/perfis/$perfilId/funcionalidades/codigos" @('VISUALIZAR_ESTOQUE', 'MOVIMENTAR_ESTOQUE')
Assert ($r.Status -eq 200 -and @($r.Body.codigosFuncionalidades).Count -eq 2) "substitui funcionalidades -> 200 com 2 codigos (veio $($r.Status))"
$r = Invoke-Api PUT "/autorizacoes/perfis/$perfilId/funcionalidades/codigos" @('NAO_EXISTE')
Assert ($r.Status -in 400, 404, 409) "codigo inexistente rejeitado (veio $($r.Status))"

# usuario
$email = "smoke$sufixo@valhalla.local"
$r = Invoke-Api POST '/usuario' @{ nome = 'Smoke User'; email = $email; senha = 'Senha@1234'; nomePerfil = $nomePerfil }
Assert ($r.Status -eq 201 -and $r.Body.idPerfil -eq $perfilId) "cria usuario com nomePerfil -> 201 vinculado ao perfil (veio $($r.Status))"
$userId = $r.Body.id
$r = Invoke-Api POST '/usuario' @{ nome = 'Dup'; email = $email.ToUpper(); senha = 'Senha@1234'; nomePerfil = $nomePerfil }
Assert ($r.Status -eq 409) "email duplicado -> 409 (veio $($r.Status))"
$r = Invoke-Api POST '/usuario' @{ nome = ''; email = 'invalido'; senha = '123'; nomePerfil = $nomePerfil }
Assert ($r.Status -eq 400 -and $r.Body.fieldErrors) "dados invalidos -> 400 com fieldErrors (veio $($r.Status); chaves: $(($r.Body.fieldErrors.PSObject.Properties.Name) -join ','))"

$r = Invoke-Api GET '/usuario'
Assert ($r.Status -eq 200 -and (@($r.Body).email -contains $email)) "lista usuarios contem o novo (veio $($r.Status))"
$r = Invoke-Api GET "/usuario/$userId"
Assert ($r.Status -eq 200 -and $r.Body.nomePerfil -eq $nomePerfil) "obter usuario -> 200 (veio $($r.Status))"

# permissoes / sobrescritas
$r = Invoke-Api PUT "/autorizacoes/usuarios/$userId/sobrescritas-permissao" @{ sobrescritas = @(@{ codigoFuncionalidade = 'USUARIOS_VISUALIZAR'; efeito = 'GRANT' }, @{ codigoFuncionalidade = 'MOVIMENTAR_ESTOQUE'; efeito = 'REVOKE' }) }
Assert ($r.Status -eq 204) "substitui sobrescritas -> 204 (veio $($r.Status))"
$r = Invoke-Api GET "/autorizacoes/usuarios/$userId/permissoes"
$ef = @($r.Body.permissoesEfetivas)
Assert ($r.Status -eq 200 -and ($ef -contains 'USUARIOS_VISUALIZAR') -and -not ($ef -contains 'MOVIMENTAR_ESTOQUE') -and ($ef -contains 'VISUALIZAR_ESTOQUE')) "permissoes efetivas = perfil + GRANT - REVOKE (veio $($ef -join ','))"

# usuario limitado: so o que o perfil + sobrescritas permitem
$limitado = New-Sessao $email 'Senha@1234'
$r = Invoke-Api GET '/usuario' $null $limitado
Assert ($r.Status -eq 200) "limitado com GRANT USUARIOS_VISUALIZAR lista usuarios (veio $($r.Status))"
$r = Invoke-Api GET '/autorizacoes/perfis' $null $limitado
Assert ($r.Status -eq 403) "limitado sem PERFIS_GERENCIAR -> 403 (veio $($r.Status))"
$r = Invoke-Api POST '/usuario' @{ nome = 'X'; email = "x$sufixo@valhalla.local"; senha = 'Senha@1234'; nomePerfil = $nomePerfil } $limitado
Assert ($r.Status -eq 403) "limitado sem USUARIOS_CRIAR -> 403 (veio $($r.Status))"

# inativar / reativar / perfil em uso / exclusao
$r = Invoke-Api PATCH "/usuario/$userId" @{ ativo = $false }
Assert ($r.Status -eq 200 -and $r.Body.ativo -eq $false) "inativa usuario -> 200 ativo=false (veio $($r.Status))"
$r = Invoke-Api POST '/auth/login' @{ email = $email; senha = 'Senha@1234' } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)
Assert ($r.Status -in 401, 403) "usuario inativo nao loga (veio $($r.Status))"
$r = Invoke-Api PATCH "/usuario/$userId" @{ ativo = $true; nomePerfil = 'Atendente' }
Assert ($r.Status -eq 200 -and $r.Body.ativo -and $r.Body.nomePerfil -eq 'Atendente') "reativa e troca perfil -> 200 (veio $($r.Status))"
$r = Invoke-Api PATCH "/usuario/$userId" @{ nomePerfil = $nomePerfil }
$r = Invoke-Api DELETE "/autorizacoes/perfis/$perfilId"
Assert ($r.Status -eq 409) "excluir perfil em uso -> 409 (veio $($r.Status))"
$r = Invoke-Api DELETE "/usuario/$userId"
Assert ($r.Status -eq 204) "exclui usuario -> 204 (veio $($r.Status))"
$r = Invoke-Api GET "/usuario/$userId"
Assert ($r.Status -in 403, 404) "usuario excluido nao e encontrado (veio $($r.Status))"
$r = Invoke-Api DELETE "/autorizacoes/perfis/$perfilId"
Assert ($r.Status -eq 204) "exclui perfil sem uso -> 204 (veio $($r.Status))"

Finish 'acesso'
