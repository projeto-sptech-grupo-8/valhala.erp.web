# Módulo: produtos e drinks (inclui receitas) — ✅ aprovado (2026-10-20)

Receitas entraram neste módulo: não dá para cadastrar um drink sem receita, então os módulos 4 e 5 viraram um só.
A **saída de drink** (baixa dos ingredientes) fica no módulo de movimentações.

## Arquitetura
- Com `produtos` fora do mock, o **store vira cache da API**: o catálogo é carregado em `syncCatalog()` (todas as páginas
  de `/produtos` + `/drinks/{id}/receita` de cada drink) e recarregado após cada gravação.
- Conversões ficam só em `src/lib/api.js`:
  - **saldo**: produto fracionado tem saldo/mínimo em **ml** no back; a interface usa embalagens (`qty = ml ÷ volume`).
  - **receita**: a interface guarda a quantidade em ml; insumo não fracionado vai para o back como `UN` (`ml ÷ volume`).
    Com isso caixa, rendimento, custo por copo e relatórios continuam funcionando sem alteração.
- `saveProduct` cria/edita pela API (PATCH só com o que mudou). Se a receita de um drink novo falhar, o produto criado é
  excluído (não fica drink sem receita).

## Campos que o back não tem (guardados só no navegador)
`local`, `fornecedor`, dose (ml), unidades por fardo, giro (`saidas30d`), **lotes/validade** e ingredientes "livres" da receita.
Ficam no `localStorage` por produto e são mesclados a cada sincronização; os lotes se reconciliam com o saldo real.
⚠️ Não aparecem em outro navegador/computador. Para persistir, o back precisa de campos/endpoints novos.

## Mudanças de comportamento
- SKU é **gerado pelo back** (`PRD-…`); o campo virou somente leitura.
- Categoria vem de `/categorias` (só ativas, ou a atual) — inclusive para drinks (antes era fixo "Drinks").
- Fracionamento e volume ficam **bloqueados na edição** (o back não permite mudar depois do cadastro).
- "Volume por dose" passou a ser opcional com a API (é auxiliar de venda, guardado localmente).
- Permissões: listar exige `VISUALIZAR_ESTOQUE`; criar/editar (`novo`, `editar`) exige `GERENCIAR_ESTOQUE`.
- Produto não pode ser excluído depois de criado com saldo (a entrada inicial é uma movimentação) — a interface não tinha exclusão.

## Bug encontrado pelo E2E e corrigido
- Abrir `#/editar?id=…` direto (F5/link) mostrava o seletor de tipo: o formulário montava antes do catálogo chegar.
  Agora um wrapper só monta o formulário com o produto carregado.

## Gate
| Etapa | Resultado |
|---|---|
| smoke API (`scripts/smoke/produtos.ps1`) | ✅ 23 verificações (SKU gerado, margem, saldo em ml, validações 400, drink sem saldo, receita ML/UN, filtros, PATCH, volume bloqueado, 403, 409 na exclusão) |
| E2E (`e2e/produtos.spec.js`) | ✅ 6/6 — fracionado · não fracionado · drink com receita ml+un · edição · catálogo sem cache local · só leitura |
| E2E (`e2e/navegacao.spec.js`) | ✅ as 22 páginas do painel abrem sem erro com catálogo real |
| regressão completa | ✅ 23/23 E2E |

## Ainda local até o módulo de movimentações
Entradas/saídas/ajustes, vendas no caixa, NF-e e inventário alteram o saldo **só no navegador**; na próxima sincronização
o saldo volta ao valor do back.
