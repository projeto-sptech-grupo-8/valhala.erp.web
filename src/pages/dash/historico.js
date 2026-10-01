/*
 * Histórico SINTÉTICO de 90 dias para os relatórios (só no mock).
 * Determinístico (semente fixa): os números são sempre os mesmos, coerentes com o giro de cada
 * produto, o dia da semana, o horário e o canal. A simulação acompanha o estoque dia a dia,
 * então as rupturas (produto zerado → venda perdida) acontecem de verdade no modelo.
 * Quando o backend existir, este arquivo é substituído por GET /relatorios/...
 */
import { allProducts, drinkProducts } from './mock.js'

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const CANAIS = ['Balcão', 'Mesa', 'Delivery']
export const MOTIVOS_PERDA = ['Perda / quebra', 'Vencimento', 'Consumo interno', 'Diferença de inventário']

const WEEKDAY = [1.0, 0.55, 0.6, 0.7, 0.9, 1.45, 1.6]                                   // dom..sáb
const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
const HOUR_W = [1, 1.2, 1.5, 1.3, 1, 1, 1.2, 1.6, 2.4, 3.2, 3.6, 3.3, 2.4, 1.4]

/* reposição: quem é bem abastecido e quem falta (para a ruptura aparecer onde é plausível) */
const RESTOCK = {
  'BEB-002': { dias: [1], alvo: 1.1 },          // Stella: distribuidora entrega pouco, 1×/semana
  'BEB-008': { dias: [1], alvo: 1.0 },          // Jack Daniel's: compra só às segundas
  'BEB-011': { dias: [1], alvo: 1.0 },
  'BEB-007': { dias: [1, 4], alvo: 1.2 },
}

function pickWeighted(rng, items, weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i] }
  return items[items.length - 1]
}

const drinkCost = (d) => d.receita.reduce((a, r) => {
  const ins = allProducts.find(p => p.id === r.produtoId)
  return ins?.volumeEmbalagem ? a + (ins.cost / ins.volumeEmbalagem) * r.quantidade : a
}, 0)

let cache = null

export function getHistorico(now = new Date()) {
  const key = now.toDateString()
  if (cache?.key === key) return cache.data
  const rng = mulberry32(20260901)

  const catalog = [
    ...allProducts.map(p => ({ id: p.id, name: p.name, cat: p.cat, price: p.price, cost: p.cost, tipo: 'padrao', w: p.saidas30d })),
    ...drinkProducts.map(d => ({ id: d.id, name: d.name, cat: d.cat, price: d.price, cost: Math.round(drinkCost(d) * 100) / 100, tipo: 'drink', w: 18 })),
  ]
  const weights = catalog.map(c => c.w)
  const stock = Object.fromEntries(allProducts.map(p => [p.id, Math.round(p.min * 2.5)]))
  const rupt = Object.fromEntries(allProducts.map(p => [p.id, { dias: 0, ocorrencias: 0, perdidas: 0, zeroOntem: false }]))

  const sales = []
  const perdas = []
  const rupturaDiaria = [] // [{ dia, produtoId, perdidas }]
  let seq = 1

  for (let d = 90; d >= 1; d--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d)
    const wd = day.getDay()

    // reposição de manhã
    for (const p of allProducts) {
      const rule = RESTOCK[p.id] || { dias: [1, 4], alvo: 3 }
      if (rule.dias.includes(wd) && stock[p.id] < p.min * 2) stock[p.id] = Math.max(stock[p.id], Math.round(p.min * rule.alvo))
    }
    const zeroHoje = new Set()
    const perdidasHoje = {}

    const n = Math.round(24 * WEEKDAY[wd] * (0.85 + rng() * 0.3))
    for (let t = 0; t < n; t++) {
      const hour = pickWeighted(rng, HOURS, HOUR_W)
      const canal = pickWeighted(rng, CANAIS, [50, 34, 16])
      const linhas = 1 + Math.floor(rng() * 3) + (canal === 'Delivery' ? 1 : 0)
      const itens = []
      for (let l = 0; l < linhas; l++) {
        const c = pickWeighted(rng, catalog, weights)
        if (itens.some(i => i.id === c.id)) continue
        let qty = c.cat === 'Cerveja' ? 1 + Math.floor(rng() * (canal === 'Delivery' ? 6 : 3)) : 1
        if (c.tipo === 'padrao') {
          const s = stock[c.id]
          if (s <= 0) { rupt[c.id].perdidas += qty; perdidasHoje[c.id] = (perdidasHoje[c.id] || 0) + qty; zeroHoje.add(c.id); continue }
          if (s < qty) { rupt[c.id].perdidas += qty - s; perdidasHoje[c.id] = (perdidasHoje[c.id] || 0) + qty - s; qty = s }
          stock[c.id] = s - qty
          if (stock[c.id] === 0) zeroHoje.add(c.id)
        }
        itens.push({ id: c.id, name: c.name, cat: c.cat, qty, price: c.price, cost: c.cost })
      }
      if (!itens.length) continue
      const subtotal = itens.reduce((a, i) => a + i.price * i.qty, 0)
      const desconto = canal === 'Balcão' && rng() < 0.12 ? Math.round(subtotal * 0.05 * 100) / 100 : 0
      const min = Math.floor(rng() * 60)
      const em = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, min).toISOString()
      sales.push({ id: `HIST-${seq}`, num: seq++, em, canal, itens, subtotal: Math.round(subtotal * 100) / 100, desconto, total: Math.round((subtotal - desconto) * 100) / 100, sintetico: true })
    }

    for (const id of Object.keys(rupt)) {
      const r = rupt[id]
      if (zeroHoje.has(id) || stock[id] <= 0) { r.dias++; if (!r.zeroOntem) r.ocorrencias++; r.zeroOntem = true; rupturaDiaria.push({ dia: day.toISOString().slice(0, 10), produtoId: id, perdidas: perdidasHoje[id] || 0 }) }
      else r.zeroOntem = false
    }

    // perdas: quebra quase diária em cerveja, consumo interno semanal, vencimento e inventário mensais
    const iso = day.toISOString()
    if (rng() < 0.35) { const p = pickWeighted(rng, allProducts.filter(x => x.cat === 'Cerveja'), [3, 1, 2, 1]); perdas.push({ em: iso, produtoId: p.id, produto: p.name, motivo: 'Perda / quebra', qty: 1 + Math.floor(rng() * 2), custo: p.cost }) }
    if (wd === 6) { const alvo = rng() < 0.5 ? 'BEB-013' : 'BEB-012'; const p = allProducts.find(x => x.id === alvo); perdas.push({ em: iso, produtoId: p.id, produto: p.name, motivo: 'Consumo interno', qty: 2 + Math.floor(rng() * 4), custo: p.cost }) }
    if (day.getDate() === 28) {
      const p = allProducts.find(x => x.id === 'BEB-004'); perdas.push({ em: iso, produtoId: p.id, produto: p.name, motivo: 'Vencimento', qty: 3 + Math.floor(rng() * 6), custo: p.cost })
      const q = allProducts.find(x => x.id === 'BEB-003'); perdas.push({ em: iso, produtoId: q.id, produto: q.name, motivo: 'Diferença de inventário', qty: 2 + Math.floor(rng() * 4), custo: q.cost })
    }
  }

  const ruptura = Object.fromEntries(Object.entries(rupt).map(([id, r]) => [id, { dias: r.dias, ocorrencias: r.ocorrencias, perdidas: r.perdidas }]))
  const data = { sales, ruptura, rupturaDiaria, perdas, dias: 90 }
  cache = { key, data }
  return data
}
