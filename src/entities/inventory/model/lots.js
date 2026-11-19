/*
 * Lotes e validade — regras FEFO (First Expired, First Out).
 * Funções puras: recebem e devolvem listas novas (a store faz o commit).
 *
 * lote: { id, lote, validade: 'AAAA-MM-DD' | null, qty, custo, entradaEm, nf }
 */
const round = (n) => Math.round(n * 1000) / 1000

export const SEM_LOTE = 'SEM-LOTE'

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

export const lotsTotal = (lotes = []) => round(lotes.reduce((a, l) => a + l.qty, 0))

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
