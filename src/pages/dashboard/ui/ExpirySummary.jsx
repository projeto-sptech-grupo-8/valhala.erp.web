import { CalendarClock, ChevronDown, ChevronRight, ChartPie } from 'lucide-react'
import { ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { dashboardNumber } from '../model/dashboardPresentation.js'
import { fmtBRL, fmtNum } from '@/shared/lib/format.js'
import s from './DashboardPage.module.css'

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })

const bands = [
  ['vencidos', 'Lotes vencidos', 'VENCIDO', 'var(--red)'],
  ['vencemEm7Dias', 'Vencem em até 7 dias', 'VENCE_EM_7_DIAS', 'var(--gold2)'],
  ['vencemEm30Dias', 'De 8 a 30 dias', 'VENCE_EM_30_DIAS', 'var(--gold2)'],
  ['semValidade', 'Sem validade', 'SEM_VALIDADE', 'var(--dim)'],
]

function ExpiryBand({ row, navigate }) {
  const { label, situation, color, value } = row
  return <button type="button" onClick={() => navigate('validades', { situacao: situation })}
    data-priority={value > 0 ? situation : undefined}
    style={{ '--expiry-band-color': value > 0 ? color : 'var(--dim)' }}>
    <i aria-hidden="true" style={{ background: 'var(--expiry-band-color)' }} />
    <span>{label}</span>
    <strong>{value == null ? '—' : fmtNum(value)}</strong>
    <ChevronRight size={14} aria-hidden="true" />
  </button>
}

export function ExpirySummary({ query, navigate }) {
  const data = query.data
  const expiredCost = dashboardNumber(data?.valorVencido)
  const riskCost = dashboardNumber(data?.valorEmRisco)
  const upcomingCost = riskCost != null && expiredCost != null && riskCost >= expiredCost
    ? riskCost - expiredCost
    : null
  const costs = [
    { label: 'Custo dos lotes vencidos', value: expiredCost, tone: 'expired' },
    { label: 'Custo a vencer em até 30 dias', value: upcomingCost, tone: 'upcoming' },
  ]
  const bandCounts = bands.map(([key]) => dashboardNumber(data?.[key]))
  const attentionCounts = bandCounts.slice(0, 3)
  const attentionLots = attentionCounts.every(count => count != null)
    ? attentionCounts.reduce((total, count) => total + count, 0)
    : null
  const totalLots = dashboardNumber(data?.lotesComSaldo)
  const coveredLots = bandCounts.every(count => Number.isInteger(count) && count >= 0)
    ? bandCounts.reduce((total, count) => total + count, 0)
    : null
  const laterLots = totalLots != null && coveredLots != null && totalLots >= coveredLots
    ? totalLots - coveredLots
    : null
  const [expired, thisWeek, thisMonth, undated] = bands.map(([, label, situation, color], index) => ({ label, situation, color, value: bandCounts[index] }))
  const later = { label: 'Validade acima de 30 dias', situation: 'VALIDO', color: 'var(--green)', value: laterLots }
  const distribution = [
    { label: 'Exigem atenção', count: attentionLots, color: 'var(--gold)' },
    { label: 'Acima de 30 dias', count: laterLots, color: 'var(--green)' },
    { label: 'Sem validade', count: bandCounts[3], color: 'var(--dim)' },
  ]
  return <article className={'card ' + s.card} aria-label="Resumo de validades">
    <header className={s.cardHeading}><h3><CalendarClock size={18} aria-hidden="true" />Validade dos lotes</h3>
      <button type="button" onClick={() => navigate('validades')}>Ver validades</button></header>
    {query.loading ? <LoadingBlock label="Consultando resumo de validades…" /> : query.error ? <ErrorBlock error={query.error} onRetry={query.reload} /> :
      <>
        <p className={s.cardContext}>
          <span>{totalLots == null ? 'Lotes com saldo' : <><strong>{fmtNum(totalLots)}</strong> lotes com saldo</>} de produtos ativos</span>
          {data?.referencia && <span>Referência <time dateTime={data.referencia}>{data.referencia.split('-').reverse().join('/')}</time></span>}
        </p>
        <div className={s.expiryBands} aria-label="Situação dos lotes" role="group">
          {[expired, thisWeek, thisMonth, later, undated].map(row => (
            <ExpiryBand key={row.situation} row={row} navigate={navigate} />
          ))}
        </div>
        <section className={s.expiryCostSection}>
          <h4>Custos por validade</h4>
          <dl className={s.expiryCosts}>
            {costs.map(({ label, value, tone }) => (
              <div key={label} data-tone={value > 0 ? tone : undefined}>
                <dt>{label}</dt>
                <dd>{value == null ? '—' : fmtBRL(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
        {totalLots > 0 && laterLots != null && <details className={s.cardDisclosure}>
          <summary><ChartPie size={16} aria-hidden="true" /><span>Ver distribuição</span><ChevronDown size={15} aria-hidden="true" /></summary>
          <div className={s.expiryDistributionBar} aria-hidden="true">
            {distribution.filter(group => group.count > 0).map(({ label, count, color }) => (
              <span key={label} style={{ flexGrow: count, background: color }} />
            ))}
          </div>
          <dl className={s.expiryDistributionLegend} aria-label="Distribuição dos lotes com saldo">
            {distribution.map(({ label, count, color }) => (
              <div key={label}>
                <dt><i aria-hidden="true" style={{ background: color }} />{label}</dt>
                <dd>{percent.format(count / totalLots)}</dd>
              </div>
            ))}
          </dl>
        </details>}
      </>}
  </article>
}
