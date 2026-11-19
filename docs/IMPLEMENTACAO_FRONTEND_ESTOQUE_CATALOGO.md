# Estoque e Catálogo — antes, depois e limites da integração

Atualizado em 14/11/2026. Referência: [plano de integração](PLANO_INTEGRACAO_ESTOQUE_CATALOGO.md).

## 1. Escopo e resultado

Esta entrega implementa a parte do planejamento que pode funcionar com os endpoints existentes. Foram alterados exclusivamente arquivos do repositório frontend, nas telas de catálogo e estoque e na infraestrutura compartilhada necessária para elas. Nenhum endpoint, DTO, migration, regra Java ou banco foi alterado.

As telas de produtos, categorias e movimentações passaram a consultar páginas no servidor. O editor e os detalhes carregam registros por ID. Drinks aceitam ingredientes unitários sem volume. Reposição utiliza os alertas já disponibilizados pelo servidor. Lotes e importação XML continuam sendo integrações parciais, agora identificadas e abertas por ação explícita.

O planejamento original contém entregas que exigem backend. Elas não foram simuladas no navegador como se estivessem concluídas. As seções seguintes descrevem o comportamento efetivamente implementado e o que continua pendente.

## 2. Comparação geral

| Área | Antes | Depois desta entrega |
| --- | --- | --- |
| Produtos | Carregamento integral, filtro e paginação locais | Página consultada na API com busca, categoria por ID, tipo, situação cadastral e ordenação suportada |
| Categorias | Todas as categorias e contagens cruzadas por nome com o catálogo inteiro | Consulta paginada; busca e situação no servidor; navegação para produtos por ID |
| Histórico | Até 300 movimentos baixados, com filtro local posterior | Consulta paginada por produto, tipo exato e período, sem limite artificial de 300 |
| Editor | Dependia do produto estar no store global | GET por ID; receita e ingredientes necessários carregados sob demanda |
| Receita | Quantidade interna dependente de volume; unitários sem volume excluídos | Quantidade explícita em ML ou UN, enviada diretamente no contrato da receita |
| Detalhes | Dados derivados de coleções globais | Consulta do produto e, para drink, sua receita e seus ingredientes |
| Falha de receita | Podia virar lista vazia silenciosamente | Erro visível com nova tentativa; edição bloqueada até obter os dados |
| Gravação parcial | Tentativa de excluir produto ao falhar receita | ID confirmado preservado; receita pode ser reenviada sem novo POST de produto |
| Exportação | Recorte local apresentado sem delimitação suficiente | Botão indica explicitamente exportação da página ou selecionados desta página |
| Reposição | Cálculo global local, sugestão de compra e drinks afetados | Resumo e alertas prioritários fornecidos pelo backend, com alcance declarado |
| Validade/XML | Carregamento implícito e promessas de persistência incompleta | Abertura explícita do fluxo local e informação sobre o que é persistido |

## 3. Produtos e drinks

### Consulta

`ProductsPage.jsx` envia `busca`, `categoriaId`, `tipo`, `ativo`, `pagina`, `tamanho`, `ordenarPor` e `direcao` ao GET `/produtos`. Parâmetros vazios são omitidos. O usuário escolhe 10, 20 ou 50 itens por página, dentro do limite existente no backend.

Busca por texto tem debounce de 300 ms. Mudança de filtro retorna à primeira página. Os parâmetros ficam na URL, permitindo recarga e restauração da consulta pela navegação do navegador. A página inicial da API é zero.

Somente Código, Produto, Preço e Custo oferecem ordenação na tabela, mapeada respectivamente para `sku`, `nome`, `precoVenda` e `precoCusto`. Categoria, saldo, situação e campos derivados não oferecem uma ordenação local que pudesse parecer global.

O envelope da API mantém `itens`, `pagina`, `tamanho`, `totalItens`, `totalPaginas`, `primeira` e `ultima`. A tabela exibe o total do servidor e envia a troca de página para nova consulta; não aplica `sort` e `slice` a uma coleção completa no modo remoto.

### Informações apresentadas

Produtos padrão mostram saldo, mínimo, preço, custo, margem disponibilizada pela API e situação cadastral. Fracionados exibem saldo/mínimo em ml, usando valores de unidade-base recebidos do servidor. Isso evita reconstruir um saldo exato multiplicando uma fração de embalagem já arredondada.

O nível de estoque apresentado por linha é identificado como estimado e usa apenas o registro recebido. Não existe filtro global por nível, pois esse parâmetro não está disponível na API. Produtos com saldo positivo e mínimo não definido são identificados como “Sem mínimo”.

Drinks mostram acesso à receita em vez de um saldo próprio. Custo e rendimento são estimados no detalhe, onde os ingredientes necessários foram consultados. A lista não busca uma receita para cada drink.

Giro e cobertura não são apresentados como informações globais confiáveis, pois dependiam de `saidas30d` local e não possuem contrato de consulta correspondente. Links antigos com filtro por nome de categoria ou status mostram orientação para refazer a seleção suportada; não aplicam o filtro somente à página atual.

### Exportação, etiquetas e permissões

“Exportar esta página” exporta somente as linhas recebidas. “Exportar selecionados desta página” trabalha com a seleção da página. “Etiquetas desta página” usa produtos padrão presentes nessa página. A troca da consulta reinicia a seleção de produtos.

Exportação e seleção ficam indisponíveis enquanto a consulta atualiza ou falha. Exportação integral do resultado filtrado continua pendente de uma solução apropriada no servidor.

Edição usa `GERENCIAR_ESTOQUE`; entrada usa `MOVIMENTAR_ESTOQUE`. Um usuário com permissão apenas de visualização não recebe botões de gravação nas telas novas. A API continua validando as permissões.

## 4. Categorias

GET `/categorias` passa a receber busca, ativo, página, tamanho e ordenação. A tela mantém criação, edição, ativação/inativação e exclusão com tratamento de erros.

O acesso aos produtos utiliza `categoriaId`, eliminando a associação pelo nome visível. Renomear uma categoria não muda sua identidade no filtro.

As contagens de produtos e o percentual de estoque saudável foram retirados desta apresentação porque dependeriam de carregar o catálogo inteiro ou de um agregado ainda inexistente. Não são calculados sobre a página atual para fingir um total global.

A validação imediata de nome repetido pode reconhecer duplicidade na página carregada; o backend permanece responsável pela unicidade no conjunto inteiro e pelo retorno de conflito. Exclusão de categoria vinculada continua orientando o usuário a inativá-la.

## 5. Editor de produto e receita

### Carregamento e formulário

O editor consulta o produto por ID. Para drink, busca a receita e apenas os produtos referenciados, com no máximo quatro consultas de ingredientes concorrentes por lote de carregamento. Uma falha nesses dados é apresentada como erro, com nova tentativa; não é convertida em receita vazia.

O formulário mantém nome, categoria, unidade de venda, preço, custo, mínimo, quantidade inicial, fracionamento e volume. Em edição, mostra saldo como somente leitura e permite ativar/inativar. Fracionamento e volume permanecem bloqueados após cadastro, respeitando o comportamento conservador do formulário anterior e as restrições do domínio.

Campos de dose comercial, fardo e validade local deixaram de ser oferecidos neste novo cadastro como se fossem dados centralizados. A interface informa o alcance da gravação. Dados locais antigos não são apagados ou migrados automaticamente por esta entrega.

O cancelamento com alteração pendente solicita confirmação. Recarregar/fechar a página com alteração pendente aciona o aviso nativo do navegador. Não foi implementado bloqueio universal de todos os links internos do painel.

### Seleção de ingredientes

O seletor consulta produtos PADRAO ativos, com busca e navegação de opções em páginas de 20. Não exige volume para produtos unitários. O produto já selecionado é obtido por ID caso esteja fora da página das opções. Um ingrediente inativo já persistido pode ser identificado, mas impede validar uma receita nova como disponível.

Os controles usam busca rotulada e select nativo para permitir operação por teclado sem introduzir uma implementação própria de combobox. Falha ao carregar opções tem mensagem e botão de nova tentativa.

Cada linha da receita mantém:

```json
{
  "produtoId": "id-do-ingrediente",
  "quantidade": 3,
  "unidadeConsumo": "UN"
}
```

Selecionar fracionado define ML e quantidade inicial de 50. Selecionar unitário define UN e quantidade inicial de 1. O usuário pode editar a quantidade positiva. Não é criada conversão fictícia de morango para ml.

O formulário valida ingrediente ativo/PADRAO, quantidade positiva finita, unidade compatível e ausência de duplicatas. O backend faz a validação definitiva. A nova receita contém somente itens rastreados: a opção “Livre”, que não era persistida pelo contrato atual, não é oferecida como ingrediente centralizado.

### Custo e rendimento

As estimativas envolvem somente os ingredientes da receita em edição/detalhe:

- Fracionado: custo por ml = custo da embalagem dividido pelo volume.
- Unitário: custo por unidade aplicado diretamente à quantidade UN.
- Rendimento: menor inteiro de saldo-base dividido pela quantidade por drink entre todos os ingredientes.
- Ingrediente ausente, inativo ou incompatível: estimativa indisponível, sem assumir estabilidade.

Exemplo validado: vodka de R$ 50 por 1.000 ml, com 2.000 ml em estoque, e morango de R$ 1 por unidade, com 30 unidades. Receita de 50 ML + 3 UN resulta em custo estimado de R$ 5,50 e rendimento de 10 copos. Na saída de dois drinks, o contrato de receita corresponde a 100 ML e 6 UN; o servidor efetua a baixa transacional.

O saldo-base é preservado no adaptador como `quantidadeEstoqueBase` e `estoqueMinimoBase`. As estimativas não autorizam saída nem reservam ingredientes. A movimentação é validada pelo servidor no momento da gravação.

### Salvamento em etapas e rede

O backend continua tendo operações separadas para produto e receita. `saveCatalogProduct` envia POST para novo produto ou PATCH dos campos alterados, depois PUT da receita para drinks.

Quando a API confirma o produto, seu ID é mantido imediatamente no formulário. Se a receita falhar, a mensagem informa que os dados do produto foram salvos e que a receita não foi confirmada. O usuário corrige e reenvia usando o ID existente. Não há exclusão automática silenciosa, e não é enviado outro POST do mesmo produto nessa retomada.

Se a resposta do POST se perder antes de confirmar o ID, o resultado é ambíguo. O formulário bloqueia novo envio e orienta consultar o catálogo. Não existe garantia de idempotência de criação sem suporte do servidor. Se a receita tiver sido gravada e apenas a resposta se perder, o PUT pode substituir a receita novamente no mesmo ID.

Duplo envio é bloqueado por estado pendente e referência síncrona. Erros preservam os valores preenchidos e apresentam mensagem e erros de campos disponíveis.

## 6. Movimentações

### Histórico

GET `/movimentacoes-estoque` recebe produto por ID, enum de tipo, datas inicial/final, página, tamanho e ordenação. É possível consultar movimentos antigos além dos 300 registros que antes eram baixados.

Os tipos são explícitos: entrada inicial, entrada, saída, saída de drink, perda, ajuste positivo e ajuste negativo. A tela não agrupa enums distintos em um filtro que a API não suporta. Produto é selecionado por consulta remota; não há busca textual local no histórico.

Datas invertidas geram mensagem antes de consultar o histórico. A interpretação do intervalo inclusivo e do horário continua seguindo o contrato existente do backend, sem alteração de fuso nesta entrega.

Quantidades e saldos usam `unidadeEstoque` da resposta. O detalhe mostra saldo anterior/posterior, operador, lote de referência, número da NF, motivo, origem do drink e snapshot da receita quando disponível. O snapshot apresenta `quantidadePorDrink` e `quantidadeConsumida`, preservando a receita aplicada na época.

Os antigos percentuais e contagens calculados sobre até 300 movimentos foram retirados. Não há indicadores agregados globais ou exportação integral implementados; exporta-se explicitamente esta página.

### Gravação direta

O formulário utiliza os comandos existentes da API diretamente. Entrada, saída, perdas e ajustes enviam quantidade positiva na unidade-base: ML para fracionado e UN para unitário. Ajuste tem direção explícita. Perda e ajuste exigem justificativa no formulário.

“Saída de drink” utiliza POST `/movimentacoes-estoque/saida-drink`. O frontend envia ID e número de drinks; o backend decide a baixa dos ingredientes. A inferência de perda por palavras na observação não participa deste novo formulário.

O saldo antes/depois mostrado durante preenchimento é estimativa. O sucesso mostra o saldo confirmado pela resposta. Enquanto grava, o formulário e seu botão de fechamento ficam bloqueados. Falha de conexão com resultado incerto impede repetir cegamente e orienta conferir o histórico.

Esta API não grava validade nem custo de entrada. Por isso, o formulário novo não oferece esses campos nem promete atualizar custo médio. Lote permanece referência textual de histórico, sem representar saldo persistido por lote.

## 7. Reposição

A tela usa GET `/dashboard/resumo?meses=1`, já existente, aproveitando resumo de críticos, zerados, produtos sem mínimo e alertas prioritários.

A relação de alertas pode ser limitada pelo servidor. A interface declara que ela não é uma lista completa de compras. Não calcula sugestão de quantidade, estoque baixo ou drinks afetados sobre uma página incompleta. As ações disponíveis levam ao produto, ao histórico e ao registro de entrada conforme permissões.

Ausência de alertas retornados é apresentada como ausência de alertas nessa consulta, sem afirmar que todo o estoque está em ordem. Consulta pendente ou com falha tem estado próprio.

Uma reposição completa, paginada, com quantidades sugeridas, política de compra e impacto em drinks permanece dependente de contrato específico no backend.

## 8. Validades e importação XML

Esses fluxos antigos ainda dependem de dados locais e do catálogo completo. `LocalStockGate` impede que sua abertura inicie esse carregamento automaticamente. O usuário lê o alcance do recurso e aciona “Carregar catálogo e continuar”. Durante carga/erro, o conteúdo operacional não aparece como pronto.

### Validades

As mensagens deixam explícito que validade e distribuição por lote são conhecidas neste navegador. Um resultado vazio não atesta validade do estoque físico. O aviso anterior de bloqueio garantido por FEFO foi substituído por informação sobre o alcance local.

A baixa por perda continua usando o fluxo legado e exige conferência dos lotes. Não há migração automática da distribuição de lotes para o servidor, pois esse modelo não existe no backend atual.

### XML

A leitura aceita arquivos XML até 5 MB. A tela informa que entradas são enviadas ao servidor, mas chave de NF-e, vínculos de fornecedor, validade e controle da importação são locais. Não promete persistir custo médio ponderado.

O envio composto legado permanece sequencial com tentativas de compensação. Ele não se torna uma transação por meio desta alteração de frontend. O usuário é informado de que falhas podem deixar entradas parciais e deve conferir histórico antes de repetir. A deduplicação local não oferece garantia entre dispositivos.

## 9. Desempenho, store e compatibilidade

`useQueryResource` conserva somente a resposta atual/anterior de cada componente, cancela a consulta ao mudar a chave/desmontar e impede resposta obsoleta de substituir a nova. A interface mantém os dados anteriores durante recarga com indicação de atualização/erro.

Leituras idênticas simultâneas do catálogo são compartilhadas em `pendingReads`. Cada consumidor pode cancelar; a rede é cancelada quando o último consumidor sai. O registro é removido após conclusão. Não há cache permanente de respostas nem retenção ilimitada de páginas.

Ao iniciar diretamente em estoque/catálogo, o store global começa leve: não desserializa o catálogo operacional antigo nem o sobrescreve com o estado vazio. A hidratação legada é adiada até um fluxo antigo precisar dela. O teste de contrato verifica a preservação do conteúdo local preexistente ao abrir o catálogo remoto.

As páginas migradas não acionam `syncCatalog` ao montar ou após suas gravações. Elas atualizam a própria consulta e marcam o catálogo legado como desatualizado para uma futura entrada em consumidor antigo.

Caixa, relatórios e outras telas fora do escopo ainda dependem do store legado e podem carregar coleções completas ao serem abertas. Se esse catálogo já estiver em memória após visitar essas telas, ele não é descartado automaticamente. A chave antiga de armazenamento continua existindo; isolamento/migração completa do estado por sessão ainda não foi entregue.

Os helpers legados de estoque receberam compatibilidade mínima com unitários sem volume para não ignorar esses ingredientes após salvar receitas no editor novo. A preparação legada de saída também rejeita receita vazia/ingrediente ausente e aceita fator unitário. O formato novo explícito foi adotado no editor/detalhe; o adaptador legado permanece para os consumidores antigos. Não foi feita reescrita do fluxo comercial de caixa.

## 10. Arquivos e responsabilidades

| Arquivo | Responsabilidade |
| --- | --- |
| `src/shared/api/api.js` | Consultas paginadas, cancelamento, compartilhamento de leituras pendentes e saldos-base |
| `src/shared/lib/hooks/usePagedQuery.js` | Estado assíncrono cancelável e parâmetros de URL |
| `src/shared/ui/data-table/DataTable.jsx` | Modo remoto sem sort/slice local; modo antigo mantido para outras telas |
| `src/features/catalog/remote/RemoteControls.jsx` | Busca com debounce, seletores remotos, tamanho de página e feedback |
| `src/features/catalog/remote/catalogModel.js` | Leitura de detalhe, estimativas de receita e salvamento em etapas |
| `src/features/catalog/remote/ProductDetail.jsx` | Detalhes consultados sob demanda |
| `src/features/catalog/remote/LocalStockGate.jsx` | Abertura explícita dos fluxos locais de lote/XML |
| `src/features/catalog/remote/remote.module.css` | Layout responsivo dos controles e formulários novos |
| `src/features/catalog/product-editor/ui/ProductForm.jsx` | Editor integrado com receita ML/UN e tratamento de falha parcial |
| `src/pages/catalog/products/ui/ProductsPage.jsx` | Listagem remota, exportação/etiquetas da página |
| `src/pages/catalog/categories/ui/CategoriesPage.jsx` | Categorias paginadas e acesso por ID |
| `src/pages/inventory/movements/ui/MovementsPage.jsx` | Histórico remoto e comandos diretos de movimentação |
| `src/pages/inventory/restock/ui/RestockPage.jsx` | Resumo e alertas de reposição existentes |
| `src/pages/inventory/expiry/ui/ExpiryPage.jsx` | Mensagens e abertura do controle local |
| `src/pages/inventory/invoice-import/ui/InvoiceImportPage.jsx` | Limite de XML e esclarecimento de persistência parcial |
| `src/app/providers/store/StoreProvider.jsx` | Hidratação legada adiada e invalidação após mutação |
| `src/entities/inventory/model/stock.js` | Compatibilidade de estimativas legadas com unitários |
| `e2e/catalog-remote.spec.js` | Testes do frontend com interceptação dos contratos da API |
| `playwright.catalog.config.js` | Execução isolada dessa suíte com servidor Vite local |

## 11. Validação realizada

A suíte dedicada validou 11 cenários em navegador Chrome com API simulada, sem conta real ou acesso ao banco:

1. Catálogo consulta uma página, envia busca/ordenação e não baixa receitas; preserva armazenamento legado.
2. Histórico consulta página além dos 300 registros, mantendo tipo, datas e unidade.
3. Drink com vodka e morango sem volume: custo, rendimento, payload ML/UN e retomada após falha sem duplicar POST.
4. Entrada envia quantidade em unidade-base e tipo exato, sem classificar observação como perda.
5. Categoria navega para produtos por ID.
6. Perfil de visualização não recebe ações de gravação; tela de 390 px sem transbordamento da página.
7. Validade não carrega catálogo completo antes da ação explícita.
8. Erro de receita impede edição, oferece nova tentativa e não fabrica receita vazia.
9. Intervalo invertido não consulta o histórico.
10. Edição direta permite inativar por PATCH sem carregar o catálogo completo.
11. Detalhe de saída apresenta quantidades por drink e consumidas no snapshot histórico.

Comando: `node node_modules/@playwright/test/cli.js test --config playwright.catalog.config.js`.

O build de produção passou. O lint direcionado aos arquivos alterados passou. O lint geral apresenta erros preexistentes em `e2e/fixtures.js`, onde o callback `use` do Playwright é interpretado como hook React. Esses fixtures não foram modificados nesta entrega.

Capturas da receita em desktop e dos produtos em celular foram geradas em `test-results/` e inspecionadas. Essa pasta é ignorada pelo Git. A tabela usa rolagem horizontal interna em tela estreita. Não foi feita auditoria completa com leitor de tela nem teste de carga com uma base real de 10.000 produtos.

O build ainda informa bundle principal acima de 500 kB. Esta entrega reduz consultas e processamento das telas migradas; não implementa divisão global do bundle por rotas. Não há promessa de redução percentual de memória ou latência sem medição em aparelho-alvo.

## 12. Pendências futuras, sem alteração de backend nesta entrega

| Pendência | Motivo |
| --- | --- |
| Filtrar/ordenar globalmente por nível, rendimento, giro e cobertura | API atual não oferece esses filtros e agregados |
| Contagem e saúde por categoria | Exigem agregado global por categoria |
| Reposição completa e sugestão de compra | Alertas do dashboard não equivalem à consulta completa de reposição |
| Exportação integral filtrada | Precisa evitar baixar todo o resultado no navegador |
| Cadastro transacional de drink + receita | POST/PATCH e PUT continuam sendo operações distintas |
| Idempotência de comandos de estoque/criação | Resultado incerto de rede não pode ser resolvido só pelo cliente |
| Saldo por lote, FEFO e bloqueio centralizado de vencidos | Modelo e validação ainda são locais |
| NF-e transacional e única entre dispositivos | Backend não persiste importação e chave como operação de domínio |
| Custo médio de entrada | Campo não faz parte do comando existente de movimentação |
| Itens livres, doses e fardos centralizados | Não fazem parte do contrato atual da receita/produto utilizado |
| Eliminar store operacional legado e migrar cache por sessão | Afeta consumidores fora das abas solicitadas e exige plano de migração dos dados locais |
| Bloquear toda navegação interna com formulário sujo | Além do cancelamento/recarregamento tratados, exige integração de navegação do painel |

Os dados de negócio no servidor continuam sendo a fonte das consultas e das decisões finais de saldo. Os recursos locais mantidos são identificados como parciais, com os limites descritos acima.
