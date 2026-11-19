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

const norm = (v = '') => v.trim().toLocaleLowerCase('pt-BR')

/* nome: obrigatório, ≤ 100, único no estabelecimento (sem diferenciar maiúsculas) */
export function validarNomePerfil(nome, perfis = [], ignoreId) {
  if (!nome.trim()) return 'O nome do perfil é obrigatório.'
  if (nome.trim().length > 100) return 'Use no máximo 100 caracteres.'
  if (perfis.some(p => p.id !== ignoreId && norm(p.nome) === norm(nome))) return 'Já existe um perfil com este nome.'
  return null
}
