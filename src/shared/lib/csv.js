/* Exportação CSV no cliente — separador ";" e BOM para abrir direto no Excel pt-BR. */
export function cell(v) {
  if (v == null) return ''
  let str = typeof v === 'number' ? String(v).replace('.', ',') : String(v)
  if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(str)) str = "'" + str
  return /[";\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function downloadCSV(filename, headers, rows) {
  const lines = [headers, ...rows].map((r) => r.map(cell).join(';'))
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function stamp() {
  return new Date().toISOString().slice(0, 10)
}
