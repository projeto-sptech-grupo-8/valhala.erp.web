# Smoke test: produtos (padrao, fracionado, drink) e receitas
. "$PSScriptRoot\lib.ps1"
Write-Host '[produtos]'
$script:Sessao = New-Sessao
$sufixo = Get-Random -Maximum 99999

$cat = (Invoke-Api POST '/categorias' @{ nome = "Smoke Prod $sufixo" }).Body
Assert ($null -ne $cat.id) 'categoria de apoio criada'

# padrao nao fracionado
$r = Invoke-Api POST '/produtos' @{ nome = "Red Bull $sufixo"; categoriaId = $cat.id; unidadeMedida = 'un'; precoVenda = 12.9; precoCusto = 8; tipo = 'PADRAO'; fracionado = $false; volumeEmbalagemMl = 250; estoqueMinimo = 10; quantidadeInicial = 24 }
Assert ($r.Status -eq 201 -and $r.Body.sku -and $r.Body.quantidadeEstoque -eq 24) "cria padrao -> 201 com SKU gerado e saldo 24 (veio $($r.Status), sku=$($r.Body.sku))"
$redbull = $r.Body
Assert ([math]::Round($redbull.margemPercentual, 1) -eq 38.0) "margem calculada pelo back = 38% (veio $($redbull.margemPercentual))"

# padrao fracionado: saldo em ML
$r = Invoke-Api POST '/produtos' @{ nome = "Vodka $sufixo"; categoriaId = $cat.id; unidadeMedida = 'garrafa'; precoVenda = 84; precoCusto = 58; tipo = 'PADRAO'; fracionado = $true; volumeEmbalagemMl = 750; estoqueMinimo = 1500; quantidadeInicial = 3750 }
Assert ($r.Status -eq 201 -and $r.Body.quantidadeEstoque -eq 3750 -and $r.Body.fracionado) "cria fracionado -> saldo em ML (3750) (veio $($r.Status), $($r.Body.quantidadeEstoque))"
$vodka = $r.Body

# validacoes
$r = Invoke-Api POST '/produtos' @{ nome = "Sem volume $sufixo"; categoriaId = $cat.id; unidadeMedida = 'garrafa'; precoVenda = 10; tipo = 'PADRAO'; fracionado = $true }
Assert ($r.Status -eq 400) "fracionado sem volume -> 400 (veio $($r.Status))"
$r = Invoke-Api POST '/produtos' @{ nome = "Preco zero $sufixo"; categoriaId = $cat.id; unidadeMedida = 'un'; precoVenda = 0; tipo = 'PADRAO' }
Assert ($r.Status -eq 400 -and $r.Body.fieldErrors.precoVenda) "preco zero -> 400 fieldErrors.precoVenda (veio $($r.Status))"
$r = Invoke-Api POST '/produtos' @{ nome = "Sem cat $sufixo"; unidadeMedida = 'un'; precoVenda = 5; tipo = 'PADRAO' }
Assert ($r.Status -eq 400 -and $r.Body.fieldErrors.categoriaId) "sem categoria -> 400 fieldErrors.categoriaId (veio $($r.Status))"

# drink + receita (ML para fracionado, UN para nao fracionado)
$r = Invoke-Api POST '/produtos' @{ nome = "Vodka Energy $sufixo"; categoriaId = $cat.id; unidadeMedida = 'copo'; precoVenda = 32; tipo = 'DRINK' }
Assert ($r.Status -eq 201 -and $r.Body.tipo -eq 'DRINK') "cria drink -> 201 (veio $($r.Status))"
$drink = $r.Body
$r = Invoke-Api POST '/produtos' @{ nome = "Drink com estoque $sufixo"; categoriaId = $cat.id; unidadeMedida = 'copo'; precoVenda = 32; tipo = 'DRINK'; quantidadeInicial = 5 }
Assert ($r.Status -eq 400) "drink com saldo proprio -> 400 (veio $($r.Status))"

$receita = @{ ingredientes = @(@{ produtoId = $vodka.id; quantidade = 50; unidadeConsumo = 'ML' }, @{ produtoId = $redbull.id; quantidade = 1; unidadeConsumo = 'UN' }) }
$r = Invoke-Api PUT "/drinks/$($drink.id)/receita" $receita
Assert ($r.Status -in 200, 204) "salva receita ML + UN -> 2xx (veio $($r.Status))"
$r = Invoke-Api GET "/drinks/$($drink.id)/receita"
Assert ($r.Status -eq 200 -and @($r.Body).Count -eq 2) "le receita -> 2 ingredientes (veio $($r.Status), $(@($r.Body).Count))"
$r = Invoke-Api PUT "/drinks/$($drink.id)/receita" @{ ingredientes = @(@{ produtoId = $redbull.id; quantidade = 50; unidadeConsumo = 'ML' }) }
Assert ($r.Status -eq 400) "ML em insumo nao fracionado -> 400 (veio $($r.Status))"
$r = Invoke-Api PUT "/drinks/$($drink.id)/receita" @{ ingredientes = @() }
Assert ($r.Status -eq 400) "receita vazia -> 400 (veio $($r.Status))"

# listagem e filtros
$r = Invoke-Api GET "/produtos?categoriaId=$($cat.id)&tamanho=100"
Assert ($r.Status -eq 200 -and $r.Body.totalItens -eq 3) "lista por categoria -> 3 (veio $($r.Status), $($r.Body.totalItens))"
$r = Invoke-Api GET "/produtos?categoriaId=$($cat.id)&tipo=DRINK"
Assert ($r.Status -eq 200 -and $r.Body.totalItens -eq 1) "filtro tipo=DRINK -> 1 (veio $($r.Body.totalItens))"
$r = Invoke-Api GET "/produtos?busca=$($redbull.sku)"
Assert ($r.Status -eq 200 -and @($r.Body.itens).id -contains $redbull.id) "busca por SKU encontra (veio $($r.Status))"

# edicao
$r = Invoke-Api PATCH "/produtos/$($redbull.id)" @{ precoVenda = 13.9; estoqueMinimo = 12 }
Assert ($r.Status -eq 200 -and $r.Body.precoVenda -eq 13.9 -and $r.Body.estoqueMinimo -eq 12) "edita preco e minimo -> 200 (veio $($r.Status))"
$r = Invoke-Api PATCH "/produtos/$($vodka.id)" @{ volumeEmbalagemMl = 1000 }
Assert ($r.Status -eq 400) "mudar volume de produto com estoque -> 400 (veio $($r.Status))"
$r = Invoke-Api PATCH "/produtos/$($redbull.id)" @{ quantidadeEstoque = 999 }
Assert ($r.Status -eq 400 -or ($r.Status -eq 200 -and $r.Body.quantidadeEstoque -eq 24)) "saldo nao muda pela edicao (veio $($r.Status), $($r.Body.quantidadeEstoque))"

# permissao: Atendente so le
$email = "prod$sufixo@valhalla.local"
$null = Invoke-Api POST '/usuario' @{ nome = 'Leitor Prod'; email = $email; senha = 'Senha@1234'; nomePerfil = 'Atendente' }
$leitor = New-Sessao $email 'Senha@1234'
$r = Invoke-Api GET '/produtos' $null $leitor
Assert ($r.Status -eq 200) "Atendente lista produtos -> 200 (veio $($r.Status))"
$r = Invoke-Api POST '/produtos' @{ nome = "X $sufixo"; categoriaId = $cat.id; unidadeMedida = 'un'; precoVenda = 5; tipo = 'PADRAO' } $leitor
Assert ($r.Status -eq 403) "Atendente cria produto -> 403 (veio $($r.Status))"

# exclusao
$r = Invoke-Api DELETE "/categorias/$($cat.id)"
Assert ($r.Status -eq 409) "excluir categoria com produtos -> 409 (veio $($r.Status))"
$r = Invoke-Api DELETE "/produtos/$($redbull.id)"
Assert ($r.Status -eq 409) "excluir produto com movimentacao inicial -> 409 (veio $($r.Status))"

Finish 'produtos'
