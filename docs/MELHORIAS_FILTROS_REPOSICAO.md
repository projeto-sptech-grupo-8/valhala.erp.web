# Filtros dos alertas exibidos — Reposição

Implementado em 16/11/2026, somente no frontend.

## Alcance dos dados

A fonte continua GET /dashboard/resumo?meses=1. O servidor retorna até cinco alertas prioritários; os filtros locais não representam uma busca por todo o estoque. As categorias disponíveis são apenas as dos alertas recebidos. Nenhuma consulta completa de produtos ou de movimentações foi adicionada.

Os indicadores permanecem globais e não são recalculados pela seleção local. A contagem Exibindo X de Y alerta(s) recebido(s) aparece após consulta bem-sucedida e desaparece durante carregamento ou erro.

## Filtros e ordenação

- Situação: Todos, Zerados e Abaixo do mínimo, com contagens dos alertas recebidos, independentes dos outros filtros. Abaixo do mínimo corresponde ao status CRITICO com saldo; Zerados é separado pelo servidor.
- Nome e categoria: preservados.
- Mínimo disponível: saldo atual dividido pelo estoque mínimo, multiplicado por 100. Faixas: até 25% (inclui zero), acima de 25% até 50%, acima de 50%. Não há sobreposição entre as faixas.
- Ordenar por: prioridade do servidor, nome A–Z e menor percentual do mínimo. O padrão preserva exatamente a ordem recebida. A ordenação por percentual permite comparar produtos com diferentes unidades sem ordenar quantidades brutas incomparáveis.
- Limpar filtros também restaura a prioridade original. Atualizar mantém os filtros e consulta novamente o resumo do servidor.

Campos ausentes, inválidos ou mínimo menor/igual a zero não viram zero: percentual e falta ficam indisponíveis. Registros sem percentual não entram em uma faixa específica e ficam no final da ordenação por percentual.

## Coluna Falta para o mínimo

Cálculo: máximo entre zero e estoque mínimo menos saldo atual. Usa a mesma unidade-base de saldo/mínimo. Para fracionados, ML confirmado pela consulta já existente do produto; se a unidade não puder ser confirmada, aparece unidade-base, sem presumir garrafas ou converter indevidamente.

Exemplo: saldo 300 ml e mínimo 1.000 ml resultam em 30% do mínimo disponível e falta de 700 ml. Não é recomendação completa de compra, previsão de ruptura ou cálculo por fardo. Não modifica mínimo, estoque ou prioridade do backend.

## UI e organização

Botões de situação com estado pressionado, contagens e foco de teclado. Categoria, faixa e ordenação organizadas em três colunas no desktop e empilhadas em telas pequenas. Ajuda por hover/foco explica a métrica e a diferença para sugestão de compra. Título, ações e comportamento recolhível existentes foram preservados.

model/restockAlerts.js concentra validação numérica, métricas, filtros e ordenação. RestockPage.jsx apresenta os dados e utiliza os mesmos controles compartilhados de filtros. Não houve alteração de contrato ou backend.

## Validação

Testes unitários para zero, valores ausentes, limites de faixa, combinação de filtros, ordenação e preservação do array original. Teste de navegador com API simulada verifica contagens, combinações, diferença em ML, ajuda, restauração da prioridade, indicadores globais e ausência de chamadas globais adicionais. Regressões de ações e unidade dos fracionados também verificadas. Lint e build de produção executados.
