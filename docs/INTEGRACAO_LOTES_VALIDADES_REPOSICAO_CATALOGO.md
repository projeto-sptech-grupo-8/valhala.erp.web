# Integração de lotes, validades, reposição e catálogo

> Revisão posterior: o backend passou a aceitar lote/validade no POST de produto e removeu código de barras/descrição. As seções antigas sobre cadastro em duas etapas e EAN são históricas. Consulte [Atualização dos contratos de Catálogo e Estoque](ATUALIZACAO_CONTRATOS_CATALOGO_ESTOQUE.md) para o comportamento vigente.

Data: 15/11/2026. Escopo: frontend de Catálogo e Estoque. Backend inspecionado como fonte dos contratos, sem alterações. Exportação de Produtos e drinks não foi modificada.

## 1. Diagnóstico do código atual

O backend evoluiu desde os documentos anteriores do projeto. A análise encontrou suporte real a lotes e fardos que ainda não era utilizado pela interface.

| Área | Antes desta integração | Situação após a implementação |
| --- | --- | --- |
| Validades e lotes | `LocalStockGate`, catálogo completo, lotes do navegador e indicadores calculados localmente | Consulta direta de uma página de `/lotes` e resumo global de `/lotes/resumo` |
| Baixa de vencidos | Consumo de lote local seguido de espelhamento genérico de movimentações | `PERDA` diretamente na API, informando o `loteId` real e a quantidade-base do lote |
| Entradas manuais | Código do lote como referência; sem campo de validade | Código e validade enviados em entradas e ajustes positivos |
| Saídas manuais | Sem escolha de lote remoto | Escolha paginada de lote de origem ou FEFO automático no servidor |
| Detalhes de movimentação | Exibia somente referência textual de lote | Mostra também as alocações reais de `lotes[]`, com quantidade e validade |
| Reposição | KPIs e alertas do dashboard; saldo e mínimo não eram exibidos | Exibe saldo e mínimo e resolve a unidade correta, inclusive ml para fracionados |
| Fardos no produto | Campos visuais sem persistência | Leitura e gravação de `fardo` e `unidadesPorFardo` no cadastro e edição |
| Movimentação em fardos | Não exposta | Alternância unidades/fardos para produto não fracionado configurado; conversão confirmada pelo servidor |
| Código de barras e descrição | Contrato existia, mas campos não estavam no formulário atual | Campos opcionais disponíveis no cadastro e edição, com envio e limpeza explícita |
| Etiquetas por validade | Lotes de memória/localStorage | Lotes reais consultados apenas no modo por validade, para os produtos exibidos |
| XML | Lote e validade ficavam fora do payload espelhado | A validade passa a acompanhar a entrada enviada ao servidor; fluxo de NF continua legado e parcialmente local |

Documentos antigos que dizem que o backend não possui lotes/fardos descrevem um estágio anterior e não devem orientar novos payloads. Este documento registra o contrato inspecionado nesta data.

## 2. Contratos inspecionados

### Lotes

`GET /lotes` devolve `RespostaPaginadaDto<LoteResponseDto>`:

- Filtros: `produtoId`, `situacao`, `venceEmDias`, `incluirZerados`.
- Paginação: `pagina` iniciada em zero; `tamanho` até 100.
- Ordenação permitida: `validade`, `codigo`, `quantidadeAtual`, `criadoEm`; direções ASC/DESC.
- Dados: `id`, `produtoId`, `produtoNome`, `produtoSku`, `unidadeEstoque`, `codigo`, `validade`, `diasParaVencer`, `situacao`, `quantidadeAtual`, `custoUnitario`, `valorCusto`, `entradaEm`.

`GET /lotes/resumo` devolve:

- `referencia`, `lotesComSaldo`, `vencidos`, `vencemEm7Dias`, `vencemEm30Dias`, `semValidade`, `valorVencido`, `valorEmRisco`.
- O resumo considera **produtos ativos com lotes de saldo positivo**. A listagem permite consultar lotes de produtos inativos e incluir zerados; por isso seus totais não precisam coincidir com os KPIs.

Fontes: `LoteEstoqueController`, `LoteEstoqueService`, `LoteResponseDto`, `ResumoValidadeLotesResponseDto`, `SituacaoValidadeLote` e `ControleLotesEstoque` no backend.

### Movimentações

`POST /movimentacoes-estoque` aceita, além dos campos anteriores:

- `validade`: somente em ENTRADA/AJUSTE_POSITIVO.
- `loteId`: lote específico em SAIDA/AJUSTE_NEGATIVO/PERDA.
- `emFardo`: conversão da quantidade por `unidadesPorFardo` no servidor.

As respostas incluem `lotes[]` com `loteId`, `codigo`, `validade` e `quantidade` alocada. O frontend mantém quantidades fracionadas em ml; não converte novamente o saldo retornado de um lote para embalagens.

### Reposição

`GET /dashboard/resumo?meses=1` já retorna os KPIs globais e alertas com `produtoId`, `nome`, `categoria`, `unidadeMedida`, `quantidadeAtual`, `estoqueMinimo` e `status`.

O serviço possui `LIMITE_ALERTAS = 5`. Não há endpoint dedicado de reposição com paginação e filtros globais neste backend. A implementação não simula uma consulta completa baixando todas as páginas de produtos.

O saldo e mínimo do alerta são valores-base. A unidade cadastrada no produto pode ser “garrafa” mesmo que o saldo de um fracionado esteja em ml. A tela consulta metadados de até cinco produtos, com concorrência limitada a dois, para identificar fracionados. Se a unidade não puder ser confirmada, mostra “unidade-base”, sem rotular ml como garrafas.

### Catálogo

`ProdutoResponseDto`, `ProdutoRequestDto` e `ProdutoAtualizacaoRequestDto` já incluem `fardo` e `unidadesPorFardo`. O frontend normaliza esses campos como `vendaFardo` e `unidadesFardo`.

`quantidadeInicialEmFardos` também existe no backend, mas o formulário mantém a quantidade inicial explicitamente em unidades/embalagens, para não alterar silenciosamente a interpretação do campo existente. A entrada em fardos fica disponível na tela de movimentação para produtos não fracionados.

## 3. Regras de validade e estoque

As regras são as do servidor. O frontend não recalcula a situação de cada lote com o relógio do navegador.

| Situação | Regra |
| --- | --- |
| VENCIDO | Data anterior à referência do servidor |
| VENCE_EM_7_DIAS | De hoje até 7 dias, inclusive |
| VENCE_EM_30_DIAS | Entre 8 e 30 dias, inclusive |
| VALIDO | Acima de 30 dias |
| SEM_VALIDADE | Sem data cadastrada |

O dia do vencimento ainda é vendável segundo a regra atual do backend. O KPI de 8 a 30 dias não soma novamente os próximos sete dias. O filtro “Precisam de atenção” utiliza `venceEmDias=30`, incluindo vencidos e próximos vencimentos, excluindo lotes sem data.

`valorCusto` e `valorEmRisco` vêm do servidor. Em fracionados, o backend calcula custo por ml a partir do custo e volume da embalagem. A interface não multiplica quantidade em ml pelo custo da garrafa.

O backend reconcilia saldos antigos como `SEM-LOTE`. Mesmo os GETs de lotes/resumo podem acionar essa reconciliação interna. Não existe criação paralela de lote no navegador para “completar” a resposta.

FEFO significa consumir primeiro o que vence primeiro; lotes sem validade ficam por último. Vencidos são bloqueados para venda/consumo. PERDA e operações administrativas permitidas pelo backend podem consumir vencidos. O servidor continua responsável por autorização, vínculo do lote ao produto, saldo, validação de datas e concorrência.

## 4. Fluxo de Validades e lotes

1. Ao abrir a tela, são consultados uma página de `/lotes` e `/lotes/resumo`, sem hidratar o catálogo legado.
2. Os quatro KPIs exibem vencidos, de hoje a sete dias, de oito a trinta dias e valor em risco. Em carregamento/erro, mostram `—`, não zero inventado.
3. O filtro permite situação, inclusão de zerados, tamanho da página e busca de produto pelo autocomplete remoto existente.
4. Toda mudança de filtro volta à página zero. Ordenação e paginação são enviadas ao banco; só campos permitidos pelo contrato são ordenáveis.
5. Recolher filtros mantém busca e ações visíveis. A linha divisória também desaparece, seguindo o padrão visual do catálogo.
6. Atualizar recarrega lista e resumo. Erro em um não transforma o outro em um resultado falso; há feedback de erro e opção de tentar novamente.

A exportação CSV já existente em Validades foi mantida com escopo explícito da página exibida; não carrega todos os lotes. A exportação de Produtos e drinks não foi alterada.

As sugestões antigas de promoção não foram mantidas como se fossem regras do backend: o DTO de lote não fornece preço sugerido de venda ou desconto por prazo. Exibir esses números exigiria uma política comercial separada. A tabela prioriza validade, situação, saldo e custo oficiais.

### Registrar perda

O botão de cada linha permite baixar somente lote vencido com saldo positivo e exige `MOVIMENTAR_ESTOQUE` na interface. O backend também valida a permissão.

Exemplo:

```json
{
  "produtoId": "UUID do produto",
  "loteId": 43,
  "tipo": "PERDA",
  "quantidade": 100,
  "motivo": "Perda por vencimento do lote VENCIDO-ML"
}
```

Para um lote de 100 ML, a quantidade enviada é 100, não 0,1 garrafa. O código do lote é uma descrição; `loteId` identifica o lote persistido.

A confirmação mostra produto, código, saldo e validade. Um bloqueio por referência impede envio duplicado por cliques rápidos. Só após a resposta de sucesso o lote é considerado concluído e o catálogo legado é invalidado.

“Baixar vencidos desta página” é explicitamente limitado aos registros exibidos; não promete baixar todos os vencidos do estabelecimento. As operações são sequenciais e não formam uma transação única. Em falha parcial, os lotes concluídos saem da lista pendente, a interface informa o erro e não os reenvia. Não há estorno automático genérico.

Em perda de conexão, a resposta é ambígua: o envio pode ter sido aceito. O botão de confirmação fica bloqueado. A orientação é fechar, atualizar a consulta e verificar o histórico antes de iniciar outra operação, sem retry automático.

## 5. Fluxo das movimentações e alimentação dos lotes

### Entrada ou ajuste positivo

O usuário informa produto, quantidade, código do lote e validade opcional. A entrada também aceita número de NF. O frontend envia `lote` e `validade` no POST.

O servidor cria/credita o lote. Sem código e com validade, pode gerar `VAL-<validade>`; sem ambos, utiliza `SEM-LOTE`. Conflitos entre código já existente e validade são apresentados conforme o erro retornado pelo backend.

### Saída, perda ou ajuste negativo

O seletor de lote consulta `/lotes?produtoId=...` paginado. A escolha padrão é “Automático (FEFO no servidor)”, que omite `loteId`. Uma escolha específica envia o ID real.

Vencidos não ficam selecionáveis em saída de venda/consumo. Perdas e ajustes negativos permitem sua seleção; a validação final permanece no servidor. Trocar produto/operação limpa a escolha anterior para não enviar lote de outro produto.

### Fardos

Configuração de venda por fardo e unidades por fardo agora é salva e recarregada no produto. Mínimo de duas unidades é validado no formulário e no backend. Drink não recebe configuração de fardo.

Na movimentação de produto não fracionado configurado, o usuário escolhe unidades ou fardos. Em fardos, o frontend envia a quantidade informada e `emFardo=true`; não multiplica também o payload. A prévia multiplica apenas para mostrar a estimativa de saldo. A resposta do servidor é a confirmação oficial.

Não foi habilitada entrada de fracionados em fardos: o conversor atual do backend multiplica por unidades, sem uma conversão explícita adicional por volume para ml. Essa combinação precisa de contrato inequívoco antes de expor um seletor que possa registrar saldo incorreto.

## 6. Catálogo e etiquetas

Nome, categoria, unidade padrão, preço, custo, saldo, mínimo, fracionamento, receitas e status continuam usando os endpoints já integrados. SKU continua automático; drinks continuam sem estoque próprio.

Código de barras e descrição continuam conectados na edição e no formulário de drink, mas foram removidos de **Novo produto padrão** por solicitação de interface. Ao editar, limpar um desses campos envia string vazia, em vez de omitir a alteração e manter o valor antigo. A validação de EAN para impressão continua específica das etiquetas: não se inventa EAN quando o cadastro contém outro formato ou verificador inválido.

### Validade no cadastro de produto padrão

Novo produto padrão exige “Data de validade” junto do estoque inicial, com asterisco vermelho e bloqueio de envio quando ausente. Essa data pertence ao lote inicial, não é um atributo global do produto. A quantidade inicial também precisa ser maior que zero para permitir a criação do lote com validade. A edição de produtos existentes mantém a validade nas operações por lote.

Como `ProdutoRequestDto` não aceita validade, o frontend cria o produto com `quantidadeInicial=0` e registra uma única ENTRADA com a quantidade inicial em unidade-base e a data informada. O backend identifica o lote pela validade quando o código é omitido. Não se registra saldo na criação e novamente na entrada.

Se o produto for criado e a entrada falhar, seu ID é preservado: uma nova tentativa conclui a entrada sem criar outro produto. Falhas de conexão na entrada bloqueiam repetição automática e orientam consultar histórico/lotes. As duas requisições não são uma transação única; pode existir produto criado com entrada pendente. O cadastro de novo produto padrão não permite omitir a data; os demais fluxos que não informam validade continuam usando seus contratos anteriores.

No modo de etiqueta por validade:

1. A interface consulta o resumo para obter a referência de data do servidor.
2. Consulta somente lotes dos produtos exibidos na página de etiquetas, com dois produtos simultâneos e 20 lotes por resposta.
3. Há navegação de páginas de lotes por produto. Não é necessário baixar todos os lotes de todos os produtos.
4. O usuário escolhe um lote real. A escolha permanece ao navegar pela lista de impressão.
5. Para imprimir por validade, cada produto selecionado precisa de lote escolhido. Lote real sem validade recebe faixa cinza. Falha de consulta não recupera datas antigas do localStorage como se fossem oficiais.
6. Nome do lote e validade ficam no trabalho de impressão. As preferências de aparência da etiqueta continuam locais por usuário, pois são preferências de impressão.

Se a referência de data não carregar, há aviso explícito e a cor usa o calendário do navegador. Abrir etiquetas no modo padrão/manual não consulta lotes.

## 7. XML: parte conectada e limites

A conversão `fromMovimento` agora encaminha `validade` em entradas e ajustes positivos. Assim, as entradas originadas da conferência XML podem alimentar os lotes reais, junto com código e número da NF.

O restante do fluxo XML ainda usa o store legado: parser no navegador, vínculos fornecedor/produto e controle de chaves importadas locais. Não existe endpoint de importação fiscal transacional neste módulo. Custo médio, idempotência global da NF e atomicidade entre vários itens não são garantidos por esta integração. Esse fluxo não deve ser descrito como uma NF importada integralmente e transacionalmente no backend. Não foi reescrito o mecanismo legado de compensações nesta tarefa.

## 8. Reposição: o que está integrado e o que falta

Integrado: KPIs oficiais, até cinco alertas prioritários, saldo atual, mínimo, categoria, situação e ações para histórico, edição e nova entrada. A unidade de fracionados é confirmada por consulta de metadados, limitada aos alertas recebidos.

Os filtros de nome, categoria e situação atuam somente nesses alertas; a explicação está no card. Eles não são filtros globais de produtos. Os KPIs permanecem globais e não mudam com esses filtros locais.

Ainda falta um contrato específico para uma lista completa de reposição:

- Paginação e filtros de nome/categoria/nível no servidor.
- Saldo e mínimo já acompanhados de unidade-base inequívoca.
- Prazo de fornecedor, estoque de segurança, sugestão de compra e pedido de compra.
- Disponibilidade vendável descontando vencidos, quando desejado como critério de reposição.

Não foi criada no frontend uma quantidade “ideal” de compra baseada em duplicar o mínimo sem regra comercial acordada.

## 9. Organização do código e desempenho

| Arquivo | Responsabilidade |
| --- | --- |
| `src/shared/api/api.js` | Consultas de lotes/resumo, mapeamento de fardos, validade nas movimentações e sinal de cancelamento do dashboard |
| `src/entities/inventory/model/remoteLots.js` | Rótulos, filtros e payload de perda de lote |
| `src/pages/inventory/expiry/ui/ExpiryPage.jsx` | Tela remota, KPIs, filtros, paginação e confirmação de perda |
| `src/features/catalog/remote/LotSelect.jsx` | Seletor remoto e paginado de lote de origem |
| `src/pages/inventory/movements/ui/NewMovementPage.jsx` | Entrada com validade, escolha de lote e conversão visual de fardos |
| `src/pages/inventory/movements/ui/MovementsPage.jsx` | Alocações reais por lote no detalhe |
| `src/pages/inventory/restock/ui/RestockPage.jsx` | Alertas oficiais, saldo/mínimo e unidade correta |
| `src/features/catalog/product-editor/ui/ProductForm.jsx` | Campos já suportados pelo backend e persistência de fardo |
| `src/features/catalog/product-labels/ui/EtiquetasModal.jsx` | Lotes oficiais sob demanda na impressão por validade |

As leituras reutilizam a API central, cookies, refresh de sessão, CSRF nas gravações e `useQueryResource` com cancelamento e proteção contra respostas antigas. A tela de validades mantém uma página e um resumo em memória. Nenhuma consulta automática carrega o catálogo inteiro para montar seus filtros ou KPIs.

## 10. Validação

Testes automatizados verificam filtros enviados ao servidor, ausência de hidratação do catálogo em validades, baixa por `loteId`, quantidade em ml, recarga do resumo, bloqueio após resposta de rede ambígua, falha parcial sem reenvio dos lotes concluídos, validade em entrada, lote escolhido em saída, persistência de fardo, movimentação em fardos sem multiplicação dupla, etiquetas com lote real e unidade de fracionados em reposição. As regras puras de payload e faixas têm testes em `tests/remoteLots.test.js`.

Os testes de interface interceptam os endpoints com respostas no formato do backend; não gravam em banco real. A homologação com a API em execução deve validar a migration V9, permissões reais e concorrência de operações entre usuários. Exportação de Produtos e drinks permanece fora do escopo desta solicitação.


## Correção de escopo — 17/11/2026

A tela principal Validade e lotes foi restaurada: filtros anteriores, seletor de 10/20/50 itens por página e sem o campo adicional de data. Exportar continua ao lado da busca, como solicitado anteriormente.

O novo filtro pertence ao painel de lotes do produto no modal de etiquetas, no modo Por validade. Usa Validade até, com referência do servidor, convertendo a data para venceEmDias. Aceita hoje ou datas futuras e inclui lotes vencidos. Não simula busca exata ou intervalo histórico que o backend não oferece. A consulta mantém produtoId e tamanho=5; não há seletor para alterar esse limite. Navegar entre páginas continua permitido.

Alterar/limpar a data retorna à página inicial dos lotes e preserva todas as seleções de impressão, inclusive fora do filtro. A escolha dos lotes permanece explícita e obrigatória por produto selecionado no modo validade. Sem referência válida, o campo de data fica desabilitado; a consulta normal continua disponível.

O aviso de exclamação no título das etiquetas continua abrindo somente por hover, sem abrir por foco automático do modal.


### Ajuste final do filtro das etiquetas — 17/11/2026

O campo de data foi substituído por Faixa de validade, com as mesmas categorias usadas na métrica de cores: Vencido/vermelho, Hoje a 7 dias/laranja, 8 a 30 dias/amarelo, Mais de 30 dias/verde e Sem validade/cinza. Todas remove a restrição. A consulta envia situacao ao backend, produtoId e tamanho=5; não filtra somente a página carregada. Alterar a faixa reinicia a página e preserva os lotes escolhidos para impressão. A tela principal de Validade e lotes permanece no formato anterior.
