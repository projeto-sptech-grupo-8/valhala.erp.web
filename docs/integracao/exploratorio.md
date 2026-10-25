# Teste exploratório final pelo front (2026-10-20)

`e2e/exploratorio.spec.js`, contra a API real e com o banco recém-restaurado. Faz parte do `npm run gate`.

## O que cobre
| Bloco | Verificação |
|---|---|
| Entrada por XML da NF-e | XML de exemplo; itens casados por EAN; caixa/fardo convertidos (4 cx × 12, 8 fd × 6); `ENTRADA` com nº da NF e lote no back |
| Validades | Entrada com validade vencida → "Registrar perda" → `PERDA` de 750 ml no back |
| Inventário | Setor local → contagem cega → aprovação → `AJUSTE_NEGATIVO` no back; lista mostra SKU |
| Caixa | Abrir, ler EAN no leitor, drink ×2, Pix, sangria, ver vendas, fechar caixa; `SAIDA` + `SAIDA_DRINK` (120 ml) no back |
| Varredura (admin, Atendente, celular 390×844) | As 22 telas: abas, segmentos, cada opção dos filtros, colunas extras, detalhes, etiquetas, exportações. Reprova qualquer erro de console/JS ou resposta 4xx/5xx inesperada |

## Erros encontrados e corrigidos
| Tela | Erro | Correção |
|---|---|---|
| Caixa | Leitor de código de barras não achava o produto (buscava pelo id interno) | Busca por SKU e EAN |
| Caixa | Abas de categoria fixas da demonstração (Cerveja, Vinho…) | Abas a partir das categorias reais do catálogo |
| Entrada por XML | Seletor de produto exibia o UUID | Exibe o SKU |
| Inventário | Lista de contagem exibia o UUID | Exibe o SKU |
| Relatórios | Misturava 90 dias de vendas **fictícias** de produtos de demonstração com os dados reais | Com a API, o histórico simulado é desligado |
| Relatórios | Aviso dizia "dados de demonstração" | Aviso explica que as vendas são do caixa deste navegador |

## Resultado
Gate completo: build, lint, 6 smoke tests de API e **38/38 E2E** (30 de regressão + 8 exploratórios).

## Observações (não são erros, mas o grupo deve saber)
- **Vendas do caixa ficam no navegador** (o back não tem vendas): só o estoque baixa no back. Relatórios e faturamento
  de outro computador não veem essas vendas.
- O menu do perfil Atendente mostra **Financeiro** (telas sem código de permissão no back, dados de demonstração).
- `EntradaNF` usa uma lista fixa de categorias perecíveis (Cerveja, Sem Álcool, Combos) só para o aviso de validade.
