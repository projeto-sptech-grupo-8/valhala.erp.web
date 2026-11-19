# Refatoração do frontend — roteamento e organização

## 1. Objetivo

Substituir a navegação manual baseada em estado e em um hook próprio por uma biblioteca de rotas React, aproximar a organização do roteamento de uma arquitetura por responsabilidades e corrigir os destinos de cadastro e demonstração identificados em `ANALISE_FRONTEND.md`.

Foi utilizado **React Router DOM 7.18.5**. A aplicação adota `HashRouter`, que mantém a URL no fragmento (`#/...`) e permite que o servidor de arquivos estáticos continue recebendo a mesma URL-base. Assim, os endereços existentes do painel, como `#/produtos` e `#/editar?id=...`, continuam válidos. [Documentação oficial do HashRouter](https://reactrouter.com/api/declarative-routers/HashRouter)

## 2. Passo a passo das alterações

### Passo 1 — instalar a biblioteca de roteamento

Foi adicionada a dependência `react-router-dom` ao `package.json` e ao `package-lock.json`. O frontend passa a usar o roteador oficial para reconhecer URLs, controlar o histórico e renderizar a tela correspondente.

### Passo 2 — simplificar o componente raiz

`src/App.jsx` deixou de controlar manualmente estados como `landing`, `login`, `forgot` e `app`. Agora ele mantém o provedor global de notificações e delega a navegação ao novo `src/app/AppRouter.jsx`.

Essa mudança separa a inicialização global da declaração das rotas e das políticas de sessão.

### Passo 3 — declarar rotas públicas e protegidas

`src/app/AppRouter.jsx` centraliza a árvore de rotas com `HashRouter`, `Routes` e `Route`.

As rotas públicas explícitas são:

| URL | Tela |
|---|---|
| `#/` | Site institucional |
| `#/login` | Login |
| `#/forgot` | Recuperação de acesso |
| `#/cadastro` | Cadastro |
| `#/demo` | Prévia pública do sistema |

As telas do painel ficam dentro de uma rota pai protegida por `RequireSession`. Se a sessão ainda não foi verificada, a interface mostra estado de carregamento e consulta `api.me()`. Sem uma sessão válida, o usuário é encaminhado ao login e a rota que tentou acessar fica guardada no estado de navegação. Depois do login, ele volta ao destino original ou vai para `#/dashboard`.

Ao sair, o app chama `api.logout()`, limpa o usuário em memória e navega para `#/`. A camada de autorização por papel/permissão permanece no shell do painel; a proteção da interface não substitui a validação que o backend precisa fazer.

### Passo 4 — criar um registro declarativo das páginas do painel

`src/app/panelRoutes.jsx` contém a relação entre o identificador da tela, seu componente React e os parâmetros específicos que esse componente recebe.

Exemplos:

- `editar` renderiza `ProductForm` e transforma `?id=...` em `editId`.
- `editarusuario` renderiza `UserForm` e transforma `?id=...` em `userId`.
- `novoperfil` transforma `?copiar=...` em `copyFrom`.
- `notafiscal` informa o identificador da listagem por meio de `page`.

O registro usa os mesmos identificadores de `src/pages/dash/pages.js`, que continua sendo a fonte de títulos, descrições, ícones e permissões. Com isso, a seleção do componente não precisa mais repetir uma longa sequência de condições em `dash.jsx`.

### Passo 5 — adaptar as chamadas de navegação já existentes

`src/app/navigation.js` oferece `usePanelNavigate()`, um adaptador entre o formato usado pelas telas (`navigate('editar', { id })`) e `useNavigate()` do React Router.

O adaptador preserva parâmetros de busca e a opção `replace`, usada por filtros para atualizar a URL sem acrescentar uma entrada ao histórico. Isso permite migrar o roteamento sem reescrever de uma vez todas as páginas e ações do painel.

### Passo 6 — transformar o painel em layout de rotas filhas

`src/pages/dash.jsx` não importa mais cada página nem escolhe a tela por uma cadeia de `if`. O componente `Shell` continua responsável pela navegação lateral, cabeçalho, breadcrumb, estado responsivo e checagem de acesso, mas renderiza a tela ativa com `<Outlet />`.

O caminho atual fornece o identificador da página; os parâmetros são lidos com `useSearchParams()`. Os componentes filhos recebem `setTitle` por meio do contexto do `Outlet`, mantendo o comportamento de títulos dinâmicos.

### Passo 7 — remover o roteador manual anterior

`src/lib/useHashRoute.js` foi removido, pois a leitura do hash, o evento `hashchange`, a construção de URLs e o histórico passaram a ser responsabilidade do React Router.

### Passo 8 — conectar os modos institucionais a URLs reais

`AppRouter.jsx` contém um adaptador pequeno para os valores `go()` ainda usados nas telas institucionais e de autenticação. Os modos são traduzidos para caminhos explícitos:

| Chamada existente | Destino |
|---|---|
| `go('landing')` | `/` |
| `go('login')` | `/login` |
| `go('forgot')` | `/forgot` |
| `go('signup')` | `/cadastro` |
| `go('demo')` | `/demo` |
| `go('app')` | `/dashboard` — passa pela proteção de sessão |

Isso corrige o comportamento em que `signup` caía no ramo padrão e mostrava o painel sem autenticação. O formulário de cadastro existente ainda não chama uma API de criação de conta; após validação local, sua navegação ao painel encontra a proteção de sessão e direciona ao login. A implementação do cadastro no backend não fazia parte desta refatoração.

### Passo 9 — criar o destino de demonstração que faltava

O botão “Acessar demonstração” agora chama `go('demo')`. A nova página `src/pages/demo.jsx`, estilizada em `src/pages/demo.module.css`, apresenta prévias navegáveis de quatro módulos: Dashboard, Produtos, Estoque e Financeiro.

Os valores são declarados como fictícios na interface. A prévia é pública e não abre o painel autenticado nem consulta dados da operação do usuário.

### Passo 10 — instalar a dependência e gerar o build

Foi executado `npm install react-router-dom@^7`; o lockfile registrou a versão resolvida `7.18.5`. Também foi executado o build de produção do Vite para confirmar que a nova árvore de imports e rotas compila.

O Vite reportou build concluído. Também emitiu um aviso de bundle JavaScript maior que 500 kB após minificação (o arquivo principal gerado ficou próximo de 987 kB). A divisão de código com carregamento preguiçoso é uma melhoria posterior recomendável, mas não foi incluída nesta alteração.

O `npm audit` identificou duas vulnerabilidades de severidade alta na árvore atual: uma em `source-map-js` anterior à versão 1.2.2 e outra no Vite 8.2.0–8.2.3. Ambas têm correção disponível segundo o registro npm. A versão do Vite já era uma dependência de desenvolvimento do projeto antes da inclusão do React Router; não atualizei dependências não necessárias para a refatoração. Consulte [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) e [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm).

Não foram executados os testes E2E ou unitários.

## 3. Arquivos alterados

### Criados

- `src/app/AppRouter.jsx` — definição das rotas públicas, proteção de sessão e composição do layout privado.
- `src/app/navigation.js` — adaptador de navegação das páginas do painel.
- `src/app/panelRoutes.jsx` — registro dos componentes associados às rotas do painel.
- `src/pages/demo.jsx` e `src/pages/demo.module.css` — prévia pública e interativa dos módulos.
- `docs/REFATORACAO_FRONTEND.md` — este documento.

### Modificados ou removidos

- `src/App.jsx` — composição mínima com `ToastProvider` e `AppRouter`.
- `src/pages/dash.jsx` — shell do painel adaptado a rotas filhas com `Outlet`.
- `src/pages/site.jsx` — destino de “Acessar demonstração” alterado para a rota pública `/demo`.
- `src/lib/useHashRoute.js` — removido após a migração.
- `package.json` e `package-lock.json` — inclusão do React Router DOM.

## 4. Fluxo resultante

```text
HashRouter
├── /                 Site institucional
├── /login            Login
├── /forgot           Recuperação de acesso
├── /cadastro         Cadastro
├── /demo             Prévia pública dos módulos
└── rotas do painel   RequireSession → StoreProvider/Shell → Outlet
    ├── /dashboard
    ├── /produtos
    ├── /editar?id=...
    ├── /usuarios
    └── demais telas registradas em panelRoutes.jsx
```

## 5. Decisões e limites

- **HashRouter em vez de BrowserRouter:** mantém os links `#/...` usados pelo projeto e evita depender de regras de fallback para URLs internas no servidor. A documentação do React Router descreve o `HashRouter` como um roteador declarativo que guarda a localização na parte hash da URL. [React Router — HashRouter](https://reactrouter.com/api/declarative-routers/HashRouter)
- **Adaptador de navegação:** reduz o risco e o tamanho da migração, pois mantém a assinatura de navegação já utilizada pelas telas enquanto delega o roteamento real à biblioteca.
- **Metadados e componentes continuam em dois registros:** `pages.js` mantém os metadados e permissões; `panelRoutes.jsx` associa componentes aos IDs. Os IDs são compartilhados, mas uma validação automática entre os dois registros pode ser acrescentada posteriormente.
- **Demonstração ilustrativa:** mostra telas representativas sem usar uma sessão de demonstração do backend. Dados de negócio reais ou uma sessão somente leitura de demonstração exigiriam contrato e suporte do backend.
- **Cadastro e recuperação:** a refatoração torna suas rotas acessíveis e impede que fluxos públicos renderizem o painel sem sessão. Não adiciona integração de cadastro nem de recuperação com backend.
- **Code splitting:** o build concluiu, mas mostrou o bundle principal acima do limite de aviso do Vite. Rotas carregadas com `lazy()` e `Suspense` podem reduzir o JS inicial em uma etapa separada.
- **Dependências:** o audit detectou duas vulnerabilidades altas com correção disponível, incluindo a versão preexistente do Vite. Elas não foram atualizadas neste trabalho, pois a atualização não era necessária para migrar o roteamento.

## 6. Resultado

A aplicação agora usa React Router para URLs, navegação e histórico; mantém as rotas antigas do painel; explicita os destinos públicos; protege páginas internas por sessão; preserva permissões no shell; e separa o registro de rotas da estrutura visual do painel. A migração é incremental: as telas continuam usando os componentes, o store e os serviços existentes.
