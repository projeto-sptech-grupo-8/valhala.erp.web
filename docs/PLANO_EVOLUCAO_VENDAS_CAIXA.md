# Plano de evolução de Vendas e Caixa — projeto atual

Data: 15/11/2026. Situação: proposta para avaliação; nenhuma tela foi implementada nesta etapa.

## 1. Objetivo e limites

Adaptar as ideias de `especificacao-frontend-caixa (1).md` ao projeto atual, preservando arquitetura, componentes, navegação e linguagem visual. O anexo é referência de fluxo: seus caminhos antigos, instruções e afirmações de disponibilidade não substituem a verificação do código atual.

Esta etapa entrega somente este planejamento. A implementação futura se concentra no domínio **Vendas**. Não alterar backend nem telas de estoque, catálogo, controle de acesso, configurações gerais ou financeiro. Não criar contas a pagar/receber nem apresentar recebimentos do caixa como resultado financeiro da empresa.

A proposta adiciona **Pedidos**, **Sessões de caixa** e **Ajustes do caixa**, dentro de Vendas. As justificativas e os impactos estão descritos antes de qualquer implementação.

## 2. Situação encontrada

| Área | Situação observada | Mudança proposta |
| --- | --- | --- |
| Caixa | `CashPage.jsx` concentra abertura, comandas, itens, recebimentos, sangria, fechamento e histórico. | Separar composição da página, operações e apresentação. |
| Sessão e comandas | `StoreProvider` persiste estado local em `localStorage`. | Ler e gravar sessões e pedidos pela API de caixa. |
| Finalização | `store.finalizeSale` usa espelhamento que envia movimentações de estoque. | Vendas chama pedidos e pagamentos; o backend controla baixa, reserva e reversão. |
| Disponibilidade | Catálogo e rendimento de drinks são montados por arrays locais. | Consultar uma página do catálogo; não apresentar estimativa local como disponibilidade garantida. |
| Autorização | `AuthorizeModal` verifica nome de perfil e PIN local. | Usar permissões e credenciais do autorizador validadas pelo backend. |
| Auditoria | Lê e filtra um array local. | Consultar `/caixa/auditoria` com filtros e paginação remota. |
| Notas fiscais | `InvoiceListPage.jsx` usa dados demonstrativos e aviso de backend pendente. | Não tratar como emissão fiscal integrada. Deixar fora do primeiro incremento. |
| Integração | `shared/api/api.js` resolve cookies, CSRF e refresh, mas não tem um domínio de caixa conectado às telas. | Reutilizar essa infraestrutura nos métodos de Vendas. |

O backend local contém controllers e serviços de caixas físicos, terminais, taxas, políticas, sessões, pedidos, descontos, pagamentos e auditoria. A existência do código não comprova credenciais, conectividade dos aparelhos nem homologação em produção.

## 3. Proposta de abas em Vendas

| Grupo | Aba | Alteração | Objetivo |
| --- | --- | --- | --- |
| Atendimento | Caixa | Melhorar a atual | Atender e receber rapidamente. |
| Atendimento | Pedidos | Nova | Retomar atendimentos e consultar histórico sem sobrecarregar o PDV. |
| Controle | Sessões de caixa | Nova | Conferir turnos, fechamentos e divergências. |
| Controle | Auditoria do caixa | Integrar a atual | Ver responsáveis, autorizações e mudanças. |
| Operação | Ajustes do caixa | Nova | Preparar políticas, maquininhas e taxas de venda. |
| Documentos | Notas fiscais | Existente, integração pendente | Não confundir comprovante com documento fiscal. |

A separação atende dois usos: operador em atendimento e gerência em consulta. Não proponho uma aba principal para cada pendência de desconto ou pagamento: esses estados pertencem ao pedido.

**Ajustes do caixa** terá três sub-abas: **Políticas e pagamentos**, **Caixas e maquininhas**, **Taxas e repasse**. Ficará em Vendas; não altera Configurações gerais nem Financeiro.

Manter `#/caixa`, `#/auditoria` e `#/notafiscal`. Novas rotas indicativas: `pedidos`, `sessoescaixa`, `ajustescaixa`. O pedido selecionado pode usar `pedidoId` na URL; cada modal não precisa de uma rota própria.

## 4. UI e UX comuns

- Preservar tema, tokens, ícones Lucide, largura e espaçamento dos cards atuais.
- Títulos com ícones, descrição curta e ajuda `?`/`!` acessível por mouse e teclado.
- Filtros recolhíveis nas listagens, mantendo buscas e ações visíveis. Recolher também a linha divisória.
- Ações secundárias em três pontos, com cabeçalho **Ações**; o principal **Receber pagamento** continua destacado no PDV.
- Detalhes históricos em painel lateral; formulários curtos e confirmações em modal; configuração extensa em sub-aba própria.
- Obrigatórios com asterisco vermelho, placeholders de exemplo, máscara monetária e campo apagável sem zero preso.
- Status com texto, ícone e cor: verde confirmado, âmbar aguardando, azul parcial/informativo, vermelho erro ou atenção. Não depender somente de cor.
- Não exibir UUID como informação principal nem tornar o nome do operador um botão sem finalidade.

## 5. Entrada no Caixa e abertura do turno

1. Consultar `GET /caixa/sessoes/atual`.
2. Durante a consulta, mostrar carregamento contextual; não piscar o formulário de abertura.
3. `200`: carregar a sessão e retomar os pedidos do servidor.
4. `204`: mostrar **Abrir caixa** e buscar caixas ativos paginados.
5. Falha: erro com **Tentar novamente**; falha de rede não significa caixa fechado.

O operador vem da autenticação e aparece somente para leitura. Campos: caixa físico, fundo de troco obrigatório e observação opcional. Selecionar automaticamente o único caixa ativo disponível somente quando isso for conhecido na consulta inteira, não porque a primeira página tem um item. Caixas `emUso` ficam indisponíveis com explicação.

Sem caixa disponível, orientar a consultar sessões ou a gerência. Não criar outro turno automaticamente nem oferecer cadastro de caixa sem permissão.

## 6. Composição e operação do PDV

```text
Caixa Principal · Operador · Aberto às 18:00      [Sangria] [Reforço] [Fechar caixa]
Recebido aprovado no turno | Dinheiro esperado na gaveta

[Em atendimento] [Aguardando cobrança] [Pagamento parcial]      [Nova comanda]
Lista paginada de comandas · número · identificação · status

Buscar produto / SKU                           Pedido #123 · Mesa 04
Categoria e resultados paginados                Itens e quantidades
Produtos e drinks                              Subtotal · Desconto · Total
                                               Pago · Pendente · Restante
                                               [Receber pagamento]
```

Em telas menores, alternar **Produtos / Pedido**, preservando o atendimento e o resumo. Evitar colunas apertadas e modais que ultrapassem a tela.

O cabeçalho usa `sessao.resumoAtual`. `qtdVendas` representa pedidos com pagamentos aprovados e pode incluir pagamentos parciais: rotular como **Pedidos com recebimento**, não **Vendas concluídas**. Mostrar `totalVendas` como **Recebido aprovado**, com ajuda explicando o escopo.

### Comandas e itens

- Criar comanda no servidor e usar número/ID reais, sem numeração comercial local.
- Canais: Balcão, Mesa, Retirada e Delivery. Mesa exige identificação; trocar canal preserva o texto informado.
- Enviar itens por `produtoId` e `quantidade`; o backend determina preço e totais.
- Busca por nome/SKU no endpoint paginado de produtos, debounce de aproximadamente 300 ms e cancelamento da consulta anterior.
- Não anunciar EAN integrado: o contrato atual de catálogo retirou código de barras. Leitor que envie SKU é possível; EAN exigiria outro contrato.
- Preservar F2 para busca, F4 para nova comanda e F9 para pagamento, respeitando permissões, campos e diálogos ativos.
- A criação/edição valida estoque no servidor. Um pedido aberto não significa estoque definitivamente reservado; a reserva depende do fluxo de pagamento.
- Editar somente no estado permitido e sem pagamentos ativos. Explicar o bloqueio em vez de oferecer controles que necessariamente falharão.
- Serializar atualizações dos itens. Durante um PUT, indicar **Salvando alterações…**; não disparar PUT concorrente a cada clique rápido.
- Se o salvamento falhar, preservar o rascunho e indicar que não foi salvo. Não cobrar itens locais divergentes do pedido confirmado.

**Paginação:** a API aceita um status por consulta. As filas do PDV devem consultar por status/sessão conforme a interação, com paginação. Não baixar todas as comandas nem apresentar o tamanho da página como total global de pedidos abertos. Um pedido em acompanhamento pode permanecer acessível ao trocar de fila.

## 7. Descontos e autorização

Modal com tipo **R$ / %**, valor e impacto no total. O limite sem autorização é a menor alçada entre percentual e valor fixo. A prévia não substitui a validação do servidor.

Acima do limite, separar dois caminhos:

1. **Autorizar agora:** usuário com permissão confirma; caso contrário, informar e-mail/senha do autorizador e motivo.
2. **Solicitar aprovação:** enviar sem credenciais, mantendo **Desconto aguardando aprovação**.

Não armazenar senha em storage, store global, logs ou telemetria. Limpar ao fechar/concluir. Remover o PIN mock do fluxo novo e não inventar bloqueio de tentativas em memória.

Desconto pendente bloqueia recebimento e oferece decisão gerencial ou **Remover solicitação**. A negação exige justificativa; a resposta do backend atualiza o pedido.

A listagem de pedidos não tem filtro `statusDesconto`. O detalhe e as comandas carregadas podem informar essa pendência, mas uma fila global específica depende de evolução do contrato. Não baixar o histórico para simular o filtro.

## 8. Recebimento e acompanhamento de pagamento

### Resumo e formas de recebimento

Mostrar **Total do pedido**, **Recebido aprovado**, **Cobranças pendentes** e **Saldo restante**. Pendência não é recebimento confirmado; os totais oficiais vêm do pedido.

Somente formas habilitadas ficam disponíveis. Em dinheiro: valor aplicado ao pedido, valor entregue e troco. Atalhos **Valor exato** e **Cliente entregou R$ 50** deixam claro que substituem o valor, evitando botões ambíguos que somam dinheiro duas vezes.

Em crédito, respeitar a configuração. `1x` continua disponível mesmo sem parcelamento; parcelas adicionais respeitam faixa e mínimo por parcela. A configuração atual limita a 12, embora o DTO de registro aceite até 24: seguir a configuração e a regra do serviço.

### Taxas e repasse

Consultar taxas por forma quando necessárias, respeitando paginação. Prévia de repasse efetivo usa gross-up:

`valorCobrado = (valorAplicadoAoPedido + taxaFixa) / (1 - taxaPercentual / 100)`

R$ 100,00 com repasse de 7,59% e sem taxa fixa gera aproximadamente **R$ 108,21**, não R$ 107,59. Mostrar **Aplicado ao pedido**, **Acréscimo**, **Total cobrado**. Antes da resposta, sinalizar **Prévia**; depois, usar os valores oficiais do pagamento.

Não dividir por zero em taxa de 100% com repasse. Não prometer parcelas iguais cujo somatório não fecha em centavos. Espelhar o arredondamento decimal do servidor nas estimativas e testar valores de fronteira.

### Point e contingência

Selecionar um único terminal ativo automaticamente; havendo vários, escolher por nome amigável. Distinguir UUID do vínculo (`terminalCaixaId`) do identificador físico (`terminalId`).

O DTO de terminal não fornece ocupação global. Mostrar ocupação conhecida por pagamentos carregados é possível, mas conflito do servidor é a autoridade. Ativo não significa conexão confirmada.

**Registrar pagamento manual** só aparece quando permitido. Explicar que registra um recebimento externo, sujeito à conciliação. Não apresentar como Pix já confirmado nem finalizar automaticamente.

### Estados de cobrança

Após enviar à Point, mostrar no pedido: maquininha, valor, forma, parcelas e situação. Permitir atender outra comanda enquanto aguarda.

| Estado | Mensagem | Comportamento |
| --- | --- | --- |
| PENDENTE / PENDENTE_NA_POINT | Aguardando a maquininha | Acompanhar e verificar situação. |
| EM_TERMINAL | Cliente está pagando | Não reenviar cobrança. |
| CANCELAMENTO_SOLICITADO | Cancelamento em processamento | Aguardar confirmação; não presumir cobrança cancelada. |
| PENDENTE_CONCILIACAO | Confirmar recebimento externo | Conferir comprovante, confirmar ou rejeitar. |
| ACAO_NECESSARIA | Pagamento precisa de atenção | Mostrar detalhe e opções válidas de recuperação. |
| APROVADO | Pagamento confirmado | Atualizar saldo; encerrar apenas quando o pedido estiver concluído. |
| RECUSADO / EXPIRADO / CANCELADO | Cobrança não concluída | Mostrar motivo e permitir nova tentativa quando o estado permitir. |
| ESTORNO_EM_ANDAMENTO | Estorno em processamento | Não anunciar devolução finalizada. |

Contador de validade é estimativa visual. Ao chegar a zero, consultar a API; não declarar expiração ou liberar reserva no cliente.

### Idempotência e conexão incerta

Cada tentativa de pagamento recebe chave própria. Repetir a mesma tentativa usa a mesma chave e payload; nova chave somente para uma nova intenção de cobrança. O serviço atual encontra a chave existente e devolve o pedido: reutilizá-la com valores diferentes pode recuperar a cobrança anterior.

Não repetir cobranças cegamente nem trocar a chave após timeout. Consultar pagamentos primeiro. Um registro técnico mínimo em `sessionStorage`, separado por usuário/pedido e sem credenciais, pode guardar chave/intenção para recuperação após F5; não é fonte de verdade do saldo ou pagamento.

Abertura, criação de pedido e sangria não têm a mesma garantia de idempotência observada em pagamentos. Se a resposta for incerta, reler o estado antes de propor repetição.

### Atualização leve

- Polling somente para cobranças em andamento conhecido e com tela visível.
- Intervalo inicial de cerca de três segundos, sem requisições sobrepostas; reduzir frequência após falhas.
- **Verificar pagamento agora** permite sincronização explícita.
- Ao recuperar foco, atualizar pontualmente, sem recarregar todo o catálogo.
- Encerrar acompanhamento em estado final ou fora do contexto. Limitar concorrência entre pedidos monitorados.
- Conciliação e atenção não justificam polling incessante a cada dois segundos.
- F5 reconstrói estado pela API. Não simular webhook em produção.

## 9. Sangria, reforço e fechamento

Sangria/reforço permanecem em modais curtos: valor, motivo e identificação do caixa. Sangria destaca dinheiro disponível esperado e valida a prévia, mantendo tratamento de conflito. Usar o resumo devolvido pelo servidor.

O modal de fechamento segue esta ordem:

1. Turno, responsáveis e recebimentos por forma.
2. Fundo de troco, reforços, sangrias e esperado na gaveta.
3. **Dinheiro contado**.
4. Resultado **Sem diferença**, **Sobra de R$ X** ou **Falta de R$ X**.
5. Justificativa obrigatória na divergência e observação opcional.

Sem diferença, sessão fecha. Com diferença, fica **EM_FECHAMENTO** e segue para análise em Sessões de caixa; o caixa físico é liberado conforme a regra do servidor. Não pedir PIN para simplesmente enviar a conferência.

Pendência de pagamento, conciliação e estorno em andamento podem bloquear fechamento. Mostrar o motivo e abrir Pedidos filtrado pela sessão, preservando o formulário de conferência. Não inventar bloqueio para todo pedido aberto: respeitar as regras reais retornadas e informar atendimentos não concluídos.

## 10. Pedidos: nova tela

Filtros recolhíveis: **Sessão**, **Status**, **Canal**, período de criação e itens por página. Ordenação no servidor. A API atual não oferece busca textual, número nem operador como filtro de pedidos: não exibir esses controles como se estivessem integrados. Uma busca textual futura depende de contrato, não de download do histórico.

Tabela: número, identificação, canal, operador, criação, total, recebido, restante, situação e Ações. O filtro de período é de criação do pedido, não data do recebimento.

Detalhe lateral com itens, descontos e pagamentos. **Continuar atendimento** abre o Caixa no pedido permitido; sessão e contexto são validados pelo backend, sem presumir que qualquer pedido antigo seja editável.

Distinguir:

- **Descartar comanda:** pedido vazio; confirmação leve.
- **Cancelar pedido:** com itens e sem pagamentos aprovados/pendentes; motivo e autorização conforme contrato.
- **Estornar venda:** pedido concluído; confirmação forte e motivo.

**Limite relevante:** `PedidoCaixaService.estornarPedido` marca pagamentos como estornados e chama a reversão de estoque. Não foi identificada nesse método chamada de refund à adquirente. Não prometer “dinheiro devolvido ao cartão/cliente”. A devolução financeira externa precisa ser confirmada com o backend antes de habilitar uma ação com essa promessa. Registro interno e refund são fatos diferentes; este plano não cria uma tela de Financeiro para resolver isso.

## 11. Sessões de caixa: nova tela

Filtros de status, caixa, operador e período de abertura, enviados ao servidor. Atalho **Divergências pendentes** corresponde a `status=EM_FECHAMENTO`.

Tabela: caixa, operador, abertura, fechamento, esperado, contado, diferença, situação e Ações. No DTO resumido, dinheiro esperado pode ser nulo enquanto a sessão está aberta: mostrar **—**, não zero. O detalhe fornece o resumo atual.

Lateral com resumo atual ou congelado no fechamento, movimentações, justificativa e resolução. **Resolver divergência** exige permissão e observação conforme contrato. Após sucesso, estado **FECHADA**, preservando diferença e trilha histórica.

Não somar a página para apresentar “valor global das divergências”. Contagem de um status exato pode usar `totalItens` da consulta correspondente; total monetário global exigiria agregado.

## 12. Auditoria

Consultar eventos por período, tipo, sessão e usuário, com paginação remota. Rótulos devem refletir o enum real; tipos desconhecidos continuam legíveis, sem desaparecer.

Tabela: data, evento, responsável, autorizador, referência, valor e Ações. Detalhe lateral com motivo e comparação **Antes / Depois** quando os dados existirem; não despejar JSON como conteúdo principal.

Não reconstruir auditoria oficial com eventos locais nem indicadores antifraude globais com uma única página. Novos indicadores dependem de agregados próprios.

## 13. Ajustes do caixa: nova tela em Vendas

### Políticas e pagamentos

Formas habilitadas, Point, contingência, impressão no aparelho, parcelamento, prazo de cobrança, repasse e limites de desconto. Explicar taxa absorvida e repassada. Point exige terminal ativo conforme serviço; orientar a sub-aba de maquininhas antes de habilitar.

### Caixas e maquininhas

Lista paginada de caixas com status e **Em uso**. Detalhe com terminais, cadastro/edição e permissões. Nome/status são editáveis; trocar aparelho não é simplesmente editar o identificador de um vínculo existente.

**Buscar aparelhos no Mercado Pago** é ação explícita, com carregamento e erro contextual. Alteração PDV/STANDALONE pede explicação do impacto e confirmação; não alternar automaticamente ao entrar no Caixa.

### Taxas e repasse

Tabela por forma/parcelas, percentual, valor fixo, política herdada ou específica e status. Edição em modal evita mudanças acidentais em várias linhas. Prévia sobre R$ 100,00 é explicativa; líquido estimado não é liquidação bancária confirmada.

Carregar por filtro/página. Não inventar obrigatoriedade de uma faixa para cada forma sem regra comprovada no contrato.

## 14. Permissões e feedback

Usar `can('CAIXA_*')` nos componentes, sem comparação direta de nomes de perfil. O backend continua sendo a autoridade. O helper global atual concede acesso total a determinados nomes de perfil; removê-lo globalmente teria impacto fora de Vendas e não entra neste plano. Confirmar os códigos fornecidos na sessão e manter validação em todas as ações.

| Permissão | Uso |
| --- | --- |
| CAIXA_VISUALIZAR | Consultas de pedidos, sessões, auditoria e ajustes. |
| CAIXA_OPERAR | Abrir turno, atender, movimentar dinheiro e registrar pagamentos conforme regras da API. |
| CAIXA_FECHAR | Enviar fechamento. |
| CAIXA_AUTORIZAR_DESCONTO | Aprovar desconto acima da alçada. |
| CAIXA_CANCELAR | Cancelar pedido com itens. |
| CAIXA_ESTORNAR | Estornar pedido concluído. |
| CAIXA_RESOLVER_DIVERGENCIA | Resolver divergência gerencial. |
| CAIXA_CONFIGURAR | Alterar políticas, caixas, terminais e taxas. |

Reutilizar `ManagementFeedback.jsx`: mensagens persistentes perto da operação, foco acessível, carregamento e confirmações. HTTP 204 não é erro. Rede indisponível não é lista vazia. HTTP 409 exige releitura/orientação; 403 indica acesso negado; `fieldErrors` destaca campos.

Consultas podem ser repetidas pelo usuário. Mutações não são repetidas automaticamente só porque houve erro. Durante envio da operação, bloquear fechamento do modal e cliques duplicados. Após uma cobrança externa já ter sido registrada, permitir sair do acompanhamento e atender outra comanda sem cancelar o pagamento.

## 15. Contratos a integrar

| Contexto | Métodos principais |
| --- | --- |
| Sessões | GET `/caixa/sessoes/atual`, GET/POST `/caixa/sessoes`, GET `/caixa/sessoes/{id}` |
| Dinheiro do turno | POST `/caixa/sessoes/{id}/movimentacoes` |
| Conferência | POST `/caixa/sessoes/{id}/fechamento`, POST `/caixa/sessoes/{id}/resolucao-divergencia` |
| Pedidos | GET/POST `/caixa/pedidos`, GET/PUT `/caixa/pedidos/{id}` |
| Descontos | PUT/DELETE `/caixa/pedidos/{id}/desconto`, POST `/caixa/pedidos/{id}/desconto/decisao` |
| Pagamentos | POST/GET `/caixa/pedidos/{id}/pagamentos` |
| Recuperação | POST `/caixa/pedidos/{pedidoId}/pagamentos/{pagamentoId}/sincronizar`, `/cancelamento-point`, `/conciliacao` |
| Reversões | POST `/caixa/pedidos/{id}/cancelamento`, POST `/caixa/pedidos/{id}/estorno` |
| Auditoria | GET `/caixa/auditoria` |
| Políticas | GET/PUT `/caixa/configuracao` |
| Caixas | GET/POST `/caixa/caixas`, GET/PATCH `/caixa/caixas/{id}` |
| Terminais | POST `/caixa/caixas/{caixaId}/terminais`, PATCH `/caixa/caixas/{caixaId}/terminais/{terminalId}` |
| Point | GET `/caixa/terminais/mercado-pago`, PATCH `/caixa/terminais/{id}/modo-operacao` |
| Taxas | GET/POST `/caixa/taxas`, PUT `/caixa/taxas/{id}` |

Sessões usam `operadorUsuarioId`; auditoria usa `usuarioId`. Datas usam `dataInicio` e `dataFim`, não os nomes do módulo de estoque. Respeitar a whitelist de ordenação de cada endpoint.

Seleção de operador depende de permissão de consultar usuários. Sem permissão, não carregar a lista nem prometer autocomplete remoto que o endpoint atual não fornece. Caixas e produtos têm consultas paginadas próprias.

## 16. Organização do código

Estrutura indicativa, mantendo as camadas atuais:

```text
src/pages/sales/
  cash/ui/CashPage.jsx                  composição do PDV
  orders/ui/OrdersPage.jsx              nova consulta de pedidos
  cash-sessions/ui/CashSessionsPage.jsx nova consulta de turnos
  cash-settings/ui/CashSettingsPage.jsx ajustes operacionais
  audit/ui/CashAuditPage.jsx            auditoria remota

src/features/sales/
  authorization/                       adaptar a autorização existente
  cash-session/                        abertura, dinheiro e fechamento
  order-editor/                        itens, atendimento e salvamento
  discounts/                           solicitação e decisão
  payments/                            recebimento, Point e conciliação

src/entities/sales/
  api/                                 métodos autenticados e contratos
  model/                               estados, rótulos, guardas e hooks
  ui/                                  resumos e estados reutilizáveis
```

Não criar outro roteador, store global paralelo, tema ou biblioteca de componentes. Evitar dependências pesadas para formulários, tabelas e polling.

O request autenticado atual é privado em `shared/api/api.js`. Acrescentar um namespace de caixa nesse arquivo ou expor o cliente existente para `entities/sales/api`: escolher uma convenção, sem duplicar CSRF e refresh de sessão. É ajuste técnico compartilhado a serviço de Vendas, não mudança nas outras telas.

Reutilizar `useQueryResource` e o padrão de filtros em URL, adaptando parâmetros/opções à API de caixa. Consultar produtos pelo contrato existente sem modificar a tela de catálogo.

A nova Vendas deixa de chamar as ações locais de caixa/finalização. Não apagar imediatamente o legado do StoreProvider: Dashboard, Relatórios e Financeiro ainda possuem consumidores. Não copiar vendas reais para arrays locais para fingir integração financeira. Esses consumidores podem continuar sem refletir os novos pedidos reais, o que deve ser informado como pendência separada antes da entrega.

Históricos locais antigos não são automaticamente vendas reais. Não importar dados demonstrativos para a API nem misturá-los ao histórico oficial.

## 17. Impactos e aviso antes de mexer fora de Vendas

**Pontos técnicos compartilhados necessários:** `src/app/panelRoutes.jsx`, grupo/metadados de Vendas em `src/entities/access/model/pages.js`, métodos em `src/shared/api/api.js` e uso do sinal existente de invalidação de catálogo após uma operação confirmada. As alterações previstas ficam limitadas aos pontos de entrada do domínio Vendas.

**Ideias fora do escopo, que precisam ser comunicadas antes de executar:**

- Integrar Dashboard, Financeiro e Relatórios aos recebimentos reais.
- Apagar todo o estado legado do StoreProvider/localStorage.
- Alterar a política global de acesso por nome de perfil.
- Criar agregados globais de pendências ou novos filtros no backend.
- Reintroduzir EAN no catálogo ou implementar refund externo da Point.
- Integrar emissão fiscal ou mover controles para Configurações gerais.

Nenhuma dessas mudanças será feita como efeito colateral desta proposta.

## 18. Sequência de implementação

1. **Contratos e base:** métodos da API, estados, rotas e permissões de Vendas, testes com respostas simuladas.
2. **Turno real:** sessão atual, caixa físico, abertura, resumo, sangria e reforço.
3. **Pedido real:** comandas paginadas, canais, itens, salvamento serializado e conflitos de estoque.
4. **Dinheiro e pagamento dividido:** chave idempotente, troco e retomada por F5; remover a baixa manual de estoque do caminho novo de Vendas.
5. **Desconto e autorização:** alçadas, solicitação, decisão e bloqueio de recebimento pendente.
6. **Point e contingência:** equipamentos, parcelas, taxas, acompanhamento e conciliação. Preparar Ajustes do caixa antes de homologar os aparelhos.
7. **Gestão:** fechamento, Sessões de caixa, resolução de divergências e histórico de Pedidos.
8. **Auditoria e acabamento:** eventos remotos, comparação antes/depois, responsividade, atalhos e acessibilidade.
9. **Homologação:** fluxo completo com backend de desenvolvimento e simulador Point somente no ambiente permitido; depois, validar aparelho real. Mocks não significam homologação de produção.

O corte do PDV local para o remoto deve ser explícito. Não deixar dois caminhos “Finalizar venda”, um local e outro remoto, misturando APIs. Incrementos de desenvolvimento não significam liberar um PDV parcialmente integrado para uso real.

## 19. Critérios de aceite

- F5 recupera sessão, pedido, desconto e pagamento pelo servidor.
- Duas abas concorrentes não duplicam operações nem mascaram conflitos.
- Permissões valem para botão, atalho e URL; a API também valida.
- Mesa exige identificação; canais e bloqueios de edição seguem o contrato.
- Cobrança pendente permite atender outro pedido sem concluir a primeira.
- Pagamento parcial não é quitação; manual exige conciliação.
- Mesma chave/payload não cria outra cobrança; timeout não gera chave nova automaticamente.
- Desconto pendente bloqueia recebimento e permite remover ou decidir.
- Sangria acima do disponível e estoque insuficiente preservam contexto e explicam o conflito.
- Estorno não promete refund externo sem contrato confirmado.
- Divergência exige justificativa e mantém trilha após resolução.
- Filtros, ordenação e paginação são remotos; não baixar histórico para filtrar.
- Indicadores da página não são apresentados como totais globais.
- Receber pagamento de pedido não faz chamadas manuais a `/movimentacoes-estoque` ou `/saida-drink`.
- Testes cobrem teclado, foco, modais, desktop, tela estreita, falhas, resultado incerto e retorno ao pedido.
- Regressão preserva as telas de catálogo, estoque e controle de acesso.

## 20. Referências e limites da análise

Frontend consultado: `CashPage.jsx`, `CashAuditPage.jsx`, `InvoiceListPage.jsx`, `AuthorizeModal.jsx`, `StoreProvider.jsx`, `entities/sales/model/cash.js`, `shared/api/api.js`, `panelRoutes.jsx` e `entities/access/model/pages.js`.

Backend consultado: controllers de PedidoCaixa, SessaoCaixa, AuditoriaCaixa, ConfiguracaoCaixa, Caixa, TaxaPagamento e TerminalPoint; DTOs/enums de pedidos, pagamentos e sessões; `PedidoCaixaService`, `SessaoCaixaService`, `CalculoPagamentoEletronicoHelper` e `DisponibilidadePoint`.

Análise estática do código local e do anexo. Não foram executadas cobranças, aberturas de turno, configuração de aparelho, migração nem alterações do código de aplicação. O único artefato desta etapa é este plano.

## 21. Integração entregue nesta etapa

As rotas Caixa e Auditoria passaram a usar componentes remotos de Vendas. Foram acrescentadas Pedidos, Sessões de caixa e Ajustes do caixa, com permissão CAIXA_VISUALIZAR. Os métodos reutilizam o request autenticado existente, incluindo CSRF e renovação de sessão.

Implementado: abertura real de sessão, criação de comanda, inclusão e remoção de itens, consulta de pedidos, recebimento dividido, chave idempotente por tentativa, troco e prévia de taxas, descontos/solicitação/decisão, conciliação manual, sincronização e cancelamento de cobrança Point, sangria/reforço, fechamento, resolução de divergência, auditoria, políticas operacionais, cadastro/edição de caixas e terminais, modo de operação e cadastro/edição de taxas. As listagens principais e as listas de ajustes usam paginação remota.

O recebimento de um pedido não chama o finalizador local nem envia movimentações de estoque pelo frontend. A reserva/baixa pertence ao servidor. A recuperação de tentativa guarda somente o payload técnico e sua chave em sessionStorage, sem senha do autorizador. Depois de uma resposta incerta, a UI bloqueia repetição imediata; a retomada usa o mesmo payload e chave.

O acompanhamento de cobranças conhecidas consulta o pedido periodicamente enquanto visível e pausa com modal aberto. Trata-se de atualização por consulta, não de webhook no navegador. A confirmação financeira depende do estado devolvido pelo servidor.

### Limites e evolução visual ainda previstos

Esta entrega integra os controles operacionais, mas não encerra todos os refinamentos do planejamento: o seletor de abertura consulta até 100 caixas ativos; busca de terminais diretamente no Mercado Pago ainda não está exposta; não há atalhos F2/F4/F9, troca responsiva Produtos/Pedido nem barra de múltiplas comandas no próprio PDV. Para retomar uma comanda, usa-se Pedidos do turno. Canal e identificação são definidos na criação; a alteração posterior ainda não possui formulário próprio. Valores são preenchidos por campos numéricos, sem a máscara monetária específica das outras telas. Filtros de sessão por operador/caixa e o seletor completo de eventos de auditoria permanecem como melhorias de interface. A edição de taxa preserva a política de repasse específica já existente, sem oferecer ainda mudança entre herdar/repassar/absorver.

O estorno de pedido concluído não foi habilitado com promessa de refund da Point; o limite do backend descrito na seção 10 permanece. Notas fiscais continua pendente e Financeiro não foi alterado. Os indicadores legados fora de Vendas não passam a refletir automaticamente os novos pedidos remotos.

### Validação executada

Build de produção concluído. Teste de navegador com API simulada cobriu abrir turno, criar comanda, adicionar produto e receber em dinheiro, verificando chave idempotente e ausência de baixa manual de estoque. Dois testes de regressão cobriram catálogo remoto e filtros de perfis. Não foram realizadas cobranças reais nem homologação com aparelho Point. O build mantém o aviso pré-existente de bundle acima de 500 kB.

## 22. Melhoria visual e de usabilidade de Vendas

As telas remotas receberam cabeçalhos com ícones, resumos monetários em cards, estados com ícone e texto e hierarquia visual mais clara. Os itens da comanda usam linhas alinhadas com quantidade, produto, subtotal e remoção. Os pagamentos mostram situação e valor sem expor a chave técnica como informação principal.

A abertura apresenta o operador e uma orientação inicial. A comanda vazia explica como começar ou retomar um pedido. Ajustes usa navegação por botões com seleção explícita e políticas em cards com status Habilitado/Desabilitado. Os filtros mantêm ações visíveis ao recolher.

Modais têm largura consistente, campos em duas colunas quando há espaço, checkboxes com área clicável maior e disposição em uma coluna no celular. No recebimento, campos de dinheiro, parcelas e maquininha aparecem conforme a forma escolhida. Troco ganha um resumo próprio. As chamadas e regras do servidor foram preservadas.

Validação: fluxo de venda em API simulada, filtros recolhíveis, navegação dos ajustes e ausência de overflow horizontal em viewport de 390 px. Capturas de desktop e celular foram conferidas. Não houve alteração de backend, Financeiro ou Configurações gerais.

## 23. Caixa: abertura na página e consulta de sessões anteriores

O título principal Caixa ganhou o ícone já definido no registro de páginas. A abertura voltou a ser um formulário direto na página, com operador somente para leitura, seleção paginada de caixas ativos, fundo de troco com a mesma máscara monetária utilizada no catálogo e observação opcional. Os campos seguem o DTO de abertura: caixaId e fundoTroco obrigatórios, observacao opcional com até 2.000 caracteres; o operador é identificado pela autenticação.

O único caixa disponível é selecionado automaticamente apenas quando a resposta comprova que há somente um registro. Caixas em uso ficam desabilitados. O fundo permite zero, exige preenchimento e preserva os dados quando o servidor recusa a abertura. Uma resposta de rede incerta bloqueia repetição imediata e oferece verificar a sessão.

A seção Sessões anteriores está disponível antes e durante o turno: cinco registros por página no servidor, com filtro Fechadas/Divergências pendentes/Canceladas. Mostra caixa, operador, abertura, encerramento, dinheiro contado, diferença e situação. Os detalhes laterais consultam o servidor para mostrar fundo, recebimentos aprovados, esperado/contado, justificativa, resolução, observações e sangrias/reforços. Valores ausentes aparecem como traço. O link Ver todas as sessões abre a consulta completa existente.

O transporte de caixa foi isolado em entities/sales/api/cashApi.js para reaproveitamento das mesmas credenciais, CSRF e renovação de sessão, sem duplicar a implementação. A nova composição de abertura e histórico fica em CashOpening.jsx com estilos próprios. Não houve modificação no backend nem em Financeiro.

Validação com API simulada: fluxo completo de venda com abertura direta; ícone do título; operador somente leitura; seleção automática do único caixa; valor brasileiro convertido corretamente no payload; erro de conflito preservando os campos; histórico paginado e detalhes reais. Capturas de desktop e celular verificadas, sem overflow horizontal da página.

## 24. Cadastro contextual quando não há caixas ativos

A abertura agora oferece Cadastrar caixa quando a consulta retorna zero caixas ativos e o usuário tem CAIXA_CONFIGURAR. O modal inicia com Caixa Principal e sugere Caixa 2, Caixa Delivery e Caixa Eventos; essas sugestões somente preenchem o nome. Confirmar envia POST /caixa/caixas com nome. A opção só passa a existir no seletor depois do sucesso, quando a lista é consultada novamente e o ID real é selecionado. O cadastro não abre sessão automaticamente.

Conflitos de nome preservam o modal e a mensagem do backend. Há atalho para consultar caixas existentes em Ajustes. Queda de conexão bloqueia repetição imediata e permite reler a lista, evitando criar outro posto sem verificar a primeira tentativa. Sem permissão de configurar, o operador recebe orientação para solicitar cadastro/ativação e pode atualizar a consulta. Nenhuma opção fictícia nem cadastro automático foi introduzido.

Os testes com API simulada verificaram lista vazia, conflito, cadastro confirmado, seleção pelo ID retornado, ausência de abertura automática de turno e bloqueio de cadastro sem permissão. Nenhum caixa real foi criado durante os testes.

## 25. Caixa aberto: seleção visual de itens e comanda

O atendimento voltou a usar produtos/drinks em cards com ícone, nome, categoria e preço ao lado da comanda, retomando a organização visual do PDV antigo. A busca nome/SKU, categoria, tipo e paginação consultam o servidor; não houve retorno ao catálogo completo ou à baixa local de estoque.

O primeiro item pode criar uma comanda de balcão no backend; para identificar mesa ou outro canal, permanece Nova comanda. A lista de comandas do turno consulta estados e páginas no servidor e permite alternar pedidos. A comanda tem controles de aumentar/diminuir quantidade e os recebimentos integrados existentes. Alterações são serializadas e ficam bloqueadas enquanto a resposta é aguardada; conflito mantém a mensagem e não altera totais como se a gravação tivesse sucesso. Pedidos com pagamento ativo ou concluídos não permitem editar itens.

No celular, Produtos e Comanda são alternados por botões para evitar duas colunas apertadas. Não são exibidas quantidades disponíveis fictícias para drinks ou calculadas apenas do saldo físico. A disponibilidade é confirmada ao adicionar pelo servidor.

A composição fica em CashWorkspace.jsx e seu CSS próprio. O backend e o financeiro permaneceram intactos. Testes com API simulada verificaram adição por card, criação do pedido, aumento/redução de quantidade, consulta paginada por busca e layout móvel. O teste de venda com pagamento e o teste de abertura/histórico também passaram no novo fluxo. Capturas de desktop e celular foram inspecionadas.

## 26. Histórico do caixa aberto

Sessões anteriores foi removido da composição do caixa aberto. O histórico de turnos permanece apenas na tela de abertura, antes de existir uma sessão ativa.

O botão Histórico caixa abre um painel lateral consultado sob demanda. Ele mostra o caixa e o operador, início do turno, recebido aprovado, esperado na gaveta, fundo de troco, recebimentos por forma, sangrias e reforços. O resumo usa os dados da sessão; não soma somente a página de pedidos.

A lista do painel consulta pedidos vinculados à sessão com paginação de dez registros e filtro de situação. O padrão é Vendas concluídas. Pagamentos parciais, estornados e cancelados são consultas separadas para evitar apresentá-los como vendas concluídas. Cada pedido pode ser expandido para conferir os produtos com a descrição e os preços históricos, quantidade, subtotal, desconto, total e recebido. O primeiro pedido aparece expandido; detalhes dos demais só são buscados quando abertos. Não há varredura de todo o histórico ou agregado de produtos inventado no frontend.

Testes com API simulada verificaram ausência de Sessões anteriores no caixa aberto, carregamento somente ao acionar Histórico caixa, filtro pela sessão, produtos registrados, paginação e mudança de situação. Abertura e venda permaneceram aprovadas nos testes de regressão. Backend e Financeiro não foram alterados.

## 27. Cabeçalho do turno aberto

O nome do caixa e a etiqueta Aberta ficam juntos na linha superior do card. Nova comanda foi movido para a direita desse cabeçalho, com orientação curta sobre os canais de atendimento. Operador e data/hora de abertura aparecem abaixo em campos informativos separados. Os indicadores permanecem no centro do card e as ações secundárias ficam na linha inferior; Fechar caixa foi separado à direita para distinguir o encerramento do atendimento diário. Em telas estreitas, o botão principal passa para uma linha própria com largura disponível. Chamadas e permissões permanecem iguais.

Build e análise estática aprovados. Os testes existentes de criação/pagamento e de seleção de produtos/quantidades passaram após a reorganização visual.

## 28. Categorias das ações do turno

Atualizar passou a ser um botão de ícone ao lado de Nova comanda, com nome acessível Atualizar caixa, tooltip e indicação de carregamento. A atualização continua disponível também para usuários que podem consultar, mas não operar o turno. As ações inferiores foram agrupadas em Movimentar dinheiro (Sangria/Reforço), Consultar (Histórico caixa/Pedidos do turno) e Encerrar turno (Fechar caixa). Os grupos preservam permissões, chamadas e adaptação para celular.

Build, análise estática e teste existente de seleção de produtos e quantidades aprovados após o ajuste visual.

## 29. Atualização imediata e limite de comandas abertas

Criar uma Nova comanda agora invalida a lista do turno e seleciona o pedido devolvido, sem exigir clicar em Atualizar. A consulta da fila acompanha também alterações de seleção e revisão do turno.

A interface limita a cinco pedidos simultaneamente abertos por sessão de caixa. A contagem vem dos totalItens do servidor para EM_ATENDIMENTO, AGUARDANDO_MAQUINA, AGUARDANDO_PAGAMENTO e PAGAMENTO_PARCIAL, consultando só um registro por estado. Concluídos, cancelados e estornados não ocupam vaga. A tela mostra a contagem e bloqueia Nova comanda no limite ou quando não consegue confirmar os dados. Antes de qualquer criação, inclusive pelo primeiro produto, o frontend confere novamente os quatro estados. Pedidos existentes continuam editáveis conforme as regras de pagamento.

Esse limite é uma proteção do frontend. A verificação e o POST são chamadas separadas: para garantir atomicamente cinco pedidos diante de requisições simultâneas de outras abas, clientes ou usuários, o backend precisaria validar o limite dentro da transação de criação. O backend não foi alterado nesta entrega. Nenhum pedido existente acima do limite é removido automaticamente.

Teste simulado cobriu criação da quinta comanda, aparição imediata na fila, seleção do novo pedido, contagem dos diferentes estados, bloqueio da sexta após recarregar e bloqueio também na criação pelo card de produto. O fluxo existente de venda/pagamento e os controles de quantidade continuam aprovados.

## 30. Pedido: posições visuais fixas de 1 a 5

A nomenclatura exibida em Vendas passou de Comanda para Pedido, incluindo Novo pedido, carregamentos, mensagens e contagem do limite.

Na área de atendimento, cinco posições aparecem sempre da esquerda para a direita. Cada pedido aberto ocupa uma posição visual; conclusão, cancelamento ou estorno libera a posição. O próximo pedido usa a primeira vaga livre, sem renumerar os outros. O título do pedido selecionado também usa essa posição, em vez de mostrar o número sequencial real. Ao consultar um atendimento já concluído, o título informa Atendimento finalizado.

O mapeamento posição/ID é uma preferência visual da sessão mantida em sessionStorage para sobreviver ao recarregamento da mesma aba. O backend continua sendo a fonte dos pedidos e estados, consultados nos quatro estados abertos. Não são enviados números de posição à API e nenhum identificador ou número histórico é alterado. O histórico continua exibindo o número real do pedido e a ordenação solicitada ao servidor. Se houver mais de cinco pedidos abertos por dados legados ou concorrência, a tela informa a necessidade de consultar a lista completa.

Três testes unitários validaram ordenação inicial, reutilização sem deslocar posições e tratamento de dados duplicados. Testes de navegador confirmaram o limite de cinco e o fluxo: pedido real #501 ocupa Pedido 1; #502 ocupa Pedido 2; após finalizar #501, o novo #503 reutiliza Pedido 1, mantendo Pedido 2. O histórico continua mostrando #501. Build e análise estática aprovados.

## 31. Situação junto do título e ordem do histórico

A situação do pedido aparece ao lado do título da posição visual (por exemplo, Pedido 4 · Em atendimento). O bloco repetido de situação abaixo dos totais foi removido apenas do atendimento; os demais detalhes continuam mostrando o status.

Finalizar libera exclusivamente a posição ocupada, sem deslocar outros pedidos. O histórico do caixa consulta ordenarPor=numero e direcao=DESC, mantendo os números reais e mostrando os mais recentes primeiro. A preferência visual 1 a 5 não é enviada ao backend e não altera a numeração histórica.

Validação: três testes unitários de posições, testes de navegador de atendimento, reutilização da vaga e consulta/ordenação do histórico; build e análise estática aprovados.

## 32. Pedido finalizado permanece até trocar de posição

O pedido selecionado que for concluído permanece temporariamente na mesma posição visual, com situação Concluído e em modo somente leitura. Adição de itens, quantidade, desconto e recebimento seguem bloqueados pelos estados existentes. Ao selecionar outro pedido ou criar um novo, a posição da seleção finalizada é liberada; as demais posições continuam inalteradas.

A fila consulta também o detalhe da seleção para reconhecer a conclusão após o recebimento. A retenção só vale para o pedido selecionado que já ocupava uma posição, nunca para um pedido antigo aberto diretamente pelo histórico. A posição temporária de conferência não transforma uma venda concluída em pedido aberto e não altera a contagem de atendimentos abertos no backend.

Teste com API simulada verificou conclusão mantida em Pedido 1, bloqueio dos controles, liberação ao selecionar Pedido 2 e reutilização de Pedido 1 sem renumerar Pedido 2 nem o histórico. O fluxo existente de pagamento único também permaneceu aprovado.

## 33. Cadastro dentro do seletor de caixa físico

O seletor mantém as opções reais retornadas por GET /caixa/caixas, com caixas em uso desabilitados, e oferece Cadastrar novo caixa no grupo Cadastro somente para CAIXA_CONFIGURAR. Escolher essa ação abre o formulário existente e restaura a seleção anterior; seu valor técnico nunca é enviado como caixaId. O posto só entra na lista após POST confirmado e releitura do backend. A ação duplicada fora do seletor foi removida. Testes de cadastro, conflito, seleção real e permissões aprovados.
