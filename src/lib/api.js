import { mockServer } from './mockServer.js'
import { moduloDoCodigo, rotuloDoCodigo } from './funcionalidades.js'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

async function request(path, options = {}, isRetry = false) {
  let res
  try {
    res = await fetch(BASE + path, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch {
    throw Object.assign(
      new Error('Não foi possível conectar ao servidor. Verifique sua conexão.'),
      { status: 0 }
    )
  }

  if (res.status === 401 && !isRetry && !path.startsWith('/auth')) {
    const refreshRes = await fetch(BASE + '/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
    if (refreshRes.ok) return request(path, options, true)
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
const list = (r) => (Array.isArray(r) ? r : r?.content ?? r?.items ?? [])

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
  profileId: u.profileId ?? u.perfilId ?? null,
  profileName: u.profileName ?? u.perfilNome ?? null,
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

/* ─── API real ─── */
const realApi = {
  login:  (email, password) => request('/auth/login', send('POST', { email, password })),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me:     () => request('/usuario/me').then(toUsuario),

  // ⚠️ CRUD de usuário ainda não documentado — ver docs/fluxo-usuarios-perfis.md §5
  usuarios: {
    listar:    () => request('/usuario').then(r => list(r).map(toUsuario)),
    obter:     (id) => request(`/usuario/${id}`).then(toUsuario),
    criar:     (data) => request('/usuario', send('POST', data)).then(toUsuario),
    atualizar: (id, patch) => request(`/usuario/${id}`, send('PATCH', patch)).then(r => (r ? toUsuario(r) : realApi.usuarios.obter(id))),
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

  permissoes: {
    doUsuario: (userId) => request(`/autorizacoes/usuarios/${userId}/permissoes`).then(r => list(r).map(toPermissao)),
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
  permissoes: {
    doUsuario: (userId) => m.permissoesUsuario(userId).then(r => r.map(toPermissao)),
    substituirSobrescritas: (userId, sobrescritas) => m.substituirSobrescritas(userId, { sobrescritas }),
  },
}

export const api = import.meta.env.VITE_MOCK === 'true' ? mockApi : realApi
