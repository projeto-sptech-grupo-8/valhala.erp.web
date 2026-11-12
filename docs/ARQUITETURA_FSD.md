# Arquitetura do frontend — Feature-Sliced Design

## Decisão

O frontend foi reorganizado com uma arquitetura **baseada em Feature-Sliced Design (FSD)**, adaptada ao tamanho e às convenções existentes do projeto.

FSD foi escolhido porque o produto é uma SPA React cuja interface acompanha domínios e fluxos de negócio — catálogo, estoque, vendas, financeiro e controle de acesso. A arquitetura organiza esses módulos em fatias que podem evoluir com responsabilidades explícitas. MVC não representa tão bem a composição funcional atual de páginas, widgets, hooks e componentes React.

## Camadas e responsabilidades

| Camada | Local | Responsabilidade |
|---|---|---|
| `app` | `src/app/` | Montagem da aplicação, roteamento, providers e configuração do painel. |
| `pages` | `src/pages/` | Entradas de rota e composição das telas por domínio. |
| `widgets` | `src/widgets/` | Blocos compostos e reutilizáveis de uma página, como Sidebar e PageHeader. |
| `features` | `src/features/` | Ações e fluxos do usuário, como editor de produto, gestão de acesso, impressão e autorização de venda. |
| `entities` | `src/entities/` | Regras e conceitos de negócio, como estoque, lotes, relatórios, acesso, preferências e sessão compartilhada. |
| `shared` | `src/shared/` | Elementos sem regra de negócio específica: API base, UI genérica, hooks, formatação e estilos globais. |

## Estrutura resultante

```text
src/
├── app/
│   ├── App.jsx
│   ├── AppRouter.jsx
│   ├── panelRoutes.jsx
│   └── providers/store/
├── pages/
│   ├── auth/{login,recovery}/
│   ├── catalog/{products,categories,product-editor}/
│   ├── inventory/{movements,restock,expiry,invoice-import}/
│   ├── sales/{cash,invoices,audit}/
│   ├── finance/{overview,reports}/
│   ├── access/{users,profiles}/
│   ├── dashboard/
│   ├── landing/
│   ├── panel/
│   ├── settings/
│   └── demo/
├── widgets/{sidebar,page-header}/
├── features/
│   ├── access-management/
│   ├── catalog/{product-editor,product-details,product-labels}/
│   ├── preferences/
│   ├── printing/
│   └── sales/authorization/
├── entities/
│   ├── access/
│   ├── inventory/
│   ├── invoices/
│   ├── preferences/
│   ├── reports/
│   ├── sales/
│   └── store/
└── shared/
    ├── api/
    ├── config/
    ├── lib/
    ├── mocks/
    ├── styles/
    └── ui/
```

## Regra de dependência

As dependências seguem a direção das responsabilidades: camadas superiores podem usar as inferiores; camadas inferiores não importam páginas nem detalhes da interface de níveis superiores.

```text
app → pages, widgets, features, entities, shared
pages → widgets, features, entities, shared
widgets → features, entities, shared
features → entities, shared
entities → shared
shared → bibliotecas externas e código de shared
```

Exemplos aplicados:

- `pages/catalog/products` compõe componentes de `features/catalog/product-details` e consulta regras de estoque em `entities/inventory`.
- `features/access-management` usa modelos de acesso e sessão de `entities` e componentes genéricos de `shared`.
- `widgets/sidebar` consome metadados/permissões de `entities/access` e o controle de tema de `features/preferences`.
- `shared` não importa páginas, features ou entidades.

As fatias principais expõem `index.js` como API pública. Imports entre fatias usam a raiz da fatia, por exemplo `@/entities/inventory` ou `@/features/catalog/product-details`. Imports dentro de uma fatia podem apontar para seus módulos internos.

## Roteamento e composição das páginas

`src/app/AppRouter.jsx` declara as rotas públicas e protegidas usando React Router DOM 7 e `HashRouter`. O hash mantém compatibilidade com os links de painel existentes e não exige uma regra de fallback no servidor. [Documentação do HashRouter](https://reactrouter.com/api/declarative-routers/HashRouter)

As telas privadas são agrupadas por um guard de sessão e recebem o provider da aplicação. `src/app/panelRoutes.jsx` liga IDs de páginas aos componentes expostos pelas APIs públicas de `pages`. Cada página de painel é então renderizada dentro do layout compartilhado `pages/panel` com `<Outlet />`.

`src/shared/lib/navigation/usePanelNavigate.js` adapta a assinatura de navegação legada (`navigate('editar', { id })`) para o `useNavigate()` do React Router. Filtros mantêm parâmetros de busca e podem substituir a entrada atual do histórico.

## Alterações arquiteturais realizadas

1. **Camada de aplicação:** o componente principal e roteamento estão em `src/app`; `App.jsx` compõe provider global e roteador.
2. **Páginas por domínio:** telas antes misturadas em `pages/dash` foram movidas para slices de catálogo, estoque, vendas, financeiro, acesso, configurações, dashboard e site.
3. **Features explícitas:** formulário de produto, fluxos de acesso, etiquetas, drawers de detalhes, impressão, tema e autorização foram agrupados por ação/domínio.
4. **Entidades de negócio:** cálculos de estoque/lote, métricas, relatórios, acesso, NF-e, sessão e preferências agora têm diretórios próprios.
5. **Widgets:** menu lateral e cabeçalho de página foram separados da implementação das rotas.
6. **Shared:** componentes de UI genéricos, feedback, tabelas, modais, API e utilitários foram organizados como recursos transversais.
7. **Aliases e APIs públicas:** o alias `@/` aponta para `src/`, reduzindo imports relativos frágeis. Fatias principais exportam por `index.js`.
8. **Documentação do repositório:** o README agora descreve a estrutura FSD e o roteamento atual.

## Padrões utilizados

- **Feature slices:** agrupamento de código por capacidade de negócio e ação do usuário.
- **Composição de páginas:** páginas ligam widgets, features e entidades, sem precisar ser proprietárias das regras de negócio.
- **Provider de aplicação:** o provider da store global é montado no grupo protegido de rotas.
- **Adaptador de navegação:** traduz chamadas já utilizadas pelas telas para a API do React Router, reduzindo o risco da migração.
- **APIs públicas por fatia:** pontos de entrada explícitos evitam que consumidores conheçam a estrutura interna do slice.

## Limites mantidos e evolução recomendada

Esta é uma migração incremental. Alguns módulos ainda concentram responsabilidades e podem ser divididos em futuras etapas:

- `app/providers/store/StoreProvider.jsx` permanece como agregador de estado e ações de vários domínios. O próximo passo é extrair stores/use cases de catálogo, estoque, caixa e vendas, deixando o provider apenas compor esses módulos.
- `shared/styles/panel.module.css` preserva estilos antigos que eram compartilhados por muitas telas. Ao mexer em cada página, vale mover regras para o CSS Module da própria página/widget/feature.
- `shared/api/api.js` ainda reúne cliente, endpoints e normalizadores. Uma evolução natural é deixar transporte/CSRF em `shared/api` e mover adaptadores e operações específicas para fatias de entidades/features.
- `entities/access/model/pages.js` contém metadados de páginas junto de regras de acesso porque o menu atual os consome em conjunto. Pode ser separado em configuração de navegação e autorização caso os metadados cresçam.
- Há um aviso do Vite de que o bundle principal passa de 500 kB minificado. Carregamento preguiçoso por rota com `lazy()`/`Suspense` é uma melhoria futura.

Esses limites não invalidam a estrutura por camadas: eles registram os próximos cortes para aproximar gradualmente o código de fatias menores e mais independentes.

## Verificação

O build de produção do Vite foi executado após as mudanças e concluiu a transformação e geração dos arquivos. O aviso do tamanho do bundle permanece. Os testes E2E/unitários não foram executados nesta etapa.
