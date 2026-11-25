import { useId } from 'react'
import { CircleHelp } from 'lucide-react'
import { LIMITE_FALTA_RECORRENTE, METAS, PRIORIDADES_ABC, TONE_COLOR } from '@/entities/reports'
import ui from './PageHeader.module.css'

const corPorTom = { ok: 'verde', warn: 'amarelo', bad: 'vermelho' }
const desempenho = [
  { tone: 'ok', label: 'Bom', description: 'O indicador atingiu a meta.' },
  { tone: 'warn', label: 'Médio', description: 'O indicador está na faixa de atenção.' },
  { tone: 'bad', label: 'Ruim', description: 'O indicador ficou fora do limite aceito.' },
]

function metaMinima({ ok, warn }, unidade = '%') {
  return `Bom a partir de ${ok}${unidade}. Médio de ${warn}${unidade} a menos de ${ok}${unidade}. Ruim abaixo de ${warn}${unidade}.`
}

function metaMaxima({ ok, warn }, referencia) {
  return `Bom até ${ok}% ${referencia}. Médio acima de ${ok}% até ${warn}%. Ruim acima de ${warn}%.`
}

const margensECustos = [
  ['Margem bruta', metaMinima(METAS.margemBruta)],
  ['Custo das mercadorias vendidas (CMV)', metaMaxima(METAS.cmv, 'da receita')],
]
const faixasFinanceiro = [
  ['Saldo em caixa em relação às contas a pagar em 30 dias', metaMinima(METAS.coberturaPagar, '×')],
  ['Contas a pagar', 'Bom quando tudo está em dia e nada vence nos próximos 7 dias. Médio quando há contas a vencer em até 7 dias. Ruim quando há conta vencida.'],
  ['Crescimento do faturamento em relação ao mês anterior', metaMinima(METAS.crescimento)],
  ['Participação nas vendas por categoria', metaMinima(METAS.participacaoCategoria)],
  ['Margem líquida', metaMinima(METAS.margemLiquida)],
  ...margensECustos,
]
const faixasRelatorios = [
  ...margensECustos,
  ['Falta de estoque', `Verde para 0 dias registrados. Amarelo quando faltou em até ${LIMITE_FALTA_RECORRENTE}% dos dias. Vermelho quando faltou em mais de ${LIMITE_FALTA_RECORRENTE}% dos dias.`],
  ['Perdas no período', metaMaxima(METAS.perdasFaturamento, 'do faturamento')],
]

function Legenda({ tone, label, description }) {
  const color = TONE_COLOR[tone]
  return (
    <span className={ui.legendRow}>
      <span className={ui.legendDot} style={{ background: color }} aria-hidden="true" />
      <span>
        <strong style={{ color }}>{label} · {corPorTom[tone]}</strong>
        {description && <span>{description}</span>}
      </span>
    </span>
  )
}

export function FinanceMetricsHelp({ reports }) {
  const id = useId()
  return (
    <span className={ui.help + ' ' + ui.metricsHelpAnchor}>
      <button type="button" className={ui.helpButton} aria-describedby={id}
        aria-label={reports ? 'Sobre as classes ABC e os indicadores dos relatórios' : 'Sobre os indicadores financeiros'}>
        <CircleHelp size={19} aria-hidden="true" />
      </button>
      <span id={id} role="tooltip" className={ui.helpText + ' ' + ui.metricsHelp}>
        {reports && (
          <>
            <strong className={ui.legendTitle}>Prioridade na Curva ABC</strong>
            <span className={ui.legendIntro}>Os produtos são ordenados por faturamento, com faixas de 80% e 95% do total acumulado.</span>
            {Object.entries(PRIORIDADES_ABC).map(([classe, { tone, label }]) => (
              <Legenda key={classe} tone={tone} label={`Classe ${classe} · ${label}`} />
            ))}
          </>
        )}
        <strong className={ui.legendTitle + (reports ? ' ' + ui.metricsHelpSection : '')}>Desempenho dos indicadores</strong>
        {desempenho.map(item => <Legenda key={item.tone} {...item} />)}
        <span className={ui.metricsHelpSection}>
          <strong className={ui.legendTitle}>Faixas de referência</strong>
          {(reports ? faixasRelatorios : faixasFinanceiro).map(([label, description]) => (
            <span className={ui.metricsHelpRule} key={label}>
              <strong>{label}</strong>
              <span>{description}</span>
            </span>
          ))}
        </span>
      </span>
    </span>
  )
}
