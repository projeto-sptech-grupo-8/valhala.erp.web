import { useState } from 'react'
import { CheckCircle2, ChevronDown, Clock3, History, RotateCcw, XCircle, CircleHelp } from 'lucide-react'
import { readCash } from '@/entities/sales/api/cashApi.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { fmtBRL } from '@/shared/lib/format.js'
import { dashboardDate, DASHBOARD_PAYMENT_FORMS } from '../model/dashboardPresentation.js'
import s from './DashboardPage.module.css'

const ordersByState = {
  EM_ATENDIMENTO: 'Em atendimento', AGUARDANDO_MAQUINA: 'Aguardando maquininha',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento', PAGAMENTO_PARCIAL: 'Pagamento parcial',
  CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado', ESTORNADO: 'Estornado',
}

const paymentStates = {
  APROVADO: ['Aprovado', 'success', CheckCircle2],
  CANCELADO: ['Cancelado', 'danger', XCircle],
  RECUSADO: ['Recusado', 'danger', XCircle],
  EXPIRADO: ['Expirado', 'danger', XCircle],
  ESTORNADO: ['Estornado', 'refund', RotateCcw],
  ESTORNO_EM_ANDAMENTO: ['Estorno em andamento', 'pending', Clock3],
  CANCELAMENTO_SOLICITADO: ['Cancelamento solicitado', 'pending', Clock3],
  PENDENTE: ['Pendente', 'pending', Clock3],
  PENDENTE_NA_POINT: ['Aguardando maquininha', 'pending', Clock3],
  EM_TERMINAL: ['Em processamento', 'pending', Clock3],
  ACAO_NECESSARIA: ['Requer atenção', 'pending', Clock3],
  PENDENTE_CONCILIACAO: ['Aguardando conciliação', 'pending', Clock3],
}

function Attempts({ orderId }) {
  const query = useQueryResource(async signal => {
    const rows = await readCash('pedidos/' + orderId + '/pagamentos', {}, signal)
    if (!Array.isArray(rows)) throw new Error('As tentativas de pagamento não foram retornadas.')
    return rows
  }, [orderId])
  if (query.loading) return <LoadingBlock lines={1} label="Consultando pagamentos…" />
  if (query.error) return <ErrorBlock error={query.error} onRetry={query.reload} />
  if (!query.data.length) return <p className={s.hint}>Nenhum pagamento registrado neste pedido.</p>
  return <ul className={s.attempts} aria-label="Tentativas de pagamento">
    {query.data.map(payment => {
      const [label, tone, Icon] = paymentStates[payment.status] || [payment.status || 'Não informado', 'neutral', CircleHelp]
      const amount = payment.valorCobrado ?? payment.valor
      return <li key={payment.id}>
        <span><strong>{DASHBOARD_PAYMENT_FORMS[payment.forma] || payment.forma || 'Forma não informada'}</strong>
          <small>Registro em {dashboardDate(payment.criadoEm || payment.solicitadoEm)}</small></span>
        <strong>{amount == null ? '—' : fmtBRL(amount)}</strong>
        <span className={s.paymentBadge} data-tone={tone}><Icon size={14} aria-hidden="true" />{label}</span>
      </li>
    })}
  </ul>
}

export function TurnPayments({ sessionId }) {
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  const [expanded, setExpanded] = useState(undefined)
  const orders = useQueryResource(async signal => {
    const data = await readCash('pedidos', { sessaoCaixaId: sessionId, status, pagina: page,
      tamanho: 5, ordenarPor: 'atualizadoEm', direcao: 'DESC' }, signal)
    if (!Array.isArray(data?.itens)) throw new Error('A lista de pedidos do turno não foi retornada.')
    return data
  }, [sessionId, status, page])
  const rows = orders.loading || orders.error ? [] : orders.data.itens
  const active = expanded === undefined ? rows[0]?.id : expanded
  function changePage(number) { setPage(number); setExpanded(undefined) }
  return <article className={'card ' + s.card + ' ' + s.wide} aria-label="Histórico de pagamentos">
    <header className={s.cardHeading}><div><h3><History size={18} />Histórico de pagamentos</h3>
      <p className={s.hint}>Abra um pedido do turno para conferir o valor e a situação de cada tentativa.</p></div>
      <label className={s.historyFilter}>Situação do pedido<select value={status} onChange={e => { setStatus(e.target.value); changePage(0) }}>
        <option value="">Todas</option>{Object.entries(ordersByState).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label></header>
    {orders.loading ? <LoadingBlock lines={2} label="Consultando pedidos do turno…" /> : orders.error ? <ErrorBlock error={orders.error} onRetry={orders.reload} /> :
      !rows.length ? <p className={s.hint}>Nenhum pedido encontrado nesta consulta.</p> :
        rows.map(order => <div className={s.historyOrder} key={order.id}>
          <button type="button" aria-expanded={active === order.id} onClick={() => setExpanded(active === order.id ? null : order.id)}>
            <strong>Pedido #{order.numero}</strong><span>{ordersByState[order.status] || order.status}</span><ChevronDown size={16} aria-hidden="true" />
          </button>
          {active === order.id && <Attempts orderId={order.id} />}
        </div>)}
    {(page > 0 || (!orders.loading && !orders.error && orders.data.ultima === false)) &&
      <div className={s.historyPager}><button disabled={!page || orders.loading} onClick={() => changePage(page - 1)}>Anterior</button>
        <span>Página {page + 1}</span><button disabled={orders.loading || !!orders.error || orders.data?.ultima !== false} onClick={() => changePage(page + 1)}>Próxima</button></div>}
  </article>
}
