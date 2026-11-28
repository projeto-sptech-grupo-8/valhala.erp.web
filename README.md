# Valhalla ERP — Frontend Web

Aplicação web (SPA) da **Adega Meraki** para gestão de catálogo, estoque por lotes, frente de caixa, pagamentos, NFC-e, financeiro, relatórios e controle de acesso.

![React 19.2](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)
![Vite 8.2](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white)
![React Router 7](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)
![JavaScript ESM](https://img.shields.io/badge/JavaScript-ESM%2FJSX-F7DF1E?logo=javascript&logoColor=black)
![CSS Modules](https://img.shields.io/badge/CSS-Modules-1572B6?logo=css3&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)

> Interface web consumidora da API REST de `valhala.core.stock.app`. Este repositório não inclui backend nem banco de dados.

## Índice

- [Visão geral](#visão-geral) · [Stack](#stack) · [Arquitetura](#arquitetura)
- [Começando](#começando) · [Configuração](#configuração) · [Comandos](#comandos)
- [Rotas e permissões](#rotas-e-permissões) · [Integração e CSRF](#integração-e-csrf) · [Armazenamento local](#armazenamento-local)
- [Testes](#testes) · [Build e publicação](#build-e-publicação) · [Solução de problemas](#solução-de-problemas)
- [Documentação complementar](#documentação-complementar) · [Contribuição](#contribuição) · [Licença](#licença)

## Visão geral

O **Valhalla ERP — Frontend Web** concentra a operação diária do estabelecimento em uma SPA integrada à API do backend:

- **Autenticação e sessão**: login com cookies `HttpOnly`, restauração via `/usuario/me`, revalidação no foco da janela (`focus`), refresh deduplicado (`/auth/refresh`), logout e alteração da própria senha.
- **Visão geral (Início)**: indicadores separados nas abas **Estoque** e **Caixa** conforme permissões, série mensal (3, 6, 9 e 12 meses), prioridades de reposição, faixas de validade e acompanhamento do turno.
- **Catálogo**: produtos padrão (com fracionamento por dose e venda em fardo), drinks com receitas, categorias, indicadores de margem bruta e giro em 30 dias e exportação Excel (`.xlsx`) pelo servidor.
- **Estoque, validades e XML**: movimentações paginadas com exportação Excel, reposição paginada no servidor (`/dashboard/reposicao`), lotes/validades com FEFO e baixa de perdas em lote, impressão de etiquetas e importação de NF-e modelo 55 via modal em Produtos (`/entradanf` redireciona para `/produtos?importar=1`).
- **Vendas e caixa (POS)**: abertura e fechamento de turno, modo tela cheia, 5 posições visuais simultâneas, catálogo de venda (`/produtos/venda` e `/categorias/venda`) atualizado a cada 20 s, pagamento dividido em até 4 partes com idempotência, integração Mercado Pago Point, estornos, conciliação manual, auditoria e ajustes de taxas, políticas e equipamentos.
- **NFC-e**: emissão automática após pedido `CONCLUIDO`, retomada de pendências em **Pedidos** (`?nfcePendente=true`), consulta/detalhes, download de XML, impressão de DANFE 80 mm no navegador e cancelamento com justificativa (15–255 caracteres).
- **Financeiro**: saldos e contas a pagar (`PAGAR`), fluxo de caixa em 6 meses, próximos vencimentos, resultado/DRE por período, comparação mensal e vendas por categoria.
- **Relatórios**: 6 visões (*Curva ABC*, *Margem por categoria*, *Falta de estoque*, *Horários de venda* com detalhamento por célula, *Canais de venda* e *Perdas por motivo*) em janelas de 7, 30 ou 90 dias, alternância entre `R$` e `%` e exportação Excel em Curva ABC e Falta de estoque.
- **Controle de acesso e configurações**: gestão de usuários, perfis e sobrescritas individuais (`GRANT`/`REVOKE`), dados cadastrais da adega (edição restrita ao perfil `Gerente`), tema claro/escuro e histórico dos últimos acessos.
- **Rotas públicas**: landing institucional (`/#/`) e demonstração interativa com dados ilustrativos (`/#/demo`).

Limites operacionais atuais: a recuperação de senha por e-mail permanece indisponível (`/forgot` orienta procurar o responsável); o emissor de NFC-e opera em ambiente `HOMOLOGACAO`; o módulo Financeiro contempla apenas contas `PAGAR` (sem busca textual por descrição na listagem da API); e vínculos/notas da importação XML e preferências de etiquetas são persistidos localmente no navegador com escopo por usuário.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework UI | `React 19.2.8` e `React DOM 19.2.8` (JavaScript ES Modules + JSX) |
| Roteamento | `React Router DOM 7.18.5` (`HashRouter`) |
| Build e Dev Server | `Vite 8.2.0` com `@vitejs/plugin-react 6.0.4` e alias `@/` → `src/` |
| Estilização | CSS Modules com tokens de tema claro/escuro |
| Componentes e ícones | `Lucide React 1.45.0`, `@radix-ui/react-slot 1.3.3`, `class-variance-authority 0.7.1`, `clsx 2.1.1` |
| Gráficos | `Recharts 3.10.1` |
| Comunicação HTTP | Fetch API nativa com cookies (`credentials: 'include'`) e `X-XSRF-TOKEN` |
| Qualidade e testes | `Oxlint 1.75.0`, Node Test Runner (Node 24+) e `Playwright 1.64.1` |

## Arquitetura

O frontend segue uma adaptação pragmática de **Feature-Sliced Design (FSD)**, organizando o código por camadas e domínios na direção `app → pages → widgets → features → entities → shared`.

```text
.
├── .github/workflows/template.yml      # Modelo inicial de CI (ainda não configurado)
├── public/valhalla-logo.png            # Logotipo estático
├── src/
│   ├── app/                            # App, AppRouter, panelRoutes, StoreProvider e tokens de tema
│   ├── pages/                          # Páginas por domínio (auth, dashboard, catalog, inventory, sales, finance, access, settings, panel, landing, demo)
│   ├── widgets/                        # Blocos compostos reutilizáveis (sidebar, page-header)
│   ├── features/                       # Fluxos e ações (access-management, account, catalog, preferences, printing, sales)
│   ├── entities/                       # Regras, modelos e APIs de domínio (access, inventory, invoices, preferences, reports, sales, store)
│   └── shared/                         # Cliente HTTP/CSRF (api/), config/, hooks/helpers (lib/), styles/ e UI genérica (ui/)
├── tests/                              # 17 arquivos de testes unitários com Node Test Runner
├── e2e/                                # Suíte interceptada (catalog-remote.spec.js) e specs integradas à API real
├── scripts/                            # gate.ps1 e smoke tests PowerShell em scripts/smoke/
├── docs/                               # Arquitetura, fluxos, planos e contratos de integração
├── .oxlintrc.json                      # Configuração do Oxlint
├── index.html                          # HTML raiz e script síncrono anti-flash de tema
├── package.json
├── package-lock.json
├── playwright.config.js                # Configuração Playwright para API real
├── playwright.catalog.config.js        # Configuração Playwright para API interceptada
└── vite.config.js                      # Configuração Vite e alias @/ -> src/
```

Fluxo de execução e comunicação com o backend:

```text
HashRouter (AppRouter) → RequireSession (GET /usuario/me)
                       → StoreProvider + PanelLayout (RBAC via pages.js)
                       → Page / Feature (useQueryResource + useListParams)
                       → api.js + csrf.js (credentials: 'include' + X-XSRF-TOKEN)
                       → Backend valhala.core.stock.app
```

### Decisões e acoplamentos relevantes

- **`useQueryResource` e `useListParams`** (`src/shared/lib/hooks/usePagedQuery.js`): padronizam carregamento, erro, cancelamento via `AbortController` e sincronização de filtros, ordenação e paginação na URL; telas de Controle de acesso ainda utilizam o hook legado `useResource` (`src/shared/lib/hooks/useResource.js`).
- **Camada de API distribuída**: o cliente central e os normalizadores ficam em `src/shared/api/api.js` (e `csrf.js`), enquanto domínios recentes encapsulam chamadas com `authenticatedRequest` em módulos próprios (`cashApi.js`, `fiscalApi.js`, `financeApi.js`, `reportApi.js` e `changePassword.js`).
- **Adaptações conhecidas de FSD**: o contexto e componentes fiscais em `pages/sales/invoices` são consumidos por `features/sales/payments` e `pages/panel`; `MoneyInput` e CSS Modules de `ProductsPage` e `SalesRemote` são reutilizados por outras fatias; e `StoreProvider` mantém apenas os vínculos e histórico local da importação XML por usuário (`valhalla:xml-import:v1:<userId|local>`), com leitura fallback da chave legada `valhalla:store:v2`. O plano de refatoração estrutural desses acoplamentos está em [docs/PENDENCIAS_TECNICAS_FRONTEND.md](docs/PENDENCIAS_TECNICAS_FRONTEND.md).
- **Interface e atalhos**: o atalho `Ctrl+B` (`⌘+B` no macOS) alterna o menu lateral ou sai do modo tela cheia do caixa, e o script inicial em [index.html](index.html) aplica o tema salvo antes da montagem do React.

## Começando

### Pré-requisitos

- **Node.js** compatível com Vite 8 (`^20.19.0 || >=22.12.0`; ambiente de verificação em Node 24).
- **npm** (incluído no Node.js) para instalação via `package-lock.json`.
- **Git**.
- Backend `valhala.core.stock.app` em execução e acessível (padrão `http://localhost:8080`) e uma conta cadastrada com as permissões necessárias.

### 1. Clone e instale as dependências

```bash
git clone https://github.com/projeto-sptech-grupo-8/valhala.erp.web.git
cd valhala.erp.web
npm ci
```

### 2. Configure a URL da API

Crie um arquivo `.env.local` na raiz do repositório para apontar para a API desejada (por padrão o cliente utiliza `http://localhost:8080`):

```powershell
# Windows (PowerShell)
'VITE_API_URL=http://localhost:8080' | Set-Content .env.local
```

```bash
# Linux/macOS
echo 'VITE_API_URL=http://localhost:8080' > .env.local
```

> Informe a URL base **sem barra final** e reinicie o Vite ao alterar `.env.local`. Variáveis `VITE_*` são incorporadas ao bundle entregue ao navegador — nunca armazene senhas, chaves privadas ou segredos nessas variáveis.

### 3. Inicie a aplicação

```bash
npm run dev
```

| Recurso | URL |
| --- | --- |
| Aplicação (desenvolvimento) | `http://localhost:5173` |
| Prévia do build (`npm run preview`) | `http://localhost:4173` |
| API padrão (`VITE_API_URL`) | `http://localhost:8080` |
| E2E com API interceptada | `http://127.0.0.1:5184` |

## Configuração

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `VITE_API_URL` | não | `http://localhost:8080` | URL base da API embutida no bundle pelo Vite (sem barra final; usar `https://` em produção). |
| `FRONTEND_URL` | não | `http://localhost:5173` | URL usada pelo Playwright real ([playwright.config.js](playwright.config.js)) e pelos smoke tests ([scripts/smoke/lib.ps1](scripts/smoke/lib.ps1)). |
| `PW_CHANNEL` | não | `chrome` | Canal do navegador utilizado pelo Playwright. |
| `API_URL` | não | `http://localhost:8080` | URL alvo dos scripts PowerShell em `scripts/smoke/`. |
| `RESET_DB` | não | — | Caminho opcional de script para restaurar o banco antes dos testes no [scripts/gate.ps1](scripts/gate.ps1). |

Notas de ambiente e rede:

- **CORS**: o backend deve responder com `Access-Control-Allow-Credentials: true`, `Access-Control-Allow-Origin` explícito (nunca `*`) e `Access-Control-Allow-Headers` liberando `Content-Type` e `X-XSRF-TOKEN`.
- **Origem consistente e cookies `SameSite=Strict`**: em desenvolvimento, não misture `localhost` e `127.0.0.1` entre frontend e backend; em produção, sirva frontend e API no mesmo site (por exemplo, via proxy reverso).
- **Versionamento**: o [.gitignore](.gitignore) ignora `.env`, `.env.*` e `*.local` (mantendo apenas `.env.example` versionado); ainda assim, prefira `.env.local` para ajustes locais.

## Comandos

| Comando | Descrição |
| --- | --- |
| `npm ci` | Instala as dependências exatas registradas em `package-lock.json` |
| `npm run dev` | Inicia o servidor de desenvolvimento Vite |
| `npm run build` | Gera os arquivos estáticos de produção em `dist/` |
| `npm run preview` | Serve localmente o build de produção gerado em `dist/` |
| `npm run lint` | Executa a análise estática com o Oxlint |
| `node --test tests/*.test.js` | Executa os testes unitários no Node Test Runner |
| `npx playwright test --config playwright.catalog.config.js` | Executa os testes E2E com API interceptada (`127.0.0.1:5184`) |
| `npm run e2e -- e2e/produtos.spec.js` | Executa uma suíte Playwright específica contra a API real (`:8080` e `:5173`) |
| `npm run gate` | Executa build, lint, smoke da API e Playwright real via [scripts/gate.ps1](scripts/gate.ps1) |
| `npm run gate -- -Modulo produtos` | Executa o gate filtrado para um módulo específico |

> **Nota no Windows PowerShell:** se a política de execução local bloquear o wrapper `npm.ps1`, utilize `npm.cmd` (por exemplo, `npm.cmd run lint`).

## Rotas e permissões

| Módulo | Rotas (`HashRouter`) | Permissão / Acesso | Estado |
| --- | --- | --- | --- |
| Público | `/#/`, `/#/demo`, `/#/login`, `/#/forgot` | Público | Ativo (`forgot` informativo) |
| Visão geral | `/#/dashboard?aba=estoque\|caixa` | `VISUALIZAR_ESTOQUE` / `CAIXA_VISUALIZAR` | Integrado |
| Catálogo | `/#/produtos`, `/#/novo`, `/#/editar`, `/#/categorias` | `VISUALIZAR_ESTOQUE` (+ `GERENCIAR_ESTOQUE` para edição) | Integrado |
| Estoque | `/#/movimentacoes`, `/#/novamovimentacao`, `/#/reposicao`, `/#/validades` | `VISUALIZAR_ESTOQUE` (+ `MOVIMENTAR_ESTOQUE`) | Integrado |
| Etiquetas e XML | Modal em `/#/produtos`; `/#/entradanf` → `/#/produtos?importar=1` | `VISUALIZAR_ESTOQUE` (+ `MOVIMENTAR_ESTOQUE` para XML) | Parcial (config/vínculos locais) |
| Vendas e caixa | `/#/caixa`, `/#/pedidos`, `/#/sessoescaixa`, `/#/auditoria`, `/#/ajustescaixa` | `CAIXA_VISUALIZAR` (+ permissões operacionais/gerenciais) | Integrado |
| NFC-e | `/#/notafiscal` (`?aba=pendentes` → `/#/pedidos?status=CONCLUIDO&nfcePendente=true`) | `CAIXA_VISUALIZAR` (+ `CAIXA_OPERAR`/`CAIXA_CANCELAR`) | Integrado (`HOMOLOGACAO`) |
| Financeiro | `/#/financeiro?aba=visao\|dre` | `VISUALIZAR_FINANCEIRO` (+ `GERENCIAR_FINANCEIRO`) | Integrado (apenas contas `PAGAR`) |
| Relatórios | `/#/relatorios?aba=abc\|margem\|ruptura\|horarios\|canais\|perdas` | `VISUALIZAR_RELATORIOS` | Integrado |
| Controle de acesso | `/#/usuarios`, `/#/novousuario`, `/#/perfis`, `/#/novoperfil` | `USUARIOS_*` / `PERFIS_GERENCIAR` | Integrado |
| Configurações | `/#/geral?aba=geral\|seguranca` (`/seguranca` e `/notificacoes` redirecionam) | Autenticado (dados da adega: apenas perfil `Gerente`) | Integrado |

As verificações definidas em `src/entities/access/model/pages.js` controlam apenas a visibilidade e a navegação na interface; a autorização definitiva de todas as operações é aplicada no backend.

## Integração e CSRF

O transporte HTTP centralizado em `src/shared/api/api.js` e `src/shared/api/csrf.js` implementa os contratos de sessão e resiliência com o backend:

1. **Cookies e CSRF**: todas as chamadas enviam `credentials: 'include'`; mutações autenticadas (`POST`, `PUT`, `PATCH`, `DELETE`) anexam `X-XSRF-TOKEN` lido do cookie `XSRF-TOKEN` ou obtido sob demanda em chamada single-flight via `GET /auth/csrf` (timeout de `10s`), com nova tentativa automática única caso o servidor retorne `403` por CSRF.
2. **Renovação de sessão única (`refreshSession`)**: requisições concorrentes que recebam `401` compartilham a mesma chamada `POST /auth/refresh` (timeout de `10s`, lendo token CSRF sem disparo recursivo de `/auth/csrf`), evitando revogação causada pela rotação de refresh token e diferenciando erro de rede (`status: 0`) de expiração real (`401`).
3. **Timeouts, paginação limitada e cancelamento**: requisições padrão aplicam timeout de `30s` com `AbortController`, paginações completas respeitam teto de segurança (`maxPages = 50`) e leituras simultâneas de catálogo/dashboard são deduplicadas por `catalogRead`, além do tratamento padronizado de respostas `204`, downloads `blob` e mapeamento de `fieldErrors`.
4. **Resiliência e sanitização**: pagamentos preservam chaves de idempotência (`crypto.randomUUID()`), a emissão fiscal consulta o vínculo do pedido antes de reenviar, operações críticas e confirmação de NF-e bloqueiam reenvios duplicados (`confirmLock` / erro incerto), caminhos dinâmicos escapam IDs com `encodeURIComponent`, exportações CSV neutralizam fórmulas e o parser XML de NF-e rejeita `<!DOCTYPE`/`<!ENTITY`, valores inválidos e excedentes ao limite de itens (`990`).

## Armazenamento local

| Armazenamento | Chave | Finalidade |
| --- | --- | --- |
| `localStorage` | `valhalla:tema` | Tema claro ou escuro do painel (lido antes da montagem em [index.html](index.html)) |
| `localStorage` | `valhalla:menu-recolhido` | Estado recolhido ou expandido do menu lateral no desktop |
| `localStorage` | `valhalla:labels:v1:<userId\|local>` | Preferências visuais de etiquetas por usuário |
| `localStorage` | `valhalla:xml-import:v1:<userId\|local>` | Vínculos emitente→produto e histórico local de NF-e importadas por usuário (migra dados somente leitura de `valhalla:store:v2`) |
| `sessionStorage` | `cash-visual-slots:<sessionId>` | Mapeamento das 5 posições visuais de atendimento no caixa |
| `sessionStorage` | `cash-payment-plan:<userId>:<orderId>` | Plano de pagamento dividido e chaves de idempotência (limpa também a chave legada `cash-payment-<orderId>`) |

> **Limpeza de sessão e terminais compartilhados:** ao encerrar sessão no logout, após alteração de senha ou ao receber `401` na verificação de acesso, o frontend remove a chave legada `valhalla:store:v2` e limpa os prefixos operacionais no `sessionStorage` (`cash-payment-plan:*`, `cash-payment-*` e `cash-visual-slots:*`). Os metadados locais de importação XML permanecem isolados por usuário em `valhalla:xml-import:v1:<userId|local>`.

## Testes

### Análise estática e testes unitários

```bash
npm run lint
node --test tests/*.test.js
```

- O Oxlint segue as regras definidas em [.oxlintrc.json](.oxlintrc.json).
- Os 17 arquivos em `tests/` cobrem proteção CSRF e cliente HTTP (`apiCsrf.test.js`), sanitização CSV e parser XML de NF-e (`csvAndNfe.test.js`), transformações e fuso horário de relatórios (`reportApi.test.js`), auditoria, taxas/políticas e pagamentos de caixa, posições visuais de comanda, métricas de catálogo, apresentação do dashboard, seleção/configuração de etiquetas, máscara monetária, regras de senha, validação de perfis, lotes remotos e métricas de reposição.

### E2E com API interceptada (contrato e UI)

```bash
npx playwright test --config playwright.catalog.config.js
```

Usa [playwright.catalog.config.js](playwright.catalog.config.js), sobe o Vite em `http://127.0.0.1:5184` com o Google Chrome instalado e executa `e2e/catalog-remote.spec.js` sem tocar banco de dados real.

### E2E com API real e Gate PowerShell

```bash
npm run e2e -- e2e/produtos.spec.js
npm run gate
```

- [playwright.config.js](playwright.config.js) executa contra a API em `:8080` e o frontend em `:5173` (`workers: 1`) e já exclui `catalog-remote.spec.js` via `testIgnore`.
- Utilize um banco de testes isolado: os fluxos reais criam e alteram registros usando credenciais locais de seed definidas em `e2e/fixtures.js` e `scripts/smoke/` (`admin@valhalla.local`), que nunca devem coincidir com ambientes de homologação ou produção.
- O [scripts/gate.ps1](scripts/gate.ps1) encadeia `build`, `lint`, testes unitários (`node --test tests/*.test.js`), `RESET_DB` opcional, smoke tests de API (`scripts/smoke/*.ps1`) e Playwright real (`playwright.config.js`); ele não executa `playwright.catalog.config.js`.
- O workflow [.github/workflows/template.yml](.github/workflows/template.yml) ainda é um modelo inicial sem pipeline automatizada configurada (acompanhado em [docs/PENDENCIAS_TECNICAS_FRONTEND.md](docs/PENDENCIAS_TECNICAS_FRONTEND.md)).

## Build e publicação

```bash
npm run build
npm run preview
```

- Os arquivos estáticos da SPA são gerados em `dist/` com o valor de `VITE_API_URL` resolvido em tempo de build (gere um novo build ao alterar o destino da API e use `https://` em produção).
- Como a aplicação utiliza `HashRouter`, as rotas permanecem após `#`, dispensando regras de fallback para `index.html` no servidor estático.
- Na publicação, alinhe **HTTPS**, **CORS** e cookies `SameSite=Strict` servindo frontend e backend no mesmo site (por exemplo, via proxy reverso), garantindo também a configuração dos serviços de NFC-e e Mercado Pago Point no backend.
- Ao servir `dist/`, recomenda-se configurar cabeçalhos HTTP de segurança como `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, `frame-ancestors 'none'` e `Content-Security-Policy` compatível com o script de tema em [index.html](index.html) e as fontes externas declaradas nos estilos globais.

## Solução de problemas

| Sintoma | Causa provável | Correção |
| --- | --- | --- |
| CORS bloqueado ou cookies não enviados | Origem divergente (`localhost` vs `127.0.0.1`) ou `FRONTEND_URL` sem a origem do front | Use exatamente a origem configurada em `FRONTEND_URL` no backend e mantenha `localhost`/`127.0.0.1` consistentes. |
| Login retorna `200`, mas a sessão não persiste em HTTP local | Backend rodando com `COOKIE_SECURE=true` sem HTTPS | Ative o perfil `dev` ou defina `COOKIE_SECURE=false` apenas no backend local. |
| `403` em requisições de escrita (CSRF) | Cookie `XSRF-TOKEN` indisponível ou CORS sem liberar `X-XSRF-TOKEN` | Libere `X-XSRF-TOKEN` em `Access-Control-Allow-Headers` no backend e mantenha frontend e API no mesmo site. |
| Alteração em `VITE_API_URL` não surte efeito | Vite não foi reiniciado ou build não foi regerado | Reinicie `npm run dev` (ou execute `npm run build` novamente para produção). |
| `npm` bloqueado no Windows PowerShell (`UnauthorizedAccess`) | Política de execução bloqueando `npm.ps1` | Execute os comandos usando `npm.cmd` (ex.: `npm.cmd run dev`, `npm.cmd run lint`). |
| `npm run e2e` executa contra a API real (`:8080`) quando você queria a suíte mockada (`:5184`) | O padrão usa [playwright.config.js](playwright.config.js) (que ignora `catalog-remote.spec.js`) | Execute `npm run e2e -- --config playwright.catalog.config.js` para a suíte interceptada sem backend. |

## Documentação complementar

| Documento | Conteúdo |
| --- | --- |
| [docs/ARQUITETURA_FSD.md](docs/ARQUITETURA_FSD.md) | Decisão arquitetural FSD, camadas e convenções iniciais |
| [docs/PADRONIZACAO_ERROS_CARREGAMENTOS.md](docs/PADRONIZACAO_ERROS_CARREGAMENTOS.md) | Padrão de feedback de carregamento, erro e estados vazios |
| [docs/PLANO_INTEGRACAO_ESTOQUE_CATALOGO.md](docs/PLANO_INTEGRACAO_ESTOQUE_CATALOGO.md) | Planejamento de integração de estoque e catálogo |
| [docs/ATUALIZACAO_CONTRATOS_CATALOGO_ESTOQUE.md](docs/ATUALIZACAO_CONTRATOS_CATALOGO_ESTOQUE.md) | Contratos e ajustes de catálogo e estoque |
| [docs/METRICAS_GIRO_MARGEM_CATALOGO.md](docs/METRICAS_GIRO_MARGEM_CATALOGO.md) | Cálculo e limites das métricas de giro e margem |
| [docs/CONFIGURACAO_E_IMPRESSAO_ETIQUETAS.md](docs/CONFIGURACAO_E_IMPRESSAO_ETIQUETAS.md) | Regras de seleção, lotes e impressão de etiquetas |
| [docs/FLUXO_PAGAMENTO_DIVIDIDO_E_PARCELADO.md](docs/FLUXO_PAGAMENTO_DIVIDIDO_E_PARCELADO.md) | Fluxo de pagamento dividido, parcelamento e idempotência |
| [docs/FLUXO_TAXAS_E_REPASSE.md](docs/FLUXO_TAXAS_E_REPASSE.md) | Regras de taxas e simulação de repasse no caixa |
| [docs/FLUXO_EDICAO_POLITICAS_CAIXA.md](docs/FLUXO_EDICAO_POLITICAS_CAIXA.md) | Configuração de políticas e meios de pagamento |
| [docs/FECHAMENTO_CAIXA_NO_LOGOUT.md](docs/FECHAMENTO_CAIXA_NO_LOGOUT.md) | Verificação e fechamento de turno no encerramento da sessão |
| [docs/MELHORIAS_AUDITORIA_CAIXA.md](docs/MELHORIAS_AUDITORIA_CAIXA.md) | Apresentação de eventos e responsáveis na auditoria do caixa |
| [docs/MELHORIAS_CAIXAS_E_MAQUININHAS.md](docs/MELHORIAS_CAIXAS_E_MAQUININHAS.md) | Gestão de caixas físicos e maquininhas Point |
| [docs/fluxo-usuarios-perfis.md](docs/fluxo-usuarios-perfis.md) | Fluxo de usuários, perfis e permissões |
| [docs/INTEGRACAO_ALTERAR_SENHA.md](docs/INTEGRACAO_ALTERAR_SENHA.md) | Contrato e validações da alteração da própria senha |
| [docs/integracao/README.md](docs/integracao/README.md) | Índice dos documentos de integração por módulo |
| [docs/integracao/dashboard.md](docs/integracao/dashboard.md) | Integração dos indicadores da visão geral |
| [docs/integracao/achados-backend.md](docs/integracao/achados-backend.md) | Achados registrados no backend durante a integração |
| [docs/PENDENCIAS_TECNICAS_FRONTEND.md](docs/PENDENCIAS_TECNICAS_FRONTEND.md) | Registro da Etapa 3 (refatorações estruturais, FSD, CI e melhorias pendentes de backend) |

> Documentos históricos como [SPEC_GAP_ANALYSIS.md](SPEC_GAP_ANALYSIS.md), [docs/ARQUITETURA_FSD.md](docs/ARQUITETURA_FSD.md) e [docs/CONTEXTO_CONTINUIDADE_CHAT.md](docs/CONTEXTO_CONTINUIDADE_CHAT.md) registram etapas anteriores do projeto; confira sempre o código atual antes de seguir referências antigas.

## Contribuição

1. Crie uma branch a partir de `main` com prefixo `feat/`, `fix/`, `docs/` ou `refactor/`.
2. Mantenha os commits no padrão Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`).
3. Ao criar ou alterar telas, registre a rota em `src/app/panelRoutes.jsx`, atualize metadados e permissões em `src/entities/access/model/pages.js` e reutilize hooks e componentes de `src/shared/`.
4. Execute `npm run lint`, `npm run build` e os testes pertinentes antes de abrir o pull request.
5. Descreva no pull request o comportamento alterado, os contratos do backend envolvidos e como validar.

## Licença

Este repositório não possui um arquivo `LICENSE` (`"private": true` em [package.json](package.json)). O uso é restrito ao contexto do projeto **Adega Meraki / Valhalla ERP** (**Grupo 08** — Projeto Integrador SPTech); consulte os mantenedores antes de reutilizar ou distribuir o código.
