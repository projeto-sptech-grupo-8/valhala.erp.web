import { CalendarClock, ChevronRight } from 'lucide-react'
import { ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { dashboardNumber } from '../model/dashboardPresentation.js'
import { fmtBRL, fmtNum } from '@/shared/lib/format.js'
import s from './DashboardPage.module.css'

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })

const bands = [
  ['vencidos', 'Lotes vencidos', 'VENCIDO', 'var(--red)'],
  ['vencemEm7Dias', 'De hoje a 7 dias', 'VENCE_EM_7_DIAS', '#e58b40'],
  ['vencemEm30Dias', 'De 8 a 30 dias', 'VENCE_EM_30_DIAS', 'var(--gold2)'],
  ['semValidade', 'Sem validade', 'SEM_VALIDADE', 'var(--dim)'],
]

function ExpiryBand({ row, max, navigate }) {
  const { label, situation, color, value } = row
  return <button type="button" onClick={() => navigate('validades', { situacao: situation })}
    title={'Consultar lotes · ' + label}
    data-priority={value > 0 ? situation : undefined}
    style={{ '--expiry-band-color': value > 0 ? color : 'var(--dim)' }}>
    <i aria-hidden="true" style={{ background: 'var(--expiry-band-color)' }} />
    <span>{label}</span>
    <strong>{value == null ? '—' : fmtNum(value)}</strong>
    <ChevronRight size={14} aria-hidden="true" />
    {value != null && <span className={s.bar} aria-hidden="true">
      <i style={{ width: (100 * value / max) + '%', background: color }} />
    </span>}
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
  const rows = [
    ...bands.map(([, label, situation, color], index) => ({ label, situation, color, value: bandCounts[index] })),
    { label: 'Validade acima de 30 dias', situation: 'VALIDO', color: 'var(--green)', value: laterLots },
  ]
  const maxBandCount = Math.max(1, ...rows.map(({ value }) => value ?? 0))
  const distribution = [
    { label: 'Exigem atenção', count: attentionLots, color: 'var(--gold)' },
    { label: 'Acima de 30 dias', count: laterLots, color: 'var(--green)' },
    { label: 'Sem validade', count: bandCounts[3], color: 'var(--dim)' },
  ]
  return <article className={'card ' + s.card + ' ' + s.expiryCard} aria-label="Resumo de validades">
    <header className={s.cardHeading}><h3><CalendarClock size={18} />Validades dos lotes</h3>
      <button onClick={() => navigate('validades')}>Ver validades</button></header>
    {query.loading ? <LoadingBlock label="Consultando resumo de validades…" /> : query.error ? <ErrorBlock error={query.error} onRetry={query.reload} /> :
      <>
        <div className={s.expiryShortcuts} aria-label="Prioridades de validade">
          {rows.slice(0, 2).map(({ value, situation, color }, index) => {
            const singular = value === 1
            const label = index === 0 ? (singular ? 'lote vencido' : 'lotes vencidos') : (singular ? 'vence em até 7 dias' : 'vencem em até 7 dias')
            return <button key={situation} type="button" onClick={() => navigate('validades', { situacao: situation })}
              style={{ '--expiry-band-color': value > 0 ? color : 'var(--dim)' }}>
              <strong>{value == null ? '—' : fmtNum(value)}</strong> {label}<ChevronRight size={15} aria-hidden="true" />
              {value != null && <span className={s.shortcutBar} aria-hidden="true"><i style={{ width: (100 * value / maxBandCount) + '%' }} /></span>}
            </button>
          })}
        </div>
        <dl className={s.expiryCosts} aria-label="Custos por validade">
          {costs.map(({ label, value, tone }) => (
            <div key={label} data-tone={value > 0 ? tone : undefined}>
              <dt>{label}</dt>
              <dd>{value == null ? '—' : fmtBRL(value)}</dd>
            </div>
          ))}
        </dl>
        <div className={s.expiryBands}>{rows.slice(2).map(row => (
          <ExpiryBand key={row.situation} row={row} max={maxBandCount} navigate={navigate} />
        ))}</div>
        {totalLots > 0 && laterLots != null && <details className={s.expiryDistribution}>
          <summary>Ver distribuição</summary>
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
        <p className={s.expiryContext}>
          <span>{totalLots == null ? 'Lotes com saldo' : <><strong>{fmtNum(totalLots)}</strong> lotes com saldo</>} de produtos ativos</span>
          {data?.referencia && <span className={s.expiryReference}>
            Referência <time dateTime={data.referencia}>{data.referencia.split('-').reverse().join('/')}</time>
          </span>}
        </p>
      </>}
  </article>
}
