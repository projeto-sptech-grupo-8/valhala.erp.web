import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilePlus2, ReceiptText } from 'lucide-react'
import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useFiscalCheckout } from '../fiscalContext.js'
import { issueInvoice, needsInvoice } from '../fiscalApi.js'
import { ConsumerFields } from './FiscalCheckout.jsx'
import s from './Invoices.module.css'

export function OrderInvoice({ order, canIssue, onIssued }) {
  const titleId = useId()
  const { receipts, dismiss } = useFiscalCheckout()
  const autoIssuing = receipts.some(row => row.id === order.id && row.pending)
  const needsEmission = needsInvoice(order)
  const note = order.notaFiscal
  const [editing, setEditing] = useState(false)
  const [customer, setCustomer] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)

  if (!needsEmission && !note) return null

  async function submit(event) {
    event.preventDefault()
    if (!canIssue || !needsEmission || autoIssuing || submitting.current) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      await issueInvoice(order.id, customer)
      dismiss(order.id)
      setEditing(false)
      setCustomer({})
      onIssued()
    } catch (err) {
      setError(err.message)
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  function closeForm() {
    setEditing(false)
    setCustomer({})
    setError('')
  }

  return <section className={s.orderFiscal} aria-labelledby={titleId} aria-busy={autoIssuing || busy}>
    <div className={s.orderFiscalHeader}>
      <h3 id={titleId}><ReceiptText size={17} aria-hidden="true" /> NFC-e</h3>
      {needsEmission && <span className={s.fiscalPending} role="status">{autoIssuing || busy ? 'Emitindo NFC-e…' : 'NFC-e pendente'}</span>}
    </div>
    {note && <div className={s.orderFiscalDocument}>
      <span>NFC-e nº {note.numero}{note.status === 'CANCELADA' ? ' · Cancelada' : note.status === 'REJEITADA' ? ' · Rejeitada' : ' · Autorizada'}</span>
      {note.id && <Link to={'/notafiscal?notaId=' + encodeURIComponent(note.id)}>Ver NFC-e</Link>}
    </div>}
    {needsEmission && canIssue && !autoIssuing && (editing ? <form onSubmit={submit}>
      <ConsumerFields value={customer} onChange={setCustomer} disabled={busy} />
      {error && <Notice title="Confira a emissão" focus>{error}</Notice>}
      <div className={s.actions}>
        <button type="button" onClick={closeForm} disabled={busy}>Voltar</button>
        <button type="submit" className="gold" disabled={busy}>{busy ? 'Emitindo…' : 'Confirmar emissão'}</button>
      </div>
    </form> : <button type="button" className="gold" onClick={() => setEditing(true)}><FilePlus2 size={16} aria-hidden="true" /> Emitir NFC-e</button>)}
  </section>
}
