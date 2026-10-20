import { mockServer } from './mockServer.js'
import { moduloDoCodigo, rotuloDoCodigo } from './funcionalidades.js'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

/* ─── CSRF: o backend exige X-XSRF-TOKEN em POST/PUT/PATCH/DELETE (exceto /auth/login) ─── */
const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
let csrfToken = null

const readCsrfCookie = () => document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1] ?? null

// cookie (mesmo host do front) ou GET /auth/csrf (API em outro domínio)
async function csrfHeader({ cookieOnly = false } = {}) {
  const fromCookie = readCsrfCookie()
  if (fromCookie) return { 'X-XSRF-TOKEN': decodeURIComponent(fromCookie) }
  if (cookieOnly) return {}
  if (!csrfToken) {
    const res = await fetch(BASE + '/auth/csrf', { credentials: 'include' }).catch(() => null)
    const body = res?.ok ? await res.json().catch(() => null) : null
    csrfToken = body?.token ?? body?.tokenCsrf ?? null
  }
  return csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}
}

// um único refresh por vez: o backend rotaciona o refresh token, então chamadas paralelas derrubariam a sessão
let refreshing = null
function refreshSession() {
  refreshing ??= csrfHeader({ cookieOnly: true }) // /auth/csrf exige o access token, que é o que expirou
    .then(headers => fetch(BASE + '/auth/refresh', { method: 'POST', credentials: 'include', headers }))
    .then(res => res.ok, () => false)
    .finally(() => { csrfToken = null; refreshing = null })
  return refreshing
}

async function request(path, options = {}, isRetry = false) {
  const method = (options.method ?? 'GET').toUpperCase()
  const csrf = MUTATIONS.has(method) && path !== '/auth/login' ? await csrfHeader() : {}
  let res
  try {
    res = await fetch(BASE + path, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...csrf, ...options.headers },
    })
  } catch {
    throw Object.assign(
      new Error('Não foi possível conectar ao servidor. Verifique sua conexão.'),
      { status: 0 }
    )
  }
  if (path === '/auth/login' || path === '/auth/logout') csrfToken = null

  if (res.status === 401 && !isRetry && !path.startsWith('/auth')) {
    if (await refreshSession()) return request(path, options, true)
    throw Object.assign(new Error('Sessão expirada'), { status: 401 })
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const fallback = res.status === 403 ? 'Você não tem permissão para esta ação.' : 'Erro inesperado'
    throw Object.assign(new Error(body.message ?? fallback), {
      status: res.status,
      fieldErrors: body.fieldErrors ?? {},
    })
  }

  if (res.status === 204) return null
  return res.json().catch(() => null)
}

const send = (method, body) => ({ method, body: body === undefined ? undefined : JSON.stringify(body) })

/* ─── Normalizadores: aceitam campos em PT ou EN e listas paginadas ─── */
const list = (r) => (Array.isArray(r) ? r : r?.itens ?? r?.content ?? r?.items ?? [])

export const toFuncionalidade = (f) => {
  const codigo = typeof f === 'string' ? f : f.codigo ?? f.code ?? f.codigoFuncionalidade
  return {
    codigo,
    nome: f.nome ?? f.name ?? rotuloDoCodigo(codigo),
    descricao: f.descricao ?? f.description ?? '',
    modulo: f.modulo ?? f.module ?? moduloDoCodigo(codigo),
  }
}

export const toPerfil = (p) => ({
  id: p.id ?? p.profileId ?? p.perfilId,
  nome: p.nome ?? p.name ?? '',
  descricao: p.descricao ?? p.description ?? '',
  codigos: p.codigosFuncionalidades
    ?? p.funcionalidades?.map(f => (typeof f === 'string' ? f : f.codigo ?? f.code))
    ?? [],
})

export const toUsuario = (u) => ({
  id: u.id,
  name: u.name ?? u.nome ?? '',
  email: u.email ?? '',
  phone: u.phone ?? u.telefone ?? '',
  profileId: u.profileId ?? u.idPerfil ?? u.perfilId ?? null,
  profileName: u.profileName ?? u.nomePerfil ?? u.perfilNome ?? null,
  active: u.active ?? u.ativo ?? true,
  createdAt: u.createdAt ?? u.criadoEm ?? null,
  updatedAt: u.updatedAt ?? u.atualizadoEm ?? null,
  permissoes: u.permissoes ?? u.permissions ?? undefined,
})

const ORIGENS = { PERFIL: 'PERFIL', PROFILE: 'PERFIL', GRANT: 'GRANT', SOBRESCRITA_GRANT: 'GRANT', REVOKE: 'REVOKE', SOBRESCRITA_REVOKE: 'REVOKE' }
export const toPermissao = (p) => {
  const origem = ORIGENS[String(p.origem ?? p.origin ?? p.origens?.[0] ?? 'PERFIL').toUpperCase()] || 'PERFIL'
  return {
    codigo: p.codigoFuncionalidade ?? p.codigo ?? p.code,
    concedida: p.concedida ?? p.efetiva ?? p.granted ?? origem !== 'REVOKE',
    origem,
  }
}

/*
 * GET /autorizacoes/usuarios/{id}/permissoes devolve
 *   { permissoesPerfil: [codigo], sobrescritas: [{ codigoFuncionalidade, efeito }], permissoesEfetivas: [codigo] }
 * A interface trabalha com uma linha por código: { codigo, concedida, origem }.
 */
export const toPermissoesUsuario = (r) => {
  if (Array.isArray(r)) return r.map(toPermissao)
  const efeitos = new Map((r?.sobrescritas ?? []).map(s => [s.codigoFuncionalidade, s.efeito]))
  const efetivas = new Set(r?.permissoesEfetivas ?? [])
  const codigos = new Set([...(r?.permissoesPerfil ?? []), ...efeitos.keys()])
  return [...codigos].map(codigo => ({
    codigo,
    concedida: efetivas.has(codigo),
    origem: ORIGENS[efeitos.get(codigo)] ?? 'PERFIL',
  }))
}

// erros de campo do back (nome, telefone, senha, nomePerfil) → campos do formulário
const CAMPOS_USUARIO = { nome: 'name', telefone: 'phone', senha: 'password', nomePerfil: 'profileId', ativo: 'active' }
const camposDoUsuario = (err) => {
  if (err?.fieldErrors) err.fieldErrors = Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [CAMPOS_USUARIO[k] ?? k, v]))
  throw err
}

// o back vincula o perfil pelo nome (nomePerfil); a interface trabalha com o id
async function comNomePerfil({ profileId, ...data }) {
  if (profileId == null || data.profileName || data.nomePerfil) return data
  const perfil = (await realApi.perfis.listar()).find(p => String(p.id) === String(profileId))
  if (!perfil) throw Object.assign(new Error('Perfil não encontrado.'), { status: 404, fieldErrors: {} })
  return { ...data, nomePerfil: perfil.nome }
}

export const toCategoria = (c) => ({
  id: c.id,
  nome: c.nome ?? c.name ?? '',
  descricao: c.descricao ?? c.description ?? '',
  ativo: c.ativo ?? c.active ?? true,
  criadoEm: c.criadoEm ?? null,
  atualizadoEm: c.atualizadoEm ?? null,
})

// percorre todas as páginas de um endpoint paginado (RespostaPaginadaDto)
async function todasAsPaginas(path, params = {}) {
  const itens = []
  for (let pagina = 0; ; pagina++) {
    const r = await request(`${path}?${new URLSearchParams({ ...params, pagina, tamanho: 100 })}`)
    itens.push(...list(r))
    if (!r || Array.isArray(r) || r.ultima !== false) return itens
  }
}

/*
 * Produto: o back guarda o saldo de produto fracionado em ML; a interface trabalha em embalagens
 * (garrafas). A conversão acontece só aqui, nos dois sentidos.
 */
const n = (v) => (v == null || v === '' ? null : Number(v))
const round3 = (v) => Math.round(v * 1000) / 1000

export const toProduto = (r) => {
  const fracionado = !!r.fracionado
  const volume = n(r.volumeEmbalagemMl)
  const base = fracionado && volume ? volume : 1
  return {
    id: r.id,
    sku: r.sku ?? '',
    name: r.nome ?? '',
    descricao: r.descricao ?? '',
    tipo: r.tipo === 'DRINK' ? 'drink' : 'padrao',
    categoriaId: r.categoriaId ?? null,
    cat: r.categoriaNome ?? '',
    unit: r.unidadeMedida ?? 'un',
    ean: r.codigoBarras ?? '',
    cost: n(r.precoCusto) ?? 0,
    price: n(r.precoVenda) ?? 0,
    margem: n(r.margemPercentual),
    fracionado,
    volumeEmbalagem: volume,
    ativo: r.ativo ?? true,
    qty: round3((n(r.quantidadeEstoque) ?? 0) / base),
    min: round3((n(r.estoqueMinimo) ?? 0) / base),
  }
}

// campos do produto da interface → contrato do back (só os informados)
export function fromProduto(p, { criar = false } = {}) {
  const drink = p.tipo === 'drink'
  const base = p.fracionado && p.volumeEmbalagem ? p.volumeEmbalagem : 1
  const body = {
    nome: p.name,
    categoriaId: p.categoriaId,
    unidadeMedida: p.unit,
    precoVenda: p.price,
    precoCusto: drink ? undefined : p.cost,
    codigoBarras: p.ean || undefined,
    descricao: p.descricao || undefined,
  }
  if (!drink) {
    body.fracionado = !!p.fracionado
    body.volumeEmbalagemMl = p.volumeEmbalagem ?? undefined
    if (p.min != null) body.estoqueMinimo = round3(p.min * base)
    if (criar) body.quantidadeInicial = round3((p.qty ?? 0) * base)
  }
  if (criar) body.tipo = drink ? 'DRINK' : 'PADRAO'
  return Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
}

/*
 * Receita: a interface guarda a quantidade em ml (insumo × volume da embalagem). O back usa ML para
 * insumo fracionado e UN (unidades) para os demais — a conversão fica aqui.
 */
export const toReceita = (ingredientes, produtos) => list(ingredientes).map(i => {
  const ins = produtos.find(p => p.id === i.produtoId)
  const qtd = n(i.quantidade) ?? 0
  return {
    produtoId: i.produtoId,
    quantidade: i.unidadeConsumo === 'UN' ? round3(qtd * (ins?.volumeEmbalagem || 1)) : qtd,
    unidade: i.unidadeConsumo ?? 'ML',
    livre: false,
  }
})

export const fromReceita = (receita, produtos) => receita.filter(r => !r.livre && r.produtoId).map(r => {
  const ins = produtos.find(p => p.id === r.produtoId)
  const un = ins && !ins.fracionado
  return {
    produtoId: r.produtoId,
    quantidade: un ? round3(r.quantidade / (ins.volumeEmbalagem || 1)) : r.quantidade,
    unidadeConsumo: un ? 'UN' : 'ML',
  }
})

// erros de campo do back → campos do formulário de produto
const CAMPOS_PRODUTO = {
  nome: 'name', categoriaId: 'cat', unidadeMedida: 'unit', precoVenda: 'price', precoCusto: 'cost',
  estoqueMinimo: 'min', quantidadeInicial: 'qty', volumeEmbalagemMl: 'volumeEmbalagem', ingredientes: 'receita',
}
const camposDoProduto = (err) => {
  if (err?.fieldErrors) err.fieldErrors = Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [CAMPOS_PRODUTO[k.split(/[.[]/)[0]] ?? k, v]))
  throw err
}

/* ─── API real ─── */
const realApi = {
  login:  (email, password) => request('/auth/login', send('POST', { email, senha: password })),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me:     () => request('/usuario/me').then(toUsuario),

  usuarios: {
    listar:    () => request('/usuario').then(r => list(r).map(toUsuario)),
    obter:     (id) => request(`/usuario/${id}`).then(toUsuario),
    criar:     async (data) => request('/usuario', send('POST', await comNomePerfil(data))).then(toUsuario).catch(camposDoUsuario),
    atualizar: async (id, patch) => request(`/usuario/${id}`, send('PATCH', await comNomePerfil(patch)))
      .then(r => (r ? toUsuario(r) : realApi.usuarios.obter(id))).catch(camposDoUsuario),
    excluir:   (id) => request(`/usuario/${id}`, { method: 'DELETE' }),
  },

  funcionalidades: {
    listar: () => request('/autorizacoes/funcionalidades').then(r => list(r).map(toFuncionalidade)),
  },

  perfis: {
    listar:    () => request('/autorizacoes/perfis').then(r => list(r).map(toPerfil)),
    obter:     (id) => request(`/autorizacoes/perfis/${id}`).then(toPerfil),
    criar:     ({ nome, descricao, codigos }) =>
      request('/autorizacoes/perfis', send('POST', { nome, descricao, codigosFuncionalidades: codigos })).then(toPerfil),
    atualizar: (id, patch) =>
      request(`/autorizacoes/perfis/${id}`, send('PATCH', patch)).then(r => (r ? toPerfil(r) : realApi.perfis.obter(id))),
    excluir:   (id) => request(`/autorizacoes/perfis/${id}`, { method: 'DELETE' }),
    substituirFuncionalidades: (id, codigos) =>
      request(`/autorizacoes/perfis/${id}/funcionalidades/codigos`, send('PUT', codigos)),
  },

  categorias: {
    listar:    () => todasAsPaginas('/categorias').then(r => r.map(toCategoria)),
    criar:     ({ nome, descricao }) => request('/categorias', send('POST', { nome, descricao })).then(toCategoria),
    atualizar: (id, patch) => request(`/categorias/${id}`, send('PATCH', patch)).then(toCategoria),
    excluir:   (id) => request(`/categorias/${id}`, { method: 'DELETE' }),
  },

  produtos: {
    listar:    (params) => todasAsPaginas('/produtos', params).then(r => r.map(toProduto)),
    obter:     (id) => request(`/produtos/${id}`).then(toProduto),
    criar:     (p) => request('/produtos', send('POST', fromProduto(p, { criar: true }))).then(toProduto).catch(camposDoProduto),
    atualizar: (id, patch) => request(`/produtos/${id}`, send('PATCH', patch)).then(toProduto).catch(camposDoProduto),
    excluir:   (id) => request(`/produtos/${id}`, { method: 'DELETE' }),
  },

  // ingredientes no formato do back; a conversão ml ↔ UN é feita por toReceita/fromReceita
  receitas: {
    obter:      (drinkId) => request(`/drinks/${drinkId}/receita`),
    substituir: (drinkId, ingredientes) =>
      request(`/drinks/${drinkId}/receita`, send('PUT', { ingredientes })).catch(camposDoProduto),
  },

  permissoes: {
    doUsuario: (userId) => request(`/autorizacoes/usuarios/${userId}/permissoes`).then(toPermissoesUsuario),
    substituirSobrescritas: (userId, sobrescritas) =>
      request(`/autorizacoes/usuarios/${userId}/sobrescritas-permissao`, send('PUT', { sobrescritas })),
  },
}

/* ─── Mock (VITE_MOCK=true): mesmo contrato, regras simuladas em mockServer.js ─── */
const m = mockServer
const mockApi = {
  login:  (email, password) => m.login(email, password),
  logout: () => m.logout(),
  me:     () => m.me().then(toUsuario),
  usuarios: {
    listar:    () => m.listarUsuarios().then(r => r.map(toUsuario)),
    obter:     (id) => m.obterUsuario(id).then(toUsuario),
    criar:     (data) => m.criarUsuario(data).then(toUsuario),
    atualizar: (id, patch) => m.atualizarUsuario(id, patch).then(toUsuario),
    excluir:   (id) => m.excluirUsuario(id),
  },
  funcionalidades: {
    listar: () => m.listarFuncionalidades().then(r => r.map(toFuncionalidade)),
  },
  perfis: {
    listar:    () => m.listarPerfis().then(r => r.map(toPerfil)),
    obter:     (id) => m.obterPerfil(id).then(toPerfil),
    criar:     ({ nome, descricao, codigos }) => m.criarPerfil({ nome, descricao, codigosFuncionalidades: codigos }).then(toPerfil),
    atualizar: (id, patch) => m.atualizarPerfil(id, patch).then(toPerfil),
    excluir:   (id) => m.excluirPerfil(id),
    substituirFuncionalidades: (id, codigos) => m.substituirFuncionalidadesPerfil(id, codigos),
  },
  categorias: {
    listar:    () => m.listarCategorias().then(r => r.map(toCategoria)),
    criar:     (data) => m.criarCategoria(data).then(toCategoria),
    atualizar: (id, patch) => m.atualizarCategoria(id, patch).then(toCategoria),
    excluir:   (id) => m.excluirCategoria(id),
  },
  permissoes: {
    doUsuario: (userId) => m.permissoesUsuario(userId).then(r => r.map(toPermissao)),
    substituirSobrescritas: (userId, sobrescritas) => m.substituirSobrescritas(userId, { sobrescritas }),
  },
}

/*
 * VITE_MOCK=true          → tudo no mock
 * VITE_MOCK_MODULES=a,b   → só esses módulos no mock (auth, usuarios, funcionalidades, perfis, permissoes, categorias, produtos)
 * Integração módulo a módulo: tire o módulo da lista quando ele passar nos testes contra a API real.
 */
const AUTH_KEYS = ['login', 'logout', 'me']
const mockedModules = new Set(
  import.meta.env.VITE_MOCK === 'true'
    ? [...Object.keys(realApi), 'auth']
    : (import.meta.env.VITE_MOCK_MODULES ?? '').split(',').map(s => s.trim()).filter(Boolean)
)
// produtos/receitas no mock ficam no próprio store do painel (estado local), não no mockServer
export const isMocked = (mod) => mockedModules.has(mod)
const pick = (key) => {
  const mod = AUTH_KEYS.includes(key) ? 'auth' : key === 'receitas' ? 'produtos' : key
  return (mockedModules.has(mod) ? mockApi : realApi)[key]
}

export const api = Object.fromEntries(Object.keys(realApi).map(key => [key, pick(key)]))
