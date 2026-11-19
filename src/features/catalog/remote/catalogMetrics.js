// Pure business rules; quantities and stock must use the same base unit.
export function marginMetric(price, cost) {
  if (!Number.isFinite(Number(price)) || !Number.isFinite(Number(cost)) || !(Number(price) > 0) || !(Number(cost) > 0)) return { tone: 'neutral', label: 'Sem custo/preço', value: null }
  const value = (Number(price) - Number(cost)) / Number(price) * 100
  return { value, tone: value < 0 ? 'red' : value < 20 ? 'orange' : value < 40 ? 'yellow' : 'green', label: value < 0 ? 'Abaixo do custo' : value < 20 ? 'Baixa' : value < 40 ? 'Intermediária' : 'Alta' }
}

export function coverageMetric(stock, outgoing) {
  if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(outgoing) || outgoing < 0) return { value: null, tone: 'neutral', label: 'Indisponível' }
  if (outgoing === 0) return { value: null, tone: 'neutral', label: 'Sem giro' }
  const value = stock / (outgoing / 30)
  return { value, tone: value < 7 ? 'red' : value <= 30 ? 'yellow' : value <= 60 ? 'green' : 'orange', label: value < 7 ? 'Reposição urgente' : value <= 30 ? 'Acompanhar' : value <= 60 ? 'Faixa proposta' : 'Possível excesso' }
}

function localDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
// Last 30 complete local calendar days, excluding the incomplete current day.
export function turnoverPeriod(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  return { dataInicial: localDate(start), dataFinal: localDate(end) }
}

export async function loadTurnover(product, period, fetchPage, signal) {
  if (product.tipo === 'drink') return { unavailable: 'O histórico repete o preparo por ingrediente e não fornece um identificador único do preparo. Não é possível somar drinks sem risco de duplicação.' }
  let outgoing = 0
  const seen = new Set()
  const expectedUnit = product.fracionado ? 'ML' : String(product.unit || 'un').trim().toUpperCase()
  for (let pagina = 0; pagina < 10; pagina++) {
    signal?.throwIfAborted()
    const page = await fetchPage({ produtoId: product.id, ...period, pagina, tamanho: 100, ordenarPor: 'ocorridoEm', direcao: 'DESC' }, signal)
    if (!Array.isArray(page?.itens) || typeof page.ultima !== 'boolean') throw new Error('Resposta de movimentações incompleta.')
    for (const m of page.itens) {
      const day = String(m.ocorridoEm || '').slice(0, 10)
      if (m.produtoId !== product.id || day < period.dataInicial || day > period.dataFinal) continue
      if (!['SAIDA', 'SAIDA_DRINK'].includes(m.tipo)) continue
      if (!m.id || seen.has(m.id)) throw new Error('Histórico alterado durante a consulta. Atualize para tentar novamente.')
      seen.add(m.id)
      if (String(m.unidadeEstoque || '').trim().toUpperCase() !== expectedUnit || !Number.isFinite(Number(m.quantidade)) || Number(m.quantidade) <= 0) throw new Error('Quantidade ou unidade de movimentação incompatível.')
      outgoing += Number(m.quantidade)
    }
    if (page.ultima) return { outgoing, coverage: coverageMetric(product.quantidadeEstoqueBase, outgoing) }
  }
  return { unavailable: 'Histórico acima do limite de 1.000 movimentações por produto. A soma parcial não é exibida.' }
}
