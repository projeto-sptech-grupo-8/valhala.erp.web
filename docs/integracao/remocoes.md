# Telas e seções removidas (2026-10-20)

Decisão de negócio: retirar **orçamentos**, **fornecedor** e **local de estoque**. Como o inventário era organizado
por setor (= local de estoque), a decisão foi retirar o **inventário** também.

| Item | O que saiu |
|---|---|
| Orçamentos | Página, item do menu (Vendas › Documentos), lista de demonstração, acesso do perfil Financeiro, texto do site |
| Inventário | Página, item do menu (Estoque › Operação), ações do store (criar, contar, aprovar), estado `inventarios`, tipo na auditoria, notificação "Inventário concluído", motivo de perda "Diferença de inventário" nos relatórios, texto do site |
| Fornecedor | Campo no cadastro de produto, campo na entrada manual de movimentação, coluna na exportação de movimentações e de reposição, lista de demonstração |
| Local de estoque | Campo "Localização" no produto, linha no detalhe do insumo, setor na tela de validades, lista de demonstração |

## Mantido (decisão)
- **Emitente da NF-e** (nome e CNPJ que vêm no XML): é dado do documento fiscal, não cadastro de fornecedor. Renomeado de
  "Fornecedor" para "Emitente"; o vínculo automático código do item → produto nas próximas notas continua.
- Motivo de saída "Devolução ao fornecedor" virou **"Devolução"**.
- Notas fiscais (emissão) continuam como estavam (demonstração).

## Efeitos colaterais
- Links antigos `#/orcamento` e `#/inventario` mostram "Página não encontrada" (coberto por E2E).
- Ajustes de estoque continuam pela tela de Movimentações (Ajuste com justificativa).
- Dados locais antigos (`localStorage`) com `local`/`fornecedor`/`inventarios` são simplesmente ignorados.

Também corrigido no caminho: a exportação de movimentações e de reposição usa o SKU em vez do id interno.
