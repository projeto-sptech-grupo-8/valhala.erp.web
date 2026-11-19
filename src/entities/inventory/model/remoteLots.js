export const LOT_STATES = {
  VENCIDO: { label: 'Vencido', tone: 'bad' },
  VENCE_EM_7_DIAS: { label: 'Vence em até 7 dias', tone: 'warn' },
  VENCE_EM_30_DIAS: { label: 'Vence entre 8 e 30 dias', tone: 'warn' },
  VALIDO: { label: 'Validade acima de 30 dias', tone: 'ok' },
  SEM_VALIDADE: { label: 'Sem validade', tone: 'off' },
}
export const lotDate = value => value ? value.split('-').reverse().join('/') : 'Não informada'
export function lotDeadline(days) {
  if (days == null) return 'Sem data de validade'
  if (days < 0) return 'Vencido há ' + Math.abs(days) + ' dia(s)'
  if (days === 0) return 'Vence hoje'
  return 'Vence em ' + days + ' dia(s)'
}
export function expiryFilter(value) {
  return value === 'atencao' ? { venceEmDias: 30 } : value === 'todos' ? {} : { situacao: value }
}
export function lossBody(lot) {
  if (!lot?.produtoId || !Number.isInteger(Number(lot.id)) || Number(lot.id) <= 0 || !Number.isFinite(Number(lot.quantidadeAtual)) || !(Number(lot.quantidadeAtual) > 0) || lot.situacao !== 'VENCIDO') throw new Error('Selecione um lote vencido com saldo positivo.')
  return { produtoId: lot.produtoId, loteId: Number(lot.id), tipo: 'PERDA', quantidade: Number(lot.quantidadeAtual), motivo: 'Perda por vencimento do lote ' + lot.codigo }
}
