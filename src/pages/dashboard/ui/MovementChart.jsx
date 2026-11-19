import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { ArrowDownToLine, ArrowUpFromLine, Activity, CalendarDays, ChevronDown } from 'lucide-react'
import { fmtNum } from '@/shared/lib/format.js'
import { dashboardNumber } from '../model/dashboardPresentation.js'
import s from './DashboardPage.module.css'

function fullMonth(value) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')) return value || 'Mês não informado'
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + '-01T00:00:00Z'))
}
function MovementTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return <div className={s.chartTip}><strong>{fullMonth(row.mes)}</strong><small>Quantidade de lançamentos</small>{[['entradas', 'Entradas'], ['saidas', 'Saídas']].map(([key, label]) => <div className={s.tooltipValue} key={key} data-direction={key}><span><i />{label}</span><b>{dashboardNumber(row[key]) == null ? 'Não informado' : fmtNum(row[key])}</b></div>)}</div>
}
export function MovementChart({ serie }) {
  const sum = key => serie.every(row => dashboardNumber(row[key]) != null) ? serie.reduce((total, row) => total + Number(row[key]), 0) : null
  const incoming = sum('entradas'), outgoing = sum('saidas')
  const total = incoming != null && outgoing != null ? incoming + outgoing : null
  const peak = outgoing > 0 ? serie.reduce((highest, row) =>
    Number(row.saidas) >= Number(highest.saidas) ? row : highest
  ) : null
  return <>
    <div className={s.movementPlot}><div className={s.movementStats} aria-label="Resumo dos lançamentos no período">
      {[[incoming, 'Entradas', 'entradas', ArrowDownToLine], [outgoing, 'Saídas', 'saidas', ArrowUpFromLine], [total, 'Total de registros', 'total', Activity]].map(([value, label, direction, Icon]) => <div key={direction} data-direction={direction}><span><Icon size={15} aria-hidden="true" />{label}</span><strong>{value == null ? '—' : fmtNum(value)}</strong></div>)}
      {peak && <div className={s.movementPeak}>
        <span><CalendarDays size={15} aria-hidden="true" />Mês com mais saídas</span>
        <b>{fullMonth(peak.mes)}</b>
        <small>{fmtNum(peak.saidas)} {Number(peak.saidas) === 1 ? 'lançamento' : 'lançamentos'}</small>
      </div>}
    </div>
    <div className={s.plotBody}><div className={s.chartLegend} aria-label="Legenda do gráfico"><span data-direction="entradas"><i />Entradas</span><span data-direction="saidas"><i />Saídas</span><small>Nº de lançamentos</small></div>
    {total === 0 && <p className={s.chartEmpty} role="status">Nenhuma entrada ou saída registrada nos meses retornados.</p>}
    {total !== 0 && <div className={s.chartScroll} tabIndex={0} role="region" aria-label="Gráfico mensal de entradas e saídas. Role horizontalmente para consultar períodos longos.">
      <div className={s.chartCanvas} style={{ minWidth: Math.max(280, serie.length * 58) }}>
        <ResponsiveContainer width="100%" height={230}><BarChart data={serie} accessibilityLayer barGap={5} barCategoryGap="25%" margin={{ top: 14, right: 14, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" />
          <XAxis dataKey="m" tick={{ fill: 'var(--dim)', fontSize: 11 }} interval={0} tickMargin={12} axisLine={false} tickLine={false} />
          <YAxis width={42} tick={{ fill: 'var(--dim)', fontSize: 11 }} allowDecimals={false} tickMargin={8} axisLine={false} tickLine={false} />
          <Tooltip content={<MovementTooltip />} filterNull={false} cursor={{ fill: 'var(--active-bg)', radius: 6 }} />
          <Bar dataKey="entradas" name="Entradas" fill="var(--movement-in)" radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Bar dataKey="saidas" name="Saídas" fill="var(--movement-out)" radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart></ResponsiveContainer>
      </div>
    </div>}
    </div></div>
    {total !== 0 && serie.length > 6 && <p className={s.hint}>Deslize o gráfico para consultar todos os meses.</p>}
    <details className={s.chartData}><summary><ChevronDown size={15} aria-hidden="true" />Ver dados por mês</summary><div><table><caption>Contagem mensal de lançamentos de estoque</caption><thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th></tr></thead><tbody>{serie.map(row => <tr key={row.mes}><td>{fullMonth(row.mes)}</td><td>{dashboardNumber(row.entradas) == null ? '—' : fmtNum(row.entradas)}</td><td>{dashboardNumber(row.saidas) == null ? '—' : fmtNum(row.saidas)}</td></tr>)}</tbody></table></div></details>
    <p className={s.hint}>O gráfico conta registros; não soma unidades com mililitros. O mês atual pode estar em andamento.</p>
  </>
}
