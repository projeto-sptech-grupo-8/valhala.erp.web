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
  crescimento: { ok: 5, warn: 0 },      // % vs. período anterior
  margemBruta: { ok: 35, warn: 25 },    // %
  margemLiquida: { ok: 15, warn: 8 },   // %
  cmv: { ok: 60, warn: 70 },            // % da receita (menor é melhor)
  coberturaPagar: { ok: 2, warn: 1 },   // saldo ÷ contas a pagar em 30 dias
  perdasFaturamento: { ok: 1, warn: 2 }, // custo das perdas ÷ faturamento, em %
  participacaoCategoria: { ok: 50, warn: 20 }, // % do total em vendas por categoria
}

export const LIMITE_FALTA_RECORRENTE = 10 // % dos dias do período, exclusivo

export const PRIORIDADES_ABC = {
  A: { tone: 'bad', label: 'Alta prioridade' },
  B: { tone: 'warn', label: 'Média prioridade' },
  C: { tone: 'ok', label: 'Baixa prioridade' },
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

export const TONE_COLOR = {
  ok: 'var(--green)',
  warn: 'var(--gold2)',
  bad: 'var(--red)',
  neutral: 'var(--gold)',
}
