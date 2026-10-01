/*
 * Escala de desempenho dos KPIs (semáforo).
 * Todas as faixas ficam aqui para serem calibradas com a operação real da adega.
 *
 *  ok   → dentro da meta        (verde)
 *  warn → atenção / tendência    (âmbar)
 *  bad  → fora da meta           (vermelho)
 *  neutral → informativo, sem meta
 */
export const METAS = {
  faturamentoDiario: 1400,              // R$ — média diária do mês anterior (41.750 ÷ 30)
  expediente: { abre: 10, fecha: 22 },  // horário de operação usado para medir o ritmo do dia
  ritmoFaturamento: { ok: 100, warn: 70 }, // % do esperado até agora
  saudeEstoque: { ok: 85, warn: 70 },   // % de produtos com estoque estável
  itensCriticos: { ok: 0, warn: 3 },    // nº de itens abaixo do mínimo (menor é melhor)
  taxaAjustes: { ok: 5, warn: 10 },     // % das movimentações que são ajustes (menor é melhor)
  taxaPerdas: { ok: 2, warn: 5 },       // % das saídas por quebra/vencimento (menor é melhor)
  crescimento: { ok: 5, warn: 0 },      // % vs. período anterior
  margemBruta: { ok: 35, warn: 25 },    // %
  margemLiquida: { ok: 15, warn: 8 },   // %
  cmv: { ok: 60, warn: 70 },            // % da receita (menor é melhor)
  coberturaPagar: { ok: 2, warn: 1 },   // saldo ÷ contas a pagar em 30 dias
}

/* maior é melhor */
export function toneHigher(v, { ok, warn }) {
  if (v == null || Number.isNaN(v)) return 'neutral'
  return v >= ok ? 'ok' : v >= warn ? 'warn' : 'bad'
}

/* menor é melhor */
export function toneLower(v, { ok, warn }) {
  if (v == null || Number.isNaN(v)) return 'neutral'
  return v <= ok ? 'ok' : v <= warn ? 'warn' : 'bad'
}

export const TONE_LABEL = { ok: 'Bom', warn: 'Atenção', bad: 'Crítico', neutral: '' }

export const TONE_COLOR = {
  ok: 'var(--green)',
  warn: 'var(--gold2)',
  bad: 'var(--red)',
  neutral: 'var(--gold)',
}

/* fração do expediente já decorrida (0–1); null fora do horário de operação */
export function fracaoExpediente(now = new Date(), { abre, fecha } = METAS.expediente) {
  const h = now.getHours() + now.getMinutes() / 60
  if (h < abre) return null
  return Math.min(1, (h - abre) / (fecha - abre))
}
