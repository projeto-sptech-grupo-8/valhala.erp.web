# Contexto de continuidade — Valhalla ERP

Atualizado em 25/11/2026. Este documento resume as decisões e implementações deste chat para permitir a continuidade em outro atendimento.

## 1. Instruções para o próximo chat

Leia este arquivo antes de trabalhar. Confira também o código atual, o README e os contratos envolvidos na solicitação. As decisões abaixo registram o histórico e as preferências do usuário. Uma nova orientação explícita do usuário pode alterá-las.

### Escopo e restrições

- Atuar como desenvolvedor frontend sênior e engenheiro de software, priorizando UI e UX.
- Manter a arquitetura, os componentes compartilhados e a estrutura atual.
- Fazer mudanças somente nas telas solicitadas. Evitar alterações paralelas sem relação com o pedido.
- A orientação persistente é **não alterar o backend**. Ele pode ser lido para analisar DTOs, endpoints, permissões e regras.
- Houve uma exceção explícita para corrigir o mapeamento de `nota_fiscal.chave_acesso`. O usuário autorizou aquela correção específica.
- A restrição antiga de não mexer no Financeiro foi superada pelas solicitações posteriores de implementação e reorganização desse módulo. Atualmente há autorização para trabalhar no frontend financeiro quando solicitado.
- Preservar funcionalidades acessíveis, permissões e comportamento das rotas.
- Não apagar alterações existentes do usuário ou de outros trabalhos.
- Remover código sem uso somente depois de verificar referências, rotas e dependências.
- Evitar filtros que baixem todo o catálogo para filtrar no navegador. Preferir filtros, paginação e ordenação no backend.
- Exceções locais expressamente aceitas incluem giro do catálogo, filtros sobre alertas já retornados, apresentação e impressão de etiquetas e paginação de categorias em Resultados.
- Não criar interfaces que aparentem persistir ou concluir uma operação sem confirmação correspondente.
- Não fazer commits, publicação ou operações reais de pagamento sem solicitação.
- Documentar fluxo e regras quando o usuário solicitar um arquivo Markdown.

## 2. Ambiente e repositórios

| Item | Local |
| --- | --- |
| Frontend | `D:/repositorio_grupo_08_pi/valhala.erp.web` |
| Backend | `D:/repositorio_grupo_08_pi/valhala.core.stock.app` |
| Shell | PowerShell no Windows |
| API padrão | `http://localhost:8080` |
| Vite padrão | `http://localhost:5173` |
| Vite dos testes interceptados | `http://127.0.0.1:5184` |

O diretório inicial do terminal pode ser o backend. Sempre informe o diretório correto ao executar comandos do frontend.

O repositório tem alterações locais acumuladas. Consulte `git status` e preserve essas alterações. Mudanças já incorporadas em commits podem deixar de aparecer no diff mesmo tendo sido feitas durante o chat.

## 3. Arquitetura

O frontend usa uma arquitetura modular baseada em Feature-Sliced Design, adaptada ao projeto.

| Camada | Responsabilidade |
| --- | --- |
| `app` | Inicialização, providers e roteamento |
| `pages` | Telas de rota por domínio |
| `widgets` | Menu lateral e cabeçalho |
| `features` | Fluxos e ações do usuário |
| `entities` | Modelos e regras dos domínios |
| `shared` | API, hooks, componentes genéricos e utilitários |

React com componentes funcionais, hooks, Context API, React Router com HashRouter, CSS Modules, Lucide e Recharts.

A estrutura contém adaptações e acoplamentos existentes. Por exemplo, a integração fiscal está em `pages/sales/invoices` e seu contexto é utilizado no pagamento e no layout do painel. Não apresentar a organização como FSD estrito.

O README principal foi reescrito com instalação, arquitetura, fluxos e limitações. Como houve evolução posterior do Financeiro, algumas descrições de estado do README e de planos antigos precisam ser confrontadas com a implementação atual.

## 4. Padrões gerais de UI e UX

### Layout e navegação

- Cards e formulários simétricos, alinhados e com espaços compactos.
- Evitar áreas vazias criadas por alturas fixas desnecessárias.
- Formulários de criação de produto, usuário, perfil e movimentação seguem largura e espaçamento semelhantes.
- Botões de cancelar e salvar/criar ficam ao final do formulário.
- Rotas principais de catálogo, estoque, acesso e vendas tiveram o botão Voltar removido.
- Quando necessário em telas internas, Voltar deve ser texto sublinhado com seta.
- Sub-abas usam o padrão de Usuários/Perfis, com ícones e sublinhado dourado na aba ativa.
- Ícones nos títulos de telas e seções relevantes.
- Explicações em ícones de ajuda aparecem ao passar o mouse ou focar.
- Não deixar tooltips abertos automaticamente ao abrir modais.

### Filtros e tabelas

- Cabeçalho do filtro com ícone e seta para recolher.
- Ao recolher, esconder também as linhas e divisórias relacionadas ao conteúdo.
- Limpar filtros e Atualizar ficam na linha do título, no canto oposto.
- Havendo outro botão principal no cabeçalho, usar utilitários compactos, à esquerda da ação principal.
- As duas ações compartilhadas usam cores baseadas no menu lateral.
- Campos de filtro têm alturas, bordas e cores consistentes.
- Títulos dos campos de filtro foram clareados para cinza claro, sem branco.
- Menus de três pontos são usados quando solicitados. Algumas tabelas tiveram ações diretas por escolha explícita do usuário. Não padronizar todos os módulos apagando essas diferenças.
- Valores numéricos alinhados, coluna de situação centralizada quando apropriado.
- Carregamento, erro e lista vazia devem ser estados distintos.
- Paginação de servidor sempre que o endpoint suportar.
- Tabelas largas devem rolar no próprio contêiner.

### Cores atuais dos textos

- Textos comuns no tema escuro usam branco pelos tokens compartilhados.
- KPIs, alertas e dados importantes mantêm cores semânticas.
- Descrição abaixo do título principal voltou à cor secundária.
- Sub-abas inativas, menu lateral, perfil e placeholders também voltaram às cores anteriores.
- Títulos dos campos de filtro usam `--filter-label`, atualmente `#dedad3` no tema escuro.
- Tema claro mantém contraste adequado com texto escuro.
- Tokens adicionados incluem `--secondary-text`, `--muted-text`, `--navigation-text` e `--filter-label`.

## 5. Catálogo e produtos

- Lista de produtos e drinks com filtros recolhíveis e buscas de nome e categoria.
- Busca por nome recebeu o rótulo Buscar nome.
- Tipo principal vem do backend, PADRAO ou DRINK.
- Drinks usam destaque amarelo na lista.
- Padrão e drink têm tags distintas.
- Dose e fardo são características adicionais.
- Quando há dose e fardo simultaneamente, mostrar os dois ícones próximos, com tooltip contendo ml ou unidades.
- Sem as duas características simultâneas, pode aparecer texto ao lado do ícone.
- Exportação de produtos foi ligada à planilha Excel do backend, com IDs da página ou da seleção.
- Drink não tem saldo próprio. A coluna Saldo / mínimo usa o botão Por receita, que abre os ingredientes.
- Detalhes de produto usam painel lateral.

### Produto padrão

- Campos visuais de SKU, unidade de venda, código de barras e descrição foram retirados conforme os pedidos.
- Validade do lote inicial é obrigatória no formulário, inclusive quando saldo inicial é zero.
- Máscaras de dinheiro e placeholders com exemplos.
- Campos numéricos permitem apagar o zero sem formar valores como 080.
- Categoria usa busca com sugestões.
- Campo de volume da embalagem aparece quando venda por dose é Sim.
- Dose e fardo possuem ícones. Os campos dependentes aparecem abaixo do respectivo seletor.
- Fardo começa como Não e, quando Sim, solicita unidades por fardo.
- A integração de fardo evoluiu no backend durante o chat. Conferir o contrato atual antes de tratá-lo como campo apenas visual.
- Asteriscos vermelhos identificam obrigatórios.

### Novo drink

- Campos de SKU e unidade de venda foram retirados da interface.
- Receita com campos de busca de ingredientes e textos compactos.
- Receita pode consumir ingredientes em ml ou unidades, conforme backend.
- O backend valida disponibilidade e receita antes de registrar saída.
- Rendimento e custo exibidos no frontend são estimativas e não garantem estoque vendável.

## 6. Estoque, lotes e etiquetas

- Movimentações têm filtros padronizados, formulário em rota separada e detalhes laterais.
- A ação da linha foi renomeada para Ver detalhes, com ícone.
- Reposição ganhou KPIs e filtros recolhíveis.
- Alertas críticos usam vermelho quando há ocorrências e podem usar azul quando zerados.
- Sem mínimo definido usa laranja.
- Indicador de cobertura utiliza verde, amarelo abaixo de 75% e vermelho abaixo de 25%, conforme a decisão de apresentação registrada.
- Indicadores desconhecidos aparecem como ausência de informação, sem fabricar zero.
- Validades e lotes consultam dados e resumo do backend.
- FEFO é executado pelo servidor. Venda/consumo de lotes vencidos é validada e bloqueada conforme as regras do backend.
- Botões de situação de validade seguem o estilo segmentado usado em Usuários.
- A ação de perdas em lote teve o rótulo alterado para Registrar todas as perdas.
- Exportação de movimentações utiliza o servidor.
- Importação XML registra entradas, mas vínculos e controle de notas importadas têm persistência local. Custo médio da importação não é persistido como média pelo backend.

### Etiquetas

- Modal com seleção de produtos e quantidade de cópias por operação.
- Configuração visual com cor por validade ou escolha manual.
- Preview de configuração é específico e desaparece ao aplicar.
- Preview da lista abre e fecha pelo ícone de olho, com amarelo enquanto ativo.
- Filtros da lista de produtos têm opções 10, 20 e 30.
- Lotes de um produto são consultados e paginados em cinco, com filtro pelas faixas de validade usadas nas cores.
- Cada produto/lote pode ter validade e cópias próprias. Não assumir que um mesmo código de lote implica validade única para todos os produtos.
- A configuração é local ao navegador/usuário.
- As cópias não representam histórico de impressão.
- O catálogo não fornece EAN no contrato utilizado. Etiquetas identificam nome, SKU e, quando escolhido, preço/lote.
- Impressão de etiquetas permaneceu ativa após a limpeza de código.

## 7. Acesso e configurações

- Usuários e perfis têm sub-abas, filtros e títulos com ícones.
- Usuários com limite 5, 10 e 15 por página.
- Nome do usuário aparece como texto na tabela.
- Detalhes de usuário e perfil abrem em painel lateral.
- UUID do usuário foi retirado dos detalhes visuais.
- Edição de usuário/perfil usa modal nos fluxos solicitados.
- Descrição de perfil e campos de categoria não devem permitir redimensionamento arbitrário.
- Excluir categoria foi movido para ações da lista.
- Configurações gerais virou entrada do menu lateral, com sub-abas Geral, Segurança e Notificações.
- Menu do perfil mantém aparência.
- Alteração de senha está integrada.
- Recuperação de senha por e-mail segue sem implementação correspondente.
- Dados da adega, histórico de acessos e notificações tiveram informações demonstrativas ou confirmações falsas retiradas.
- Os campos históricos de Dados da adega eram nome, CNPJ, e-mail de contato, telefone e endereço.
- O seletor de tema continua disponível.

## 8. Caixa, pedidos e pagamentos

- Caixa físico selecionado no fluxo de abertura, com acesso aos ajustes para cadastro.
- O campo de operador foi removido da abertura; o usuário autenticado define a operação.
- Com o turno aberto, sessões anteriores ficam no histórico do caixa.
- Cinco posições visuais de pedidos, preenchidas da esquerda para a direita.
- Número da posição difere do número histórico do pedido.
- Pedido concluído ou cancelado permanece brevemente visível e libera a posição após cinco segundos.
- Pedido cancelado e seu ícone usam vermelho.
- Selecionar uma posição livre abre os campos do novo pedido.
- Limite de itens do catálogo do caixa evoluiu para 9, 12 e 18.
- Posições mostram a situação do pedido, como Em atendimento, Aguardando maquininha e Pagamento parcial.
- Turno novo não reaproveita o pedido concluído de um turno anterior.
- Termos visuais foram trocados de Comanda para Pedido.
- Botão Fechar caixa em vermelho.
- Dinheiro esperado considera abertura, pagamentos em dinheiro, troco, reforços e sangrias conforme o backend.

### Pagamentos

- Divisão de um recebimento em até quatro partes na interface.
- Cada parte é enviada e confirmada separadamente.
- Parcelamento é próprio do crédito e depende das políticas do backend.
- Total das partes deve corresponder ao saldo.
- Tentativa incerta mantém a chave de idempotência e confere o servidor antes de repetir.
- Pagamentos pendentes bloqueiam uma nova cobrança no mesmo pedido.
- Enquanto um pedido aguarda pagamento, o operador pode atender outra posição livre.
- Crédito/débito têm apresentação específica de andamento e aprovação.
- Pedido só é tratado como concluído quando a API retorna CONCLUIDO.
- Terminais Mercado Pago podem ser consultados no cadastro de maquininha.
- Ajustes do caixa têm sub-abas, políticas, equipamentos, taxas e repasse.
- Prazo máximo configurável na interface foi limitado a 600 segundos, conforme decisão do chat.
- Exclusão de equipamento respeita bloqueios do servidor.
- Logout consulta o turno e conduz ao fechamento/conferência, quando necessário.

## 9. Notas fiscais

### Backend e exceção de alteração

O backend ganhou módulo fiscal durante o chat. Foi autorizado corrigir somente o mapeamento de `chaveAcesso` em `NotaFiscalEntity`, adicionando `@JdbcTypeCode(SqlTypes.CHAR)` para corresponder à coluna CHAR(44).

Os testes de inicialização e integração fiscal passaram com H2. Isso não confirmou o PostgreSQL local do log original.

O emissor implementado naquele momento era simulado e operava em HOMOLOGACAO. Conferir o estado atual antes de afirmar emissão real na SEFAZ.

### Frontend fiscal

- Sub-abas Notas emitidas e Pedidos para emissão no padrão de Usuários/Perfis.
- Emissão após a API confirmar CONCLUIDO, preservando o ID real do pedido.
- CPF/CNPJ e nome do consumidor opcionais.
- Máscara automática CPF/CNPJ, com edição no meio do texto e envio de dígitos.
- Placeholder de CPF com exemplo.
- Ao perder a resposta da emissão, consultar a nota vinculada antes de permitir nova tentativa.
- Se o navegador fechar antes da emissão, retomar em Pedidos para emissão.
- A aprovação parcial de pagamento não emite nota.
- Menu de três pontos por linha, com ações permitidas.
- Botão de download renomeado de Baixar XML para Baixar. O formato permanece XML.
- Filtros automáticos, sem botão Buscar.
- Texto e documento usam pausa de 300 ms. Situação e intervalo válido atualizam ao mudar.
- Situação usa AUTORIZADA, CANCELADA e REJEITADA.
- Painel lateral destaca número, pedido, situação, total e ações de baixar/imprimir.
- Dados fiscais técnicos ficam em uma seção expansível.
- Cancelamento fiscal solicita 15 a 255 caracteres e autorização.
- Mensagens de ausência de notas e de pedidos elegíveis são centralizadas e distinguem ausência geral de ausência causada por filtros.
- DANFE 80 mm é montado pelo navegador com os dados retornados. XML é baixado do backend.

Arquivos principais em `src/pages/sales/invoices/`, com integração no pagamento e no layout do painel.

## 10. Visão geral do Início

- Sub-abas Estoque e Caixa, montadas conforme as permissões.
- O gráfico de movimentações de estoque tem períodos 3, 6, 9 e 12 meses.
- KPIs de Estoque e Caixa foram padronizadas com a estética do Financeiro.
- Cards das KPIs sem bordas, fundo suave, ícone em base de 32 px e valor destacado.
- Cores de negócio e regras dos indicadores foram preservadas.
- Reposição e validades possuem cards organizados e simétricos.
- Cobertura do estoque mínimo fica no topo de Prioridades de reposição.
- Validades destaca vencidos e até sete dias, com custos e cinco faixas visíveis.
- As cinco faixas de validade têm barras e navegam à lista filtrada.
- O resumo percentual de distribuição pode ser recolhido.
- Histórico de pagamentos da Visão geral do Caixa diferencia aprovado, pendente, cancelado e estornado.
- Ausência de turno aberto possui mensagem e ação para a tela de caixa.

## 11. Financeiro — estado atual e decisões recentes

A integração financeira passou a existir durante a evolução do projeto. O código atual usa `financeApi` para resumo, resultado e contas. A descrição antiga de Financeiro inteiramente demonstrativo ficou desatualizada.

### Contas e regras do backend analisadas

- Contas possuem tipo PAGAR ou RECEBER.
- Cadastro começa em ABERTA.
- Somente conta em aberto pode ser editada, baixada ou cancelada.
- Baixa muda para PAGA e registra data/valor efetivos.
- Baixa não aceita data futura.
- O valor da baixa pode diferir do original por desconto/juros. O fluxo analisado não controla saldo restante de recebimento parcial.
- Tipo não pode ser alterado depois do cadastro.
- Categoria é obrigatória para PAGAR e proibida para RECEBER.
- MERCADORIA é distinguida de despesas fixas e variáveis no resultado.
- Contas a receber são lançamentos manuais separados das vendas já recebidas no caixa. Repetir a mesma entrada nos dois fluxos pode duplicar o saldo financeiro.
- O usuário decidiu não utilizar contas a receber na interface financeira atual.

### Visão geral

- Permanecem duas KPIs, Saldo financeiro acumulado e A pagar em 30 dias.
- Botão Nova conta aparece somente na Visão geral e cria conta PAGAR.
- Botão Nova conta a receber e KPI A receber foram retirados.
- Botão Ver todas as contas foi retirado.
- Saldo financeiro acumulado inclui recebimentos e baixas financeiras; não equivale à gaveta do turno.
- Saldo usa cor segundo valor positivo/negativo/zero e borda padrão, sem a borda vermelha.
- A pagar sinaliza vencidas e próximos vencimentos.
- Gráfico e próximos vencimentos foram reunidos em um card.
- O gráfico tem prioridade e o link Ver valores por mês foi retirado.
- Próximos vencimentos funciona como painel lateral recolhível à direita.
- Recolher fecha o painel em direção à direita, liberando largura ao gráfico.
- Fechado, ficam ícone e seta, sem texto vertical.
- Em telas pequenas, expandir o painel pode empilhar o conteúdo para manter leitura.
- Centro de custo virou botão com opções na linha do título dos vencimentos.
- As consultas de vencimentos usam apenas PAGAR.
- Gráfico usa verde para entradas e vermelho para saídas.
- Layout foi compactado, sem espaçamentos excessivos.

### Lista de contas

- Exibida na Visão geral, abaixo do resumo.
- Consulta PAGAR, inclusive depois de Limpar filtros.
- Retirado filtro de tipo, já que a listagem é de contas a pagar.
- Filtros de situação, centro de custo e vencimento inicial/final.
- Paginação remota com 10, 20 e 50.
- A API analisada não possui busca textual por nome/descrição de conta. O usuário pediu, mas essa parte não foi implementada por faltar o contrato.
- Não simular essa busca filtrando uma única página ou enviando parâmetro ignorado.
- Valores alinhados à direita e situação centralizada.
- Tags de Em aberto, Baixada e Cancelada.
- Ações em menu de três pontos, respeitando situação e permissão.
- Ver detalhes abre Drawer compartilhado.
- O painel lateral da conta é exclusivamente informativo, com fechar.
- Editar, registrar pagamento e cancelar permanecem no menu da linha.
- Botões de ações foram explicitamente retirados de dentro do painel lateral.

### Resultado

- Indicadores do mês e Vendas por categoria saíram da Visão geral para Resultado.
- Posteriormente, foi removida a KPI mensal de CMV duplicada.
- KPIs principais do período incluem lucro líquido, lucro bruto e CMV.
- Bordas das KPIs de resultado foram removidas.
- O título visual Indicadores do resultado foi removido.
- Alternância Reais/Porcentagem virou ícones de cédula e porcentagem ao lado do período, com tooltip, nome acessível e estado ativo dourado.
- O seletor mostra o nome do período.
- Composição do resultado e Vendas por categoria ficam abertas, lado a lado no desktop e empilhadas em telas menores.
- Composição teve a estética antiga restaurada a pedido do usuário, com divisórias, fundo nos subtotais e lucro líquido dourado.
- Vendas por categoria tem a mesma altura da composição quando lado a lado.
- Barras de participação usam uma única cor. Participação menor não é classificada como ruim.
- Categorias ordenadas pelo maior faturamento.
- Paginação local de três categorias por página na sub-aba Resultado. O usuário pediu, reverteu e depois confirmou novamente esse limite. O estado atual é três por página.
- Mudar período reinicia o componente de categorias por chave do intervalo.
- Total e percentuais continuam representando o período completo.

### Faixa de comparação mensal

- Nome Faturamento — mês atual.
- Exibe faturamento atual, mesmo intervalo do mês anterior e variação.
- Sem base anterior, usa Sem base para comparação em cinza.
- Variação positiva verde e negativa vermelha.
- O faturamento atual tem maior destaque.
- A posição final escolhida é sempre abaixo das KPIs, mesmo quando o período selecionado muda.
- Os dados continuam sendo do mês atual. O título e a data precisam deixar isso claro.
- Faixa oculta quando `faturamento.vendasMesAtual` não é maior que zero.
- DTO do faturamento inclui `mesAtual`, `mesAnteriorMesmoPeriodo`, `crescimentoPercentual`, `cmvMesAtual`, `cmvPercentual` e `vendasMesAtual`.

## 12. Arquivos prioritários para localizar mudanças

| Área | Arquivos |
| --- | --- |
| Tokens de cor | `src/app/styles/App.module.css` |
| Filtros compartilhados | `src/shared/ui/filters/FilterActions.jsx` e CSS correspondente |
| Layout, sidebar e perfil | `src/shared/styles/panel.module.css`, `src/widgets/sidebar/ui/Sidebar.jsx` |
| Cabeçalho | `src/widgets/page-header/ui/PageHeader.jsx` |
| Dashboard | `src/pages/dashboard/ui/`, especialmente `OverviewControls.jsx` e `DashboardPage.module.css` |
| Financeiro | `src/pages/finance/overview/ui/FinancePage.jsx`, `FinanceAccounts.jsx`, `FinancePage.module.css` |
| API financeira | `src/pages/finance/overview/model/financeApi.js` |
| Fiscal | `src/pages/sales/invoices/` |
| Pagamento | `src/features/sales/payments/ui/SalePaymentModal.jsx` |
| Atendimento | `src/pages/sales/remote/CashWorkspace.jsx`, `SalesRemote.jsx` |
| Rotas e permissões | `src/app/panelRoutes.jsx`, `src/entities/access/model/pages.js` |
| Testes de contrato/UI | `e2e/catalog-remote.spec.js` |

## 13. Limpeza de código realizada

Foram retirados componentes antigos sem acesso pelas rotas e sem consumidores, incluindo o caixa e auditoria locais substituídos pelos fluxos remotos, componentes antigos de detalhes de produto, autorização simulada, seletor remoto antigo, código de barras sem uso e geração antiga de cupom/comanda.

A impressão de etiquetas e a importação XML foram preservadas. Parte da StoreProvider e dos modelos de estoque foi reduzida para manter consumidores ativos e dependências do Financeiro/relatórios existentes naquele momento.

Não recriar componentes apagados somente porque um documento histórico ainda os menciona.

## 14. Verificação e limitações

### Comandos do frontend

```powershell
npm ci
npm run dev
npm run build
npm run lint
node --test tests/*.test.js
node node_modules/@playwright/test/cli.js test --config playwright.catalog.config.js
```

A configuração de Playwright acima usa Chrome e API interceptada. Testes padrão em `playwright.config.js` também incluem fluxos que dependem da API real e podem alterar dados.

Em algumas execuções desta sessão, a compilação foi feita pela API do Vite para encerrar corretamente o processo.

```powershell
node --input-type=module -e "import {build} from 'vite'; await build(); process.exit(0)"
```

### Evidência disponível

- Houve baterias de 39 testes unitários aprovadas durante as integrações.
- Testes fiscais com API simulada verificaram emissão após aprovação, recuperação de resposta incerta, XML, cancelamento e painel lateral em 320 px.
- Testes de filtros verificaram máscara CPF/CNPJ e situação automática.
- Revisões de responsividade abrangeram larguras de 320 a 1440 px.
- Várias mudanças visuais recentes tiveram apenas build e lint. Não considerar toda alteração visual validada em navegador ou com API real.
- Integração Point física, produção fiscal e PostgreSQL do erro inicial não foram validados por esses testes.
- O build pode emitir aviso de bundle maior que 500 kB. Não houve trabalho de divisão do bundle nesta etapa.

### Pendências que exigem atenção no próximo chat

1. Revisar visualmente os últimos ajustes de Financeiro com dados reais, longos e vazios.
2. A busca textual de contas depende de endpoint/parâmetro no backend.
3. Verificar eventuais divergências entre o README e integrações adicionadas depois de sua redação.
4. O CSS financeiro acumulou regras sobrepostas nas iterações de layout. Consolidar somente se for necessário ao pedido e preservando a aparência aprovada.
5. A apresentação do DANFE no frontend não equivale a validar homologação fiscal de produção.
6. No acompanhamento fiscal, recarregar/fechar a página pode exigir retomada por Pedidos para emissão.

## 15. Como iniciar uma nova solicitação

Informe que este arquivo contém o contexto anterior, descreva a tela e o ajuste desejados e mantenha a restrição de frontend quando aplicável.

O próximo agente deve verificar o código e os contratos atuais antes de concluir que um recurso continua ausente ou demonstrativo, porque o backend evoluiu ao longo deste chat.
