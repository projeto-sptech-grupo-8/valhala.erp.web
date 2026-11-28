import { authenticatedRequest, api } from '@/shared/api/api.js'
import { readCash } from '@/entities/sales/api/cashApi.js'
import { extrairDataHora, horarioReport, perdasReport, pertenceAoHorario } from './reportTransform.js'

export { horarioReport, perdasReport, pertenceAoHorario }

const MAX_REPORT_PAGES = 50

export async function readReport(path, dias, signal) {
  const data = await authenticatedRequest(`/relatorios/${path}?dias=${dias}`, { signal })
  if (!Array.isArray(data?.itens) || !data.referencia || !data.totais) {
    throw new Error('O servidor não retornou o relatório completo.')
  }
  return data
}

export function exportReport(path, dias, filters) {
  const query = new URLSearchParams({ dias })
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value)
  return authenticatedRequest(`/relatorios/${path}/exportar?${query}`, { responseType: 'blob' })
}

export async function estoqueAtual(signal) {
  const produtos = new Map()
  for (let pagina = 0; pagina < MAX_REPORT_PAGES; pagina++) {
    const result = await api.produtos.pagina({ tipo: 'PADRAO', ativo: true, pagina, tamanho: 100, ordenarPor: 'nome', direcao: 'ASC' }, signal)
    for (const produto of result.itens) produtos.set(produto.id, produto)
    if (result.ultima !== false || !result.itens.length) return produtos
  }
  throw new Error('A consulta de estoque atual excedeu o limite máximo de páginas.')
}

export async function produtosDoHorario(referencia, diaSemana, hora, celula, signal) {
  const { de, ate, fusoHorario } = referencia
  const ids = new Set()
  let completed = false
  // O filtro de datas dos pedidos é pela criação. A conclusão é o que define a célula.
  for (let pagina = 0; pagina < MAX_REPORT_PAGES; pagina++) {
    const result = await readCash('pedidos', { status: 'CONCLUIDO', dataFim: ate, ordenarPor: 'concluidoEm', direcao: 'DESC', pagina, tamanho: 100 }, signal)
    if (!Array.isArray(result?.itens)) throw new Error('A lista de pedidos do caixa não foi retornada.')
    for (const pedido of result.itens) {
      if (pertenceAoHorario(pedido, de, ate, diaSemana, hora, fusoHorario)) ids.add(pedido.id)
    }
    const ultimo = result.itens.at(-1)
    const lastParsed = extrairDataHora(ultimo?.concluidoEm, fusoHorario)
    if (!ultimo || result.ultima !== false || (lastParsed && lastParsed.data < de)) {
      completed = true
      break
    }
  }
  if (!completed) throw new Error('A consulta de pedidos excedeu o limite máximo de páginas.')
  if (ids.size !== celula.tickets) throw new Error('Os pedidos do caixa mudaram desde a consulta. Atualize o relatório para conferir os produtos.')

  const produtos = new Map()
  const pedidos = [...ids]
  let faturamento = 0
  for (let i = 0; i < pedidos.length; i += 6) {
    const lote = await Promise.all(pedidos.slice(i, i + 6).map(id => readCash(`pedidos/${encodeURIComponent(id)}`, {}, signal)))
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
