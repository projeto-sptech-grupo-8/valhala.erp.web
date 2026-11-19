# Giro e margem no catálogo: regras, fluxo e implementação

## Objetivo e escopo

A lista de Produtos e drinks ganha dois botões independentes, **Margem** e **Giro**, na área de filtros. Ambos começam desativados. A lista principal continua paginada e filtrada pelo backend; os indicadores são calculados no frontend, conforme solicitado. Nenhum arquivo ou contrato do backend foi alterado.

Antes, Margem era uma coluna fixa e Giro não era apresentado na consulta remota. O antigo campo local `saidas30d`, inicialmente zero, não representa o histórico do servidor e não é utilizado nesta implementação.

Os botões alteram a apresentação das colunas. Não filtram produtos, não alteram os totais da consulta e não representam um filtro global por rentabilidade ou demanda.

## Interface e experiência

- **Margem** mostra/oculta a coluna Margem bruta.
- **Giro** mostra/oculta Giro (30 dias) e Cobertura estimada.
- Ambos podem ficar ativos ao mesmo tempo; `aria-pressed` comunica a seleção.
- Cada botão tem um `?` separado, acessível por mouse e foco do teclado. A ajuda explica as fórmulas, faixas e exceções.
- Os controles permanecem visíveis quando os demais filtros são recolhidos.
- As colunas possuem valor, descrição e cor: a compreensão não depende apenas da cor.
- Margem inclui uma barra visual de 0 a 100%; percentuais negativos continuam escritos e destacados em vermelho, sem barra preenchida.
- A tabela aumenta sua largura mínima quando as colunas são exibidas, preservando a rolagem horizontal e evitando comprimir os dados existentes.
- Os botões ficam junto às buscas, com o título “Exibir indicadores” acima, em um controle segmentado como o Status de Usuários, com seleção independente. Em telas menores, os blocos se reorganizam em linhas.
- O período do giro, o escopo da página, as fórmulas, os exemplos e as limitações ficam na ajuda acima dos botões, sem textos permanentes ao ativar as colunas.
- A ajuda abre sobre o próprio botão, por mouse ou foco, sem ícone de ajuda separado e com apenas uma explicação visível por vez. Escape fecha a explicação. A caixa respeita a largura da janela e permite rolar o conteúdo quando não há altura suficiente acima do controle.
- A legenda usa cores e rótulos organizados em faixas. O acionamento continua independente da ajuda: somente clicar no botão mostra/oculta as colunas.
- Durante a consulta aparece “Calculando…”. Erros, limites e falta de contrato aparecem como “Indisponível”, com o motivo no atributo de ajuda da célula; nunca viram zero.

## Regras de negócio: margem

### Fórmula e custo

`margem bruta (%) = (preço de venda − custo) / preço de venda × 100`

É margem sobre o preço de venda, não markup sobre o custo. Não inclui impostos, comissão, taxas, frete, mão de obra ou despesas operacionais. Não representa lucro líquido.

Para produto padrão, preço e custo são os valores da unidade/embalagem retornados no cadastro. Não se divide o custo da embalagem por ml para compará-lo com o preço da mesma embalagem.

Para drink, o custo é estimado pela receita atual: ingrediente fracionado usa `custo da embalagem / volume da embalagem × quantidade em ml`; ingrediente unitário usa `custo unitário × quantidade em UN`. São reutilizados `loadProduct` e `recipeSummary`, já existentes na arquitetura.

Receita incompleta, ingrediente incompatível/inativo ou ingrediente sem custo positivo impede a classificação da margem. Não se atribui custo zero a um ingrediente desconhecido. A margem de drink é identificada como estimada (`est.`); não representa o custo histórico de uma venda.

Preço ou custo não positivo, ausente ou não finito gera estado neutro. No contrato atual, custo zero não pode ser distinguido de custo não informado; por isso não recebe classificação de margem de 100%.

### Faixas iniciais

| Intervalo real, antes do arredondamento | Cor | Texto |
| --- | --- | --- |
| Menor que 0% | Vermelho | Abaixo do custo |
| De 0% a menos de 20% | Laranja | Baixa |
| De 20% a menos de 40% | Amarelo | Intermediária |
| A partir de 40% | Verde | Alta |
| Sem base de cálculo | Neutra | Sem custo/preço ou motivo específico |

São faixas propostas de atenção, não metas financeiras validadas para todas as categorias. Estão centralizadas em funções puras para permitir ajuste futuro.

## Regras de negócio: giro e cobertura

### O que significa giro nesta tela

O indicador segue a definição operacional documentada pelo projeto: **quantidade consumida em 30 dias**. Não é o índice financeiro tradicional `custo das vendas / estoque médio`.

São usados os últimos **30 dias civis completos**, excluindo hoje, no calendário local do navegador. Exemplo: consultando em 14/11, o intervalo é 15/10 a 13/11, inclusive. A exclusão do dia incompleto evita dividir um período parcial por 30. A API recebe `dataInicial` e `dataFinal`; a data final do backend é inclusiva.

### Movimentações consideradas

| Tipo da API | Entra no giro? | Motivo |
| --- | --- | --- |
| SAIDA | Sim | Consumo/saída direta do produto |
| SAIDA_DRINK | Sim, no ingrediente movimentado | Consumo do ingrediente na preparação do drink |
| ENTRADA e ENTRADA_INICIAL | Não | Reposição não representa demanda |
| PERDA | Não | Descarte não é consumo comercial |
| AJUSTE_POSITIVO e AJUSTE_NEGATIVO | Não | Correção administrativa não é demanda |

O frontend soma a **quantidade**, e não a quantidade de registros. Uma saída de 10 unidades soma 10. Motivo textual não é usado para inferir tipo de movimentação.

Como SAIDA também pode registrar consumo que não veio do caixa, a interface usa “Consumo em 30 dias”, evitando prometer faturamento ou vendas comprovadas.

### Unidades

- Produto padrão não fracionado: soma em UN; exibição com sua unidade cadastrada.
- Produto fracionado: soma em ML; saldo considerado também em ML, usando `quantidadeEstoqueBase`.
- Não se comparam números brutos de giro entre produtos de unidades diferentes.
- Unidade incompatível ou quantidade inválida impede a publicação do resultado.

### Drinks

O DTO de movimentações identifica o ingrediente movimentado e `origemDrinkId`, mas não fornece a quantidade de drinks vendidos como um agregado de vendas. Somar as linhas dos ingredientes não informa quantos copos foram vendidos, pois cada ingrediente possui sua própria quantidade.

Consequentemente, **Giro e Cobertura de drinks ficam indisponíveis** nesta versão. O consumo dos seus ingredientes participa do giro desses ingredientes. Não são consultadas receitas para tentar deduzir vendas históricas com base na receita atual. A margem estimada do drink continua disponível pelo botão Margem.

### Fórmulas de cobertura

`média diária = consumo de 30 dias / 30`

`cobertura em dias = saldo atual em unidade base / média diária`

Exemplo: saída de 60 UN e saldo de 20 UN → média de 2 UN/dia → cobertura de 10 dias.

O saldo é atual, enquanto o consumo usa uma janela histórica. A cobertura é uma estimativa sob manutenção desse ritmo, não uma previsão de demanda, uma reserva de estoque ou uma ordem automática de compra. Não considera sazonalidade, prazo de fornecedor ou estoque de segurança.

| Cobertura real | Cor | Texto |
| --- | --- | --- |
| Menor que 7 dias | Vermelho | Reposição urgente |
| De 7 a 30 dias, inclusive | Amarelo | Acompanhar |
| Maior que 30 até 60 dias, inclusive | Verde | Faixa proposta |
| Maior que 60 dias | Laranja | Possível excesso |
| Consumo zero em histórico completo | Neutra | Sem giro |
| Saldo ausente/inválido ou histórico indisponível | Neutra | Indisponível |

Sem consumo, a cobertura é não calculável: não aparece infinito nem uma quantidade inventada de dias. Saldo zero com consumo positivo produz cobertura zero/vermelha. Giro zero não substitui o indicador de estoque zerado já existente na tabela.

## Fluxo de dados e desempenho

1. A página consulta `/produtos` com seus filtros e paginação existentes. Indicadores desativados não consultam movimentações nem receitas.
2. Ao ativar Margem, produtos padrão usam os valores já carregados. Para drinks da página, o frontend consulta receita/ingredientes pelos serviços existentes.
3. Ao ativar Giro, o frontend consulta `/movimentacoes-estoque` **por produto padrão visível**, limitado ao período calculado, com 100 registros por página e ordenação por data decrescente.
4. As páginas de cada histórico são percorridas sequencialmente. Só é publicada a soma após confirmar a última página. Entradas, perdas e ajustes são descartados na agregação.
5. São processados até dois produtos simultaneamente. A carga de ingredientes da margem de drinks reutiliza a concorrência limitada de `loadProduct` (até quatro ingredientes por produto).
6. A agregação descarta cada página após somar: não guarda todo o histórico. Guarda apenas somas, identificadores para detectar repetição e resultados dos produtos consultados.
7. Há limite de dez páginas/1.000 registros de movimentação por produto. Caso o histórico ultrapasse esse limite, aparece Indisponível; não é apresentada soma parcial como completa. O limite inclui todos os tipos recebidos na consulta do produto.
8. Um cache em memória do hook mantém até 100 resultados por até 60 segundos, sem localStorage, incluindo produto/modos/período/revisão na chave. Erros e limites não são cacheados como sucesso.
9. Mudança de página, filtros ou modos cancela a execução anterior por AbortSignal. Respostas antigas não substituem a consulta vigente. O mecanismo usa `useQueryResource`, já adotado nas telas do catálogo.
10. Atualizar incrementa a revisão das métricas e recarrega produtos. Isso permite recalcular sem depender de cache anterior. Não há polling ou consulta automática em segundo plano.
11. Falha de um produto mantém o estado de indisponibilidade naquele produto sem impedir os demais. Falha de receita não inventa margem para o drink.

O custo da solução ainda depende da quantidade de produtos e movimentações. Não é equivalente a um agregado do servidor. O limite e a concorrência impedem uma busca ilimitada; em bases maiores, o caminho futuro é agregar no backend, mantendo estas funções como referência de regra.

## O que não mudou

- Filtros, ordenação e paginação de produtos continuam no backend.
- Giro, cobertura e margem visual não recebem ordenação ou filtro global, pois a API atual não oferece isso. Ordenar apenas a página criaria uma percepção incorreta do conjunto completo.
- Exportar mantém o CSV anterior. Não exporta indicadores ocultos ou ainda em consulta.
- A operação não grava produtos, movimentações nem configurações no backend.
- Limpar filtros continua limpando a consulta de produtos; não altera a escolha visual dos indicadores.
- Os botões começam desativados ao remontar a tela; não há persistência de preferências nesta versão.

## Organização do código

| Arquivo | Responsabilidade |
| --- | --- |
| `src/features/catalog/remote/catalogMetrics.js` | Fórmulas puras, faixas, janela de datas e leitura paginada/agregação de giro |
| `src/features/catalog/remote/useCatalogMetrics.js` | Consulta sob demanda, concorrência, cancelamento e cache limitado |
| `src/features/catalog/remote/CatalogMetricControls.jsx` | Botões, ajuda acessível e células visuais |
| `src/features/catalog/remote/CatalogMetrics.module.css` | Cores, barra de margem, estados, controles e tooltips |
| `src/pages/catalog/products/ui/ProductsPage.jsx` | Estado dos botões, inclusão das colunas e integração com Atualizar |
| `src/pages/catalog/products/ui/ProductsPage.module.css` | Largura variável da tabela com indicadores visíveis |
| `tests/catalogMetrics.test.js` | Limites das fórmulas, datas, paginação e exceções |
| `e2e/catalog-remote.spec.js` | Botões, cores, ajuda e ausência de consultas antecipadas |

## Validação e evolução

Os testes cobrem limites de margem/cobertura, ausência de custo, consumo zero, mudança de mês, soma de várias páginas, exclusão de perdas/entradas, unidade incompatível, limite de histórico e indisponibilidade de drinks. O teste de interface verifica colunas ocultas inicialmente, ativação independente, ajuda, cores e consulta de movimentações somente após clicar em Giro.

Evoluções: tornar faixas configuráveis por categoria; suportar quantidade histórica de drinks vendidos mediante contrato próprio; identificar custos explicitamente ausentes; oferecer agregados no servidor para eliminar o limite de histórico e permitir filtros/ordenação globais. Hoje, consultas separadas não possuem snapshot transacional: movimentações feitas durante a leitura podem deslocar páginas; duplicidades são rejeitadas, mas a API não garante detecção de todos os deslocamentos. Atualizar refaz a consulta.
