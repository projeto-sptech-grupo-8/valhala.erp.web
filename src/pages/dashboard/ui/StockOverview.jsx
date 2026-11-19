import { useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowLeftRight, ArrowUp, BarChart3, CalendarX, Download, Gauge, PackageX, ShieldCheck } from 'lucide-react'
import { MovementTypeBadge } from '@/entities/inventory/ui/MovementTypeBadge.jsx'
import { api } from '@/shared/api/api.js'
import { downloadCSV, stamp } from '@/shared/lib/csv.js'
import { Meter } from '@/shared/ui/primitives/ui.jsx'
import { fmtNum } from '@/shared/lib/format.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { dashboardDate, dashboardHealth, dashboardNumber } from '../model/dashboardPresentation.js'
import { OverviewStat, OverviewToolbar } from './OverviewControls.jsx'
import { ExpirySummary } from './ExpirySummary.jsx'
import { MovementChart } from './MovementChart.jsx'
import s from './DashboardPage.module.css'

const formatCount = value => value == null ? '—' : fmtNum(value)
const alertColor = value => value == null ? 'neutral' : value > 0 ? 'bad' : 'info'

export function StockOverview({ navigate, headerTarget }) {
  const toast = useToast()
  const [months, setMonths] = useState(6)
  const summary = useQueryResource(async signal => {
    const data = await api.dashboard.resumo(months, signal)
    if (!data?.estoque || !data?.movimentacoes) throw new Error('O servidor não retornou o resumo completo de estoque e movimentações.')
    return data
  }, [months])
  const expiry = useQueryResource(signal => api.lotes.resumo(signal), [])
  const data = !summary.loading && !summary.error ? summary.data : null
  const stock = data?.estoque
  const alerts = stock?.alertas?.slice(0, 5) || []
  const recent = data?.ultimasMovimentacoes?.slice(0, 5) || []
  const serie = data?.serieMensal || []
  const ids = [...new Set([...alerts, ...recent].map(row => row.produtoId).filter(Boolean))]
  const units = useQueryResource(async signal => {
    const result = {}
    for (let i = 0; i < ids.length; i += 2) {
      await Promise.all(ids.slice(i, i + 2).map(async id => {
        try {
          const product = await api.produtos.obter(id, signal)
          result[id] = product.fracionado ? 'ml' : product.unit || null
        } catch (error) {
          if (signal.aborted) throw error
          result[id] = null
        }
      }))
    }
    return result
  }, [ids, data?.geradoEm])
  function quantity(id, value) {
    if (dashboardNumber(value) == null) return '—'
    return fmtNum(value) + ' ' + ((!units.loading && units.data?.[id]) || '(unidade-base)')
  }
  function exportChart() {
    downloadCSV('movimentacao-estoque-' + stamp(), ['Mês', 'Entradas (lançamentos)', 'Saídas (lançamentos)'],
      serie.map(row => [row.mes, row.entradas ?? '', row.saidas ?? '']))
    toast('Arquivo CSV gerado com a série retornada pelo servidor.', { title: 'Exportação concluída' })
  }
  const critical = dashboardNumber(stock?.criticos)
  const zero = dashboardNumber(stock?.zerados)
  const health = dashboardHealth(stock)
  const stockTotal = dashboardNumber(stock?.totalProdutos)
  const withMinimum = dashboardNumber(stock?.produtosComMinimoDefinido)
  const withoutMinimum = dashboardNumber(stock?.produtosSemMinimoDefinido)
  const coverage = stockTotal > 0 && withMinimum != null && withMinimum >= 0 && withMinimum <= stockTotal
    ? Math.round(100 * withMinimum / stockTotal)
    : null
  const expired = expiry.loading || expiry.error ? null : dashboardNumber(expiry.data?.vencidos)
  const healthy = dashboardNumber(stock?.saudaveis)
  const nearMinimum = [withMinimum, critical, healthy].every(count => Number.isInteger(count) && count >= 0)
    && critical + healthy <= withMinimum ? withMinimum - critical - healthy : null
  const minimumBands = [
    { label: 'Críticos', description: 'Abaixo do mínimo', count: critical, tone: 'critical' },
    { label: 'Próximos do mínimo', description: 'Do mínimo a menos de 1,5×', count: nearMinimum, tone: 'near' },
    { label: 'Saudáveis', description: 'A partir de 1,5× o mínimo', count: healthy, tone: 'healthy' },
  ]
  const busy = summary.loading || expiry.loading
  return <>
    <OverviewToolbar target={headerTarget} title="Estoque do estabelecimento"
      detail={data && 'Atualizado em ' + dashboardDate(data.geradoEm) + (data.referencia?.fusoHorario ? ' · ' + data.referencia.fusoHorario : '')}
      busy={busy} refresh={() => { summary.reload(); expiry.reload() }} />
    {summary.error && <ErrorBlock error={summary.error} onRetry={summary.reload} />}
    <section className={'stats ' + s.stats} aria-label="Indicadores da operação" aria-busy={busy}>
      <OverviewStat icon={AlertTriangle} label="Estoque crítico" value={formatCount(critical)} accent={alertColor(critical)}
        description="Produtos abaixo do mínimo, incluindo os zerados." />
      <OverviewStat icon={PackageX} label="Produtos zerados" value={formatCount(zero)} accent={alertColor(zero)}
        description="Produtos com mínimo definido e saldo zerado." />
      <OverviewStat icon={ShieldCheck} label="Saúde do estoque" value={health.percent == null ? '—' : health.percent + '%'} accent={health.tone} progress={health.percent}
        description={stock?.produtosComMinimoDefinido === 0 ? 'Nenhum produto com mínimo definido para avaliar.' : stock?.saudaveis != null && stock?.produtosComMinimoDefinido != null ? stock.saudaveis + ' de ' + stock.produtosComMinimoDefinido + ' produtos com mínimo estão saudáveis.' : 'Produtos saudáveis entre os que têm mínimo.'}
        help="O saldo saudável é de pelo menos 1,5 vez o mínimo. Verde a partir de 75%, amarelo de 25% a menos de 75% e vermelho abaixo de 25%." />
      <OverviewStat icon={CalendarX} label="Lotes vencidos" value={formatCount(expired)} accent={alertColor(expired)} description="Lotes de produtos ativos com saldo e validade passada." />
    </section>
    <div className={s.grid}>
        <article className={'card ' + s.card} aria-label="Alertas prioritários de estoque">
          <header className={s.cardHeading}><h3><AlertTriangle size={18} />Prioridades de reposição</h3><button onClick={() => navigate('reposicao')}>Ver reposição</button></header>
          {stock && <section className={s.stockCoverage} aria-label="Cobertura do estoque mínimo">
            <header className={s.coverageHeading}>
              <h4><Gauge size={15} aria-hidden="true" />Cobertura do estoque mínimo</h4>
              <strong>{coverage == null ? '—' : coverage + '%'}</strong>
            </header>
            {coverage != null && <Meter pct={coverage} label="Produtos com mínimo definido" />}
            {coverage == null
              ? <p>{stockTotal === 0 ? 'Nenhum produto ativo com estoque.' : 'Cobertura indisponível.'}</p>
              : <p className={s.coverageLegend}>
                <span><i aria-hidden="true" />{fmtNum(withMinimum)} de {fmtNum(stockTotal)} com mínimo</span>
                <span><i aria-hidden="true" />{formatCount(withoutMinimum)} sem mínimo</span>
              </p>}
            {withMinimum > 0 && <div className={s.minimumBreakdown}>
              <h5>Entre os produtos com mínimo</h5>
              <dl className={s.minimumBands} aria-label="Situação dos produtos com mínimo definido">
                {minimumBands.map(({ label, description, count, tone }) => (
                  <div key={tone} data-tone={count > 0 ? tone : undefined}>
                    <dt>{label}</dt>
                    <dd>{formatCount(count)}</dd>
                    <dd className={s.minimumBandDescription}>{description}</dd>
                  </div>
                ))}
              </dl>
            </div>}
          </section>}
          {summary.loading ? <LoadingBlock label="Consultando alertas prioritários…" /> : summary.error ? <p className={s.empty}>Alertas indisponíveis.</p> :
            alerts.length ? <ul className={s.alerts}>{alerts.map(row => {
              const min = dashboardNumber(row.estoqueMinimo), balance = dashboardNumber(row.quantidadeAtual)
              const missing = min == null || balance == null ? null : Math.max(0, min - balance)
              const zeroBalance = row.status === 'ZERADO'
              return <li key={row.produtoId}>
                <span>
                  <span className={s.alertName}>
                    <strong>{row.nome}</strong>
                    <span className={s.alertStatus} data-zero={zeroBalance}>{zeroBalance ? 'Zerado' : 'Crítico'}</span>
                  </span>
                  <small>{row.categoria || 'Categoria não informada'} · Mínimo: {quantity(row.produtoId, min)}</small>
                </span>
                <span className={s.balance} data-zero={zeroBalance}>
                  <span className={s.alertCurrent}><small>Saldo atual</small><b>{quantity(row.produtoId, balance)}</b></span>
                  <small>Falta para o mínimo: {quantity(row.produtoId, missing)}</small>
                </span>
              </li>
            })}</ul> : <p className={s.empty}>Nenhum alerta retornado nesta consulta.</p>}
          {stock && <p className={s.hint}>{alerts.length} alerta(s) exibido(s){critical != null && ' de ' + critical + ' produto(s) em alerta'}. Até cinco prioridades por consulta.</p>}
          {stock && !units.loading && Object.values(units.data || {}).includes(null) && <p className={s.unitWarning}>Algumas unidades não puderam ser confirmadas. As quantidades estão em unidade-base.</p>}
        </article>
        <ExpirySummary query={expiry} navigate={navigate} />

        <article className={'card ' + s.card + ' ' + s.wide} aria-label="Série de movimentações">
          <header className={s.cardHeading}>
            <h3><BarChart3 size={18} />Movimentação de estoque · {months} meses</h3>
            <div className={s.chartControls}>
              <label>Período do gráfico<select aria-label="Período do gráfico" value={months} onChange={event => setMonths(Number(event.target.value))}>
                {[3, 6, 9, 12].map(n => <option key={n} value={n}>{n} meses</option>)}
              </select></label>
              <button disabled={!serie.length} onClick={exportChart}><Download size={14} />Exportar</button>
            </div>
          </header>
          {summary.loading ? <LoadingBlock label="Carregando série de movimentações…" /> : summary.error ? <p className={s.empty}>Série indisponível.</p> :
            serie.length ? <MovementChart serie={serie} /> : <p className={s.empty}>Nenhuma série retornada para este período.</p>}
        </article>
        <article className={'card ' + s.card + ' ' + s.wide} aria-label="Últimas movimentações">
          <header className={s.cardHeading}><h3><ArrowLeftRight size={18} />Últimas movimentações</h3><button onClick={() => navigate('movimentacoes')}>Ver todas</button></header>
          <p className={s.hint}>Até cinco registros recentes, independentemente do período do gráfico.</p>
          {summary.loading ? <LoadingBlock label="Carregando últimas movimentações…" /> : summary.error ? <p className={s.empty}>Movimentações indisponíveis.</p> : recent.length ?
            <>
              <div className={s.feedHeading} aria-hidden="true">
                <span>Produto</span><span>Movimentação</span><span>Data e hora</span><span>Operador</span><span>Quantidade</span>
              </div>
              <ul className={s.feed}>{recent.map(row => {
                const incoming = row.direcao === 'ENTRADA'
                const outgoing = row.direcao === 'SAIDA'
                const Icon = incoming ? ArrowUp : outgoing ? ArrowDown : ArrowLeftRight
                const tone = row.tipo === 'PERDA' ? 'negative' : incoming ? 'positive' : outgoing ? 'outgoing' : 'neutral'
                const amount = quantity(row.produtoId, row.quantidade)
                const sign = amount === '—' ? '' : incoming ? '+' : outgoing ? '−' : ''
                return <li key={row.id}>
                  <span className={s.feedProduct}>
                    <span className={s.direction} data-tone={tone}><Icon size={15} aria-hidden="true" /></span>
                    <strong>{row.produtoNome || 'Produto não informado'}</strong>
                  </span>
                  <span className={s.feedKind}><MovementTypeBadge type={row.tipo} /></span>
                  <span className={s.feedDate}>{dashboardDate(row.ocorridoEm)}</span>
                  <span className={s.feedOperator}><span className={s.feedBy}>Por </span>{row.operador || 'Operador não informado'}</span>
                  <strong className={s.quantity} data-tone={tone}>{sign}{amount}</strong>
                </li>
              })}</ul>
            </> : <p className={s.empty}>Nenhuma movimentação retornada.</p>}
        </article>
    </div>
  </>
}
