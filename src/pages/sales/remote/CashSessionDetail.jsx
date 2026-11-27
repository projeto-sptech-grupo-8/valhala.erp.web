import { ArrowDownCircle, ArrowUpCircle, Banknote, CalendarClock, ClipboardCheck, History, MessageSquare, Wallet } from 'lucide-react'
import { Drawer } from '@/shared/ui/drawer/Drawer.jsx'
import { ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { fmtBRL, fmtDateTime, fmtNum } from '@/shared/lib/format.js'
import { CashSessionBadge } from './CashSessionBadge.jsx'
import s from './CashSessionDetail.module.css'

const date = value => value ? <time dateTime={value}>{fmtDateTime(value)}</time> : '—'
const amount = value => value == null ? '—' : fmtBRL(value)

export function CashSessionDetail({ query, onClose, onResolve }) {
  const session = query.loading || query.error ? null : query.data
  const summary = session?.resumoFechamento || session?.resumoAtual || {}
  const counted = session?.dinheiroContado ?? summary.dinheiroContado
  const difference = session?.diferenca ?? summary.diferenca
  const differenceTone = difference == null ? undefined : Number(difference) === 0 ? 'success' : 'danger'
  const notes = [
    ['Observação da abertura', session?.observacaoAbertura],
    ['Observação do fechamento', session?.observacaoFechamento],
    ['Justificativa da diferença', session?.justificativaDivergencia],
    ['Resolução da divergência', session?.divergenciaResolvidaPorNome && <>{session.divergenciaResolvidaPorNome}{session.divergenciaResolvidaEm && <> · {date(session.divergenciaResolvidaEm)}</>}</>],
  ].filter(([, value]) => value)

  return <Drawer title="Detalhes da sessão de caixa" onClose={onClose}>
    <div className={s.detail}>
      <header className={s.header}>
        <span className={s.headerIcon}><Wallet size={24} aria-hidden="true" /></span>
        <div>
          {session && <p>Detalhes da sessão de caixa</p>}
          <h2>{session?.caixaNome || 'Sessão de caixa'}</h2>
        </div>
        {session && <CashSessionBadge value={session.status} />}
      </header>
      {query.loading && <LoadingBlock label="Carregando sessão de caixa…" lines={3} />}
      {query.error && <ErrorBlock error={query.error} onRetry={query.reload} />}
      {session && <>
        <section className={s.section}>
          <h3><CalendarClock size={17} aria-hidden="true" /> Turno</h3>
          <dl className={s.shift}>
            <div><dt>Abertura</dt><dd>{date(session.abertaEm)}</dd>{session.operadorNome && <dd className={s.person}>{session.operadorNome}</dd>}</div>
            <div><dt>Encerramento</dt><dd>{session.fechadaEm ? date(session.fechadaEm) : session.status === 'ABERTA' ? 'Em andamento' : '—'}</dd>{session.fechadaPorNome && <dd className={s.person}>{session.fechadaPorNome}</dd>}</div>
          </dl>
        </section>

        <section className={s.section}>
          <h3><Banknote size={17} aria-hidden="true" /> Resumo financeiro</h3>
          <dl className={s.totals}>
            <div><dt>Recebido aprovado</dt><dd>{amount(summary.totalVendas)}</dd></div>
            <div><dt>Esperado na gaveta</dt><dd>{amount(session.dinheiroEsperado ?? summary.dinheiroEsperado)}</dd></div>
          </dl>
          <dl className={s.breakdown}>
            {[
              ['Fundo de troco', amount(session.fundoTroco ?? summary.fundoTroco)],
              ['Pedidos com recebimento', summary.qtdVendas == null ? null : fmtNum(summary.qtdVendas)],
              ['Sangrias', summary.sangrias == null ? null : amount(summary.sangrias)],
              ['Reforços', summary.reforcos == null ? null : amount(summary.reforcos)],
              ['Dinheiro contado', counted == null ? null : amount(counted)],
            ].filter(([, value]) => value != null).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            {difference != null && <div className={s.difference} data-tone={differenceTone}><dt>Diferença</dt><dd>{amount(difference)}</dd></div>}
          </dl>
        </section>

        {(notes.length > 0 || onResolve && session.status === 'EM_FECHAMENTO') && <section className={s.section}>
          <h3><MessageSquare size={17} aria-hidden="true" /> Observações e conferência</h3>
          {notes.length > 0 && <dl className={s.notes}>{notes.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
          {onResolve && session.status === 'EM_FECHAMENTO' && <button type="button" className="gold" onClick={() => onResolve(session.id)}><ClipboardCheck size={16} aria-hidden="true" /> Resolver divergência</button>}
        </section>}

        <section className={s.section}>
          <h3><History size={17} aria-hidden="true" /> Sangrias e reforços</h3>
          {session.movimentacoes?.length ? <ul className={s.movements}>
            {session.movimentacoes.map(movement => {
              const withdrawal = movement.tipo === 'SANGRIA'
              const Icon = withdrawal ? ArrowUpCircle : ArrowDownCircle
              return <li key={movement.id}>
                <Icon size={18} data-tone={withdrawal ? 'danger' : 'success'} aria-hidden="true" />
                <div>
                  <strong>{withdrawal ? 'Sangria' : movement.tipo === 'REFORCO' ? 'Reforço' : movement.tipo}</strong>
                  {movement.motivo && <p>{movement.motivo}</p>}
                  {(movement.usuarioNome || movement.ocorridoEm) && <small>{movement.usuarioNome}{movement.usuarioNome && movement.ocorridoEm && ' · '}{movement.ocorridoEm && date(movement.ocorridoEm)}</small>}
                </div>
                <strong className={s.movementAmount}>{amount(movement.valor)}</strong>
              </li>
            })}
          </ul> : <p className={s.empty}>Nenhuma movimentação de dinheiro registrada neste turno.</p>}
        </section>
      </>}
    </div>
  </Drawer>
}
