# Análise e plano de integração — Estoque e Catálogo

Data: 13/11/2026. Escopo: produtos, categorias, receitas de drinks, movimentações, reposição, lotes/validade, importação de NF-e e reflexos dessas operações no estoque.

## 1. Resultado da análise

O backend já oferece uma base adequada de CRUD, permissões, validações, filtros e paginação no banco. O frontend está parcialmente integrado, mas mantém uma arquitetura de catálogo completo em memória, cálculos de domínio no navegador e dados operacionais em localStorage. A paginação visual atual não reduz a carga de dados.

A prioridade é substituir essa dependência global por consultas por tela, preservando o contrato paginado, e fazer o servidor assumir os cálculos e operações que precisam ser consistentes entre usuários. Apenas trocar os filtros de lugar não resolve: receitas, detalhes, indicadores, seletores, exportações e gravações também precisam deixar de depender do catálogo inteiro.

Este documento é análise estática e proposta de execução, não implementação. Não houve alteração no código da aplicação, execução de testes, medição de desempenho ou validação visual no navegador. Constatações de UI/UX abaixo vêm dos componentes e contratos; responsividade e acessibilidade precisam de validação prática posterior.

Referências de versão consultadas: frontend `a33ac96`; backend `733b76f`. O código foi relido nesta análise; referências da conversa anterior podem apontar para versões diferentes.

## 2. O que já existe e deve ser aproveitado

| Área | Backend existente | Integração atual / lacuna |
| --- | --- | --- |
| Produtos | GET paginado com `busca`, `categoriaId`, `tipo`, `ativo`, `pagina`, `tamanho`, `ordenarPor`, `direcao`; GET por ID; POST, PATCH, DELETE | CRUD parcial ligado à API; listagem percorre todas as páginas e filtra localmente; sem fluxo de ativação/inativação no editor analisado |
| Categorias | CRUD; GET paginado com busca, situação e ordenação | CRUD integrado; listagem integral; indicadores calculados cruzando produtos pelo nome da categoria |
| Receitas | GET/PUT `/drinks/{id}/receita`; validação de PADRAO, ativo, estabelecimento, duplicidade, quantidade e ML/UN | Integrado, mas modelo interno depende de volume; produtos sem volume ficam fora do seletor |
| Movimentações | GET paginado por produto, tipo, usuário e intervalo de datas; POST de entrada, saída, ajustes e perda | API busca até três páginas de 100; tela filtra esse recorte localmente |
| Saída de drink | POST `/movimentacoes-estoque/saida-drink`; baixa transacional dos ingredientes, com trava e validação de saldo | Usado pelo store, mas preparação local depende de volume e lotes locais |
| Resumo de dashboard | GET `/dashboard/resumo?meses=6`; agregados de estoque e movimentações | Pode servir de referência para agregações; não substitui consultas específicas de reposição, categorias e histórico filtrado |
| Lotes, validade, FEFO | Movimentação aceita texto de lote e número da nota | Não há, no módulo inspecionado, entidade/API de saldo por lote com validade e FEFO persistidos |
| NF-e | Movimentação aceita número da nota | Importação, chave única, vínculos de fornecedor, conversão e histórico da importação ficam no frontend |

O envelope existente é `{ itens, pagina, tamanho, totalItens, totalPaginas, primeira, ultima }`, com página inicial zero, padrão de 20 itens e limite de 100. Deve ser preservado no cliente.

Ordenações atuais de produtos: `nome`, `sku`, `precoVenda`, `precoCusto`, `criadoEm`, `atualizadoEm`. Categorias: `nome`, `criadoEm`, `atualizadoEm`. Movimentações: `ocorridoEm`, `tipo`, `quantidade`, `saldoPosterior`. Colunas como status, rendimento, categoria, giro e cobertura não podem simplesmente enviar seus nomes atuais para a API.

## 3. Lacunas confirmadas e impactos

### 3.1 Carga global, filtros e paginação — prioridade alta

- `shared/api/api.js`: `todasAsPaginas` busca integralmente produtos e categorias, descartando os metadados de navegação.
- `StoreProvider.syncCatalog`: baixa o catálogo, faz uma requisição de receita por drink via `Promise.all` e carrega movimentações. Repete essa sincronização após gravações.
- `ProductsPage`: filtra por texto, categoria, tipo e status no navegador. Calcula disponibilidade e indicadores durante a renderização.
- `DataTable`: ordena uma cópia do array completo e aplica `slice` para a página visível. Mostrar 12 linhas não significa baixar 12 registros.
- `CategoriesPage`: percorre produtos para cada categoria e associa pelo nome, apesar de existir `categoriaId`. Renomear uma categoria pode deixar indicadores inconsistentes até atualizar o catálogo.
- `useResource` ignora respostas após desmontagem, mas não cancela a requisição; não fornece cache compartilhado ou deduplicação.

**Como fazer:** criar consultas paginadas independentes por recurso/tela, tabela controlada, busca remota com debounce e cancelamento, seletores com busca e página limitada, cache limitado em memória e invalidação por recurso. Manter no cliente apenas estado de interação, rascunhos e validações imediatas de campos.

### 3.2 Histórico incompleto e indicadores enganosos — prioridade alta

`api.movimentacoes.listar` limita o histórico a 300 registros. Busca e datas na tela atuam somente sobre esse recorte: uma movimentação antiga existente pode aparecer como inexistente. Contadores e exportações também derivam desse subconjunto.

A API já permite filtrar antes de paginar, mas a interface não usa essa capacidade. O filtro visual “Saída” agrupa tipos distintos, enquanto a API recebe um único enum `tipo`; o mesmo ocorre com ajustes positivo e negativo. Busca textual por nome do produto também não equivale ao filtro existente por `produtoId`.

**Como fazer:** enviar datas e produto à API; oferecer tipos exatos inicialmente ou adicionar filtro de grupo/lista de tipos no backend. Para pesquisa textual de histórico, propor `busca` no servidor ou usar autocomplete que resolve o produto por ID. Indicadores devem vir de uma agregação com os mesmos filtros e definição explícita de contagem, quantidade ou valor.

Preservar o tipo original e usar `PERDA` para identificar perda: hoje o frontend também infere perda por regex na observação. Não confundir número de movimentações com quantidade perdida ou percentual financeiro.

### 3.3 Drinks: unidades, custo e disponibilidade — prioridade alta

O backend aceita ingrediente PADRAO fracionado em ML e não fracionado em UN. Quantidades são positivas; ingredientes devem ser ativos, do mesmo estabelecimento e não repetidos. Um drink não tem estoque próprio.

No frontend atual, `ProductForm` monta opções com `products.filter(p => p.volumeEmbalagem)`. Além de excluir morango sem volume, não aplica explicitamente a condição de ativo nessa seleção. `emUn` depende de volume; `toReceita/fromReceita` convertem unidades para uma representação interna baseada em ml. `stock.js`, detalhes e preparação da baixa no store ignoram ingredientes sem volume em vários cálculos.

**Como fazer:** adotar receita explícita `{ produtoId, quantidade, unidadeConsumo }`; mostrar ML/UN conforme o produto e nunca inventar volume para um item unitário. Receitas já persistidas na API têm unidade e são a fonte para reconstruir o editor; descartar/versionar apenas caches antigos incompatíveis, sem converter cegamente dados persistidos.

Exemplo de aceite: 50 ML de vodka + 3 UN de morango por drink; dois drinks consomem 100 ML e 6 UN. O gargalo é o menor rendimento entre todos os ingredientes rastreados. Para custo, definir que custo de fracionado representa embalagem: custo por ML = custo da embalagem / volume; custo unitário é aplicado diretamente em UN. A estimativa durante edição pode usar somente as linhas carregadas; o resumo persistido e a autorização de saída devem ser do servidor.

Na listagem, devolver resumo de custo, rendimento, gargalo e situação do drink, calculado em lote no backend, para evitar buscar todas as receitas. Definir regra de status: hoje `getStatusDrink` pode classificar como estável um drink cuja receita está vazia ou cujo ingrediente não foi localizado. Dados ausentes não significam disponibilidade.

Ingredientes “Livre” não são enviados à receita. Decidir seu papel: se forem parte da ficha técnica, persistir como itens não rastreados com nome e observação; enquanto isso, informar claramente o alcance local. Não usar “Livre” para contornar ingrediente unitário.

### 3.4 Persistência parcial e gravações em múltiplas etapas — prioridade alta

O cadastro de drink executa POST do produto e depois PUT da receita. Em falha, tenta excluir o produto; erro dessa exclusão é ignorado. Na edição, PATCH pode concluir e PUT falhar, deixando alteração parcial.

Movimentações compostas são primeiro aplicadas no estado local e depois enviadas sequencialmente. Em falha, o store tenta compensar as já realizadas por ajustes. Isso não oferece atomicidade: pode haver falha de rede, concorrência ou falha do próprio estorno. O comentário de que tudo acontece ou nada acontece não é uma garantia técnica desse fluxo.

**Como fazer:** propor operação transacional para produto + receita e comandos de estoque compostos quando necessários. Reaproveitar a saída de drink já transacional. Para requisições sujeitas a repetição, adicionar idempotência no servidor. Não repetir POST automaticamente após timeout sem mecanismo para consultar o resultado.

Enquanto os contratos não existirem, manter o formulário e o ID já criado, informar exatamente a etapa salva e permitir retomar a receita. Não mostrar sucesso integral antes da resposta. Separar “gravação concluída, atualização da tela falhou” de “gravação falhou”.

### 3.5 Lotes, validade, custo médio e NF-e — depende de backend

`LOCAL_FIELDS` guarda dose, fardo, saídas de 30 dias e lotes. `MovimentacaoRequestDto` não recebe validade nem custo de entrada. O custo médio calculado localmente pode ser sobrescrito pelo custo retornado na sincronização. A interface promete atualização de custo médio e bloqueio de vencidos, mas o servidor de estoque analisado não possui o modelo necessário para garantir essas regras em múltiplos dispositivos.

O número de lote gravado no histórico não equivale a saldo por lote. Reconciliação de lotes locais com saldo global não recupera a distribuição real de validade.

**Como fazer:** modelar lote por estabelecimento/produto, saldo, validade, custo e vínculo com movimentação; executar consumo FEFO, perda por lote e bloqueio de vencidos no servidor. Definir regras para lote sem validade e fuso/data de negócio. Para NF-e, persistir chave única por estabelecimento, importação, itens, fatores e vínculos, com validação e confirmação transacional/idempotente.

Até lá, não apresentar esses recursos como controle centralizado completo. Planejar migração assistida de dados locais, com conferência e sem criar saldo duplicado. XML pode ter prévia no cliente, com limites de arquivo; servidor valida a versão confirmada e é responsável por persistência e duplicidade.

### 3.6 Reposição e indicadores — depende de consultas agregadas

Reposição calcula tudo com os arrays globais, incluindo sugestão de compra `2 × mínimo − saldo`, status e drinks afetados. Giro e cobertura dependem de `saidas30d`, campo local inicializado em zero. Não há contrato específico para esses indicadores no produto retornado.

**Como fazer:** criar consulta paginada de reposição com filtros, resumos globais e motivos da sugestão; definir janela de giro, tipos de movimentação incluídos, tratamento de perdas/ajustes e unidade de compra. A política de “duas vezes o mínimo” deve ser acordada, não apresentada como previsão de demanda. Reutilizar as regras de status no servidor; o dashboard existente só distingue zerado/crítico nos alertas e não resolve todo o modelo da tela.

### 3.7 Contratos e experiência do catálogo

- Backend aceita `ativo` no PATCH, mas o editor e `fromProduto` não oferecem esse fluxo. Inativação é importante quando exclusão é bloqueada por vínculos/histórico.
- `fromProduto` transforma descrição e código de barras vazios em `undefined`; limpar um campo pode não enviar alteração. Definir semântica de ausente, vazio e nulo com o backend antes de corrigir.
- Detalhes e editor dependem de localizar o produto no store; usar GET por ID, com 404 real distinto de falha de carga, é pré-requisito para paginação.
- `toMovimento` descarta `unidadeEstoque`, `saldoAnterior`, `origemDrinkId` e `receitaAplicada`. Usar esses dados para histórico auditável e exibir a receita aplicada na época, não apenas a receita atual.
- `syncCatalog` transforma falha de receita em `[]`. Preservar erro por recurso e ação de tentar novamente; nunca interpretar falha de rede como receita vazia.
- O store serializa todo o estado em localStorage a cada mudança e usa chave global `valhalla:store:v2`. Limitar persistência a preferências/rascunhos e isolar por estabelecimento/usuário; revalidar ao trocar sessão. Não é evidência de acesso indevido no servidor, mas há risco de reapresentar dados locais de sessão anterior.
- Algumas ações usam `canEdit(role)`, que olha nome de perfil, enquanto outras usam permissões efetivas. Uniformizar `VISUALIZAR_ESTOQUE`, `GERENCIAR_ESTOQUE` e `MOVIMENTAR_ESTOQUE`, inclusive nos detalhes e reposição. O servidor continua sendo a autoridade.

## 4. Contratos necessários: existente versus proposto

Os caminhos novos abaixo são sugestões a acordar; não existem como garantia da API atual.

| Necessidade | Ação proposta |
| --- | --- |
| Listas básicas | Usar os GET atuais, preservando envelope e passando filtros/página/ordenação |
| Filtro por situação do estoque | Estender `/produtos` ou criar consulta de estoque com `statusEstoque`; aplicar no banco antes da paginação |
| Colunas derivadas | DTO de consulta com status, unidade-base, quantidade, custo/rendimento do drink; agregação por página, sem consulta individual por linha |
| Categorias com indicadores | Consulta agregada por `categoriaId`, com totais e saúde do estoque definidos; não derivar totais de uma página de produtos |
| Histórico agrupado e busca | Estender tipos/grupo e busca se mantida a UX atual; agregados e exportação com filtros equivalentes |
| Reposição | Proposta GET `/estoque/reposicao`, com página, resumo, sugestão e impacto em drinks |
| Ficha de drink | Leitura detalhada e gravação transacional de produto + receita; opcional prévia calculada pelo servidor |
| Lotes/validades | Modelo e APIs de consulta/entrada/consumo/perda por lote, com filtros de produto, situação e datas |
| Importação de NF-e | APIs de prévia/validação e confirmação, com persistência e deduplicação por chave |
| Exportação integral | Endpoint que reaplica filtros e permissões; stream/arquivo, e job apenas se o volume justificar |

Manter estabelecimento obtido da sessão, validações de permissão e ordenações permitidas no servidor. Adicionar desempate estável por ID na paginação. Avaliar índices e planos de execução para estabelecimento, situação, categoria, datas e produto conforme consultas reais; não resolver carga no navegador criando consultas lentas no servidor.

## 5. Arquitetura de frontend proposta

1. **API:** métodos de uma página por chamada, parâmetros tipados/documentados e suporte a `AbortSignal`. O wrapper já repassa opções ao fetch, mas deve preservar cancelamento como cancelamento, em vez de transformá-lo em erro de conexão.
2. **Consultas por domínio:** hooks para lista/detalhe de produtos, categorias, receitas e movimentações. Chave de cache inclui estabelecimento, filtros, página, tamanho e ordenação. Deduplicar consultas iguais e limitar retenção. Escolher entre ampliar a infraestrutura existente ou biblioteca específica após estimar custo; não adicionar dependência sem necessidade.
3. **Tabela remota:** receber linhas da página, total, página, tamanho, ordenação e callbacks. Desligar sort/slice locais no modo remoto. Manter modo local somente para listas pequenas como linhas de receita em edição.
4. **Estado na URL:** busca, IDs de filtros, situação, tipo, intervalo, página e ordenação. Alterar filtro retorna à página zero; voltar/avançar restaura a visão. Hoje apenas parte dos filtros de produtos é refletida na URL.
5. **Seletores remotos:** autocomplete acessível de produtos/categorias, busca com debounce de aproximadamente 300 ms e página limitada. Carregar por ID as opções já selecionadas que não estão na página; indicar inativo e impedir uso incompatível sem esconder o motivo.
6. **Mutações:** estado pendente por operação, impedir duplo envio, atualizar o detalhe com resposta do servidor e invalidar apenas consultas afetadas. Mudança de ingrediente também invalida resumo dos drinks dependentes; definir essa dependência no contrato/cache.
7. **Store global:** retirar coleções completas e decisões de saldo; manter sessão, preferências e estado transversal mínimo. Migrar consumidores de forma incremental para não quebrar caixa e outras telas que hoje compartilham esses arrays.

Formatação, expansão de linha, seleção de uma página e validação de campos continuam locais. O objetivo é reduzir trabalho proporcional ao banco inteiro, sem criar uma requisição para cada interação puramente visual.

## 6. UI/UX a implementar

### Listas e filtros

- Diferenciar “nenhum cadastro”, “nenhum resultado com estes filtros”, “carregando”, “falha” e “dados anteriores sendo atualizados”. Reposição e validades não devem anunciar estoque saudável enquanto a carga falhou ou não terminou.
- Mostrar total vindo do servidor, filtros ativos e ação limpar. Manter linhas anteriores durante recarga com indicação discreta; não alternar para tabela vazia a cada tecla.
- Exibir data/hora de atualização quando relevante e ação de recarregar. Ao perder conexão, não sugerir que uma alteração foi salva.
- Tornar explícito “selecionar esta página” versus “todos os resultados”. Exportação integral deve respeitar o filtro inteiro; etiquetas podem usar seleção limitada. Nunca chamar uma página de exportação completa.
- Não deixar coluna aparentar ordenação global quando a API não a suporta. Implementar suporte ou retirar a interação até existir.

### Formulários e detalhes

- Unidade junto ao campo e saldo: “50 ml”, “3 un”, com explicação de embalagem versus unidade-base quando necessário. Evitar longas opções de select combinando nome e todos os saldos.
- Mostrar o efeito previsto de uma movimentação como estimativa e o saldo confirmado após resposta; servidor resolve concorrência.
- Entrada, saída, perda e ajuste devem ter intenção explícita. Não classificar perda pelo que foi escrito em observação.
- Preservar valores em erro; mapear `fieldErrors` para campos, resumo acessível e foco no primeiro erro. Preservar diferenças entre 400, 403, 404, 409 e falha de conexão.
- Informar bloqueio de fracionamento/volume com motivo; não oferecer edição que o backend recusará.
- Separar situação cadastral (ativo/inativo) de situação de estoque (zerado/crítico/baixo/estável).
- Detalhe de movimento deve apresentar tipo original, unidade, saldo anterior/posterior, operador, referência e origem do drink quando houver.
- Manter validação de saída sem receita, ingrediente inativo/ausente e saldo insuficiente; apresentar ação útil para corrigir, em vez de números zero fabricados.

### Acessibilidade e telas menores

Preservar tabelas semânticas, labels e foco já existentes. Validar navegação de combobox por teclado, anúncio de carga/erro, retorno de foco de modal/drawer, contraste e status com texto além de cor. Em viewport pequeno, priorizar produto, saldo/unidade e ações, deixando detalhes secundários expansíveis. Essas verificações exigem navegação real na implementação.

## 7. Ordem de execução

| Etapa | Entrega | Dependência / critério de conclusão |
| --- | --- | --- |
| 1 — Contratos e confiabilidade | Mapear unidades, tipos, status, campos locais e parciais; corrigir estados de erro e mensagens de persistência | Nenhuma falha de receita vira vazio; nenhuma operação parcial é anunciada como integral |
| 2 — Paginação real | API paginada, tabela remota, URL, cancelamento, detalhes por ID; migrar categorias/produtos/movimentações | Abrir tela carrega somente a página e recursos necessários; histórico antigo é consultável |
| 3 — Drinks completos | Receita ML/UN explícita, seleção de produtos sem volume, resumo remoto e cadastro consistente | Caso vodka + morango passa em cadastro, edição, custo, rendimento, detalhe e baixa |
| 4 — Agregados e reposição | Status, indicadores por categoria, reposição, histórico agregado, giro/cobertura e exportação | Totais e filtros correspondem ao conjunto completo, independentemente da página |
| 5 — Lotes e importação | Persistência de lotes/validade/custo, FEFO, NF-e idempotente e migração assistida | Duas sessões veem a mesma distribuição de saldo e não duplicam importação |
| 6 — Remoção de dependências antigas | Retirar sincronização global, campos operacionais locais e compensações substituídas por transações | Nenhuma tela depende de carregar todo o catálogo; regressão dos consumidores compartilhados concluída |

As etapas podem ser entregues por recurso, mas não misturar uma lista paginada com cálculos que pressupõem catálogo completo. Funcionalidades sem contrato devem ficar claramente indisponíveis/incompletas até a respectiva entrega. Não remover o carregamento global antes de migrar seus consumidores.

## 8. Validação e critérios de aceite

### Integração e domínio

- Filtros combinados, totais, página vazia e última página; ordenação estável; busca de movimento além dos 300 recentes; datas inclusivas com contrato de fuso documentado.
- Drinks com ML e UN sem volume; ingrediente inativo, repetido, removido e saldo insuficiente. Testar receita somente unitária e receita mista, inclusive saída.
- Duas sessões movimentando o mesmo saldo; duplo clique; timeout depois de gravação; falha entre etapas. Confirmar idempotência e ausência de saldo negativo no servidor.
- Atualização de categoria refletida por ID; ativação/inativação; campos apagados; erro de categoria vinculada e produto com histórico.
- Histórico mantém origem, unidade e snapshot da receita; perda usa enum. Indicadores e exportação usam os mesmos filtros.
- Lotes e NF-e, quando implementados: recarga sem localStorage, outro navegador, importação repetida, perda parcial e bloqueio de vencidos.

### Desempenho e UX

- Instrumentar número de requests, bytes transferidos, memória e tempo de interação antes/depois com bases de 100, 1.000 e 10.000 produtos e histórico maior que 300 registros.
- Abrir uma página não pode gerar uma chamada por drink nem percorrer todas as páginas. Renderizar somente a página solicitada; não serializar catálogo/histórico inteiro a cada mudança.
- Digitação rápida aplica somente a última consulta, sem resultados antigos sobrescrevendo novos e sem toast de erro para cancelamento intencional.
- Testar teclado, tela estreita, conexão lenta, erro da API e sessão sem permissão; rascunhos devem sobreviver a falha de envio.
- Definir metas de latência/memória com aparelho-alvo e ambiente de referência após medir a base atual; não declarar ganho numérico sem medição.

Já existem testes E2E de produtos, categorias e movimentações. O teste de receita com UN usa energético não fracionado **com volume de 250 ml**, portanto não cobre o morango sem volume. Expandir esses cenários, além de testes de contrato e testes de integração transacional no backend. Os testes não foram executados nesta análise.

## 9. Mapa de evidências para implementação

Caminhos relativos às raízes de cada repositório; nomes de funções servem de âncora para evitar dependência de linhas mutáveis.

| Repositório / arquivo | Evidência principal |
| --- | --- |
| Front: `src/shared/api/api.js` | `todasAsPaginas`, limites de movimentações, adaptadores de produto/receita/movimento e wrapper request |
| Front: `src/app/providers/store/StoreProvider.jsx` | `syncCatalog`, `LOCAL_FIELDS`, `saveProductRemote`, `espelhado`, `postarMovimentos`, `finalizeSale` |
| Front: `src/shared/ui/data-table/DataTable.jsx` | Ordenação e paginação locais |
| Front: `src/shared/lib/hooks/useResource.js` | Estado assíncrono sem cancelamento efetivo da requisição |
| Front: `src/pages/catalog/products/ui/ProductsPage.jsx` | Filtros, exportação e cálculos locais |
| Front: `src/pages/catalog/categories/ui/CategoriesPage.jsx` | Agregação por nome e CRUD integrado |
| Front: `src/features/catalog/product-editor/ui/ProductForm.jsx` | Ingredientes por volume, unidades e dependência de store |
| Front: `src/features/catalog/product-details/ui/DrinkDrawer.jsx` e `InsumoDrawer.jsx` | Detalhes dependentes do catálogo e receitas locais |
| Front: `src/entities/inventory/model/stock.js` e `lots.js` | Status, custo, rendimento e FEFO locais |
| Front: `src/pages/inventory/{movements,restock,expiry,invoice-import}/ui/` | Histórico, reposição, validade e NF-e |
| Front: `src/entities/access/model/pages.js` | `canEdit(role)` versus permissões efetivas |
| Front: `e2e/produtos.spec.js`, `movimentacoes.spec.js`, `categorias.spec.js` | Cobertura existente e lacuna de ingrediente sem volume |
| Back: `src/main/java/valhalla/core/stock/app/modules/estoque/controller/` | Parâmetros e endpoints disponíveis |
| Back: `src/main/java/valhalla/core/stock/app/modules/estoque/service/ProdutoService.java` | Filtros por Specification, paginação e regras cadastrais |
| Back: `src/main/java/valhalla/core/stock/app/modules/estoque/service/ReceitaDrinkService.java` | Validações de ingredientes e ML/UN |
| Back: `src/main/java/valhalla/core/stock/app/modules/estoque/service/MovimentacaoEstoqueService.java` | Filtros, travas, transação e snapshot da receita |
| Back: `src/main/java/valhalla/core/stock/app/modules/estoque/dto/` | Campos persistíveis e dados de histórico descartados no cliente |
| Back: `src/main/java/valhalla/core/stock/app/shared/pagination/RespostaPaginadaDto.java` | Envelope paginado existente |
| Back: `src/main/java/valhalla/core/stock/app/modules/dashboard/` | Agregações existentes e limites de reaproveitamento |

## 10. Decisões a fechar antes das respectivas entregas

1. Regra única de status para padrão/drink e comportamento de receita incompleta.
2. Definição de unidade de estoque, compra e venda; precisão decimal e arredondamento; sem assumir que toda UN precisa ser inteira.
3. Persistência de itens livres, doses e fardos e migração dos dados locais.
4. Tipos incluídos em giro/cobertura, política de reposição e escopo dos indicadores.
5. Escopo transacional de importações e demais operações compostas que alteram estoque.
6. Seleção/exportação da página versus resultado completo e limites para impressão de etiquetas.

Essas decisões não impedem iniciar a integração dos filtros e da paginação já suportados. Elas impedem apresentar cálculos e operações novas como regras definitivas sem contrato de domínio.
