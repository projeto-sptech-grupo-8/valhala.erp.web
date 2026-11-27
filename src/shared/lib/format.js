const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

export function fmtBRL(n) {
  return brl.format(Number(n) || 0)
}

export function fmtNum(n) {
  return num.format(Number(n) || 0)
}

export function acrescentarDias(dia, quantidade) {
  const data = new Date(dia + 'T00:00:00Z')
  data.setUTCDate(data.getUTCDate() + quantidade)
  return data.toISOString().slice(0, 10)
}

export function fmtDateTime(date) {
  const d = new Date(date)
  const p = (x) => String(x).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}`
}
