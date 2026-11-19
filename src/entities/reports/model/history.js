/*
 * Constantes e histórico dos relatórios. O back ainda não expõe vendas/perdas históricas
 * (GET /relatorios/...), então o histórico vem vazio: os relatórios usam só as vendas do caixa
 * registradas neste navegador.
 */
export const CANAIS = ['Balcão', 'Mesa', 'Delivery']
export const MOTIVOS_PERDA = ['Perda / quebra', 'Vencimento', 'Consumo interno']

export function getHistorico() {
  return { sales: [], ruptura: {}, rupturaDiaria: [], perdas: [], dias: 90 }
}
