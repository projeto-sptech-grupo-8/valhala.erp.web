import {
  LayoutDashboard, Package, Tag, ArrowLeftRight, ShoppingCart,
  CreditCard, FileSpreadsheet, Receipt, TrendingUp,
  Users, Shield, Bell, Settings, KeyRound, CalendarClock, FileUp, ClipboardList, ShieldCheck, BarChart3,
} from 'lucide-react'

/*
 * Registro único de páginas do painel.
 * section → grupo do menu e 1º nível do breadcrumb
 * parent  → página "mãe" no breadcrumb (ex.: Editar produto › Produtos)
 * perm    → código de funcionalidade exigido (sobrepõe o acesso por perfil)
 */
export const pages = {
  dashboard:     { section: 'Início',        title: 'Dashboard',            desc: 'Estoque, vendas e caixa da adega em um só lugar.', icon: LayoutDashboard },
  produtos:      { section: 'Catálogo',       title: 'Produtos e drinks',             desc: 'Bebidas, drinks, doses e combos vendidos pela adega.', icon: Package },
  categorias:    { section: 'Catálogo',       title: 'Categorias',           desc: 'Organização do catálogo por família de produto.', icon: Tag },
  movimentacoes: { section: 'Estoque',       title: 'Movimentações',        desc: 'Histórico completo de entradas, saídas e ajustes.', icon: ArrowLeftRight },
  reposicao:     { section: 'Estoque',       title: 'Reposição',            desc: 'Produtos que precisam ser reabastecidos.', icon: ShoppingCart },
  caixa:         { section: 'Vendas',        title: 'Caixa',                desc: 'Vendas de balcão e mesas simultâneas.', icon: CreditCard },
  orcamento:     { section: 'Vendas',        title: 'Orçamentos',           desc: 'Propostas comerciais enviadas a clientes.', icon: FileSpreadsheet },
  notafiscal:    { section: 'Vendas',        title: 'Notas fiscais',        desc: 'NF-e emitidas para vendas e pedidos.', icon: Receipt },
  entradanf:     { section: 'Estoque',       title: 'Entrada por XML',      desc: 'Importe a NF-e do fornecedor: itens, custo, lote e validade conferidos antes de entrar.', icon: FileUp },
  inventario:    { section: 'Estoque',       title: 'Inventário',           desc: 'Contagem cega por setor, divergências e ajuste aprovado pelo gerente.', icon: ClipboardList },
  validades:     { section: 'Estoque',       title: 'Validades e lotes',    desc: 'Lotes vencidos e a vencer, com sugestão de promoção para escoar.', icon: CalendarClock },
  auditoria:     { section: 'Vendas',        title: 'Auditoria do caixa',   desc: 'Descontos, cancelamentos e itens removidos — quem fez, quem autorizou e quanto.', icon: ShieldCheck },
  relatorios:    { section: 'Financeiro',    title: 'Relatórios',           desc: 'Curva ABC, margem, ruptura, horários de pico, canais e perdas.', icon: BarChart3 },
  financeiro:    { section: 'Financeiro',    title: 'Financeiro',           desc: 'Fluxo de caixa, resultado e contas a pagar e receber.', icon: TrendingUp },
  novo:          { section: 'Catálogo',       title: 'Novo produto',         desc: 'Cadastre um item no catálogo da adega.', parent: 'produtos' },
  editar:        { section: 'Catálogo',       title: 'Editar produto',       desc: 'Atualize os dados de um item do catálogo.', parent: 'produtos' },
  usuarios:      { section: 'Controle de acesso', title: 'Usuários',             desc: 'Contas do estabelecimento, perfis vinculados e status de acesso.', icon: Users, perm: 'USUARIOS_VISUALIZAR' },
  novousuario:   { section: 'Controle de acesso', title: 'Novo usuário',         desc: 'Crie uma conta e vincule um perfil de acesso.', parent: 'usuarios', perm: 'USUARIOS_CRIAR' },
  usuario:       { section: 'Controle de acesso', title: 'Detalhe do usuário',   desc: 'Dados da conta, perfil e permissões efetivas.', parent: 'usuarios', perm: 'USUARIOS_VISUALIZAR' },
  editarusuario: { section: 'Controle de acesso', title: 'Editar usuário',       desc: 'Atualize os dados da conta.', parent: 'usuarios', perm: 'USUARIOS_EDITAR' },
  perfis:        { section: 'Controle de acesso', title: 'Perfis de acesso',     desc: 'Conjuntos de funcionalidades atribuídos aos usuários.', icon: KeyRound, perm: 'PERFIS_GERENCIAR' },
  novoperfil:    { section: 'Controle de acesso', title: 'Novo perfil',          desc: 'Defina um nome e as funcionalidades do perfil.', parent: 'perfis', perm: 'PERFIS_GERENCIAR' },
  perfil:        { section: 'Controle de acesso', title: 'Detalhe do perfil',    desc: 'Funcionalidades e usuários vinculados.', parent: 'perfis', perm: 'PERFIS_GERENCIAR' },
  seguranca:     { section: 'Minha conta', title: 'Segurança',            desc: 'Senha, sessões ativas e histórico de acessos.', icon: Shield },
  notificacoes:  { section: 'Minha conta', title: 'Notificações',         desc: 'Preferências de alertas por e-mail e push.', icon: Bell },
  geral:         { section: 'Sistema', title: 'Configurações gerais', desc: 'Dados da adega, aparência e preferências regionais.', icon: Settings },
}

/*
 * Menu lateral por domínio de negócio.
 * Domínio com várias subopções abre a caixa lateral; com uma só (após o RBAC), navega direto.
 */
export const domains = [
  { id: 'inicio',     label: 'Início',             icon: LayoutDashboard, groups: [{ items: ['dashboard'] }] },
  // RF01 / RF03 — o que a adega vende (produto, drink, dose, combo)
  { id: 'catalogo',   label: 'Catálogo',           icon: Package, groups: [{ items: ['produtos', 'categorias'] }] },
  // RF02 / RF07 / RF11 / RF12 — saldo físico, entradas, saídas e alertas
  { id: 'estoque',    label: 'Estoque',            icon: ArrowLeftRight, groups: [
    { label: 'Operação', items: ['movimentacoes', 'entradanf', 'inventario'] },
    { label: 'Controle', items: ['reposicao', 'validades'] },
  ] },
  // RF04–RF06 / RF08 — atendimento, caixa e documentos de venda
  { id: 'vendas',     label: 'Vendas',             icon: CreditCard, groups: [
    { label: 'Atendimento', items: ['caixa'] },
    { label: 'Documentos', items: ['orcamento', 'notafiscal'] },
    { label: 'Controle', items: ['auditoria'] },
  ] },
  // RF09 — resultado, fluxo de caixa e contas
  { id: 'financeiro', label: 'Financeiro',         icon: TrendingUp, groups: [{ items: ['financeiro', 'relatorios'] }] },
  // RF10 — quem pode fazer o quê
  { id: 'acesso',     label: 'Controle de acesso', icon: KeyRound, groups: [{ items: ['usuarios', 'perfis'] }] },
]

/* Fora das regras de negócio: preferências da conta e do sistema (abre pelo rodapé do menu) */
export const accountDomain = {
  id: 'conta', label: 'Conta e sistema', icon: Settings, groups: [
    { label: 'Minha conta', items: ['seguranca', 'notificacoes'] },
    { label: 'Sistema', items: ['geral'] },
  ],
}

const NAV_ORDER = [...domains, accountDomain].flatMap(d => d.groups.flatMap(g => g.items))

/* domínios visíveis para o usuário (grupos/itens sem permissão são removidos) */
export function visibleDomains(role, can, list = domains) {
  return list
    .map(d => ({ ...d, groups: d.groups.map(g => ({ ...g, items: g.items.filter(id => pages[id] && canAccess(role, id, can)) })).filter(g => g.items.length) }))
    .filter(d => d.groups.length)
}

/* ─── RBAC (RF10 / RNF04) ───
 * Espelha os perfis do backend (profileName). Páginas filhas herdam a permissão da mãe.
 */
const ALL = Object.keys(pages)
const ESTOQUE = ['dashboard', 'produtos', 'categorias', 'movimentacoes', 'reposicao', 'novo', 'editar', 'entradanf', 'inventario', 'validades']

const roleAccess = {
  Administrador:     ALL,
  Gerente:           ALL, // a doc da API: o gerente sempre possui todas as permissões
  Caixa:             ['dashboard', 'caixa', 'produtos', 'notificacoes', 'seguranca'],
  Estoquista:        [...ESTOQUE, 'notificacoes', 'seguranca'],
  Financeiro:        ['dashboard', 'financeiro', 'relatorios', 'orcamento', 'notafiscal', 'notificacoes', 'seguranca'],
  'Somente leitura': ['dashboard', 'produtos', 'categorias', 'movimentacoes', 'reposicao', 'validades', 'relatorios', 'seguranca'],
}

/* Ações de escrita bloqueadas para perfis de consulta */
const readOnlyRoles = ['Somente leitura']

/*
 * can(codigo) — permissão por funcionalidade.
 * Gerente/Administrador têm tudo; os demais usam a lista de permissões vinda de /usuario/me
 * (quando o backend a enviar). Sem a lista, nega por segurança — a API valida de qualquer forma.
 */
const FULL_ACCESS = ['Gerente', 'Administrador']
export function makeCan(user) {
  const perms = new Set(user?.permissoes || [])
  return (codigo) => FULL_ACCESS.includes(user?.profileName) || perms.has(codigo)
}

export function canAccess(role, page, can) {
  const meta = pages[page]
  if (meta?.perm && can) return can(meta.perm)
  const allowed = roleAccess[role] || roleAccess['Somente leitura']
  return allowed.includes(page)
}

export function canEdit(role) {
  return !readOnlyRoles.includes(role)
}

export function firstAllowed(role) {
  return NAV_ORDER.find(p => !pages[p].perm && canAccess(role, p)) || 'dashboard'
}
