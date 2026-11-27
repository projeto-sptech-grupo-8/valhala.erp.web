function number(value) {
  if (value == null || typeof value === 'boolean' || String(value).trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function minimumMetrics(row) {
  const balance = number(row.quantidadeAtual), minimum = number(row.estoqueMinimo)
  if (balance == null || minimum == null || minimum <= 0) return { percentage: null, missing: null }
  return { percentage: balance / minimum * 100, missing: Math.max(0, minimum - balance) }
}
