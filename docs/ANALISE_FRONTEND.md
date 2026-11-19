# Análise do frontend — Valhalla ERP

## 1. Escopo e método

Esta análise cobre a estrutura do código-fonte React em `src/`, com foco em arquitetura, navegação, organização de componentes, estado, integração com API, boas práticas de frontend e aplicação dos princípios SOLID. Foram consultados, entre outros, `src/App.jsx`, `src/lib/useHashRoute.js`, `src/pages/dash.jsx`, `src/pages/dash/pages.js`, `src/pages/dash/store.jsx`, `src/lib/api.js` e componentes de páginas e navegação.

O documento é uma revisão estática do código. Não foram executados build, lint ou testes nesta análise. As recomendações abaixo priorizam evolução incremental, sem propor uma reescrita geral.

## 2. Resumo executivo

O projeto usa React com Vite, componentes funcionais e hooks. A interface institucional, autenticação e painel estão organizados em páginas. O painel tem subpastas para componentes reutilizáveis e para controle de acesso. CSS Modules são usados junto a estilos globais e algumas regras inline.

Há boas decisões já presentes: integração HTTP concentrada em `src/lib/api.js`; metadados de navegação e controle de acesso reunidos em `src/pages/dash/pages.js`; rotas internas serializadas na URL para permitir links diretos, atualização da página e histórico do navegador; e diversos cuidados de acessibilidade, como rótulos ARIA, foco de teclado e link para pular ao conteúdo.

Os principais riscos de manutenção são:

1. O roteamento externo usa estado React, enquanto o painel tem um roteador próprio por hash. A navegação está dividida entre `App.jsx`, `useHashRoute.js`, o registro `pages.js` e o componente `Page` em `dash.jsx`.
2. `src/pages/dash/store.jsx` tem cerca de 524 linhas e concentra estado, persistência local, sincronização remota e regras de vários domínios. Isso torna mudanças de negócio mais difíceis de isolar.
3. `src/lib/api.js` tem cerca de 400 linhas e combina transporte HTTP, sessão/CSRF, normalização de DTOs e operações de domínio.
4. O contexto do store expõe um objeto amplo. Como `useStore()` consome o contexto inteiro, mudanças em uma parte do estado podem renderizar novamente consumidores que só usam outra parte.
5. O botão “Acessar demonstração” da página institucional chama `go('signup')`, mas `App.jsx` não trata `signup` e usa o painel como ramo padrão. Assim, o botão não encaminha para uma área de demonstração definida no frontend.

## 3. Padrões de projeto e organização atuais

### 3.1 Stack e estilo de implementação

- React 19 e JavaScript com módulos ES.
- Vite como ferramenta de desenvolvimento e build.
- Componentes funcionais e hooks (`useState`, `useEffect`, `useContext`, hooks próprios).
- CSS Modules para estilos específicos de páginas e componentes, com estilos globais em arquivos como `src/index.module.css` e `src/App.module.css`.
- `lucide-react` para ícones e Recharts para gráficos.
- Não há biblioteca de roteamento declarada nas dependências; o projeto implementa navegação manualmente.

Exemplo: `src/components/ui/button.jsx` encapsula um botão e suas variantes CSS, enquanto `src/pages/dash/components/DataTable.jsx` e outros componentes do painel fornecem peças reutilizáveis.

### 3.2 Organização por páginas e domínio

O código é principalmente organizado por páginas. `src/pages/dash/` contém telas do painel e alguns componentes compartilhados; `src/pages/dash/acesso/` agrupa telas e componentes do domínio de usuários e perfis. `src/lib/` concentra funções compartilhadas de API, formatação, roteamento e recursos.

Esse padrão é compreensível para o tamanho atual do produto. A organização por domínio já aparece em “acesso”, mas ainda não é uniforme: páginas de produtos, caixa, estoque e financeiro convivem diretamente em `dash/`, enquanto regras de domínio do estoque são compartilhadas no store.

### 3.3 Padrões identificados

| Padrão | Onde aparece | Avaliação |
|---|---|---|
| Componentes de apresentação | Páginas e componentes JSX | Adequado; separar ainda mais as telas grandes reduziria acoplamento. |
| Hooks próprios | `useHashRoute`, `useResource`, `useMediaQuery`, `useStore`, `useDialog` | Boa forma de encapsular comportamento reutilizável. |
| Provider/Context | `StoreProvider` e `StoreCtx` | Adequado para estado compartilhado, mas o contexto atual é amplo. |
| Camada de serviço/API | `src/lib/api.js` | Centraliza chamadas e adaptação de formatos, embora acumule muitas responsabilidades. |
| Registro de metadados | `src/pages/dash/pages.js` | Boa fonte central para títulos, descrições, ícones e permissões. |
| Gate de rota/permissão | `Shell` em `src/pages/dash.jsx` e `canAccess` em `pages.js` | Ajuda a evitar a renderização de telas não permitidas; deve continuar acompanhado de autorização no backend. |

Não há evidência de uso sistemático de classes, Redux, React Router ou uma arquitetura formal como Clean Architecture. O desenho é uma aplicação React funcional com abstrações próprias.

## 4. Fluxo das telas e navegação

### 4.1 Fluxo de entrada da aplicação

`src/App.jsx` mantém o modo de tela no estado React. Os modos observados são `landing`, `login`, `forgot`, `restoring` e `app`.

1. Sem uma rota interna no hash, a aplicação inicia na página institucional (`landing`).
2. A página institucional chama `go('login')` ou `go('signup')` para trocar o modo. A tela de cadastro (`cadastro.jsx`) existe, mas o seletor central de `App.jsx` não mostra um ramo para `signup`; esse valor cai no ramo padrão do painel. Essa discrepância deve ser validada e corrigida: o código atual não encaminha `signup` para o componente `Cadastro`.
3. Se a URL inicial corresponder ao formato de hash interno `#/...`, `App.jsx` inicia em `restoring`, chama `api.me()` e tenta restaurar a sessão.
4. Com sessão válida, mostra o painel. Se a verificação falhar, mostra login.
5. Login bem-sucedido atualiza o usuário e muda o modo para `app`.
6. Logout encerra a sessão, limpa o hash e retorna à página institucional.

Exemplo do ponto a verificar: `src/pages/site.jsx` e `src/pages/cadastro.jsx` chamam `go('signup')`, mas `src/App.jsx` só tem ramos explícitos para landing, login e forgot; o `else` final renderiza `Dash`. A tela de cadastro é importada? No trecho analisado de `App.jsx`, não há import ou ramo para `Cadastro`.

### 4.2 Rotas internas do painel

O painel usa hash routing próprio em `src/lib/useHashRoute.js`. O formato é `#/<pagina>?chave=valor`. O hook lê `window.location.hash`, escuta `hashchange`, constrói links com `URLSearchParams` e oferece navegação normal ou `replace`.

`src/pages/dash.jsx` usa o valor retornado para selecionar a tela. O componente local `Page` contém uma cadeia de condições que associa cada identificador ao componente correspondente. O registro `src/pages/dash/pages.js` guarda título, descrição, ícone, seção, relação de página-pai e, em alguns casos, permissão.

| Rota hash | Tela/componente principal |
|---|---|
| `#/dashboard` | Dashboard |
| `#/produtos` | Produtos e drinks |
| `#/categorias` | Categorias |
| `#/movimentacoes` | Movimentações |
| `#/reposicao` | Reposição |
| `#/caixa` | Caixa |
| `#/notafiscal` | Listagem de notas fiscais |
| `#/entradanf` | Entrada por XML |
| `#/validades` | Validades e lotes |
| `#/auditoria` | Auditoria do caixa |
| `#/relatorios` | Relatórios |
| `#/financeiro` | Financeiro |
| `#/novo` e `#/editar?id=...` | Cadastro/edição de produto |
| `#/usuarios`, `#/novousuario`, `#/usuario?id=...`, `#/editarusuario?id=...` | Gestão de usuários |
| `#/perfis`, `#/novoperfil`, `#/perfil?id=...` | Gestão de perfis |
| `#/seguranca`, `#/notificacoes`, `#/geral` | Configurações |

Os grupos de navegação lateral são definidos em `domains` e `accountDomain`, também em `pages.js`. `visibleDomains()` filtra itens com base no papel e permissões efetivas. `canAccess()` decide se a tela atual é conhecida e permitida. Se a rota não existir, o painel apresenta estado de página não encontrada; se existir sem permissão, apresenta estado de acesso bloqueado.

### 4.3 Observações de fluxo

- As rotas internas ficam disponíveis em URLs, favoritos e voltar/avançar, uma vantagem sobre manter tudo apenas em estado local.
- Os filtros podem ser serializados na URL usando parâmetros, como descrito no comentário de `useHashRoute`.
- A navegação entre landing/login/cadastro depende de estados de `App`, não de URLs independentes. Isso dificulta deep links e pode deixar a URL sem representar a tela atual.
- O mecanismo de “Acessar demonstração” atualmente chama `go('signup')`; como `App.jsx` não trata esse modo, o seletor cai no ramo padrão que renderiza o painel. Se a intenção do produto é apresentar as telas sem autenticação, é necessária uma rota/tela de demonstração distinta, ou uma sessão demonstrativa explicitamente configurada.
- A ausência de um ramo `signup` no roteador central é uma inconsistência funcional provável, pois `Cadastro` existe e os CTAs ainda chamam esse valor. A análise não alterou nem executou essa navegação.

## 5. Boas práticas de frontend

### Pontos positivos observados

1. **Separação parcial entre interface e API.** A maior parte do código de transporte está em `src/lib/api.js`, em vez de espalhada por cada componente.
2. **Tratamento de falhas e sessão.** `request()` padroniza erro de conexão, trata respostas não bem-sucedidas e tenta renovar a sessão após `401` em chamadas não relacionadas à autenticação.
3. **Adaptação de formatos.** Funções como `toProduto`, `toUsuario` e `toPerfil` isolam diferenças entre DTOs do backend e os modelos utilizados pela interface.
4. **Estados de carregamento reutilizáveis.** `useResource()` representa dados, erro, carregamento e recarga, mantendo dados anteriores durante uma atualização.
5. **Acessibilidade em vários fluxos.** Foram encontrados `aria-label`, `aria-expanded`, `aria-current`, diálogos com estado modal, suporte a Escape, gerenciamento de foco e link “Pular para o conteúdo”.
6. **Responsividade.** Há regras mobile e comportamento de menu por largura de tela; `useMediaQuery()` assina a mudança da media query.
7. **Testes automatizados disponíveis no repositório.** Há arquivos de teste E2E em `e2e/` e configuração Playwright. A existência desses testes é positiva, mas a cobertura e o estado atual não foram avaliados nesta revisão.
8. **Metadados de navegação centralizados.** O registro `pages.js` reduz duplicação de rótulos e permite gerar menu, breadcrumb e controles de acesso a partir de metadados comuns.

### Melhorias recomendadas

#### Prioridade alta — corrigir a representação e o fluxo de rotas

- Unificar a navegação em um único mecanismo, preferencialmente uma biblioteca de roteamento, ou consolidar as rotas manuais num módulo central bem definido.
- Representar landing, login, cadastro, recuperação de senha e demonstração em rotas explícitas, por exemplo `/`, `/login`, `/cadastro`, `/recuperar-senha` e `/demo`.
- Substituir a cadeia de `if` em `Page` por um mapa de rota para componente. O mesmo identificador deve alimentar metadados, renderização e navegação, evitando cadastrar rota em vários lugares.
- Adicionar uma checagem automática ou teste de consistência entre `pages`, componentes registrados, itens de menu e permissões.
- Revisar o destino de `go('signup')` e “Acessar demonstração”, pois os pontos observados não correspondem claramente a um componente de cadastro/demonstração no roteador central.

#### Prioridade alta — reduzir responsabilidade do store

- Dividir `StoreProvider` em contextos ou hooks por domínio: catálogo, movimentações, caixa, financeiro e preferências.
- Mover regras puras de estoque e conversões para módulos de domínio independentes, com entradas/saídas explícitas.
- Extrair sincronização de catálogo e persistência local para hooks ou repositórios próprios.
- Manter no provider apenas composição do estado, coordenação e publicação de ações.

Exemplo de direção: `useCatalogStore()` expõe operações de produtos e drinks; `useInventoryStore()` trata movimentações e lotes; `catalogRepository` coordena leitura/gravação remota. Isso diminui o impacto de uma alteração em estoque sobre telas financeiras.

#### Prioridade média — separar responsabilidades do cliente de API

- Manter um cliente HTTP para base URL, credenciais, CSRF, renovação de sessão e erros.
- Mover normalizadores e conversores para arquivos próximos ao domínio, como `lib/api/mappers/product.js` e `access.js`.
- Separar grupos de endpoints por recurso (`productsApi`, `usersApi`, `profilesApi`, `movementsApi`).
- Definir contratos de entrada/saída consistentes e tipá-los com TypeScript ou JSDoc, principalmente nos mapeadores que aceitam nomes de campos em português e inglês.

#### Prioridade média — melhorar granularidade do estado compartilhado

- Evitar que todo consumidor leia o objeto amplo de `StoreCtx` quando precisa de apenas um valor.
- Separar contexts por frequência de atualização/domínio ou usar seletores com uma solução apropriada.
- Memorizar valores do provider quando isso reduzir renderizações e fizer sentido após medição.
- Extrair estado de interface local (modais, filtros e abas) da store global quando não precisa ser compartilhado.

#### Prioridade média — padronizar estrutura e estilos

- Evoluir para uma organização mais regular por domínio/feature: `features/catalog`, `features/inventory`, `features/access`, com componentes, hooks e serviços relacionados próximos.
- Documentar quando usar CSS Modules, tokens globais e estilos inline. Estilos dinâmicos (por exemplo, largura de barra calculada) são um uso razoável de inline; layout e aparência estática ficam mais fáceis de manter em CSS.
- Definir e aplicar tokens de cor, espaçamento, tipografia e estados interativos, evitando valores repetidos.
- Evitar estilos inline extensos em formulários e componentes quando puderem ser classes nomeadas; eles dificultam consistência e responsividade.

#### Prioridade contínua — qualidade, segurança e acessibilidade

- Preservar validação e autorização no backend; o controle de acesso no frontend melhora a experiência, mas não é uma barreira de segurança suficiente.
- Acrescentar testes unitários para mapeadores, regras de estoque e funções de permissão, além dos E2E existentes.
- Verificar estados vazios, erro, carregamento e recuperação de falhas por tela.
- Revisar navegação por teclado, contraste, foco após mudanças de rota e anúncios de conteúdo atualizado.
- Considerar TypeScript de forma incremental começando pelos contratos da API, store e rotas.

## 6. Princípios SOLID

SOLID foi formulado para desenho de software orientado a objetos. Em React funcional, os princípios continuam úteis como critérios para limites de módulo, componentes e dependências, mas não devem ser aplicados mecanicamente.

### S — Single Responsibility Principle (Responsabilidade Única)

**Atendimento parcial.** Componentes como `Button`, `PageHeader` e alguns drawers têm objetivos relativamente delimitados. Por outro lado, `StoreProvider` em `src/pages/dash/store.jsx` acumula gerenciamento de estado, persistência local, sincronização com backend e regras de estoque/venda. `src/lib/api.js` acumula transporte, CSRF/refresh, mapeamento de dados e chamadas de vários domínios.

**Exemplo:** uma alteração na forma de persistir o catálogo pode exigir edição no mesmo arquivo que implementa consumo FEFO e registro de movimentações. Isso aumenta a chance de regressão não relacionada.

**Melhoria:** separar persistência, acesso remoto e regras puras de domínio; dividir provider/store por domínio.

### O — Open/Closed Principle (Aberto/Fechado)

**Atendimento parcial.** O cadastro central `pages` é um ponto de extensão útil para título, ícone, seção e permissão. Porém, ao criar uma tela também é preciso editar a cadeia condicional do componente `Page`, grupos do menu e possivelmente permissões em outro trecho do mesmo arquivo.

**Exemplo:** adicionar uma nova página de negócio implica adicionar metadados e acrescentar outro `if (page === ...) return ...`.

**Melhoria:** ter um único registro de rotas que associe id, metadados, componente, parâmetros e permissão, a partir do qual o menu e a seleção da tela possam ser derivados.

### L — Liskov Substitution Principle (Substituição de Liskov)

**Não é o principal ponto de pressão atual.** O frontend usa predominantemente composição e funções, não hierarquias de classes. Componentes reutilizáveis recebem props e costumam ser substituídos por componentes compatíveis sem herança.

**Cuidado aplicável:** componentes genéricos como `Button`, `DataTable` e `Modal` precisam manter o contrato declarado. Por exemplo, adicionar comportamento que impede `disabled`, `type` ou propagação de eventos pode quebrar consumidores que os utilizam como substitutos de elementos nativos.

**Melhoria:** documentar props e semântica dos componentes de UI e cobrir seus estados principais com testes de componente.

### I — Interface Segregation Principle (Segregação de Interfaces)

**Atendimento parcial.** `useStore()` fornece o contexto inteiro; consumidores podem depender de um objeto grande que contém dados, ações, sessão, tema, catálogo e impressão. Isso cria acoplamento e pode provocar renders desnecessários.

**Exemplo:** um componente que só precisa do catálogo importa `useStore()` e recebe implicitamente acesso a propriedades de caixa, tema e impressão.

**Melhoria:** fornecer hooks/contextos menores, como `useCatalog()`, `useInventory()` e `useTheme()`, ou seletores que exponham somente o contrato necessário.

### D — Dependency Inversion Principle (Inversão de Dependência)

**Atendimento parcial.** A UI geralmente chama ações do store, o que evita espalhar chamadas HTTP por todas as telas. Ainda assim, o store importa diretamente o módulo concreto `api` e a tela de login também o importa. As regras e componentes dependem do cliente específico, em vez de um contrato de repositório.

**Exemplo:** `StoreProvider` chama `api.produtos` diretamente; substituir a fonte de dados ou criar um cenário controlado de demonstração exige adaptar o store ou interceptar o módulo concreto.

**Melhoria:** definir contratos por recurso e injetar repositórios/serviços no provider, ou usar hooks de domínio sobre uma interface estável. Essa abstração deve ser introduzida onde há necessidade real (como testes, modo demonstração ou múltiplas fontes), evitando abstrações genéricas sem uso.

## 7. Plano de melhoria sugerido

1. **Resolver inconsistências visíveis do fluxo:** confirmar rotas de cadastro e demonstração e garantir que cada CTA leve à tela pretendida.
2. **Centralizar o roteamento:** uma fonte única de verdade para URL, componente, metadados e permissão.
3. **Modularizar o store:** separar catálogo, estoque, caixa, financeiro e preferências sem alterar regras de negócio.
4. **Separar o cliente API:** transporte, endpoints e mapeadores em módulos com contratos claros.
5. **Reduzir o contexto amplo e medir renders:** fragmentar por domínio ou adicionar seletores conforme o impacto observado.
6. **Fortalecer contratos:** adotar JSDoc ou TypeScript incrementalmente e adicionar testes unitários para regras e conversões críticas.
7. **Manter a acessibilidade existente:** incluir a navegação de rotas e novos fluxos em verificações por teclado e leitor de tela.

## 8. Conclusão

O frontend possui uma base funcional e várias práticas adequadas, sobretudo na centralização parcial da API, uso de hooks, navegação interna compartilhável e atenção à acessibilidade. A principal oportunidade não é trocar a stack, mas reduzir responsabilidades concentradas e eliminar duplicidade entre registro, navegação e renderização de rotas. Recomenda-se começar pelos fluxos inconsistentes de cadastro/demonstração e seguir com a modularização incremental do painel e do store.
