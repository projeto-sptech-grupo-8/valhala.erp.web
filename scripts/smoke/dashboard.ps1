# Smoke test: resumo do dashboard
. "$PSScriptRoot\lib.ps1"
Write-Host '[dashboard]'
$script:Sessao = New-Sessao
$sufixo = Get-Random -Maximum 99999

$antes = (Invoke-Api GET '/dashboard/resumo?meses=6').Body
$mesAtual = (Get-Date).ToString('yyyy-MM')
$serieAntes = @($antes.movimentacoes.serieMensal) | Where-Object mes -eq $mesAtual

$cat = (Invoke-Api POST '/categorias' @{ nome = "Smoke Dash $sufixo" }).Body
$p = (Invoke-Api POST '/produtos' @{ nome = "Dash $sufixo"; categoriaId = $cat.id; unidadeMedida = 'un'; precoVenda = 10; precoCusto = 5; tipo = 'PADRAO'; estoqueMinimo = 10; quantidadeInicial = 3 }).Body
$null = Invoke-Api POST '/movimentacoes-estoque' @{ produtoId = $p.id; tipo = 'SAIDA'; quantidade = 1 }

$r = Invoke-Api GET '/dashboard/resumo?meses=6'
Assert ($r.Status -eq 200) "resumo -> 200 (veio $($r.Status))"
$serie = @($r.Body.movimentacoes.serieMensal)
Assert ($serie.Count -eq 6 -and $serie[-1].mes -eq $mesAtual) "serie com 6 meses terminando no mes atual (veio $($serie.Count), ultimo $($serie[-1].mes))"
$atual = $serie[-1]
Assert ($atual.entradas -eq $serieAntes.entradas + 1 -and $atual.saidas -eq $serieAntes.saidas + 1) "serie conta +1 entrada (inicial) e +1 saida (veio $($atual.entradas)/$($atual.saidas))"
Assert ((@($r.Body.movimentacoes.ultimas)[0]).produtoId -eq $p.id) 'ultima movimentacao e a saida recem-criada'
Assert ((@($r.Body.estoque.alertas).produtoId) -contains $p.id) 'produto abaixo do minimo aparece nos alertas'
Assert ($r.Body.caixa.status -eq 'INDISPONIVEL' -and $r.Body.financeiro.status -eq 'INDISPONIVEL') 'caixa e financeiro sinalizados como indisponiveis'
$r = Invoke-Api GET '/dashboard/resumo?meses=25'
Assert ($r.Status -eq 400) "meses > 24 -> 400 (veio $($r.Status))"

Finish 'dashboard'
