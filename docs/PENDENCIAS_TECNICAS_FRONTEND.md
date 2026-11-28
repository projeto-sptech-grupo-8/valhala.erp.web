# Pendências Técnicas do Frontend (Etapa 3)

Este documento registra as melhorias de **Etapa 3 — Refatoração estrutural** identificadas na análise técnica do frontend (`valhala.erp.web`). As correções prioritárias de **Etapa 1** (bugs imediatos, segurança de URLs/CSV/XML, limpeza de assets e configuração) e **Etapa 2** (sessão/armazenamento, single-flight CSRF, timeouts, polling do caixa e otimizações de relatórios/métricas) já foram aplicadas; os itens abaixo ficaram intencionalmente fora do escopo imediato por envolverem refatoração estrutural mais ampla, evolução conjunta com o backend (`valhala.core.stock.app`) ou configuração de esteira CI/CD.

> **Restrição mantida:** nenhum arquivo do backend (`valhala.core.stock.app`) deve ser alterado apenas pelo frontend para resolver itens dependentes de contrato; as integrações novas devem ser coordenadas via especificação de endpoint.

---

## Resumo por frente

| Subetapa | Foco principal | Risco atual | Impacto esperado |
| --- | --- | --- | --- |
| **3.1** | Code-splitting, fontes e warning de Fast Refresh | Bundle JS único grande (`~1,3 MB`) e CSS bloqueante | Redução do bundle inicial e build/lint 100% limpo |
| **3.2** | Higiene de renderização, hooks, timers e DOM | `setState` em render, debounce instável e limpeza incompleta de DOM/timers | Menor risco de loops/re-renders em React e zero leaks de UI |
| **3.3** | Acoplamento FSD, N+1 dependente de backend, smoke/E2E e CI | Violação de camadas FSD, fan-out HTTP e pipeline CI inativa | Arquitetura previsível, menor carga na API e integração contínua real |

---

## 3.1 Code-splitting, fontes e rotas do painel

### 1. Fragmentação do bundle JS por rota (`React.lazy` + `Suspense` + `manualChunks`)
- **Referências:** `src/app/AppRouter.jsx:14-19`, `src/app/panelRoutes.jsx:1-20`, `vite.config.js`
- **Problema:** `AppRouter.jsx` importa estaticamente `Demo`, `Forgot`, `Login`, `Site` e `PanelLayout`, enquanto `panelRoutes.jsx` importa estaticamente todas as páginas do painel. Como resultado, o build de produção gera um único chunk JavaScript monolítico (`dist/assets/index-Dh5EtYHR.js`, ~`1.298,50 kB`) carregado já na landing page ou tela de login.
- **Por que corrigir:** usuários que acessam apenas a página inicial, login ou um único módulo operacional (como Frente de Caixa) baixam e fazem parse de bibliotecas pesadas de gráficos, planilhas e relatórios sem necessidade.
- **Impacto na aplicação e no código:**
  - *Aplicação:* melhora FCP/TTI na entrada e reduz consumo de memória em terminais de caixa simples.
  - *Código:* conversão das rotas em imports dinâmicos com `React.lazy`, fallback visual uniforme com `Suspense` em `AppRouter.jsx` e `PanelLayout.jsx`, além de configuração opcional de `build.rollupOptions.output.manualChunks` no `vite.config.js`.

### 2. Eliminação do único warning restante do Oxlint (`panelRoutes.jsx`)
- **Referências:** `src/app/panelRoutes.jsx:26`
- **Problema:** `export const panelRoutes` coexiste no mesmo arquivo que declarações/referências JSX de componentes, disparando o único warning de `fast-refresh` no `npm.cmd run lint`.
- **Por que corrigir:** manter `0` erros e `0` warnings facilita tratar qualquer novo alerta do linter como falha bloqueante no CI.
- **Impacto na aplicação e no código:**
  - *Aplicação:* zero impacto em runtime; melhora a experiência de HMR em desenvolvimento.
  - *Código:* separar metadados/rotas declarativas para um módulo `.js` puro ou isolar wrappers de componente em arquivo próprio.

### 3. Remoção do `@import` bloqueante de Google Fonts no CSS global
- **Referências:** `src/shared/styles/global.module.css:1`, `index.html`
- **Problema:** `@import url('https://fonts.googleapis.com/...')` na primeira linha de `global.module.css` cria uma dependência em cascata bloqueante antes da aplicação completa dos estilos.
- **Por que corrigir:** em conexões móveis ou redes instáveis, atrasos na CDN de fontes atrasam a primeira pintura útil.
- **Impacto na aplicação e no código:**
  - *Aplicação:* melhora a velocidade de renderização inicial e evita bloqueio do parser CSS.
  - *Código:* mover o carregamento das fontes para `<link rel="preconnect">` + `<link rel="stylesheet">` em `index.html` (ou empacotar os arquivos WOFF2 localmente no frontend).

**Critérios de aceite (3.1):**
- Chunk inicial de entrada substancialmente menor e chunks separados sob demanda em `dist/assets/`.
- `npm.cmd run lint` finalizando com `0` erros e `0` warnings.
- Navegação completa entre Landing, Login e rotas do Painel validada pelos testes E2E sem erros de carregamento de chunk.

---

## 3.2 Higiene de renderização, timers e listeners

### 1. Eliminação de `setState` síncrono durante o render
- **Referências:**
  - `src/pages/finance/overview/ui/FinanceAccounts.jsx:45` (`if (data && pagina > ultimaPagina) setPagina(ultimaPagina)`)
  - `src/pages/finance/reports/ui/ReportsPage.jsx:579` (`if (selecionado && !celulaSelecionada?.tickets) setSelecionado(null)`)
  - `src/pages/finance/reports/ui/ReportTable.jsx:54-56` (chamada inline `setSelected(...)` durante render)
- **Problema:** ajustar estado diretamente no corpo da função de renderização provoca dupla passada imediata, dificulta previsibilidade em React 19 / StrictMode e mascara o fluxo real de derivação de estado.
- **Por que corrigir:** padrões de `setState` em render quebram mais facilmente em concorrência do React e geram re-renderizações em cascata difíceis de depurar.
- **Impacto na aplicação e no código:**
  - *Aplicação:* transições de página/filtro mais suaves e menor risco de loop de renderização em bordas de paginação ou troca de período.
  - *Código:* derivar o valor efetivo (`paginaEfetiva = Math.min(pagina, ultimaPagina)`, seleção derivada do dado atual) diretamente no cálculo de exibição ou normalizar em `useEffect`/event handler.

### 2. Estabilização de debounce e callbacks do painel
- **Referências:**
  - `src/features/catalog/remote/RemoteControls.jsx:9-13` (`SearchInput` inclui `onChange` nas dependências do `useEffect`)
  - `src/pages/panel/ui/PanelLayout.jsx:89` (`known = !!pages[page]` sem `Object.hasOwn`)
  - `src/pages/panel/ui/PanelLayout.jsx:107` (`setTitle` recriado a cada render sem `useCallback`)
- **Problema:**
  1. Quando o componente pai passa uma função inline para `SearchInput`, cada render reinicia o timer de debounce mesmo sem mudança no termo digitado.
  2. Em `PanelLayout.jsx:89`, consultar `pages[page]` sem `Object.hasOwn(pages, page)` considera chaves herdadas de `Object.prototype` (como `toString` ou `constructor`) como páginas válidas.
  3. `setTitle` sem `useCallback` em `PanelLayout.jsx:107` invalida `useEffect` de páginas filhas que declararem `setTitle` em suas dependências.
- **Por que corrigir:** evita resets silenciosos de busca, roteamento anômalo por nomes reservados e efeitos repetidos ao trocar título.
- **Impacto na aplicação e no código:**
  - *Aplicação:* digitação em filtros mais responsiva e roteamento interno mais robusto.
  - *Código:* armazenar `onChange` em `useRef` dentro de `SearchInput`, trocar `!!pages[page]` por `Object.hasOwn(pages, page)` e envolver `setTitle` com `useCallback`.

### 3. Limpeza garantida de DOM e timers (`iframe` de DANFE e toasts)
- **Referências:**
  - `src/pages/sales/invoices/ui/InvoiceDetail.jsx:11-28` (`printDanfe` remove o `<iframe>` oculto apenas no evento `afterprint`)
  - `src/shared/ui/notifications/ToastProvider.jsx:17` (`if (duration) setTimeout(() => dismiss(id), duration)` sem rastreamento/cleanup)
- **Problema:**
  1. Caso o usuário cancele o diálogo de impressão ou o navegador não emita `afterprint`, o `<iframe>` invisível continua anexado ao `document.body`.
  2. Os timeouts de auto-dismiss em `ToastProvider.jsx` não ficam armazenados para `clearTimeout` caso o provider seja desmontado (ex.: encerramento rápido em testes ou remontagem).
- **Por que corrigir:** previne acúmulo de nós DOM órfãos após impressões repetidas no caixa e elimina timers órfãos após unmount.
- **Impacto na aplicação e no código:**
  - *Aplicação:* menor retenção de memória em sessões longas de caixa com emissão/reimpressão frequente de NFC-e.
  - *Código:* adicionar limpeza com fallback por timeout após impressão/erro em `printDanfe` e registrar timers em `Map`/`useRef` com cleanup no `useEffect` de desmontagem do `ToastProvider`.

**Critérios de aceite (3.2):**
- Nenhum componente chamando setters de estado diretamente no corpo do render.
- Busca debounced não reinicia timer quando props de renderização do pai mudam sem alteração do termo.
- Impressão cancelada remove o `<iframe>` do DOM e unmount do `ToastProvider` cancela todos os timers ativos.

---

## 3.3 Desacoplamento FSD, N+1 dependente de backend, smoke/E2E e CI/CD

### 1. Correção das violações de fronteira FSD (`features -> pages` e features cruzadas)
- **Referências:**
  - `src/features/sales/payments/ui/SalePaymentModal.jsx:1-2` (importa módulos de `@/pages/sales/invoices/...`)
  - `src/features/sales/payments/ui/SalePaymentModal.jsx:10` (importa `MoneyInput` de `features/catalog/product-editor`)
  - Módulos legados/cruzados documentados no [README.md](../README.md) (`StoreProvider`, componentes compartilhados entre `ProductsPage` e `SalesRemote`)
- **Problema:** a camada `features` depende diretamente de `pages` (invertendo a hierarquia unidirecional `app -> pages -> widgets -> features -> entities -> shared`) e cruza fronteiras entre features independentes (`sales` dependendo de `catalog`).
- **Por que corrigir:** acoplamentos invertidos criam risco de dependências circulares, dificultam code-splitting limpo por página e impedem reaproveitamento isolado de componentes.
- **Impacto na aplicação e no código:**
  - *Aplicação:* melhora a separação natural de chunks entre Catálogo, Caixa e Faturamento Fiscal.
  - *Código:* mover `MoneyInput` para `src/shared/ui/` e extrair hooks/componentes fiscais reutilizáveis de `pages/sales/invoices` para `entities/invoices` ou `features/sales/fiscal`.

### 2. Eliminação dos últimos padrões N+1 / agregação client-side (dependente de novos endpoints no backend)
- **Referências:**
  - `src/pages/dashboard/ui/StockOverview.jsx:35-50` (até 8 requisições `GET /produtos/{id}` para enriquecer unidades de exibição)
  - `src/pages/finance/reports/model/reportApi.js:20-68` (`estoqueAtual` nas linhas `20-27` e `produtosDoHorario` nas linhas `29-68` paginando até `MAX_REPORT_PAGES = 50` com agregação no navegador)
  - `src/features/catalog/remote/useCatalogMetrics.js:15-47` (cálculo de giro em 30 dias e margem de receitas/drinks com fan-out no cliente, mitigado temporariamente em Etapa 2 com cache LRU em módulo)
- **Problema:** embora a Etapa 2 tenha adicionado limite de páginas (`MAX_REPORT_PAGES = 50`) e cache compartilhado em `useCatalogMetrics.js`, o frontend ainda consolida dados pesados no cliente por ausência de projeções agregadas na API.
- **Por que corrigir:** à medida que o catálogo, histórico de vendas e pedidos de caixa crescerem em produção, paginações no cliente podem atingir o teto de 50 páginas (truncamento visível) ou pressionar rede e CPU do cliente.
- **Impacto na aplicação e no código:**
  - *Aplicação:* carregamento instantâneo de relatórios, dashboard de reposição e tabela de catálogo sem múltiplas idas e vindas HTTP.
  - *Código:* manter camada adaptadora fina no frontend (`reportApi.js`, `StockOverview.jsx`, `useCatalogMetrics.js`) pronta para consumir endpoints agregados no backend (unidade já embutida no DTO de alertas, agregado de estoque/horário server-side e projeção batch de giro/margem).

### 3. Parametrização de credenciais em scripts de smoke/E2E e ativação real de CI
- **Referências:**
  - `e2e/fixtures.js:5` (`export const ADMIN = { email: 'admin@valhalla.local', senha: 'Senha@123' }`)
  - `scripts/smoke/lib.ps1:26`, `scripts/smoke/auth.ps1:10`
  - `.github/workflows/template.yml:29-36`
- **Problema:**
  1. Credenciais locais de seed estão literais nos scripts de smoke e fixtures E2E; caso alguém aponte os scripts para outro ambiente, há risco de reutilização de credencial padrão ou exposição acidental em logs.
  2. `.github/workflows/template.yml` permanece apenas como modelo sem pipeline real executando verificações do frontend.
- **Por que corrigir:** garante boas práticas de higiene de credenciais e impede regressões silenciosas antes de merge.
- **Impacto na aplicação e no código:**
  - *Aplicação:* zero risco de impacto funcional; fortalece governança de entrega e segurança operacional.
  - *Código:* ler credenciais de `process.env` (`$env:VALHALLA_SMOKE_EMAIL` / `$env:VALHALLA_SMOKE_PASSWORD` no PowerShell e `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` no Playwright, mantendo fallback apenas quando explicitamente em execução local) e substituir o template por workflow ativo executando:
    - `npm.cmd run lint`
    - `node --test tests/*.test.js`
    - `npm.cmd run build`
    - `npx playwright test --config playwright.catalog.config.js`

### 4. Expansão da suíte de testes para módulos ainda pouco cobertos
- **Referências:** `tests/`, `e2e/`
- **Problema:** após a Etapa 2, os fluxos centrais de CSRF/API, CSV/NF-e e transformações de relatórios passaram a contar com testes unitários (`17` arquivos em `tests/`), e os fluxos de catálogo/caixa/alteração de senha contam com E2E mockado; entretanto, fluxos completos de **Financeiro (Contas a Pagar)** e **Relatórios (renderização e filtros)** ainda carecem de cenários E2E dedicados no `playwright.catalog.config.js`.
- **Por que corrigir:** garante proteção contra regressões visuais e de integração na evolução de Etapa 3 (principalmente durante introdução de `React.lazy` e desacoplamento FSD).
- **Impacto na aplicação e no código:** maior confiança em refatorações estruturais sem dependência manual.

**Critérios de aceite (3.3):**
- Zero imports de `pages/*` dentro de `features/*` e zero imports cruzados entre features independentes.
- Pipeline CI executando automaticamente em PR/push com lint, testes unitários, build e E2E mockado verdes.
- Scripts de smoke e E2E aceitando credenciais por variáveis de ambiente e cobertura E2E adicionada para Financeiro e Relatórios.
