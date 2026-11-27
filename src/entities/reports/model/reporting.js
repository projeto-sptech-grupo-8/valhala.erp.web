export const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']   // segunda primeiro (rotina de escala)
export const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
export const MOTIVOS_PERDA = ['Perda / quebra', 'Vencimento', 'Consumo interno']

export function binOf(v, max) {
  if (!v) return 0
  return Math.min(5, 1 + Math.floor((v / max) * 5 - 1e-9))
}
