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

export function filterRestockAlerts(rows, { search = '', status = '', category = '', range = '', order = 'priority' }) {
  const text = search.trim().toLocaleLowerCase('pt-BR')
  const filtered = rows.filter(row => {
    const percentage = minimumMetrics(row).percentage
    const matchesRange = !range || percentage != null && (range === '25' ? percentage <= 25 : range === '50' ? percentage > 25 && percentage <= 50 : percentage > 50)
    return (!status || row.status === status) && (!category || row.categoria === category) && (!text || (row.nome || '').toLocaleLowerCase('pt-BR').includes(text)) && matchesRange
  })
  if (order === 'name') return filtered.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
  if (order === 'percentage') return filtered.sort((a, b) => (minimumMetrics(a).percentage ?? Infinity) - (minimumMetrics(b).percentage ?? Infinity))
  return filtered // Preserve the server's priority order; never sort by incomparable quantities.
}
