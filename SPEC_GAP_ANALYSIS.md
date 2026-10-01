# Valhalla ERP — Spec & Gap Analysis
**Adega Meraki · Grupo 08 · SPTech 2026**

---

## 1. Estado atual do frontend

O projeto tem apenas camada de apresentação. Toda a lógica de negócio está simulada com dados estáticos no cliente — não há chamadas a API, persistência nem backend iniciado.

### Telas existentes

| Arquivo | O que renderiza | Dados |
|---|---|---|
| `site.jsx` | Landing page institucional | Estáticos (marketing) |
| `login.jsx` | Tela de login com validação de formato | Frontend only, sem autenticação real |
| `cadastro.jsx` | Cadastro de novo usuário | Frontend only, sem persistência |
| `dash.jsx` | Shell do app + todas as telas internas | Mock hardcoded |

### Módulos no dash (sidebar)

**ESTOQUE:** Dashboard · Produtos · Categorias · Fornecedores · Movimentações · Tipos de Estocagem · Inventário

**VENDAS:** Caixa · Novo Pedido · Orçamentos · Notas Fiscais

**GESTÃO:** Financeiro · Relatórios

**CONFIGURAÇÕES:** Usuários · Segurança & 2FA · Notificações · Configurações Gerais

---

## 2. Requisitos funcionais × implementação

### RF01 — Cadastrar, editar e excluir produtos `PARCIAL`

**O que existe:**
- Listagem de produtos (tabela com mock)
- Formulário "Novo produto" com 4 abas: Identificação, Unidade e preço, Fracionamento, Fiscal
- Filtro por nome/categoria/status (sem lógica de filtro)

**O que falta:**
- Nenhum campo de Fracionamento na aba correspondente — aba existe mas está vazia
- Sem ação de editar produto existente (botão não existe na tabela)
- Sem ação de excluir produto
- Sem validação de formulário (campos requeridos, tipo, min/max)
- Sem chamada de API — salvar não persiste nada
- Sem upload de imagem (doc menciona Amazon S3)
- Sem campo de estoque mínimo para alertas (RF11)

---

### RF02 — Baixa automática ao vender `NÃO IMPLEMENTADO`

**O que existe:**
- Tela de Caixa (POS) que adiciona produtos a um carrinho
- Cálculo simples de total (preço fixo × quantidade de itens)

**O que falta:**
- Ao finalizar venda, não há nenhuma deduçao de estoque
- Sem verificação de quantidade disponível antes de vender
- Sem bloqueio de venda com estoque zerado
- Sem geração de movimentação de saída automática

---

### RF03 — Conversão combos, doses e fardos `NÃO IMPLEMENTADO`

**O que existe:**
- Aba "Fracionamento" no cadastro de produto (vazia)

**O que falta:**
- Modelo de dados para definir componentes de um combo/dose/fardo
- Lógica de explosão: vender 1 fardo → deduzir N unidades
- Vender 1 dose → deduzir fração de 1 garrafa
- Vender 1 combo → deduzir cada produto-componente individualmente
- Tudo precisa gerar movimentações separadas no histórico

---

### RF04 — Múltiplos pedidos simultâneos `NÃO IMPLEMENTADO`

**O que existe:**
- Uma única tela "Novo Pedido" sem estado persistente

**O que falta:**
- Conceito de "mesa/comanda aberta"
- Lista de pedidos em andamento acessível de qualquer tela
- Criar novo pedido sem cancelar o anterior
- Interface de seleção entre pedidos ativos (ex.: tab de mesas ou lista lateral)

---

### RF05 — Salvar pedido temporariamente e retomar `NÃO IMPLEMENTADO`

**O que existe:**
- Botão "Salvar rascunho" (sem ação)

**O que falta:**
- Persistência do estado do pedido (itens, cliente, observações)
- Lista de rascunhos salvos
- Retomada de um rascunho sem perder o pedido corrente

---

### RF06 — Alternância entre pedidos em atendimento `NÃO IMPLEMENTADO`

Depende do RF04 e RF05. Não há estrutura de pedidos múltiplos para alternar.

---

### RF07 — Registrar entradas e saídas de estoque `PARCIAL`

**O que existe:**
- Listagem de movimentações (tabela com mock)
- Filtro por Todos/Entradas (sem lógica)

**O que falta:**
- Formulário para registrar entrada manual (NF recebida, ajuste)
- Formulário para registrar saída manual (perda, vencimento)
- Nenhuma movimentação é gerada pelas vendas (RF02)
- Sem paginação nem filtro por período/produto/operador
- Sem exportação real

---

### RF08 — Abertura e fechamento de caixa `NÃO IMPLEMENTADO`

**O que existe:**
- Tela de Caixa (POS) sem workflow de abertura/fechamento

**O que falta:**
- Tela de abertura: informar valor inicial em espécie, operador
- Controle de estado: caixa aberto/fechado (bloqueio de venda se fechado)
- Tela de fechamento: conferência de valores por forma de pagamento, diferenças
- Histórico de sessões de caixa
- Sangria e reforço de caixa

---

### RF09 — Relatórios financeiros `PARCIAL`

**O que existe:**
- 6 cards de relatório (Estoque, Vendas, Financeiro, Movimentações, Inventário, Fiscal)
- Botão "Exportar Excel" (sem ação)
- Tela Financeiro com stats estáticas e gráfico CSS

**O que falta:**
- Dados reais em todos os relatórios
- Filtros por período, categoria, produto
- Exportação real (Excel/CSV)
- Gráfico de fluxo de caixa real (hoje usa barras CSS com altura hardcoded)
- DRE simplificado (receitas − despesas = lucro)
- Contas a pagar/receber com vencimentos reais

---

### RF10 — Gerenciar níveis de acesso `NÃO IMPLEMENTADO`

**O que existe:**
- Tela "Usuários" no menu de configurações (via `config.jsx`)
- Tela "Segurança & 2FA"

**O que falta:**
- Definição de roles (Admin, Atendente, Operador de Caixa)
- Atribuição de role ao criar/editar usuário
- Bloqueio de rotas/telas por role (ex.: atendente não acessa Financeiro)
- 2FA — existe a tela mas sem lógica
- Nenhum usuário real — auth é bypassada no frontend

---

### RF11 — Alertas de estoque baixo `PARCIAL`

**O que existe:**
- Widget "Alertas de estoque crítico" no Dashboard com 4 itens mockados

**O que falta:**
- Campo de "estoque mínimo" no cadastro de produto (ausente no formulário)
- Lógica real que compara quantidade atual com mínimo
- Alerta visível em outras telas além do dashboard
- Notificação quando o estoque atinge o mínimo após uma venda

---

### RF12 — Histórico de movimentações `PARCIAL`

**O que existe:**
- Tabela de movimentações com 3 linhas mockadas

**O que falta:**
- Movimentações geradas automaticamente pelas vendas
- Movimentações de entrada manual
- Filtro real por tipo/produto/período/operador
- Paginação
- Exportação

---

## 3. Requisitos não-funcionais × implementação

| Código | Requisito | Status | Observação |
|---|---|---|---|
| RNF01 | Interface intuitiva | `PARCIAL` | Layout existe, mas fluxos críticos (caixa, pedido) não estão completos |
| RNF02 | Resposta ≤ 3s | `NÃO TESTADO` | Sem backend para medir |
| RNF03 | Autenticação segura | `NÃO IMPLEMENTADO` | Login é validação de formato somente; qualquer credencial entra |
| RNF04 | Financeiro só para autorizados | `NÃO IMPLEMENTADO` | Sem RBAC; todas as telas acessíveis a qualquer um |
| RNF05 | Disponibilidade 95% | `NÃO APLICÁVEL` | Sem infra/deploy |
| RNF06 | Backup periódico do banco | `NÃO APLICÁVEL` | Sem banco |
| RNF07 | Compatível com mobile e desktop | `PARCIAL` | Landing tem breakpoints; dash não tem layout responsivo |

---

## 4. Backend — nada iniciado

A documentação especifica **Java + Spring Boot + PostgreSQL + AWS + S3**. Nenhum arquivo de backend existe no repositório.

### O que precisa ser criado do zero

**Infraestrutura**
- [ ] Projeto Spring Boot (Maven ou Gradle)
- [ ] Configuração PostgreSQL (datasource, migrations com Flyway ou Liquibase)
- [ ] Configuração AWS (EC2 ou ECS, S3 para imagens)
- [ ] CI/CD básico

**Segurança**
- [ ] Spring Security + JWT
- [ ] Roles: `ADMIN`, `ATENDENTE`, `CAIXA`
- [ ] Endpoints protegidos por role
- [ ] 2FA (TOTP — Google Authenticator)

**Módulos e endpoints mínimos**

| Módulo | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| Usuários | CRUD + atribuição de role |
| Produtos | CRUD + upload de imagem (S3) + fracionamento |
| Categorias | CRUD |
| Fornecedores | CRUD |
| Estoque | GET saldo, POST entrada, movimentações com filtro |
| Combos/Fardos | Definir composição, explosão automática na venda |
| Pedidos | CRUD, múltiplos abertos, rascunho, retomada |
| Caixa | Abrir sessão, registrar venda, sangria, fechamento |
| Financeiro | Contas a pagar/receber, DRE, fluxo de caixa |
| Relatórios | Dados agrupados por período, exportação CSV/XLSX |
| Alertas | Verificação pós-venda, endpoint de pendências |

---

## 5. Gaps de negócio (contexto Adega Meraki)

Alguns termos da documentação diferem dos dados mock do frontend atual:

| No frontend | Na doc / negócio real |
|---|---|
| Dados de hardware (tinta, alicate, parafuso, EPI) | Bebidas, doses, garrafas, fardos, combos |
| "Salão" em vários lugares do código | "Adega" ou "estabelecimento" |
| Login aceita só `@gmail.com` | Produção precisa aceitar qualquer e-mail corporativo |
| Caixa sem abertura/fechamento | Workflow completo de sessão de caixa |

---

## 6. User Stories sem cobertura de tela

| User Story | Status |
|---|---|
| US01 — Cadastro de produtos | `PARCIAL` — formulário existe, sem validações completas nem Fracionamento |
| US02 — Baixa automática | `NÃO IMPLEMENTADO` |
| US03 — Conversão combos/fardos | `NÃO IMPLEMENTADO` |
| US04 — Alerta de estoque baixo | `PARCIAL` — widget mock, sem lógica |

---

## 7. Prioridade de desenvolvimento sugerida

### Sprint 1 — Base técnica
1. Backend: setup Spring Boot + PostgreSQL + JWT
2. Endpoints de Auth com roles
3. CRUD de Produtos com estoque mínimo
4. Conectar frontend (remover mocks, chamar API)

### Sprint 2 — Core de negócio
5. Lógica de Fracionamento (combos, doses, fardos)
6. Caixa: abertura, venda com baixa automática, fechamento
7. Movimentações automáticas na venda
8. Alertas de estoque baixo

### Sprint 3 — Pedidos múltiplos
9. API de Pedidos com estado (aberto, rascunho, fechado)
10. UI: comanda múltipla, alternância, retomada

### Sprint 4 — Gestão e relatórios
11. Financeiro com dados reais
12. Relatórios com filtros e exportação
13. RBAC no frontend (ocultar telas por role)
14. 2FA

### Sprint 5 — Qualidade e deploy
15. Responsividade do dash (mobile para atendente/caixa)
16. Testes de integração críticos
17. Deploy AWS + backup automático PostgreSQL
18. Testes com usuários da Adega Meraki

---

## 8. Resumo executivo

| Dimensão | Total de itens | Implementado | Parcial | Faltando |
|---|---|---|---|---|
| Requisitos funcionais (RF) | 12 | 0 | 5 | 7 |
| Requisitos não-funcionais (RNF) | 7 | 0 | 2 | 3 (+2 sem backend) |
| User Stories | 4 | 0 | 2 | 2 |
| Backend | — | 0% | — | 100% |

**O frontend tem estrutura visual de todas as telas, mas nenhuma funcionalidade real está conectada. O backend não foi iniciado. O núcleo do negócio (baixa de estoque, fracionamento, múltiplos pedidos e caixa) não existe em nenhuma camada.**
