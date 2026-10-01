/*
 * Backend simulado (VITE_MOCK=true).
 * Reproduz as regras da doc de autorizações para a interface ser testada contra o
 * mesmo comportamento do backend real. Estado persistido no localStorage.
 */
const KEY = 'valhalla:mockdb:v1'
export const ME_ID = '00000000-0000-4000-8000-000000000001'

const FUNCIONALIDADES = [
  { codigo: 'VISUALIZAR_ESTOQUE',    nome: 'Visualizar estoque',        descricao: 'Consultar produtos, saldos e movimentações.', modulo: 'ESTOQUE' },
  { codigo: 'MOVIMENTAR_ESTOQUE',    nome: 'Movimentar estoque',        descricao: 'Registrar entradas, saídas e ajustes.', modulo: 'ESTOQUE' },
  { codigo: 'PRODUTOS_GERENCIAR',    nome: 'Gerenciar produtos',        descricao: 'Cadastrar, editar e excluir produtos e receitas.', modulo: 'ESTOQUE' },
  { codigo: 'CAIXA_OPERAR',          nome: 'Operar caixa',              descricao: 'Abrir, fechar, vender, sangria e reforço.', modulo: 'VENDAS' },
  { codigo: 'PEDIDOS_GERENCIAR',     nome: 'Gerenciar pedidos',         descricao: 'Abrir mesas, salvar e retomar pedidos.', modulo: 'VENDAS' },
  { codigo: 'NOTAS_EMITIR',          nome: 'Emitir notas fiscais',      descricao: 'Emitir e cancelar NF-e.', modulo: 'VENDAS' },
  { codigo: 'FINANCEIRO_VISUALIZAR', nome: 'Visualizar financeiro',     descricao: 'Fluxo de caixa, DRE e contas.', modulo: 'FINANCEIRO' },
  { codigo: 'RELATORIOS_VISUALIZAR', nome: 'Visualizar relatórios',     descricao: 'Consultar e exportar relatórios.', modulo: 'FINANCEIRO' },
  { codigo: 'USUARIOS_VISUALIZAR',   nome: 'Visualizar usuários',       descricao: 'Consultar contas do estabelecimento.', modulo: 'USUARIOS' },
  { codigo: 'USUARIOS_CRIAR',        nome: 'Criar usuários',            descricao: 'Cadastrar novas contas.', modulo: 'USUARIOS' },
  { codigo: 'USUARIOS_EDITAR',       nome: 'Editar usuários',           descricao: 'Alterar dados e perfil de contas.', modulo: 'USUARIOS' },
  { codigo: 'USUARIOS_INATIVAR',     nome: 'Inativar usuários',         descricao: 'Bloquear e reativar o acesso de contas.', modulo: 'USUARIOS' },
  { codigo: 'USUARIOS_EXCLUIR',      nome: 'Excluir usuários',          descricao: 'Remover contas definitivamente.', modulo: 'USUARIOS' },
  { codigo: 'PERFIS_GERENCIAR',      nome: 'Gerenciar perfis',          descricao: 'Criar, editar e excluir perfis de acesso.', modulo: 'ACESSO' },
  { codigo: 'PERMISSOES_GERENCIAR',  nome: 'Gerenciar permissões',      descricao: 'Ajustar permissões individuais de usuários.', modulo: 'ACESSO' },
]
const ALL_CODES = FUNCIONALIDADES.map(f => f.codigo)

function seed() {
  const now = new Date().toISOString()
  return {
    perfis: [
      { id: 'pf-gerente',    nome: 'Gerente',    descricao: 'Acesso total ao estabelecimento.', codigos: ALL_CODES },
      { id: 'pf-caixa',      nome: 'Caixa',      descricao: 'Atendimento no caixa e nas mesas.', codigos: ['VISUALIZAR_ESTOQUE', 'CAIXA_OPERAR', 'PEDIDOS_GERENCIAR'] },
      { id: 'pf-estoquista', nome: 'Estoquista', descricao: 'Recebimento e controle de estoque.', codigos: ['VISUALIZAR_ESTOQUE', 'MOVIMENTAR_ESTOQUE', 'PRODUTOS_GERENCIAR'] },
      { id: 'pf-financeiro', nome: 'Financeiro', descricao: 'Contas, fluxo de caixa e relatórios.', codigos: ['VISUALIZAR_ESTOQUE', 'FINANCEIRO_VISUALIZAR', 'RELATORIOS_VISUALIZAR'] },
      { id: 'pf-consulta',   nome: 'Consulta',   descricao: 'Somente leitura de estoque e relatórios.', codigos: ['VISUALIZAR_ESTOQUE', 'RELATORIOS_VISUALIZAR'] },
    ],
    usuarios: [
      { id: ME_ID,   name: 'Dev Gerente',   email: 'dev@meraki.com',      phone: '11999990000', profileId: 'pf-gerente',    active: true,  createdAt: '2026-01-01T09:00:00', updatedAt: now },
      { id: 'us-02', name: 'Carlos Souza',  email: 'carlos@meraki.com',   phone: '11988881111', profileId: 'pf-estoquista', active: true,  createdAt: '2026-02-10T14:20:00', updatedAt: '2026-08-02T10:00:00' },
      { id: 'us-03', name: 'Maria Jesus',   email: 'maria@meraki.com',    phone: '11977772222', profileId: 'pf-caixa',      active: true,  createdAt: '2026-03-05T11:00:00', updatedAt: '2026-09-01T16:40:00' },
      { id: 'us-04', name: 'Roberto Alves', email: 'roberto@meraki.com',  phone: '',            profileId: 'pf-caixa',      active: true,  createdAt: '2026-04-18T08:30:00', updatedAt: '2026-09-12T09:15:00' },
      { id: 'us-05', name: 'Ana Paula',     email: 'ana@meraki.com',      phone: '11955554444', profileId: 'pf-estoquista', active: false, createdAt: '2026-02-22T13:00:00', updatedAt: '2026-07-30T18:00:00' },
      { id: 'us-06', name: 'Beatriz Nunes', email: 'beatriz@meraki.com',  phone: '11944443333', profileId: 'pf-financeiro', active: true,  createdAt: '2026-05-09T10:10:00', updatedAt: '2026-08-21T12:00:00' },
    ],
    // sobrescritas por usuário: { [userId]: [{ codigoFuncionalidade, efeito }] }
    sobrescritas: {
      'us-04': [{ codigoFuncionalidade: 'MOVIMENTAR_ESTOQUE', efeito: 'GRANT' }],
      'us-06': [{ codigoFuncionalidade: 'VISUALIZAR_ESTOQUE', efeito: 'REVOKE' }],
    },
    seq: 100,
  }
}

function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) } catch { /* ignore */ }
  return seed()
}
let db = load()
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* ignore */ } }

const delay = (ms = 260 + Math.random() * 220) => new Promise(r => setTimeout(r, ms))
const clone = (x) => JSON.parse(JSON.stringify(x))
const fail = (status, message, fieldErrors = {}) => { throw Object.assign(new Error(message), { status, fieldErrors }) }
const norm = (s = '') => s.trim().toLocaleLowerCase('pt-BR')
const isEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

function perfilOut(p) {
  return { id: p.id, nome: p.nome, descricao: p.descricao, codigosFuncionalidades: [...p.codigos] }
}
function userOut(u) {
  const p = db.perfis.find(x => x.id === u.profileId)
  return { ...clone(u), profileName: p?.nome || null }
}
function getUser(id) {
  return db.usuarios.find(u => u.id === id) || fail(404, 'Usuário não encontrado.')
}
function getPerfil(id) {
  return db.perfis.find(p => p.id === id) || fail(404, 'Perfil não encontrado.')
}
function validarCodigos(codigos) {
  if (!Array.isArray(codigos)) fail(400, 'Lista de funcionalidades inválida.')
  const invalid = codigos.filter(c => !ALL_CODES.includes(c))
  if (invalid.length) fail(400, `Funcionalidade inexistente: ${invalid.join(', ')}.`)
  if (new Set(codigos).size !== codigos.length) fail(400, 'Há funcionalidades repetidas.')
}
function validarNomePerfil(nome, ignoreId) {
  if (!nome || !nome.trim()) fail(400, 'Dados inválidos.', { nome: 'O nome do perfil é obrigatório.' })
  if (nome.trim().length > 100) fail(400, 'Dados inválidos.', { nome: 'Use no máximo 100 caracteres.' })
  if (db.perfis.some(p => p.id !== ignoreId && norm(p.nome) === norm(nome))) fail(409, 'Já existe um perfil com este nome.', { nome: 'Já existe um perfil com este nome.' })
}
function validarUsuario(data, ignoreId) {
  const fe = {}
  if (data.name !== undefined && (!data.name || data.name.trim().length < 3)) fe.name = 'Informe o nome completo.'
  if (data.email !== undefined) {
    if (!isEmail(data.email)) fe.email = 'E-mail inválido.'
    else if (db.usuarios.some(u => u.id !== ignoreId && norm(u.email) === norm(data.email))) fe.email = 'Já existe uma conta com este e-mail.'
  }
  if (data.phone && !/^\d{10,11}$/.test(data.phone)) fe.phone = 'Telefone deve ter DDD + número.'
  if (data.profileId !== undefined && !db.perfis.some(p => p.id === data.profileId)) fe.profileId = 'Selecione um perfil válido.'
  if (Object.keys(fe).length) fail(fe.email?.startsWith('Já existe') ? 409 : 400, Object.values(fe)[0], fe)
}

export const mockServer = {
  /* ─── auth ─── */
  async login(email, password) {
    await delay(500)
    if (password === 'wrong') fail(401, 'E-mail ou senha incorretos.')
    const me = getUser(ME_ID)
    if (!me.active) fail(403, 'Conta inativa. Fale com o gerente do estabelecimento.')
    return { message: 'Autenticação realizada com sucesso', user: me.name }
  },
  async logout() { await delay(200); return null },
  async me() { await delay(150); return userOut(getUser(ME_ID)) },

  /* ─── usuários (contrato a confirmar) ─── */
  async listarUsuarios() { await delay(); return db.usuarios.map(userOut) },
  async obterUsuario(id) { await delay(); return userOut(getUser(id)) },
  async criarUsuario(data) {
    await delay(600)
    validarUsuario({ name: data.name ?? '', email: data.email ?? '', phone: data.phone, profileId: data.profileId ?? '' })
    if (!data.password || data.password.length < 8) fail(400, 'Dados inválidos.', { password: 'A senha precisa ter ao menos 8 caracteres.' })
    const now = new Date().toISOString()
    const u = { id: `us-${++db.seq}`, name: data.name.trim(), email: data.email.trim().toLowerCase(), phone: data.phone || '', profileId: data.profileId, active: true, createdAt: now, updatedAt: now }
    db.usuarios.push(u); save()
    return userOut(u)
  },
  async atualizarUsuario(id, patch) {
    await delay(450)
    const u = getUser(id)
    if (!Object.keys(patch).length) fail(400, 'Nenhum campo para atualizar.')
    if (id === ME_ID && patch.active === false) fail(409, 'Você não pode inativar a própria conta.')
    validarUsuario(patch, id)
    Object.assign(u, {
      ...('name' in patch && { name: patch.name.trim() }),
      ...('email' in patch && { email: patch.email.trim().toLowerCase() }),
      ...('phone' in patch && { phone: patch.phone || '' }),
      ...('profileId' in patch && { profileId: patch.profileId }),
      ...('active' in patch && { active: !!patch.active }),
      updatedAt: new Date().toISOString(),
    })
    save()
    return userOut(u)
  },
  async excluirUsuario(id) {
    await delay(450)
    getUser(id)
    if (id === ME_ID) fail(409, 'Você não pode excluir a própria conta.')
    db.usuarios = db.usuarios.filter(u => u.id !== id)
    delete db.sobrescritas[id]
    save()
    return null
  },

  /* ─── autorizações (documentado) ─── */
  async listarFuncionalidades() { await delay(180); return clone(FUNCIONALIDADES) },
  async listarPerfis() { await delay(); return db.perfis.map(perfilOut) },
  async obterPerfil(id) { await delay(); return perfilOut(getPerfil(id)) },
  async criarPerfil({ nome, descricao = '', codigosFuncionalidades = [] }) {
    await delay(500)
    validarNomePerfil(nome)
    validarCodigos(codigosFuncionalidades)
    const p = { id: `pf-${++db.seq}`, nome: nome.trim(), descricao: (descricao || '').trim(), codigos: codigosFuncionalidades }
    db.perfis.push(p); save()
    return perfilOut(p)
  },
  async atualizarPerfil(id, patch) {
    await delay(400)
    const p = getPerfil(id)
    if (!('nome' in patch) && !('descricao' in patch)) fail(400, 'Informe ao menos o nome ou a descrição.')
    if ('nome' in patch) validarNomePerfil(patch.nome, id)
    if ('nome' in patch) p.nome = patch.nome.trim()
    if ('descricao' in patch) p.descricao = (patch.descricao || '').trim()
    save()
    return perfilOut(p)
  },
  async excluirPerfil(id) {
    await delay(400)
    getPerfil(id)
    const n = db.usuarios.filter(u => u.profileId === id).length
    if (n) fail(409, `Não é possível excluir: ${n} usuário(s) vinculado(s) a este perfil.`)
    db.perfis = db.perfis.filter(p => p.id !== id); save()
    return null
  },
  async substituirFuncionalidadesPerfil(id, codigos) {
    await delay(450)
    const p = getPerfil(id)
    validarCodigos(codigos)
    p.codigos = [...codigos]; save()
    return null
  },
  async substituirSobrescritas(userId, { sobrescritas }) {
    await delay(450)
    getUser(userId)
    if (!Array.isArray(sobrescritas)) fail(400, 'Formato inválido.')
    const codigos = sobrescritas.map(s => s.codigoFuncionalidade)
    if (new Set(codigos).size !== codigos.length) fail(400, 'Cada funcionalidade pode aparecer uma única vez.')
    validarCodigos(codigos)
    if (sobrescritas.some(s => !['GRANT', 'REVOKE'].includes(s.efeito))) fail(400, 'Efeito deve ser GRANT ou REVOKE.')
    db.sobrescritas[userId] = clone(sobrescritas); save()
    return null // a API revoga a sessão atual do usuário
  },
  async permissoesUsuario(userId) {
    await delay()
    const u = getUser(userId)
    const perfil = db.perfis.find(p => p.id === u.profileId)
    const doPerfil = new Set(perfil?.codigos || [])
    const sobre = Object.fromEntries((db.sobrescritas[userId] || []).map(s => [s.codigoFuncionalidade, s.efeito]))
    return FUNCIONALIDADES
      .filter(f => doPerfil.has(f.codigo) || sobre[f.codigo])
      .map(f => {
        const ef = sobre[f.codigo]
        return {
          codigoFuncionalidade: f.codigo,
          concedida: ef === 'REVOKE' ? false : true,
          origem: ef === 'GRANT' ? 'SOBRESCRITA_GRANT' : ef === 'REVOKE' ? 'SOBRESCRITA_REVOKE' : 'PERFIL',
          noPerfil: doPerfil.has(f.codigo),
        }
      })
  },

  reset() { db = seed(); save() },
}
