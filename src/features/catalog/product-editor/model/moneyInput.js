export function formatMoneyInput(value) {
  if (value === '' || value == null || !Number.isFinite(Number(value))) return ''
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function maskMoneyDraft(raw) {
  const clean = raw.replace(/[^\d,]/g, '')
  if (!clean) return { display: '', value: '' }
  const [integer, ...decimals] = clean.split(',')
  const whole = (integer || '0').replace(/^0+(?=\d)/, '')
  const fraction = decimals.join('').slice(0, 2)
  return {
    display: whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (decimals.length ? ',' + fraction : ''),
    value: whole + (fraction ? '.' + fraction : ''),
  }
}
