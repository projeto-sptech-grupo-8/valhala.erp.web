import {
  LayoutDashboard, Package, Tag, ArrowLeftRight, ShoppingCart,
  CreditCard, Receipt, TrendingUp,
  Users, Shield, Bell, Settings, KeyRound, CalendarClock, FileUp, ShieldCheck, BarChart3,
} from 'lucide-react'

/*
 * Registro único de páginas do painel.
 * section → grupo do menu e 1º nível do breadcrumb
 * parent  → página "mãe" no breadcrumb (ex.: Editar produto › Produtos)
 * perm    → código de funcionalidade exigido (sobrepõe o acesso por perfil)
 */
export const pages = {
  pedidos: { section:'Vendas', title:'Pedidos', desc:'Consulte e retome os pedidos do servidor.', icon:Receipt, perm:'CAIXA_VISUALIZAR' },
  sessoescaixa: { section:'Vendas', title:'Sessões de caixa', desc:'Confira turnos e divergências.', icon:CreditCard, perm:'CAIXA_VISUALIZAR' },
  ajustescaixa: { section:'Vendas', title:'Ajustes do caixa', desc:'Políticas, maquininhas e taxas de Vendas.', icon:Settings, perm:'CAIXA_VISUALIZAR' },
  novamovimentacao: { section: 'Estoque', title: 'Nova movimentação', desc: 'Registre uma entrada, saída, perda ou ajuste e confira o efeito previsto no estoque antes de salvar.', parent: 'movimentacoes', perm: 'MOVIMENTAR_ESTOQUE' },
  dashboard:     { section: 'Início',        title: 'Visão geral',            desc: 'Consulte o estoque do estabelecimento ou os recebimentos do seu turno.', icon: LayoutDashboard },
  produtos:      { section: 'Catálogo',       title: 'Produtos e drinks',             desc: 'Bebidas, drinks, doses e combos vendidos pela adega.', icon: Package, perm: 'VISUALIZAR_ESTOQUE' },
  categorias:    { section: 'Catálogo',       title: 'Categorias',           desc: 'Organização do catálogo por família de produto.', icon: Tag, perm: 'VISUALIZAR_ESTOQUE' },
  movimentacoes: { section: 'Estoque',       title: 'Movimentações',        desc: 'Histórico completo de entradas, saídas e ajustes.', icon: ArrowLeftRight, perm: 'VISUALIZAR_ESTOQUE' },
  reposicao:     { section: 'Estoque',       title: 'Reposição',            desc: 'Produtos que precisam ser reabastecidos.', icon: ShoppingCart },
  caixa:         { section: 'Vendas',        perm: 'CAIXA_VISUALIZAR', title: 'Caixa',                desc: 'Vendas de balcão e mesas simultâneas.', icon: CreditCard },
  notafiscal:    { perm: 'CAIXA_VISUALIZAR', section: 'Vendas',        title: 'Notas fiscais',        desc: 'Consulte as NFC-e e os pedidos disponíveis para emissão.', icon: Receipt },
  entradanf:     { section: 'Estoque',       title: 'Entrada por XML',      desc: 'Importe a NF-e do emitente: itens, custo, lote e validade conferidos antes de entrar.', icon: FileUp, perm: 'MOVIMENTAR_ESTOQUE' },
  validades:     { section: 'Estoque',       title: 'Validades e lotes',    desc: 'Consulte saldos por lote, acompanhe vencimentos e registre perdas no estoque.', icon: CalendarClock, perm: 'VISUALIZAR_ESTOQUE' },
  auditoria:     { section: 'Vendas',        perm: 'CAIXA_VISUALIZAR', title: 'Auditoria do caixa',   desc: 'Descontos, cancelamentos e itens removidos — quem fez, quem autorizou e quanto.', icon: ShieldCheck },
  relatorios:    { section: 'Financeiro',    title: 'Relatórios',           desc: 'Curva ABC, margem, ruptura, horários de pico, canais e perdas.', icon: BarChart3, perm: 'VISUALIZAR_RELATORIOS' },
  financeiro:    { section: 'Financeiro',    title: 'Financeiro',           desc: 'Fluxo de caixa, resultado e contas a pagar e receber.', icon: TrendingUp, perm: 'VISUALIZAR_FINANCEIRO' },
  novo:          { section: 'Catálogo',       title: 'Novo produto',         desc: 'Cadastre um item no catálogo da adega.', parent: 'produtos', perm: 'GERENCIAR_ESTOQUE' },
  editar:        { section: 'Catálogo',       title: 'Editar produto',       desc: 'Atualize os dados de um item do catálogo.', parent: 'produtos', perm: 'GERENCIAR_ESTOQUE' },
  usuarios:      { section: 'Controle de acesso', title: 'Usuários',             desc: 'Contas do estabelecimento, perfis vinculados e status de acesso.', icon: Users, perm: 'USUARIOS_VISUALIZAR' },
  novousuario:   { section: 'Controle de acesso', title: 'Novo usuário',         desc: 'Crie uma conta e vincule um perfil de acesso.', parent: 'usuarios', perm: 'USUARIOS_CRIAR' },
  usuario:       { section: 'Controle de acesso', title: 'Detalhe do usuário',   desc: 'Dados da conta, perfil e permissões efetivas.', parent: 'usuarios', perm: 'USUARIOS_VISUALIZAR' },
  editarusuario: { section: 'Controle de acesso', title: 'Editar usuário',       desc: 'Atualize os dados da conta.', parent: 'usuarios', perm: 'USUARIOS_EDITAR' },
  perfis:        { section: 'Controle de acesso', title: 'Perfis de acesso',     desc: 'Conjuntos de funcionalidades atribuídos aos usuários.', icon: KeyRound, perm: 'PERFIS_GERENCIAR' },
  novoperfil:    { section: 'Controle de acesso', title: 'Novo perfil',          desc: 'Defina um nome e as funcionalidades do perfil.', parent: 'perfis', perm: 'PERFIS_GERENCIAR' },
  perfil:        { section: 'Controle de acesso', title: 'Detalhe do perfil',    desc: 'Funcionalidades e usuários vinculados.', parent: 'perfis', perm: 'PERFIS_GERENCIAR' },
  seguranca:     { section: 'Minha conta', title: 'Segurança',            desc: 'Senha, sessões ativas e histórico de acessos.', icon: Shield },
  notificacoes:  { section: 'Minha conta', title: 'Notificações',         desc: 'Preferências de alertas por e-mail e push.', icon: Bell },
  geral:         { section: 'Sistema', title: 'Configurações gerais', desc: 'Dados da adega e aparência do painel.', icon: Settings },
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
    { label: 'Operação', items: ['movimentacoes'] },
    { label: 'Controle', items: ['reposicao', 'validades'] },
  ] },
  // RF04–RF06 / RF08 — atendimento, caixa e documentos de venda
  { id: 'vendas',     label: 'Vendas',             icon: CreditCard, groups: [
    { label: 'Atendimento', items: ['caixa', 'pedidos'] },
    { label: 'Documentos', items: ['notafiscal'] },
    { label: 'Controle', items: ['sessoescaixa', 'auditoria', 'ajustescaixa'] },
  ] },
  // RF09 — resultado, fluxo de caixa e contas
  { id: 'financeiro', label: 'Financeiro',         icon: TrendingUp, groups: [{ items: ['financeiro', 'relatorios'] }] },
  // RF10 — quem pode fazer o quê
  { id: 'acesso',     label: 'Controle de acesso', icon: KeyRound, groups: [{ items: ['usuarios'] }] },
  { id: 'configuracoes', label: 'Configurações gerais', icon: Settings, groups: [{ items: ['geral'] }] },
]

/* Fora das regras de negócio: preferências da conta e do sistema (abre pelo rodapé do menu) */
export const accountDomain = { id: 'conta', label: 'Aparência', icon: Settings, groups: [] }

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
const ESTOQUE = ['dashboard', 'produtos', 'categorias', 'movimentacoes', 'reposicao', 'novo', 'editar', 'entradanf', 'validades']

const roleAccess = {
  Administrador:     ALL,
  Gerente:           ALL, // a doc da API: o gerente sempre possui todas as permissões
  Caixa:             ['dashboard', 'caixa', 'produtos', 'notificacoes', 'seguranca'],
  Estoquista:        [...ESTOQUE, 'notificacoes', 'seguranca'],
  Financeiro:        ['dashboard', 'financeiro', 'relatorios', 'notafiscal', 'notificacoes', 'seguranca'],
  'Somente leitura': ['dashboard', 'produtos', 'categorias', 'movimentacoes', 'reposicao', 'validades', 'relatorios', 'seguranca'],
}

/* Ações de escrita bloqueadas para perfis de consulta */

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
  if (page === 'geral') return true
  if (meta?.perm && can) return can(meta.perm)
  const allowed = roleAccess[role] || roleAccess['Somente leitura']
  return allowed.includes(page)
}

export function firstAllowed(role) {
  return NAV_ORDER.find(p => !pages[p].perm && canAccess(role, p)) || 'dashboard'
}
