/* ─── Regras de estoque ───
 * Funções puras: recebem a lista de produtos (da store) em vez de ler o mock,
 * para refletir vendas e movimentações em tempo real.
 */
export function getStatus(p) {
  if (p.qty <= 0) return 'Zerado'
  if (p.qty < p.min) return 'Crítico'
  if (p.qty < p.min * 1.5) return 'Baixo'
  return 'Estável'
}

export function isCritical(p) {
  const st = getStatus(p)
  return st === 'Crítico' || st === 'Zerado'
}

export function getEstoqueML(p) {
  if (p.tipo !== 'padrao' || !p.volumeEmbalagem) return null
  return Math.round(p.qty * p.volumeEmbalagem)
}

function trackedIngredients(drink) {
  return drink.receita.filter(r => !r.livre && r.produtoId)
}

export function getRendimentoDrink(drink, products) {
  const limits = trackedIngredients(drink)
    .map(r => {
      const insumo = products.find(p => p.id === r.produtoId)
      if (!insumo?.volumeEmbalagem) return null
      return Math.max(0, Math.floor((insumo.qty * insumo.volumeEmbalagem) / r.quantidade))
    })
    .filter(l => l !== null)
  if (!limits.length) return null
  return Math.min(...limits)
}

export function getGargalo(drink, products) {
  let minR = Infinity, result = null
  trackedIngredients(drink).forEach(r => {
    const insumo = products.find(p => p.id === r.produtoId)
    if (!insumo?.volumeEmbalagem) return
    const rend = Math.max(0, Math.floor((insumo.qty * insumo.volumeEmbalagem) / r.quantidade))
    if (rend < minR) { minR = rend; result = { insumo, rendimento: rend, dose: r.quantidade } }
  })
  return result
}

export function getStatusDrink(drink, products) {
  const statuses = trackedIngredients(drink).map(r => {
    const p = products.find(p => p.id === r.produtoId)
    return p ? getStatus(p) : 'Estável'
  })
  if (statuses.includes('Zerado') || statuses.includes('Crítico')) return 'Crítico'
  if (statuses.includes('Baixo')) return 'Baixo'
  return 'Estável'
}

export function getStatusAny(p, products) {
  return p.tipo === 'drink' ? getStatusDrink(p, products) : getStatus(p)
}

export function getCustoDrink(receita, products) {
  return receita
    .filter(r => !r.livre && r.produtoId)
    .reduce((acc, r) => {
      const ins = products.find(p => p.id === r.produtoId)
      if (!ins?.volumeEmbalagem) return acc
      return acc + (ins.cost / ins.volumeEmbalagem) * r.quantidade
    }, 0)
}

/* Quantidade com sinal, independente de como foi gravada */
export function movDelta(m) {
  if (m.tipo === 'Entrada') return Math.abs(m.qty)
  if (m.tipo === 'Ajuste') return m.qty
  return -Math.abs(m.qty)
}

export function movKind(m) {
  if (m.tipo === 'Entrada') return 'Entrada'
  if (m.tipo === 'Ajuste') return 'Ajuste'
  return 'Saída'
}

/* Cor por nível de rendimento (copos possíveis) */
export function rendColor(n) {
  return n > 20 ? 'var(--green)' : n > 5 ? 'var(--gold2)' : 'var(--red)'
}

/* Quantidade legível: doses aparecem em ml, não em fração de garrafa */
export function fmtMovQty(m, products, fmt) {
  const d = movDelta(m)
  const sign = d > 0 ? '+' : '−'
  if (m.tipo === 'Saída (dose)') {
    const vol = products.find(p => p.id === m.produtoId)?.volumeEmbalagem
    if (vol) return `${sign}${Math.round(Math.abs(d) * vol)}ml`
  }
  return `${sign}${fmt(Math.abs(d))}`
}
