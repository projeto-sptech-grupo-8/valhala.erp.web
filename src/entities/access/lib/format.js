/* Telefone BR: guarda só dígitos, exibe (11) 99999-0000 */
export function onlyDigits(v = '') {
  return String(v).replace(/\D/g, '').slice(0, 11)
}

export function fmtPhone(v = '') {
  const d = onlyDigits(v)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export const isEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

/* força da senha: 0–4 */
export function passwordScore(v = '') {
  return [v.length >= 8, /[a-zA-Z]/.test(v) && /\d/.test(v), /[A-Z]/.test(v) && /[a-z]/.test(v), /[^A-Za-z0-9]/.test(v) || v.length >= 12]
    .filter(Boolean).length
}

export function normalizeProfileKey(name) {
  return String(name ?? '').normalize('NFD').replace(/\p{M}/gu, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

// Mesma normalização usada pelo backend para identificar o perfil reservado.
export function isManagerProfile(name) {
  return normalizeProfileKey(name) === 'GERENTE'
}

/* nome: obrigatório, ≤ 100, único no estabelecimento (normalizado igual ao backend) */
export function validarNomePerfil(nome, perfis = [], ignoreId, { allowManager = false } = {}) {
  const trimmed = String(nome ?? '').trim()
  if (!trimmed) return 'O nome do perfil é obrigatório.'
  if (trimmed.length > 100) return 'Use no máximo 100 caracteres.'
  if (!allowManager && isManagerProfile(trimmed)) return 'Gerente é um nome reservado.'
  const key = normalizeProfileKey(trimmed)
  if (perfis.some(p => p.id !== ignoreId && normalizeProfileKey(p.nome) === key)) {
    return 'Já existe um perfil com este nome.'
  }
  return null
}
