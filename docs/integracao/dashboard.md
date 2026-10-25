# Módulo: dashboard — ✅ aprovado (2026-10-20)

## O que mudou
- O gráfico **Movimentação de estoque · 6 meses** usa `GET /dashboard/resumo` (`serieMensal`) em vez de dados de
  demonstração. O back conta **lançamentos** por mês (não soma quantidades, então não mistura ml e unidades) —
  o cartão indica "nº de lançamentos". O gráfico recarrega quando o histórico muda.
- Indicadores de estoque (crítico, saúde), "Estoque crítico" e "Últimas movimentações" já vinham do catálogo e do
  histórico reais (módulos de produtos e movimentações).
- Faturamento, caixa e formas de pagamento seguem locais: o back marca caixa e financeiro como `INDISPONIVEL`.

## Bug do back encontrado e corrigido (commit separado)
- `GET /dashboard/resumo` dava **500 no PostgreSQL**: a consulta usava `function('year', …)`, que vira `year()` no SQL
  (não existe no PostgreSQL). Os testes do back passavam porque rodam em H2. Trocado por `extract(year from …)` / `extract(month from …)`.

## Gate
| Etapa | Resultado |
|---|---|
| smoke API (`scripts/smoke/dashboard.ps1`) | ✅ 7 verificações (série de 6 meses até o mês atual, contagem de entrada/saída, últimas, alertas, módulos indisponíveis, limite de meses) |
| E2E (`e2e/dashboard.spec.js`) | ✅ série do mês atual, alerta e última movimentação na tela |
| regressão completa | ✅ 30/30 E2E |

## Observação
- A "saúde do estoque" exibida é calculada no front (Estável/Baixo/Crítico/Zerado, regra da seção 7 das regras de
  negócio); o `saudePercentual` do back usa só crítico/zerado e pode diferir.
