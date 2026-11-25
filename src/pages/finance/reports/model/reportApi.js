import { authenticatedRequest, api } from '@/shared/api/api.js'
import { readCash } from '@/entities/sales/api/cashApi.js'
import { HOURS, WEEKDAYS, MOTIVOS_PERDA } from '@/entities/reports'

export async function readReport(path, dias, signal) {
  const data = await authenticatedRequest(`/relatorios/${path}?dias=${dias}`, { signal })
  if (!Array.isArray(data?.itens) || !data.referencia || !data.totais) {
    throw new Error('O servidor não retornou o relatório completo.')
  }
  return data
}

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

export async function estoqueAtual(signal) {
  const produtos = new Map()
  for (let pagina = 0; ; pagina++) {
    const result = await api.produtos.pagina({ tipo: 'PADRAO', ativo: true, pagina, tamanho: 100, ordenarPor: 'nome', direcao: 'ASC' }, signal)
    for (const produto of result.itens) produtos.set(produto.id, produto)
    if (result.ultima !== false || !result.itens.length) return produtos
  }
}

const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
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

function pertenceAoHorario(pedido, de, ate, diaSemana, hora) {
  const concluido = pedido.concluidoEm
  const data = concluido?.slice(0, 10)
  return data && data >= de && data <= ate && Number(concluido.slice(11, 13)) === hora
    && (new Date(data + 'T00:00:00Z').getUTCDay() + 6) % 7 === diaSemana
}

export async function produtosDoHorario(referencia, diaSemana, hora, celula, signal) {
  const { de, ate } = referencia
  const ids = new Set()
  // O filtro de datas dos pedidos é pela criação. A conclusão é o que define a célula.
  for (let pagina = 0; ; pagina++) {
    const result = await readCash('pedidos', { status: 'CONCLUIDO', dataFim: ate, ordenarPor: 'concluidoEm', direcao: 'DESC', pagina, tamanho: 100 }, signal)
    if (!Array.isArray(result?.itens)) throw new Error('A lista de pedidos do caixa não foi retornada.')
    for (const pedido of result.itens) {
      if (pertenceAoHorario(pedido, de, ate, diaSemana, hora)) ids.add(pedido.id)
    }
    const ultimo = result.itens.at(-1)
    if (!ultimo || result.ultima !== false || ultimo.concluidoEm?.slice(0, 10) < de) break
  }
  if (ids.size !== celula.tickets) throw new Error('Os pedidos do caixa mudaram desde a consulta. Atualize o relatório para conferir os produtos.')

  const produtos = new Map()
  const pedidos = [...ids]
  let faturamento = 0
  for (let i = 0; i < pedidos.length; i += 6) {
    const lote = await Promise.all(pedidos.slice(i, i + 6).map(id => readCash(`pedidos/${id}`, {}, signal)))
    for (const pedido of lote) {
      if (pedido?.status !== 'CONCLUIDO' || !Array.isArray(pedido.itens)) {
        throw new Error('Um dos pedidos mudou desde a consulta ou não retornou seus itens.')
      }
      faturamento += pedido.total
      for (const item of pedido.itens) {
        const id = item.produtoId
        const produto = produtos.get(id) ?? { id, name: item.descricaoProduto, qty: 0, receita: 0 }
        produto.qty += item.quantidade
        produto.receita += item.subtotal
        produtos.set(id, produto)
      }
    }
  }
  if (Math.round(faturamento * 100) !== Math.round(celula.receita * 100)) {
    throw new Error('O total dos pedidos mudou desde a consulta. Atualize o relatório para conferir os produtos.')
  }
  return [...produtos.values()].sort((a, b) => b.receita - a.receita)
}
