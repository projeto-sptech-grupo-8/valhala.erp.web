import { ArrowRight, Banknote, CircleDollarSign, CreditCard, Receipt, Wallet } from 'lucide-react'
import { readCash } from '@/entities/sales/api/cashApi.js'
import { fmtBRL, fmtNum } from '@/shared/lib/format.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { ErrorBlock, LoadingBlock, Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { dashboardDate, dashboardNumber, DASHBOARD_PAYMENT_FORMS } from '../model/dashboardPresentation.js'
import { TurnPayments } from './TurnPayments.jsx'
import { OverviewStat, OverviewToolbar } from './OverviewControls.jsx'
import s from './DashboardPage.module.css'

const money = value => dashboardNumber(value) == null ? '—' : fmtBRL(value)

export function CashOverview({ navigate, headerTarget }) {
  const cash = useQueryResource(async signal => {
    const session = await readCash('sessoes/atual', {}, signal)
    if (session != null && (!session.id || session.status !== 'ABERTA')) throw new Error('O servidor não retornou uma sessão aberta válida para o operador.')
    return session
  }, [])
  const turn = !cash.loading && !cash.error ? cash.data : null
  const totals = turn?.resumoAtual
  const received = dashboardNumber(totals?.totalVendas)
  const orders = dashboardNumber(totals?.qtdVendas)
  const average = orders > 0 && received != null ? received / orders : null
  return <>
    <OverviewToolbar target={headerTarget} title={turn ? (turn.caixaNome || 'Caixa do operador') + ' · Aberto' : 'Caixa do operador'}
      detail={turn && (turn.operadorNome || 'Operador não informado') + ' · Abertura em ' + dashboardDate(turn.abertaEm)}
      busy={cash.loading} refresh={cash.reload} />
    {cash.loading ? <LoadingBlock label="Consultando o turno do operador…" /> :
      cash.error ? <ErrorBlock error={cash.error} onRetry={cash.reload} /> :
      !turn ? <section className={'card ' + s.cashEmpty} aria-labelledby="cash-overview-no-turn">
        <div className={s.cashEmptyIcon}><Wallet size={24} aria-hidden="true" /></div>
        <div className={s.cashEmptyCopy}>
          <h2 id="cash-overview-no-turn">Sem turno aberto</h2>
          <p>Ao abrir um turno no Caixa, você poderá acompanhar aqui os recebimentos e o dinheiro esperado na gaveta.</p>
        </div>
        <button type="button" className="gold" onClick={() => navigate('caixa')}>
          Ir para o caixa <ArrowRight size={16} aria-hidden="true" />
        </button>
      </section> :
      !totals ? <Notice tone="info">O servidor não informou o resumo financeiro deste turno.</Notice> :
      <>
        <section className={'stats ' + s.stats} aria-label="Indicadores da operação">
          <OverviewStat icon={CreditCard} label="Recebido no turno" value={money(received)} accent={received == null ? 'neutral' : received > 0 ? 'ok' : 'info'}
            description="Pagamentos aprovados desde a abertura." />
          <OverviewStat icon={Receipt} label="Pedidos com pagamento" value={orders == null ? '—' : fmtNum(orders)} accent={orders == null ? 'neutral' : 'info'}
            description="Cada pedido conta uma vez, mesmo com pagamento dividido." />
          <OverviewStat icon={Wallet} label="Dinheiro esperado" value={money(totals.dinheiroEsperado)} accent={dashboardNumber(totals.dinheiroEsperado) == null ? 'neutral' : 'info'}
            description="Valor que deve estar na gaveta deste caixa." />
          <OverviewStat icon={CircleDollarSign} label="Média recebida por pedido" value={money(average)} accent={average == null ? 'neutral' : 'info'}
            description="Recebido dividido pelos pedidos com pagamento aprovado." help="Pedidos parcialmente pagos entram na média pelo valor aprovado até agora." />
        </section>
        <div className={s.grid}>
          <article className={'card ' + s.card} aria-label="Pagamentos aprovados no turno">
            <header className={s.cardHeading}><h3><CreditCard size={18} />Formas de pagamento</h3>
              <button onClick={() => navigate('pedidos', { sessaoCaixaId: turn.id })}>Ver pedidos</button></header>
            {received === 0 && <p className={s.hint}>Nenhum pagamento aprovado neste turno.</p>}
              <div className={s.payments}>{Object.entries(DASHBOARD_PAYMENT_FORMS).map(([key, label]) => {
                const value = dashboardNumber(totals.porForma?.[key])
                const percent = value != null && received > 0 ? value / received * 100 : null
                return <div key={key} data-form={key}>
                  <div><span><i className={s.paymentDot} />{label}{percent != null && <small>{fmtNum(percent)}%</small>}</span><strong>{money(value)}</strong></div>
                  {percent != null && <span className={s.bar} aria-hidden="true"><i style={{ width: Math.min(100, Math.max(0, percent)) + '%' }} /></span>}
                </div>
              })}</div>
          </article>
          <article className={'card ' + s.card} aria-label="Composição da gaveta">
            <header className={s.cardHeading}><h3><Banknote size={18} />Composição da gaveta</h3>
              <button onClick={() => navigate('caixa')}>Ir para o caixa</button></header>
            <dl className={s.cashBreakdown}>{[
              ['Fundo de troco', totals.fundoTroco, ''],
              ['Recebido em dinheiro', totals.porForma?.DINHEIRO, '+'],
              ['Reforços', totals.reforcos, '+'],
              ['Sangrias', totals.sangrias, '−'],
            ].map(([label, value, sign]) => <div key={label}><dt>{label}</dt><dd data-sign={dashboardNumber(value) > 0 ? sign : undefined}>{dashboardNumber(value) > 0 && sign + ' '}{money(value)}</dd></div>)}
              <div><dt>Dinheiro esperado</dt><dd>{money(totals.dinheiroEsperado)}</dd></div>
            </dl>
          </article>
        </div>
      </>}
    {turn && <div className={s.historyGrid}><TurnPayments key={turn.id} sessionId={turn.id} /></div>}
  </>
}
