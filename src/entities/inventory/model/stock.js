/* ─── Regras de estoque ───
 * Funções puras: recebem a lista de produtos (da store) em vez de ler o mock,
 * para refletir vendas e movimentações em tempo real.
 */
export function getStatus(p) {
  if (p.qty <= 0) return 'Zerado'
  if (p.qty < p.min) return 'Crítico'
  if (p.qty < p.min * 1.5) return 'Baixo'
  return 'Estável'
}
