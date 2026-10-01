/*
 * Cálculos dos relatórios de gestão (funções puras).
 * Fonte: histórico sintético (mock) + vendas reais da sessão. Com o backend, cada função
 * vira um endpoint agregado (GET /relatorios/abc?dias=30 …) — a tela não muda.
 */
import { MOTIVOS_PERDA } from './historico.js'

const DAY = 86400000
export const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']   // segunda primeiro (rotina de escala)
export const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]

const r2 = (n) => Math.round(n * 100) / 100

export function inPeriod(iso, dias, now = new Date()) {
  const t = new Date(iso).getTime()
  const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
  return t >= fim - (dias + 1) * DAY && t < fim
}

/* histórico + vendas reais no mesmo formato */
export function mergeSales(hist, real, products, drinks) {
  const all = [...products, ...drinks]
  const realN = (real || []).map(v => ({
    ...v,
    canal: v.canal || 'Mesa',
    itens: v.itens.map(i => ({ ...i, cat: i.cat || all.find(p => p.id === i.id)?.cat || 'Outros', cost: i.cost ?? all.find(p => p.id === i.id)?.cost ?? 0 })),
  }))
  return [...hist.sales, ...realN]
}

/* ─── Curva ABC (faturamento) ─── */
export function curvaABC(sales) {
  const by = {}
  for (const v of sales) for (const i of v.itens) {
    const e = (by[i.id] ||= { id: i.id, name: i.name, cat: i.cat, receita: 0, qty: 0 })
    e.receita += i.price * i.qty
    e.qty += i.qty
  }
  const rows = Object.values(by).sort((a, b) => b.receita - a.receita)
  const total = rows.reduce((a, r) => a + r.receita, 0) || 1
  let acc = 0
  return rows.map((r, k) => {
    const antes = acc
    acc += r.receita
    const classe = antes / total < 0.8 ? 'A' : antes / total < 0.95 ? 'B' : 'C'
    return { ...r, receita: r2(r.receita), pos: k + 1, pct: (r.receita / total) * 100, acumulado: (acc / total) * 100, classe }
  })
}

/* ─── Margem por categoria ─── */
export function margemPorCategoria(sales) {
  const by = {}
  for (const v of sales) for (const i of v.itens) {
    const e = (by[i.cat] ||= { cat: i.cat, receita: 0, cmv: 0, qty: 0 })
    e.receita += i.price * i.qty
    e.cmv += (i.cost || 0) * i.qty
    e.qty += i.qty
  }
  const total = Object.values(by).reduce((a, e) => a + e.receita, 0) || 1
  return Object.values(by)
    .map(e => ({ ...e, receita: r2(e.receita), cmv: r2(e.cmv), lucro: r2(e.receita - e.cmv), margem: e.receita ? ((e.receita - e.cmv) / e.receita) * 100 : 0, share: (e.receita / total) * 100 }))
    .sort((a, b) => b.margem - a.margem)
}

/* ─── Ruptura (dias zerados, ocorrências e venda perdida) ─── */
export function rupturas(rupturaDiaria, dias, products, now = new Date()) {
  const by = {}
  for (const d of rupturaDiaria) {
    if (!inPeriod(`${d.dia}T12:00:00`, dias, now)) continue
    ;(by[d.produtoId] ||= []).push(d)
  }
  return products.map(p => {
    const list = (by[p.id] || []).sort((a, b) => a.dia.localeCompare(b.dia))
    let ocorrencias = 0
    let prev = null
    for (const d of list) {
      if (!prev || (new Date(d.dia) - new Date(prev)) / DAY > 1) ocorrencias++
      prev = d.dia
    }
    const perdidas = list.reduce((a, d) => a + d.perdidas, 0)
    return { id: p.id, name: p.name, cat: p.cat, dias: list.length, ocorrencias, perdidas, vendaPerdida: r2(perdidas * p.price), pctDias: (list.length / dias) * 100, estoqueAtual: p.qty, min: p.min }
  }).sort((a, b) => b.vendaPerdida - a.vendaPerdida || b.dias - a.dias)
}

/* ─── Mapa de calor: vendas por dia da semana × hora ─── */
export function mapaHorarios(sales) {
  const grid = WEEKDAYS.map(() => HOURS.map(() => ({ tickets: 0, receita: 0 })))
  for (const v of sales) {
    const d = new Date(v.em)
    const row = (d.getDay() + 6) % 7
    const col = HOURS.indexOf(d.getHours())
    if (col < 0) continue
    grid[row][col].tickets++
    grid[row][col].receita += v.total
  }
  const cells = grid.flatMap((r, ri) => r.map((c, ci) => ({ ...c, dia: WEEKDAYS[ri], hora: HOURS[ci], ri, ci })))
  const max = Math.max(1, ...cells.map(c => c.tickets))
  const picos = [...cells].sort((a, b) => b.tickets - a.tickets).slice(0, 3)
  const porDia = WEEKDAYS.map((d, ri) => ({ dia: d, tickets: grid[ri].reduce((a, c) => a + c.tickets, 0) }))
  return { grid, max, picos, porDia }
}

/* 5 classes iguais da rampa; 0 fica fora (neutro) */
export function binOf(v, max) {
  if (!v) return 0
  return Math.min(5, 1 + Math.floor((v / max) * 5 - 1e-9))
}

/* ─── Canais ─── */
export function porCanal(sales, canais) {
  const total = sales.reduce((a, v) => a + v.total, 0) || 1
  return canais.map(c => {
    const list = sales.filter(v => v.canal === c)
    const fat = list.reduce((a, v) => a + v.total, 0)
    const itens = list.reduce((a, v) => a + v.itens.reduce((x, i) => x + i.qty, 0), 0)
    return { canal: c, vendas: list.length, faturamento: r2(fat), ticket: list.length ? fat / list.length : 0, share: (fat / total) * 100, itensPorVenda: list.length ? itens / list.length : 0 }
  })
}

/* ─── Perdas por motivo (sintético + movimentações reais) ─── */
function motivoDe(m) {
  if (m.tipo === 'Ajuste' && m.qty < 0 && /Diferença de inventário/.test(m.obs || '')) return 'Diferença de inventário'
  if (m.tipo !== 'Saída') return null
  return MOTIVOS_PERDA.find(x => (m.obs || '').startsWith(x)) || null
}

export function perdas(histPerdas, movements, products, dias, now = new Date()) {
  const eventos = [
    ...histPerdas.map(p => ({ em: p.em, motivo: p.motivo, valor: p.qty * p.custo, produto: p.produto })),
    ...movements.map(m => {
      const motivo = motivoDe(m)
      if (!motivo) return null
      const cost = products.find(p => p.id === m.produtoId)?.cost || 0
      return { em: m.em, motivo, valor: Math.abs(m.qty) * cost, produto: m.produto }
    }).filter(Boolean),
  ].filter(e => inPeriod(e.em, dias, now))

  // granularidade conforme o período: dia (7), semana (30), mês (90)
  const gran = dias <= 7 ? 'dia' : dias <= 30 ? 'semana' : 'mes'
  const keyOf = (iso) => {
    const d = new Date(iso)
    if (gran === 'dia') return { k: d.toISOString().slice(0, 10), label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` }
    if (gran === 'semana') {
      const s = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
      return { k: s.toISOString().slice(0, 10), label: `sem. ${String(s.getDate()).padStart(2, '0')}/${String(s.getMonth() + 1).padStart(2, '0')}` }
    }
    const m = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][d.getMonth()]
    return { k: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${m}/${String(d.getFullYear()).slice(2)}` }
  }
  const buckets = {}
  for (const e of eventos) {
    const { k, label } = keyOf(e.em)
    const b = (buckets[k] ||= { k, label, total: 0, ...Object.fromEntries(MOTIVOS_PERDA.map(m => [m, 0])) })
    b[e.motivo] += e.valor
    b.total += e.valor
  }
  const rows = Object.values(buckets).sort((a, b) => a.k.localeCompare(b.k)).map(b => ({ ...b, total: r2(b.total), ...Object.fromEntries(MOTIVOS_PERDA.map(m => [m, r2(b[m])])) }))
  const porMotivo = MOTIVOS_PERDA.map(m => ({ motivo: m, valor: r2(eventos.filter(e => e.motivo === m).reduce((a, e) => a + e.valor, 0)) }))
  return { rows, porMotivo, total: r2(eventos.reduce((a, e) => a + e.valor, 0)), gran }
}
