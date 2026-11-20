# Valhalla ERP — Frontend

Aplicação web para a operação de uma adega, desenvolvida pelo Grupo 08 como parte do Projeto Integrador. Reúne catálogo de produtos e drinks, estoque por lotes, atendimento no caixa, pagamentos, documentos fiscais e controle de acesso.

O painel organiza as rotinas por domínio e oferece uma visão geral separada entre estoque e caixa. As telas operacionais consultam a API do projeto `valhala.core.stock.app`, responsável por persistência, permissões e validação das regras de negócio.

A interface usa React, JavaScript com JSX e CSS Modules. A arquitetura segue uma adaptação de Feature-Sliced Design, com componentes funcionais, hooks e composição de telas.

## Sumário

- [Escopo e estado dos módulos](#escopo-e-estado-dos-módulos)
- [Tecnologias](#tecnologias)
- [Executar localmente](#executar-localmente)
- [Comandos](#comandos)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Arquitetura e padrões](#arquitetura-e-padrões)
- [Fluxos da aplicação](#fluxos-da-aplicação)
- [Integração e tratamento de falhas](#integração-e-tratamento-de-falhas)
- [Interface e experiência de uso](#interface-e-experiência-de-uso)
- [Testes e verificações](#testes-e-verificações)
- [Build e publicação](#build-e-publicação)
- [Manutenção](#manutenção)
- [Documentação complementar](#documentação-complementar)

## Escopo e estado dos módulos

| Módulo | Funcionalidades e situação atual |
| --- | --- |
| Autenticação | Login, restauração da sessão, renovação e logout integrados. Alteração de senha integrada. Recuperação por e-mail aguarda implementação. |
| Visão geral | Indicadores e consultas de estoque e caixa integrados. Exibe validade, prioridades de reposição, movimentações e dados do turno conforme permissões. |
| Catálogo | Produtos padrão, drinks, categorias, receitas, fracionamento e fardos integrados. Exportação de produtos em Excel pelo servidor. |
| Estoque | Movimentações, reposição, consulta de lotes e validades e registro de perdas integrados. |
| Etiquetas | Dados de produtos e consulta de lotes pela API. Seleção, cópias e impressão no navegador. Configuração visual salva localmente por usuário. |
| Importação XML | Leitura de NF-e no navegador e envio das entradas de estoque à API. Vínculos de itens e controle das NF-e importadas são locais. |
| Vendas e caixa | Abertura e fechamento de turnos, pedidos, pagamentos, sangria, reforço, histórico, auditoria e ajustes integrados. |
| NFC-e | Emissão após a conclusão do pedido, consulta, download XML, impressão e cancelamento integrados. O emissor atual do backend é simulado e opera em homologação. |
| Controle de acesso | Gestão de usuários, perfis e permissões conectada à API. |
| Configurações | Aparência persistida no navegador. Dados cadastrais da adega e histórico de acessos aguardam integração. Preferências de notificação são temporárias. |
| Financeiro e relatórios | Telas preservadas para evolução. Utilizam dados demonstrativos e cálculos locais, com integração pendente. |
| Apresentação e demonstração | Rotas públicas para conhecer o produto. |

### Limites operacionais

A importação XML registra movimentações no servidor, mas os vínculos entre itens da nota e produtos e a identificação de notas já importadas dependem do armazenamento local. O custo médio calculado nesse fluxo não é persistido como custo médio pelo backend.

A emissão fiscal automática é iniciada pelo frontend durante o atendimento. Fechar ou recarregar o navegador pode interromper esse acompanhamento. A sub-aba **Pedidos para emissão** permite retomar pedidos elegíveis retornados pelo servidor.

A configuração de etiquetas vale para o navegador utilizado. A quantidade de cópias representa a operação de impressão atual.

## Tecnologias

As versões declaradas e os scripts ficam em [package.json](package.json). O [package-lock.json](package-lock.json) registra as versões resolvidas.

| Tecnologia | Uso |
| --- | --- |
| React 19 e React DOM | Componentes, hooks, contextos e renderização |
| React Router DOM 7 | Rotas públicas, rotas protegidas e navegação por hash |
| Vite 8 | Servidor de desenvolvimento e build |
| JavaScript ES Modules e JSX | Implementação da aplicação |
| CSS Modules | Estilos por componente e por tela |
| Lucide React | Ícones |
| Recharts | Gráficos |
| Radix Slot, CVA e clsx | Composição e variantes de elementos de interface |
| Fetch API | Comunicação HTTP com a API |
| Oxlint | Análise estática |
| Node Test Runner | Testes de regras e funções |
| Playwright | Testes de navegador com API real ou interceptada |

## Executar localmente

### Pré-requisitos

- Node.js compatível com o Vite instalado. A versão presente no repositório aceita `^20.19.0 || >=22.12.0`. O ambiente usado nas verificações utiliza Node.js 24.
- npm.
- API `valhala.core.stock.app` configurada e acessível para utilizar os módulos integrados.
- Uma conta cadastrada no backend com as permissões necessárias.

O banco de dados e as credenciais de serviços externos são configurados no repositório do backend.

### Instalação

Na raiz deste repositório, onde está o `package.json`, execute

```bash
npm ci
npm run dev
```

Abra o endereço exibido pelo Vite. O endereço padrão é `http://localhost:5173`.

### Endereço da API

O cliente usa `http://localhost:8080` como endereço padrão. Para apontar para outro ambiente, crie um arquivo `.env.local` na raiz do frontend.

```dotenv
VITE_API_URL=http://localhost:8080
```

Use a URL base sem barra final. Reinicie o Vite após alterar o arquivo.

As variáveis `VITE_*` são incorporadas ao código entregue ao navegador. Mantenha senhas de banco, chaves privadas e segredos de pagamento na configuração do backend.

A autenticação envia cookies com `credentials: 'include'`. O backend precisa permitir a origem do frontend no CORS e fornecer cookies compatíveis com os domínios e o protocolo usados. Em desenvolvimento, mantenha o uso de `localhost` e `127.0.0.1` consistente entre as configurações.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm ci` | Instala as dependências registradas no lockfile |
| `npm run dev` | Inicia o frontend em desenvolvimento |
| `npm run build` | Gera os arquivos estáticos em `dist/` |
| `npm run preview` | Serve uma prévia local do build |
| `npm run lint` | Executa o Oxlint |
| `node --test tests/*.test.js` | Executa os testes de regras com o Node |
| `npm run e2e` | Executa o Playwright com a configuração padrão |
| `npx playwright test --config playwright.catalog.config.js` | Executa a suíte com API interceptada |
| `npm run gate` | Executa o fluxo de verificações definido em PowerShell |
| `npm run gate -- -Modulo produtos` | Executa o gate direcionado a um módulo existente |

## Estrutura do repositório

```text
.
├── public/                         # Arquivos estáticos
├── src/
│   ├── main.jsx                    # Entrada e montagem do React
│   ├── app/
│   │   ├── App.jsx                 # Estilos e provider de avisos
│   │   ├── AppRouter.jsx           # Sessão e rotas públicas/protegidas
│   │   ├── panelRoutes.jsx         # Registro das telas do painel
│   │   └── providers/store/        # Estado compartilhado e cache legado
│   ├── pages/
│   │   ├── auth/                   # Login e orientação de recuperação
│   │   ├── dashboard/              # Visão geral de estoque e caixa
│   │   ├── catalog/                # Produtos, drinks e categorias
│   │   ├── inventory/              # Movimentos, reposição, validade e XML
│   │   ├── sales/
│   │   │   ├── remote/             # Caixa, pedidos, sessões e ajustes
│   │   │   └── invoices/           # NFC-e, integração e acompanhamento
│   │   ├── access/                 # Usuários e perfis
│   │   ├── settings/               # Configurações gerais
│   │   ├── finance/                # Financeiro e relatórios
│   │   ├── panel/                  # Layout autenticado
│   │   ├── landing/                # Apresentação pública
│   │   └── demo/                   # Demonstração
│   ├── widgets/                    # Menu lateral e cabeçalho
│   ├── features/                   # Formulários, pagamentos e impressão
│   ├── entities/                   # Modelos e conceitos de negócio
│   └── shared/                     # API, hooks, UI e utilitários comuns
├── tests/                          # Testes de regras
├── e2e/                            # Testes de navegador
├── scripts/                        # Gate e verificações diretas da API
├── docs/                           # Planos e documentação por módulo
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── playwright.config.js
└── playwright.catalog.config.js
```

Algumas pastas usam segmentos como `ui/`, `model/` e `api/` para separar interface, transformação de dados e comunicação remota. O alias `@/` aponta para `src/`.

## Arquitetura e padrões

### Organização por domínio e camadas

A base do projeto é Feature-Sliced Design adaptado. Cada módulo agrupa arquivos por responsabilidade e negócio.

| Camada | Responsabilidade |
| --- | --- |
| `app` | Inicialização, composição global, roteamento e providers |
| `pages` | Entradas de rota e composição de telas |
| `widgets` | Blocos compostos, como menu lateral e cabeçalho |
| `features` | Ações do usuário, como pagamento, edição e impressão |
| `entities` | Dados, regras e representação de conceitos de negócio |
| `shared` | Infraestrutura e componentes genéricos |

A direção desejada das dependências acompanha a ordem acima. Uma página compõe funcionalidades, entidades e componentes compartilhados. Fatias com `index.js` expõem sua API pública.

A estrutura atual também contém adaptações. O domínio fiscal mantém API, contexto de acompanhamento e componentes em `pages/sales/invoices`. Esse contexto é consumido pelo pagamento e pelo layout do painel. A API compartilhada ainda concentra normalizadores de vários domínios. Esses pontos representam acoplamentos existentes a considerar em futuras reorganizações.

### Composição, hooks e estado

A interface é composta por componentes funcionais. Hooks concentram consultas, formulários, navegação e controle de operações.

- Estado de formulário e interação permanece próximo ao componente.
- `useQueryResource` controla carregamento, erro, resposta e atualização de uma consulta.
- O cancelamento por `AbortController` e a chave da consulta evitam que respostas antigas substituam a consulta atual.
- `useListParams` mantém filtros, paginação e ordenação na URL das telas que o utilizam.
- O `StoreProvider` mantém sessão acessível ao painel, preferências e parte do cache usado por impressão, importação e relatórios.
- O acompanhamento fiscal usa um contexto próprio durante a sessão do painel.

A situação dos pedidos, a aprovação de pagamentos e as permissões operacionais são confirmadas pela API.

### Persistência local

| Armazenamento | Uso atual |
| --- | --- |
| Memória React | Formulários, consultas atuais, painéis, modais e acompanhamento fiscal |
| `localStorage` | Tema, menu recolhido, configurações de etiquetas e cache legado da store, incluindo vínculos XML |
| `sessionStorage` | Posições visuais dos pedidos e plano de pagamento com chaves de tentativa |
| Backend | Cadastros, receitas, estoque, lotes, pedidos, recebimentos, notas fiscais e acesso |

Os pagamentos preservam a chave de idempotência da tentativa para permitir a conferência ou retomada após falhas de comunicação.

## Fluxos da aplicação

### Acesso e navegação

1. `main.jsx` monta `App`, que fornece estilos e avisos globais.
2. `AppRouter` define as rotas e tenta restaurar a sessão ao acessar uma tela protegida.
3. O cliente consulta `/usuario/me`. Quando necessário, tenta renovar a sessão.
4. Usuários autenticados acessam o layout do painel com menu lateral, cabeçalho e conteúdo da rota.
5. Os metadados de `entities/access/model/pages.js` e as permissões do usuário orientam a navegação e as ações disponíveis.

O projeto usa `HashRouter`. Exemplos de endereços incluem `/#/produtos`, `/#/caixa` e `/#/notafiscal?aba=pendentes`.

### Catálogo e estoque

1. As listagens consultam páginas de dados com os filtros suportados pelo backend.
2. Produtos padrão mantêm estoque próprio. Drinks usam receita composta por ingredientes.
3. No cadastro inicial do produto padrão, o formulário solicita validade do lote inicial, inclusive quando o saldo inicial é zero.
4. Movimentações e perdas são enviadas à API, que valida saldo, unidade e consumo dos lotes.
5. Consultas de validades e reposição apresentam os dados e indicadores retornados pelo servidor.
6. Etiquetas utilizam os produtos selecionados e, quando aplicável, os lotes escolhidos.

O backend aplica FEFO na seleção automática de lotes. As estimativas de custo, rendimento e indicadores calculados no frontend seguem os dados disponíveis e não substituem a validação de uma saída. O giro do catálogo é calculado no frontend a partir das movimentações consultadas.

### Caixa e pagamentos

1. O operador seleciona o caixa físico e abre um turno.
2. Uma posição livre inicia um pedido. Há cinco posições visuais de atendimento.
3. Os produtos selecionados atualizam o pedido no servidor.
4. O recebimento pode ser dividido em até quatro partes. Cada parte é registrada e confirmada separadamente.
5. O parcelamento depende da forma de pagamento e das políticas retornadas pelo backend.
6. Pagamentos pendentes são acompanhados ou conferidos antes de uma nova cobrança no mesmo pedido.
7. Pedidos concluídos ou cancelados liberam a posição após cinco segundos. O histórico preserva o número real do pedido.
8. O fechamento envia dinheiro contado e justificativa de divergência quando aplicável.

O fluxo de logout consulta o turno e conduz ao fechamento quando necessário. Pedidos ou pagamentos pendentes e divergências são tratados conforme as respostas e permissões do servidor.

### NFC-e

1. O operador pode identificar o consumidor antes do recebimento.
2. Depois que a API confirma o pedido como `CONCLUIDO`, o frontend inicia a emissão.
3. A integração consulta a nota já vinculada ao pedido antes de emitir e confere o vínculo em caso de resposta incerta.
4. A confirmação permite continuar no caixa ou baixar o XML.
5. A aba **Notas emitidas** reúne consulta, painel lateral, download, impressão e cancelamento.
6. A aba **Pedidos para emissão** consulta pedidos elegíveis para emissão ou retomada.
7. O cancelamento exige justificativa entre 15 e 255 caracteres e autorização conforme o backend.

As faixas de situação são `AUTORIZADA`, `CANCELADA` e `REJEITADA`. A interface identifica o ambiente de homologação. O DANFE de 80 mm é montado no navegador a partir dos dados da nota. O XML é baixado pelo endpoint fiscal.

### Usuários e perfis

A tela de usuários consulta e gerencia contas. Os perfis agrupam funcionalidades e suas permissões. Os detalhes são apresentados em painéis laterais e as ações de edição usam os formulários e modais correspondentes.

A alteração da própria senha atualiza o usuário pela API e orienta uma nova autenticação. A autorização definitiva de cada operação é realizada no backend.

## Integração e tratamento de falhas

O cliente HTTP central fica em `src/shared/api/api.js`. Ele envia cookies, obtém o token CSRF para mutações e coordena uma única renovação de sessão entre chamadas concorrentes.

O código trata respostas vazias, erros de negócio e validações por campo. Downloads usam respostas binárias. Os normalizadores adaptam DTOs da API às representações utilizadas pela interface.

As listagens operacionais priorizam paginação, ordenação e filtros no servidor. Algumas consultas agregadas ou indicadores existentes fazem cálculos locais sobre respostas da API. O cache legado ainda carrega coleções completas em determinados fluxos.

Nos filtros de notas fiscais, número e documento consultam após uma pausa de 300 ms na digitação. Situação e período válido atualizam a consulta ao mudar.

Falhas de pagamento preservam a tentativa para conferência. Operações com resposta incerta devem consultar o estado do servidor antes de reenviar. No fluxo XML, entradas já aceitas podem exigir movimentações de compensação se uma etapa posterior falhar.

## Interface e experiência de uso

- CSS Modules organizam estilos de componentes e telas. Variáveis CSS fornecem a paleta e os temas.
- Filtros usam cabeçalho recolhível e ações de limpar e atualizar.
- Tabelas mostram carregamento, erro e ausência de resultados conforme a consulta.
- Menus de ações, formulários e painéis laterais reaproveitam componentes compartilhados.
- Tabelas extensas mantêm rolagem no próprio contêiner.
- Valores monetários, documentos e quantidades utilizam os componentes de entrada correspondentes.
- Rótulos, foco de diálogo e descrições acessíveis fazem parte dos componentes existentes.

A cobertura de testes inclui verificações em larguras entre 320 e 1440 pixels. Mudanças de layout devem ser verificadas também com dados preenchidos, textos longos e mensagens de erro.

## Testes e verificações

### Regras de negócio e apresentação

```bash
node --test tests/*.test.js
```

A pasta `tests/` cobre regras como divisão de pagamentos, políticas e taxas do caixa, seleção de etiquetas, métricas do catálogo e apresentação dos indicadores.

### Navegador com API interceptada

```bash
npx playwright test --config playwright.catalog.config.js
```

Essa configuração executa `e2e/catalog-remote.spec.js`, inicia o Vite em `127.0.0.1:5184` e intercepta as chamadas à API em `localhost:8080`. Usa o Google Chrome instalado. Permite verificar contratos de interface e falhas controladas.

### Navegador com API real

A configuração padrão usa a API em `:8080` e o frontend já iniciado em `:5173`. As fixtures e scripts usam cadastros de demonstração.

```bash
npm run e2e -- e2e/produtos.spec.js
```

As variáveis `FRONTEND_URL` e `PW_CHANNEL` ajustam o endereço da interface e o canal do navegador dessa configuração. Separe o banco de testes, pois as suítes reais podem cadastrar, editar e remover dados.

### Gate em PowerShell

`scripts/gate.ps1` encadeia build, lint, smoke da API e testes de navegador. A opção `-Modulo` seleciona um script em `scripts/smoke/` e o arquivo de teste correspondente. A variável opcional `RESET_DB` aponta para um script de restauração executado pelo gate.

As verificações usam configurações distintas. O resultado da suíte com API interceptada verifica o comportamento do frontend. A comunicação com o backend real e os serviços externos exige execução no ambiente integrado.

## Build e publicação

```bash
npm run build
npm run preview
```

O Vite gera a SPA em `dist/`. Essa pasta é o artefato servido pela hospedagem estática. `preview` permite conferir o resultado localmente.

O endereço definido em `VITE_API_URL` é resolvido durante o build. Gere um novo build ao alterar o destino da API. O uso de rotas por hash mantém o caminho das telas após `#`.

Na publicação, alinhe HTTPS, CORS e atributos dos cookies entre frontend e backend. O domínio fiscal e a integração Point dependem também da configuração dos serviços no backend.

## Manutenção

Ao implementar uma alteração, localize a rota em `app/panelRoutes.jsx`, confira os DTOs e controladores do backend e identifique o componente responsável pelo fluxo.

Reutilize os componentes compartilhados de formulário, feedback e navegação. Preserve a separação entre rascunho do usuário, estado confirmado pela API e dados de apresentação. Mantenha validações locais para orientar o preenchimento e encaminhe as regras definitivas ao servidor.

Verifique build, lint e os testes pertinentes ao comportamento alterado. Atualize a documentação do módulo quando houver mudança de contrato, persistência, permissão ou fluxo operacional.

O projeto possui documentação produzida em etapas diferentes. Os arquivos de planejamento registram decisões daquele momento. Confira a implementação atual e os contratos antes de seguir caminhos ou instruções históricas.

## Documentação complementar

- [Arquitetura baseada em FSD](docs/ARQUITETURA_FSD.md)
- [Planejamento de integração de estoque e catálogo](docs/PLANO_INTEGRACAO_ESTOQUE_CATALOGO.md)
- [Contratos de estoque e catálogo](docs/ATUALIZACAO_CONTRATOS_CATALOGO_ESTOQUE.md)
- [Fluxo de usuários e perfis](docs/fluxo-usuarios-perfis.md)
- [Integração da visão geral](docs/integracao/dashboard.md)
- [Pagamento dividido e parcelado](docs/FLUXO_PAGAMENTO_DIVIDIDO_E_PARCELADO.md)
- [Taxas e repasse](docs/FLUXO_TAXAS_E_REPASSE.md)
- [Fechamento do caixa no logout](docs/FECHAMENTO_CAIXA_NO_LOGOUT.md)
- [Configuração e impressão de etiquetas](docs/CONFIGURACAO_E_IMPRESSAO_ETIQUETAS.md)
- [Métricas de giro e margem](docs/METRICAS_GIRO_MARGEM_CATALOGO.md)

## Equipe e contexto

Desenvolvido pelo Grupo 08 no Projeto Integrador. A identificação do pacote permanece como `valhalla`, com a versão técnica `0.0.0` e o atributo `private` no manifesto. Consulte a equipe sobre as condições de uso e distribuição.
