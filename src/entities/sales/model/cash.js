/* ─── Regras da sessão de caixa (RF08) ─── */
const round = (n) => Math.round(n * 1000) / 1000

export const FORMAS = ['Pix', 'Crédito', 'Débito', 'Dinheiro']

/* Totais da sessão de caixa por forma de pagamento */
export function caixaResumo(caixa, sales) {
  const vendas = sales.filter(s => s.caixaId === caixa.id)
  const porForma = Object.fromEntries(FORMAS.map(f => [f, 0]))
  for (const v of vendas) {
    for (const p of v.pagamentos) porForma[p.forma] = (porForma[p.forma] || 0) + p.valor
    porForma.Dinheiro -= v.troco || 0
  }
  const sangrias = caixa.movs.filter(m => m.tipo === 'Sangria').reduce((a, m) => a + m.valor, 0)
  const reforcos = caixa.movs.filter(m => m.tipo === 'Reforço').reduce((a, m) => a + m.valor, 0)
  const totalVendas = vendas.reduce((a, v) => a + v.total, 0)
  return {
    qtdVendas: vendas.length,
    totalVendas: round(totalVendas),
    porForma,
    sangrias,
    reforcos,
    dinheiroEsperado: round(caixa.valorInicial + porForma.Dinheiro + reforcos - sangrias),
  }
}
