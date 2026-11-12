/*
 * Lotes e validade — regras FEFO (First Expired, First Out).
 * Funções puras: recebem e devolvem listas novas (a store faz o commit).
 *
 * lote: { id, lote, validade: 'AAAA-MM-DD' | null, qty, custo, entradaEm, nf }
 */
const round = (n) => Math.round(n * 1000) / 1000

export const SEM_LOTE = 'SEM-LOTE'

export function todayISO(now = new Date()) {
  const p = (x) => String(x).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

export function addDaysISO(days, base = new Date()) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return todayISO(d)
}

/* dias até a validade (negativo = vencido); null = sem validade */
export function daysUntil(validade, now = new Date()) {
  if (!validade) return null
  const [y, m, d] = validade.split('-').map(Number)
  const end = new Date(y, m - 1, d)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((end - start) / 86400000)
}

/* vence no próprio dia ainda é vendável; vencido é a partir do dia seguinte */
export const isExpired = (lot, now) => lot.validade != null && daysUntil(lot.validade, now) < 0

export function lotStatus(lot, now) {
  const d = daysUntil(lot.validade, now)
  if (d == null) return { key: 'sem', label: 'Sem validade', tone: 'neutral', dias: null }
  if (d < 0) return { key: 'vencido', label: 'Vencido', tone: 'bad', dias: d }
  if (d <= 7) return { key: '7d', label: 'Vence em até 7 dias', tone: 'bad', dias: d }
  if (d <= 30) return { key: '30d', label: 'Vence em até 30 dias', tone: 'warn', dias: d }
  return { key: 'ok', label: 'No prazo', tone: 'ok', dias: d }
}

export const lotsTotal = (lotes = []) => round(lotes.reduce((a, l) => a + l.qty, 0))

/* saldo que pode ser vendido (exclui lotes vencidos) */
export function sellableQty(p, now) {
  if (!p.lotes) return p.qty
  return round(p.lotes.filter(l => !isExpired(l, now)).reduce((a, l) => a + l.qty, 0))
}

export function expiredQty(p, now) {
  return round((p.lotes || []).filter(l => isExpired(l, now)).reduce((a, l) => a + l.qty, 0))
}

/* ordem FEFO: vence antes sai antes; sem validade por último */
export function fefoOrder(lotes) {
  return [...lotes].sort((a, b) => {
    if (a.validade === b.validade) return (a.entradaEm || '').localeCompare(b.entradaEm || '')
    if (!a.validade) return 1
    if (!b.validade) return -1
    return a.validade.localeCompare(b.validade)
  })
}

/*
 * Consome `qty` em ordem FEFO.
 * allowExpired=false (venda): pula lotes vencidos — produto vencido não pode ser vendido.
 * Retorna { lotes, used: [{ id, lote, validade, qty }], missing }.
 */
export function consumeFEFO(lotes = [], qty, { allowExpired = false, now } = {}) {
  let rest = qty
  const used = []
  const next = fefoOrder(lotes).map(l => ({ ...l }))
  for (const l of next) {
    if (rest <= 0) break
    if (!allowExpired && isExpired(l, now)) continue
    const take = Math.min(l.qty, rest)
    if (take <= 0) continue
    l.qty = round(l.qty - take)
    rest = round(rest - take)
    used.push({ id: l.id, lote: l.lote, validade: l.validade, qty: round(take) })
  }
  return { lotes: next.filter(l => l.qty > 0), used, missing: round(Math.max(0, rest)) }
}

/* consome um lote específico (ex.: perda de lote vencido) */
export function consumeLot(lotes = [], loteId, qty) {
  const lot = lotes.find(l => l.id === loteId)
  if (!lot) throw new Error('Lote não encontrado.')
  const take = qty == null ? lot.qty : Math.min(qty, lot.qty)
  const next = lotes.map(l => (l.id === loteId ? { ...l, qty: round(l.qty - take) } : l)).filter(l => l.qty > 0)
  return { lotes: next, used: [{ id: lot.id, lote: lot.lote, validade: lot.validade, qty: round(take) }] }
}

let lotSeq = 0
const lotId = () => `LT-${Date.now().toString(36)}-${(lotSeq++).toString(36)}`

/* adiciona saldo; mesmo número de lote + mesma validade soma no lote existente */
export function addLot(lotes = [], { lote, validade = null, qty, custo, nf = '', entradaEm }) {
  const code = (lote || '').trim() || SEM_LOTE
  const v = validade || null
  const ex = lotes.find(l => l.lote === code && l.validade === v)
  if (ex) return lotes.map(l => (l === ex ? { ...l, qty: round(l.qty + qty) } : l))
  return [...lotes, { id: lotId(), lote: code, validade: v, qty: round(qty), custo: custo ?? null, nf, entradaEm: entradaEm || new Date().toISOString() }]
}

/* garante que a soma dos lotes bate com o saldo (ajusta o SEM-LOTE) */
export function normalizeLots(p) {
  const lotes = p.lotes ? p.lotes.map(l => ({ ...l })) : []
  const diff = round(p.qty - lotsTotal(lotes))
  if (diff > 0) return addLot(lotes, { lote: SEM_LOTE, qty: diff, custo: p.cost })
  if (diff < 0) return consumeFEFO(lotes, -diff, { allowExpired: true }).lotes
  return lotes
}

/* custo médio ponderado após uma entrada */
export function weightedCost(qtyAtual, custoAtual, qtyEntrada, custoEntrada) {
  if (!(custoEntrada > 0)) return custoAtual
  const q = Math.max(0, qtyAtual)
  if (q + qtyEntrada <= 0) return custoEntrada
  return Math.round(((q * (custoAtual || 0) + qtyEntrada * custoEntrada) / (q + qtyEntrada)) * 10000) / 10000
}

/* sugestão de promoção para escoar lote próximo do vencimento */
export function promoSuggestion(p, lot, now) {
  const d = daysUntil(lot.validade, now)
  if (d == null || d < 0 || d > 30) return null
  const pct = d <= 7 ? 30 : d <= 15 ? 20 : 10
  const piso = Math.round(p.cost * 1.05 * 100) / 100
  const preco = Math.max(piso, Math.round(p.price * (1 - pct / 100) * 10) / 10 - 0.01)
  const margem = preco > 0 ? Math.round(((preco - p.cost) / preco) * 100) : 0
  return { pct: Math.round((1 - preco / p.price) * 100), preco: Math.round(preco * 100) / 100, margem, limitadoPeloCusto: preco === piso }
}

const fmtShort = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : 's/ val.')
export const describeUsed = (used) => used.map(u => `${u.lote} (${u.qty}${u.validade ? ' · val. ' + fmtShort(u.validade) : ''})`).join(', ')
