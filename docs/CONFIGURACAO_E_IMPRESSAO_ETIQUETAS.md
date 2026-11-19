# Configuração e impressão de etiquetas por produto e lote

Atualizado em 16/11/2026, após implementação e validação. Este documento substitui a descrição anterior de seleção de um único lote por produto e as referências antigas a lotes locais e EAN.

## 1. Objetivo e escopo

Permitir etiquetas de preço e etiquetas de identificação por lote, mantendo a arquitetura atual do frontend. Uma impressão pode conter vários lotes do mesmo produto, cada um com quantidade, validade e cor próprias. Não houve alteração no backend.

Imprimir não altera estoque, preço, validade ou lote; não registra vendas ou perdas. A quantidade de etiquetas não é saldo de estoque nem histórico de impressões. O navegador não confirma se a impressora concluiu o trabalho.

## 2. Regra real do backend

Fontes analisadas no projeto valhala.core.stock.app:

- modules/estoque/entity/LoteEstoqueEntity.java: cada lote pertence a um EstoqueEntity e tem código, validade opcional e saldo.
- modules/estoque/entity/EstoqueEntity.java: cada estoque pertence a um único produto.
- db/migration/V9__controlar_lotes_e_validade.sql: unicidade por estoque_id + codigo, não por código global.
- modules/estoque/service/ControleLotesEstoque.java, creditar: uma entrada do mesmo produto/código não pode substituir uma validade já definida por outra diferente. Se o lote tem saldo sem validade, é necessário outro código para receber uma validade.
- modules/estoque/dto/LoteResponseDto.java: saldo na unidade-base; ML para fracionado.

Consequências:

1. Um produto pode possuir vários lotes.
2. Cada registro de lote pertence a um único produto e tem uma única validade.
3. Produtos diferentes podem exibir o mesmo código de lote e ter validades distintas. São registros distintos.
4. Uma entrega ou nota com vários produtos não equivale a um lote único com uma validade global.
5. O frontend identifica a seleção por ID do produto e ID do lote; nunca agrupa pelo texto do código.
6. A data impressa vem do lote retornado pelo servidor, nunca de uma data geral presumida para o produto.

Exemplo:

| Produto | Lote | Validade | Etiquetas |
| --- | --- | --- | --- |
| Cerveja A | L001 | 20/12/2026 | 5 |
| Cerveja A | L002 | 15/02/2027 | 8 |
| Suco B | L001 | 10/01/2027 | 2 |

O trabalho contém três entradas independentes e 15 etiquetas. Cerveja A/L001 e Suco B/L001 não compartilham validade.

## 3. Antes e depois

| Aspecto | Antes | Agora |
| --- | --- | --- |
| Lotes por produto | Um lote escolhido em select | Vários lotes selecionáveis em tabela expandida |
| Quantidade por validade | Uma quantidade para todo o produto | De 1 a 99 por lote selecionado |
| Total do produto | Quantidade digitada | Soma das quantidades dos lotes |
| Consulta de lotes | Consulta para todos os produtos exibidos no modo validade | Apenas produtos selecionados com detalhes abertos; paginação do servidor |
| Prévia do lote | Dependia do select | Olho em cada lote, sem alterar sua seleção |
| Prévia da configuração | Compartilhada com a lista | Exclusiva, encerrada ao aplicar/cancelar |

## 4. Fluxo de UI e UX

1. Abrir Etiqueta no catálogo. O modal recebe somente os produtos da página do catálogo.
2. Buscar por nome/SKU, filtrar por quantidade definida e escolher 10, 20 ou 30 produtos por página. Esses filtros são locais sobre a lista já recebida; não simulam busca global do catálogo.
3. Abrir Configurar etiqueta e escolher formato e identificação por cor.
4. Padrão e Cor manual são etiquetas de preço: quantidade por produto, sem atribuir validade específica.
5. Por validade habilita identificação por lote. Aplicar fecha a configuração e sua prévia exclusiva.
6. Marcar o produto. Seus lotes podem ser abertos/recolhidos pelo botão da linha. Selecionar produtos exibidos marca produtos, mas não escolhe lotes automaticamente.
7. Marcar os lotes desejados e informar uma quantidade para cada um. A tabela apresenta código, validade/situação, saldo/unidade, quantidade e olho.
8. O produto mostra a soma de etiquetas e quantos lotes estão selecionados. Sem lote escolhido, permanece pendente e imprimir fica bloqueado.
9. Usar a paginação dos lotes. Seleções de outras páginas são preservadas e aparecem em um resumo com ação Remover. Não é necessário carregar todos os lotes para mantê-las.
10. Conferir total de produtos, etiquetas e folhas A4; imprimir selecionados.

Desmarcar um produto remove seus lotes da operação. Recolher detalhes, mudar a página de produtos ou aplicar filtros não descarta a seleção. Limpar seleção remove todos os produtos e lotes, inclusive fora da página atual.

A troca de modo visual preserva as seleções em memória, mas apenas a seleção correspondente ao modo ativo entra na impressão. Cancelar configuração descarta alterações de aparência; não desfaz edições de seleção feitas na lista durante a configuração.

## 5. Quantidades e bloqueios

- Número inteiro de 1 a 99 por produto no modo preço, ou por lote no modo validade.
- Campo vazio, zero, negativo, decimal ou acima de 99 bloqueia a impressão se estiver selecionado.
- Produto selecionado sem lotes no modo validade também bloqueia a impressão.
- Não há seleção automática do lote mais próximo do vencimento: o usuário deve conferir o lote físico.
- A quantidade de etiquetas não fica limitada ao saldo. É possível reimprimir, etiquetar prateleiras ou usar mais de uma etiqueta por embalagem. O saldo é apenas informativo e pode estar em ML.
- Seleções fora da página e dos filtros continuam no total, com aviso explícito.
- Falha na consulta não é tratada como lista vazia: há mensagem e Tentar novamente.
- Sem lotes com saldo, não é possível inventar um lote para imprimir por validade. O modo de preço continua disponível.
- Enquanto a configuração estiver em edição, imprimir fica desabilitado.

## 6. Validade, cor e segurança operacional

A cor é calculada individualmente a partir da validade de cada lote e da referência de GET /lotes/resumo:

| Situação | Cor |
| --- | --- |
| Antes da referência | Vermelho |
| Hoje até 7 dias | Laranja |
| 8 a 30 dias | Amarelo |
| Mais de 30 dias | Verde |
| Sem data | Cinza, Validade não informada |

A data de vencimento ainda conta como hoje. A data é tratada como calendário, sem converter o dia da validade por fuso horário. Se a referência do servidor falhar, há aviso de uso do calendário do navegador.

Um lote sem validade pode ser selecionado, mas sua etiqueta não inventa uma data. Lotes vencidos com saldo podem receber etiqueta vermelha para identificação operacional; isso não autoriza venda ou consumo. As saídas continuam sob FEFO e bloqueios do backend. A impressão não reserva lotes nem altera a ordem de consumo do servidor.

Cor é acompanhada de texto para não depender somente da percepção visual. A impressão da faixa depende da opção de gráficos de fundo da impressora. Usar escala 100%, sem cabeçalho/rodapé do navegador.

## 7. Prévias e ajuda

- O olho da linha abre a prévia; clicar novamente no mesmo olho fecha. Outro olho troca a visualização.
- O olho ativo fica amarelo e volta à cor normal ao fechar; aria-pressed informa o estado.
- O olho de um lote mostra seu código, data e cor usando as configurações aplicadas, mesmo antes de selecionar o lote para imprimir.
- O olho do produto mostra o produto e o último lote visualizado; sem lote, o modo validade informa ausência de data. Isso não preenche a seleção nem libera impressão.
- Configurar etiqueta fecha a prévia da lista e abre uma prévia exclusiva dentro da configuração. Ela usa o primeiro produto como amostra e, se houver, o lote previamente visualizado desse produto.
- Aplicar/cancelar/fechar configuração remove sua prévia. Não abre automaticamente a prévia da lista.
- O ícone ! ao lado de Etiquetas de produtos reúne o aviso sobre ausência de código de barras e a explicação de quantidades/preço por litro. Ajuda acessível por hover e foco de teclado.
- A mesma implementação ProductLabel renderiza prévia e impressão.

## 8. Integração e desempenho

GET /lotes recebe produtoId, incluirZerados=false, pagina, tamanho=5, ordenarPor=validade e direcao=ASC. A seleção de produto, saldo positivo, ordenação e paginação são executadas no backend. Não se baixa todo o estoque ou todo o catálogo.

ProductLots monta a consulta somente quando o produto está selecionado, os detalhes estão abertos e o modo atual é Por validade. Recolher/desmarcar/trocar de página desmonta a consulta e aborta a requisição pendente pelo hook existente. Seleções feitas são mantidas no pai do modal; a resposta paginada é mantida apenas pelo painel aberto. Não há polling.

GET /lotes/resumo fornece a referência de data quando algum modo de validade está em uso. Erros são tratados separadamente das consultas de lotes.

As seleções são instantâneos dos dados consultados durante esta preparação. Não há atualização em tempo real ou revalidação transacional antes de imprimir. Se outro operador movimentar o estoque depois, a impressão não reserva ou garante aquele saldo. Reabrir os detalhes consulta novamente. A validade não é editável no modal.

## 9. Organização do código

| Arquivo | Responsabilidade |
| --- | --- |
| features/catalog/product-labels/ui/EtiquetasModal.jsx | Modos, seleção de produtos/lotes, totais, configuração e envio do trabalho |
| features/catalog/product-labels/ui/ProductLots.jsx | Consulta paginada por produto, seleção e quantidade por lote, saldo, erros e olho |
| features/catalog/product-labels/model/labelSelection.js | Montagem das entradas, soma e detecção de seleções incompletas |
| features/catalog/product-labels/model/labelSettings.js | Preferências, formatos, validação de quantidades e métrica de cores |
| features/catalog/product-labels/ui/ProductLabel.jsx | Etiqueta reutilizada na prévia e impressão |
| features/catalog/product-labels/ui/LabelHelp.jsx | Ajuda contextual e variante com exclamação |
| features/printing/ui/PrintHost.jsx | Expansão de cópias; chave por entrada/cópia evita colisão entre lotes do mesmo produto |

O payload interno do host permanece tipo=etiquetas, formato e itens com product, copias e appearance. Agora um mesmo product pode aparecer em várias entradas, cada uma com seu lote/validade/cor. Não foi criado endpoint de impressão.

Apenas preferências visuais são persistidas por usuário neste navegador. Produtos selecionados, lotes e quantidades não são persistidos; fechar o modal encerra a preparação. O catálogo não fornece código de barras; não é gerado um EAN fictício a partir do SKU.

## 10. Validação executada

- 3 testes unitários: múltiplos lotes e códigos iguais em produtos diferentes; totais e bloqueios; modo preço independente dos lotes.
- 7 testes de navegador com API simulada: cor manual e quantidades; validade do servidor; ausência de data e persistência; limites; paginação de produtos/prévia da configuração; impressão de dois lotes do mesmo produto; falha/recuperação e preservação entre páginas de lotes.
- Cenário principal imprime 5 etiquetas do lote L-01 e 8 de SEM-LOTE, preservando as aparências e a ausência de data no segundo.
- Layout móvel verificado em 390 px, sem transbordamento horizontal da página; tabelas usam rolagem interna.
- Lint dos arquivos alterados e build de produção concluídos. O build mantém o aviso preexistente de tamanho de bundle.

Os testes interceptam APIs e não modificam estoque, conta ou impressora reais. Validação física de alinhamento/papel depende do equipamento do usuário.


## Filtro de lotes no modal — 17/11/2026

ProductLots consulta cinco lotes por página, com limite fixo. Validade até converte a data para venceEmDias com base na referência recebida pelo modal; inclui vencidos e aceita hoje ou data futura, conforme o contrato disponível. Alterar ou limpar a data reinicia a página sem remover lotes selecionados. O filtro não altera os indicadores globais nem a tela principal Validade e lotes, que mantém seu seletor de tamanho. Não existe consulta exata por validade ou intervalo histórico no contrato atual.


### Ajuste final do filtro das etiquetas — 17/11/2026

O campo de data foi substituído por Faixa de validade, com as mesmas categorias usadas na métrica de cores: Vencido/vermelho, Hoje a 7 dias/laranja, 8 a 30 dias/amarelo, Mais de 30 dias/verde e Sem validade/cinza. Todas remove a restrição. A consulta envia situacao ao backend, produtoId e tamanho=5; não filtra somente a página carregada. Alterar a faixa reinicia a página e preserva os lotes escolhidos para impressão. A tela principal de Validade e lotes permanece no formato anterior.
