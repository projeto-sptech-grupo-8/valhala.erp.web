import { HOURS, WEEKDAYS, MOTIVOS_PERDA } from '../../../../entities/reports/model/reporting.js'

const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function horarioReport(itens) {
  const primeiraHora = Math.min(HOURS[0], ...itens.map(linha => linha.hora))
  const horas = Array.from({ length: 24 - primeiraHora }, (_, i) => primeiraHora + i)
  const grid = WEEKDAYS.map(() => horas.map(() => ({ tickets: 0, receita: 0 })))
  for (const linha of itens) {
    if (grid[linha.diaSemana]?.[linha.hora - primeiraHora]) {
      grid[linha.diaSemana][linha.hora - primeiraHora] = { tickets: linha.vendas, receita: linha.receita }
    }
  }
  const cells = grid.flatMap((row, ri) => row.map((cell, ci) => ({ ...cell, ri, ci, dia: WEEKDAYS[ri], hora: horas[ci] })))
  return {
    horas, grid,
    max: Math.max(1, ...cells.map(cell => cell.tickets)),
    picos: [...cells].sort((a, b) => b.tickets - a.tickets).slice(0, 3),
    porDia: WEEKDAYS.map((dia, ri) => ({ dia, tickets: grid[ri].reduce((total, cell) => total + cell.tickets, 0) })),
  }
}

export function perdasReport(itens, granularidade) {
  const gran = granularidade?.toLowerCase()
  const buckets = new Map()
  const totais = new Map(MOTIVOS_PERDA.map(motivo => [motivo, 0]))
  for (const { periodo, motivo, valor } of itens) {
    if (!totais.has(motivo)) totais.set(motivo, 0)
    const [ano, mes, dia] = periodo.split('-')
    const label = gran === 'mes' ? `${meses[Number(mes) - 1]}/${ano.slice(2)}` : `${gran === 'semana' ? 'sem. ' : ''}${dia}/${mes}`
    if (!buckets.has(periodo)) buckets.set(periodo, { k: periodo, label, total: 0 })
    const row = buckets.get(periodo)
    row[motivo] = (row[motivo] ?? 0) + valor
    row.total += valor
    totais.set(motivo, totais.get(motivo) + valor)
  }
  const motivos = [...totais.keys()]
  const zeros = Object.fromEntries(motivos.map(motivo => [motivo, 0]))
  const rows = [...buckets.values()].sort((a, b) => a.k.localeCompare(b.k)).map(row => ({ ...zeros, ...row }))
  const porMotivo = [...totais].map(([motivo, valor]) => ({ motivo, valor }))
  return { rows, motivos, porMotivo, total: porMotivo.reduce((sum, row) => sum + row.valor, 0), gran }
}

export function extrairDataHora(concluido, fusoHorario) {
  if (!concluido) return null
  if (/([zZ]|[+-]\d{2}:\d{2})$/.test(concluido)) {
    const date = new Date(concluido)
    if (Number.isNaN(date.getTime())) return null
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: fusoHorario || 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(date).map(part => [part.type, part.value]),
    )
    return { data: `${parts.year}-${parts.month}-${parts.day}`, horaPedido: Number(parts.hour) % 24 }
  }
  return { data: concluido.slice(0, 10), horaPedido: Number(concluido.slice(11, 13)) }
}

export function pertenceAoHorario(pedido, de, ate, diaSemana, hora, fusoHorario) {
  const parsed = extrairDataHora(pedido?.concluidoEm, fusoHorario)
  if (!parsed) return false
  const { data, horaPedido } = parsed
  return data >= de && data <= ate && horaPedido === hora
    && (new Date(data + 'T00:00:00Z').getUTCDay() + 6) % 7 === diaSemana
}
