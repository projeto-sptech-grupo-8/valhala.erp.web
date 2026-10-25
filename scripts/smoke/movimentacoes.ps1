# Smoke test: movimentacoes de estoque (entrada, saida, ajustes, perda, saida de drink)
. "$PSScriptRoot\lib.ps1"
Write-Host '[movimentacoes]'
$script:Sessao = New-Sessao
$sufixo = Get-Random -Maximum 99999
function Saldo($id) { [decimal](Invoke-Api GET "/produtos/$id").Body.quantidadeEstoque }

$cat = (Invoke-Api POST '/categorias' @{ nome = "Smoke Mov $sufixo" }).Body
$gin = (Invoke-Api POST '/produtos' @{ nome = "Gin $sufixo"; categoriaId = $cat.id; unidadeMedida = 'garrafa'; precoVenda = 120; precoCusto = 80; tipo = 'PADRAO'; fracionado = $true; volumeEmbalagemMl = 750; quantidadeInicial = 1500 }).Body
$tonica = (Invoke-Api POST '/produtos' @{ nome = "Tonica $sufixo"; categoriaId = $cat.id; unidadeMedida = 'un'; precoVenda = 6; precoCusto = 3; tipo = 'PADRAO'; fracionado = $false; volumeEmbalagemMl = 350; quantidadeInicial = 3 }).Body
$drink = (Invoke-Api POST '/produtos' @{ nome = "Gin Tonica $sufixo"; categoriaId = $cat.id; unidadeMedida = 'copo'; precoVenda = 35; tipo = 'DRINK' }).Body
$null = Invoke-Api PUT "/drinks/$($drink.id)/receita" @{ ingredientes = @(@{ produtoId = $gin.id; quantidade = 60; unidadeConsumo = 'ML' }, @{ produtoId = $tonica.id; quantidade = 1; unidadeConsumo = 'UN' }) }

$r = Invoke-Api GET "/movimentacoes-estoque?produtoId=$($gin.id)&tipo=ENTRADA_INICIAL"
Assert ($r.Status -eq 200 -and $r.Body.totalItens -eq 1) "cadastro com saldo gera ENTRADA_INICIAL (veio $($r.Body.totalItens))"

$r = Invoke-Api POST '/movimentacoes-estoque' @{ produtoId = $gin.id; tipo = 'ENTRADA'; quantidade = 750; lote = "L-$sufixo"; numeroNotaFiscal = "NF-$sufixo"; motivo = 'compra' }
Assert ($r.Status -eq 201 -and $r.Body.saldoAnterior -eq 1500 -and $r.Body.saldoPosterior -eq 2250 -and $r.Body.lote -eq "L-$sufixo") "ENTRADA com lote/NF -> 201, saldo 1500 -> 2250 (veio $($r.Status))"
Assert ($r.Body.usuarioNome -eq 'Administrador Inicial') "registra o responsavel (veio $($r.Body.usuarioNome))"

$r = Invoke-Api POST '/movimentacoes-estoque' @{ produtoId = $gin.id; tipo = 'SAIDA'; quantidade = 100 }
Assert ($r.Status -eq 201 -and (Saldo $gin.id) -eq 2150) "SAIDA -> saldo 2150 (veio $($r.Status))"
$r = Invoke-Api POST '/movimentacoes-estoque' @{ produtoId = $gin.id; tipo = 'SAIDA'; quantidade = 999999 }
Assert ($r.Status -in 400, 409, 422 -and (Saldo $gin.id) -eq 2150) "SAIDA acima do saldo rejeitada e saldo intacto (veio $($r.Status))"
$r = Invoke-Api POST '/movimentacoes-estoque' @{ produtoId = $gin.id; tipo = 'AJUSTE_POSITIVO'; quantidade = 50; motivo = 'contagem' }
Assert ($r.Status -eq 201 -and (Saldo $gin.id) -eq 2200) "AJUSTE_POSITIVO -> 2200 (veio $($r.Status))"
$r = Invoke-Api POST '/movimentacoes-estoque' @{ produtoId = $gin.id; tipo = 'AJUSTE_NEGATIVO'; quantidade = 200; motivo = 'contagem' }
Assert ($r.Status -eq 201 -and (Saldo $gin.id) -eq 2000) "AJUSTE_NEGATIVO -> 2000 (veio $($r.Status))"
$r = Invoke-Api POST '/movimentacoes-estoque' @{ produtoId = $gin.id; tipo = 'PERDA'; quantidade = 500; motivo = 'Vencimento' }
Assert ($r.Status -eq 201 -and (Saldo $gin.id) -eq 1500) "PERDA -> 1500 (veio $($r.Status))"
$r = Invoke-Api POST '/movimentacoes-estoque' @{ produtoId = $gin.id; tipo = 'ENTRADA'; quantidade = 0 }
Assert ($r.Status -eq 400) "quantidade zero -> 400 (veio $($r.Status))"
$r = Invoke-Api POST '/movimentacoes-estoque' @{ produtoId = $gin.id; tipo = 'SAIDA_DRINK'; quantidade = 60 }
Assert ($r.Status -eq 400) "SAIDA_DRINK so pelo endpoint proprio -> 400 (veio $($r.Status))"

# saida de drink: baixa ML do fracionado e UN do outro, numa transacao
$r = Invoke-Api POST '/movimentacoes-estoque/saida-drink' @{ drinkId = $drink.id; quantidade = 2; motivo = 'venda' }
Assert ($r.Status -eq 201 -and @($r.Body).Count -eq 2) "saida-drink x2 -> 201 com 2 movimentacoes (veio $($r.Status))"
Assert ((Saldo $gin.id) -eq 1380 -and (Saldo $tonica.id) -eq 1) "gin 1500-120=1380 ml, tonica 3-2=1 un (veio $(Saldo $gin.id), $(Saldo $tonica.id))"
$r = Invoke-Api POST '/movimentacoes-estoque/saida-drink' @{ drinkId = $drink.id; quantidade = 2 }
Assert ($r.Status -in 400, 409, 422) "saida-drink sem tonica suficiente rejeitada (veio $($r.Status))"
Assert ((Saldo $gin.id) -eq 1380 -and (Saldo $tonica.id) -eq 1) "nada baixado quando um insumo falta (atomico) (veio $(Saldo $gin.id), $(Saldo $tonica.id))"

# listagem
$r = Invoke-Api GET "/movimentacoes-estoque?produtoId=$($gin.id)&tamanho=100"
Assert ($r.Status -eq 200 -and $r.Body.totalItens -eq 7) "historico do gin tem 7 movimentacoes (veio $($r.Body.totalItens))"
$tipos = @($r.Body.itens).tipo
Assert ($tipos[0] -eq 'SAIDA_DRINK') "ordenado do mais recente (primeiro = $($tipos[0]))"
$hoje = (Get-Date).ToString('yyyy-MM-dd')
$r = Invoke-Api GET "/movimentacoes-estoque?produtoId=$($gin.id)&dataInicial=$hoje&dataFinal=$hoje"
Assert ($r.Status -eq 200 -and $r.Body.totalItens -eq 7) "filtro de data (hoje) -> 7 (veio $($r.Body.totalItens))"

# permissoes: perfil so com VISUALIZAR_ESTOQUE nao movimenta
$perfil = "Leitor Mov $sufixo"
$null = Invoke-Api POST '/autorizacoes/perfis' @{ nome = $perfil; codigosFuncionalidades = @('VISUALIZAR_ESTOQUE') }
$email = "mov$sufixo@valhalla.local"
$null = Invoke-Api POST '/usuario' @{ nome = 'Leitor Mov'; email = $email; senha = 'Senha@1234'; nomePerfil = $perfil }
$leitor = New-Sessao $email 'Senha@1234'
$r = Invoke-Api GET '/movimentacoes-estoque' $null $leitor
Assert ($r.Status -eq 200) "leitor lista movimentacoes -> 200 (veio $($r.Status))"
$r = Invoke-Api POST '/movimentacoes-estoque' @{ produtoId = $gin.id; tipo = 'SAIDA'; quantidade = 1 } $leitor
Assert ($r.Status -eq 403) "leitor sem MOVIMENTAR_ESTOQUE -> 403 (veio $($r.Status))"

Finish 'movimentacoes'
