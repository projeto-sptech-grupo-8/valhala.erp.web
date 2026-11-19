# Visão geral de Estoque e Caixa

Atualizado em 18/11/2026. A tela **Início → Visão geral** reúne dois painéis de consulta. **Estoque** responde quais produtos repor e quais lotes verificar. **Caixa** mostra quanto o operador recebeu no turno e quanto deve encontrar na gaveta.

## Navegação e carregamento

O menu lateral mantém uma entrada, **Início**. O cabeçalho contém o contexto da consulta e o botão **Atualizar**. Logo abaixo, os links **Estoque** e **Caixa** seguem o padrão visual de Controle de acesso e Ajustes do caixa. O endereço identifica a aba, inclusive ao recarregar a página ou usar o botão Voltar do navegador.

| Aba | Endereço | Permissão | Consultas ao entrar |
| --- | --- | --- | --- |
| Estoque | `#/dashboard?aba=estoque` | `VISUALIZAR_ESTOQUE` | `GET /dashboard/resumo?meses=6` e `GET /lotes/resumo` |
| Caixa | `#/dashboard?aba=caixa` | `CAIXA_VISUALIZAR` | `GET /caixa/sessoes/atual` |

Na entrada geral, o sistema abre Estoque quando o perfil tem acesso. Se o perfil só puder consultar Caixa, abre Caixa diretamente. Uma aba desconhecida ou sem permissão também leva à primeira disponível. Um perfil sem as duas permissões recebe uma mensagem de acesso.

Somente o painel visível é montado. Trocar de aba cancela as consultas em andamento e inicia as do outro módulo. Retornar a uma aba busca os dados novamente. **Atualizar** consulta as fontes da aba ativa. Trocar o período do gráfico de estoque atualiza o resumo de movimentações e conserva a consulta de validade.

## Estoque do estabelecimento

Os quatro indicadores aparecem antes dos detalhes. O servidor calcula os totais para o estabelecimento autenticado.

| Indicador | Fonte e interpretação |
| --- | --- |
| Estoque crítico | `estoque.criticos`. Produtos ativos com mínimo positivo e saldo abaixo desse mínimo. Já inclui os zerados. |
| Produtos zerados | `estoque.zerados`. Parte do total crítico com saldo menor ou igual a zero. Críticos e zerados ficam vermelhos acima de zero e azuis em zero. |
| Saúde do estoque | `estoque.saudePercentual`. Um saldo saudável alcança ao menos 1,5 vez o mínimo. A base considera os produtos com mínimo definido. Verde a partir de 75%, amarelo de 25% a menos de 75% e vermelho abaixo de 25%. Sem produtos na base, a tela exibe **—**. |
| Lotes vencidos | `vencidos` do resumo de lotes. Conta lotes com saldo, de produtos ativos, cuja validade já passou na data de referência do servidor. |

**Prioridades de reposição.** A lista exibe até cinco alertas na ordem do servidor. A cobertura mostra os produtos com estoque mínimo definido em relação ao total de produtos ativos com estoque, além da quantidade sem mínimo. Entre os produtos com mínimo definido, o bloco no topo apresenta os críticos, os próximos do mínimo e os saudáveis. A faixa intermediária é a diferença entre o total com mínimo e a soma dos críticos e saudáveis. Cada linha identifica produto, saldo atual, mínimo e quantidade que falta para atingi-lo. O rodapé distingue a quantidade exibida do total global. Para confirmar unidades, o frontend consulta os produtos presentes nos alertas e nas cinco últimas movimentações. IDs repetidos são consultados uma vez por carga, com até duas requisições simultâneas. Um item fracionado usa ml. Se a unidade ficar indisponível, a quantidade recebe o rótulo “unidade-base”.

**Validades dos lotes.** O topo mostra o custo dos lotes vencidos (`valorVencido`), o custo dos que vencem de hoje a 30 dias (`valorEmRisco` menos `valorVencido`) e a contagem combinada dessas faixas. O grupo Agir agora destaca vencidos e lotes que vencem até sete dias. Acompanhar reúne as três situações restantes. As cinco opções são clicáveis e mostram a quantidade de lotes. As barras de cada linha usam a maior contagem das cinco faixas como referência. Cada linha abre Validades e lotes com o filtro correspondente. A contagem acima de 30 dias é o total com saldo menos a soma das outras quatro faixas. O rodapé informa o total de lotes com saldo de produtos ativos e a data de referência. Quando as contagens estão completas e há saldo, o controle Ver distribuição revela uma barra com a proporção em atenção, acima de 30 dias e sem validade. Todos os dados usam o resumo de `/lotes/resumo`. Valores ausentes aparecem como **—**.

**Movimentação de estoque.** Barras agrupadas do Recharts comparam a quantidade mensal de lançamentos de entrada e saída. O seletor aceita 3, 6, 9 ou 12 meses. Ao lado do gráfico aparece o mês com mais lançamentos de saída. Em caso de empate, aparece o mês mais recente. O mês corrente pode estar incompleto. O gráfico oferece legenda, valores ao passar o mouse, tabela mensal e exportação CSV da série consultada. As cinco últimas movimentações aparecem com produto, quantidade, unidade, operador e horário, independentemente do período do gráfico.

## Caixa do operador

O cabeçalho identifica o caixa aberto, o operador e a abertura da sessão. Os totais acompanham o turno mesmo quando ele atravessa a meia-noite.

| Indicador | Fonte e interpretação |
| --- | --- |
| Recebido no turno | `resumoAtual.totalVendas`. Soma dos valores aprovados aplicados aos pedidos, inclusive pagamentos parciais. |
| Pedidos com pagamento | `qtdVendas`. Conta pedidos distintos com ao menos um pagamento aprovado. Dividir o pagamento em várias partes mantém uma ocorrência por pedido. |
| Dinheiro esperado | `dinheiroEsperado`. Valor da gaveta calculado pelo servidor. |
| Média recebida por pedido | Total recebido dividido pela quantidade de pedidos com pagamento. Sem base para dividir, a média aparece como **—**. |

**Formas de pagamento.** Barras horizontais mostram dinheiro, Pix, débito e crédito. Cada linha apresenta o valor e, quando o total é positivo, sua participação no recebido. **Ver pedidos** abre a lista filtrada pela sessão.

**Composição da gaveta.** A conferência apresenta o fundo de troco, soma os recebimentos em dinheiro e os reforços e subtrai as sangrias. O total exibido vem do backend. Por exemplo, R$ 100 de fundo, R$ 75 recebidos em dinheiro, R$ 25 de reforço e R$ 10 de sangria resultam em R$ 190 esperados. Pix e cartões entram no recebido do turno e ficam fora da gaveta.

Uma resposta HTTP 204 exibe **Sem turno aberto** e um atalho para Caixa. Uma falha de consulta oferece nova tentativa. Uma sessão aberta sem resumo exibe um aviso de dados indisponíveis. Campos numéricos ausentes usam **—**, preservando o significado do zero confirmado.

**Histórico de pagamentos.** Com turno aberto, a tela lista cinco pedidos por página via `GET /caixa/pedidos`, filtrados por sessão e, opcionalmente, por situação do pedido. A ordem considera a atualização mais recente. O primeiro pedido abre automaticamente. Expandir outro consulta `GET /caixa/pedidos/{id}/pagamentos` apenas para aquele pedido. Cada tentativa mostra a forma, o valor da cobrança, a data do registro e seu estado atual. Um pedido concluído pode reunir uma tentativa cancelada e outra aprovada. Uma falha ao buscar as tentativas oferece nova consulta dentro do próprio histórico.

A cor acompanha o texto da situação. Aprovações ficam verdes, pendências e solicitações em andamento ficam amarelas, cancelamentos confirmados, recusas e expirações ficam vermelhos, e estornos concluídos ficam roxos. Um estado desconhecido recebe cor neutra. A gaveta destaca entradas e retiradas apenas quando há valor movimentado. Em Estoque, entradas usam verde, saídas comuns usam roxo e perdas usam vermelho. O azul identifica indicadores informativos, incluindo alertas com contagem zero.

## Organização do frontend

| Arquivo em `src/pages/dashboard` | Responsabilidade |
| --- | --- |
| `ui/DashboardPage.jsx` | Navegação, permissões e montagem da aba selecionada. |
| `ui/StockOverview.jsx` | Consultas de estoque, KPIs, reposição e movimentações recentes. |
| `ui/ExpirySummary.jsx` e `ui/MovementChart.jsx` | Comparação entre faixas de validade, navegação e série mensal de lançamentos. |
| `ui/CashOverview.jsx` | Contexto da sessão, indicadores de recebimento, formas de pagamento e gaveta. |
| `ui/TurnPayments.jsx` | Lista paginada de pedidos do turno e tentativas de pagamento do pedido expandido. |
| `ui/OverviewControls.jsx` | Botão de atualização no cabeçalho e apresentação comum dos KPIs. |
| `model/dashboardPresentation.js` | Formatação de datas, valores disponíveis, saúde e nomes de formas de pagamento e movimentações. |

O layout usa ícones, cores, componentes de feedback e navegação do painel operacional. Em telas estreitas, os cards se empilham e séries longas podem ser percorridas dentro do gráfico. A única biblioteca de gráficos utilizada é o Recharts já presente no projeto. As comparações simples usam barras CSS com rótulos e valores legíveis.

## Limites dos dados e verificação

O caixa retrata a sessão do operador e o estoque retrata o estabelecimento. Faturamento consolidado por dia ou hora, DRE e vendas por categoria exigem fontes agregadas próprias. A Visão geral usa os contratos operacionais disponíveis. Os dados demonstrativos do Financeiro ficam restritos àquele módulo.

Os testes em `e2e/catalog-remote.spec.js` interceptam a API para verificar permissões, consultas por aba, atualização, totais de caixa, filtragem por validade, exportação e largura em tela móvel. O fluxo de recuperação de falhas também verifica que valores indisponíveis permanecem distinguíveis de um caixa fechado ou um estoque zerado.
