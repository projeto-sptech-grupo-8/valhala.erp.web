# Módulo: movimentações de estoque — ✅ aprovado (2026-10-20)

## O que passou a ir para o back
Toda ação que mexe no saldo agora é registrada em `/movimentacoes-estoque`:

| Origem na interface | Tipo no back |
|---|---|
| Movimentações › Entrada (lote e NF-e) | `ENTRADA` |
| Movimentações › Saída (consumo, devolução, outro) | `SAIDA` |
| Movimentações › Saída por perda/quebra/vencimento · Validades › baixa de lote vencido | `PERDA` |
| Movimentações › Ajuste (+/−) · Inventário aprovado | `AJUSTE_POSITIVO` / `AJUSTE_NEGATIVO` |
| Caixa › venda de produto | `SAIDA` |
| Caixa › venda de drink | `/saida-drink` → `SAIDA_DRINK` por ingrediente (transacional no back) |
| Entrada por XML da NF-e | `ENTRADA` por item (com nº da NF e lote) |

O histórico (`Movimentações`, dashboard) vem do back: as 300 movimentações mais recentes, convertidas para embalagens.

## Como evita estado inconsistente (`store.jsx › espelhado`)
1. A ação roda primeiro no front (FEFO, lotes, validação de saldo) — erros de validação aparecem sem chamar a API.
2. As movimentações geradas são enviadas na ordem em que ocorreram (quantidade em ml para fracionado).
3. Se uma falhar, as que já foram aceitas são **estornadas por ajuste** (`Estorno automático da movimentação #N`)
   e o estado local volta ao anterior: a operação acontece inteira ou não acontece (inclusive a venda).
   Se o próprio estorno falhar, a mensagem de erro lista os ids para revisão manual.
4. Em sucesso, catálogo e histórico são recarregados do back.
- Caixa: proteção contra duplo clique em "Finalizar venda" enquanto a API responde.

## Permissões alinhadas ao back
- Registrar movimentação, baixar lote vencido e criar inventário: `MOVIMENTAR_ESTOQUE` (antes era pelo nome do perfil).
- Páginas Movimentações, Validades, Inventário: `VISUALIZAR_ESTOQUE`; Entrada por XML: `MOVIMENTAR_ESTOQUE`.
- Caixa continua pelo perfil: o back não tem funcionalidade de caixa.

## Gate
| Etapa | Resultado |
|---|---|
| smoke API (`scripts/smoke/movimentacoes.ps1`) | ✅ 19 verificações (entrada inicial, entrada com lote/NF, saída, saldo insuficiente, ajustes, perda, saída de drink ML+UN, atomicidade do drink, ordenação, filtro de data, 403) |
| E2E (`e2e/movimentacoes.spec.js`) | ✅ 6/6 — entrada · perda + ajuste · saldo insuficiente · venda (produto + drink) · **falha no meio da venda com estorno** |
| regressão completa | ✅ 29/29 E2E |

## Sem E2E dedicado (usam o mesmo mecanismo testado acima)
- Entrada por XML da NF-e, aprovação de inventário e baixa de lote em Validades.
  Lotes/validade e setor (`local`) são dados só do navegador, então esses fluxos dependem de dados locais.

## Limitações
- O lote é enviado na entrada, mas o **saldo por lote/validade (FEFO) continua só no navegador**: o back guarda o lote
  na movimentação, não um saldo por lote.
- O custo médio ponderado calculado na entrada não é enviado (o back não recebe custo na movimentação).
