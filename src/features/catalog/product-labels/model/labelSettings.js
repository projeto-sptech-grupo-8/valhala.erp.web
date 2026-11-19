export const DEFAULT_SETTINGS = { version: 1, formato: 'padrao', mode: 'padrao', color: '#2563eb' }
export const FORMATS = { padrao: { name: 'Padrão · 63,5 × 33,9 mm', perPage: 24 }, grande: { name: 'Grande · 99 × 57 mm', perPage: 10 } }
export const preferenceKey = userId => `valhalla:labels:v1:${userId || 'local'}`

export function readSettings(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    if (saved?.version !== 1) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, formato: FORMATS[saved.formato] ? saved.formato : 'padrao', mode: ['padrao', 'manual', 'validade'].includes(saved.mode) ? saved.mode : 'padrao', color: /^#[0-9a-f]{6}$/i.test(saved.color) ? saved.color : DEFAULT_SETTINGS.color }
  } catch { return { ...DEFAULT_SETTINGS } }
}

export function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false
  const parsed = new Date(`${date}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}

export function localToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function expiryAppearance(date, today = localToday()) {
  if (!validDate(date)) return { color: '#64748b', text: 'Validade não informada' }
  const days = Math.round((new Date(`${date}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / 86400000)
  if (days < 0) return { color: '#dc2626', text: 'Vencido' }
  if (days <= 7) return { color: '#f97316', text: days === 0 ? 'Vence hoje' : 'Vence em até 7 dias' }
  if (days <= 30) return { color: '#eab308', text: 'Vence entre 8 e 30 dias' }
  return { color: '#16a34a', text: 'Mais de 30 dias para vencer' }
}

export function appearanceFor(settings, lot, today) {
  if (settings.mode === 'validade') return { ...expiryAppearance(lot?.validade, today), lote: lot?.lote || null, validade: validDate(lot?.validade) ? lot.validade : null }
  if (settings.mode === 'manual') return { color: settings.color, text: 'Destaque' }
  return { color: null, text: '' }
}

export function stripeTextColor(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return '#111111'
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4)
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179 ? '#111111' : '#ffffff'
}

export const formatExpiry = date => validDate(date) ? date.split('-').reverse().join('/') : 'Não informada'
export const validCopies = value => value !== '' && Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 99
