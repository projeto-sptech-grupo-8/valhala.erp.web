import { AlertCircle, CheckCircle2, Clock3, CreditCard, RefreshCw } from 'lucide-react'
import { fmtBRL } from '@/shared/lib/format.js'
import { PAYMENT_NAMES } from '../model/paymentRules.js'
import s from './SalePaymentModal.module.css'

const statuses = {
  PENDENTE: ['Pagamento em andamento', 'Aguarde a confirmação do envio da cobrança.'],
  PENDENTE_NA_POINT: ['Aguardando na maquininha', 'Confira a cobrança na maquininha para iniciar o pagamento.'],
  EM_TERMINAL: ['Pagamento em andamento', 'Peça ao cliente para seguir as instruções na maquininha.'],
  PENDENTE_CONCILIACAO: ['Conferência necessária', 'Volte ao pedido para conferir o comprovante e conciliar o recebimento.'],
  ACAO_NECESSARIA: ['Pagamento requer atenção', 'Volte ao pedido para verificar os detalhes da cobrança.'],
  CANCELAMENTO_SOLICITADO: ['Cancelamento em andamento', 'Aguarde a confirmação do cancelamento antes de cobrar novamente.'],
  ESTORNO_EM_ANDAMENTO: ['Estorno em andamento', 'Aguarde a confirmação ou volte ao pedido para retomar o estorno caso tenha ocorrido falha na comunicação.'],
  RECUSADO: ['Pagamento recusado', 'Você pode tentar outra forma de pagamento ou repetir a cobrança.'],
  EXPIRADO: ['Cobrança expirada', 'Inicie uma nova tentativa para receber esta parte.'],
  CANCELADO: ['Pagamento cancelado', 'Inicie uma nova tentativa para receber esta parte.'],
}

export function CardPaymentStatus({ payment, order, checking, onCheck, onRetry }) {
  const approved = payment.status === 'APROVADO'
  const settled = approved && order?.status === 'CONCLUIDO'
  const tone = approved ? 'success' : onRetry ? 'danger' : 'pending'
  const Icon = approved ? CheckCircle2 : onRetry ? AlertCircle : Clock3
  const amount = payment.valorCobrado ?? payment.valor
  const [title, description] = approved
    ? ['Pagamento aprovado', settled
      ? 'O recebimento foi confirmado e o pedido está concluído.'
      : 'O recebimento foi confirmado. Consulte o saldo para continuar.']
    : statuses[payment.status] || ['Verifique o pagamento', 'Consulte o pedido para conferir a situação da cobrança.']

  return <section className={s.cardPaymentStatus} data-tone={tone} aria-label="Situação do pagamento no cartão">
    <div className={s.cardPaymentHeading} role="status">
      <span className={s.cardPaymentIcon}><Icon size={24} aria-hidden="true" /></span>
      <div><h3>{title}</h3><p>{description}</p></div>
    </div>
    <dl className={s.cardPaymentFacts}>
      <div><dt>Valor cobrado</dt><dd>{amount == null ? '—' : fmtBRL(amount)}</dd></div>
      <div><dt>Forma de pagamento</dt><dd><CreditCard size={15} aria-hidden="true" />{PAYMENT_NAMES[payment.forma]}</dd></div>
      {payment.forma === 'CREDITO' && payment.parcelas > 0 && <div><dt>Parcelas</dt><dd>{payment.parcelas}×</dd></div>}
      {order?.saldoRestante != null && approved && !settled && <div><dt>Saldo restante</dt><dd>{fmtBRL(order.saldoRestante)}</dd></div>}
    </dl>
    {onCheck && <button type="button" disabled={checking} onClick={onCheck}>
      <RefreshCw size={15} aria-hidden="true" />{checking ? 'Consultando…' : 'Atualizar pagamento'}
    </button>}
    {onRetry && <button type="button" disabled={checking} onClick={onRetry}>Nova tentativa desta parte</button>}
  </section>
}
