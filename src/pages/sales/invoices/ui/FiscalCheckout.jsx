import { TaxDocumentInput } from './TaxDocumentInput.jsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, ReceiptText } from 'lucide-react'
import { readCash } from '@/entities/sales/api/cashApi.js'
import { issueInvoice, downloadInvoice } from '../fiscalApi.js'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import s from './Invoices.module.css'

import { FiscalContext, useFiscalCheckout } from '../fiscalContext.js'

const RECEIPT_TIMEOUT_MS = 5000

export function ConsumerFields({ value, onChange, disabled }) {
  return <details className={s.customer}><summary>Identificar consumidor na nota (opcional)</summary>
    <div className={s.fields}><label>CPF ou CNPJ<TaxDocumentInput value={value.documentoCliente} disabled={disabled} onChange={documentoCliente=>onChange({...value,documentoCliente})}/></label>
    <label>Nome ou razão social<input disabled={disabled} value={value.nomeCliente || ''} maxLength={150} onChange={e => onChange({...value, nomeCliente:e.target.value})}/></label></div>
  </details>
}

export function FiscalProvider({ children }) {
  const jobs = useRef(new Map()), customers = useRef(new Map())
  const [receipts, setReceipts] = useState([])
  const [invoiceRevision, setInvoiceRevision] = useState(0)
  const toast = useToast()
  const active = useRef(true)
  const dismiss = useCallback(id => {
    jobs.current.delete(id)
    setReceipts(list => list.filter(row => row.id !== id))
  }, [])
  useEffect(() => {
    const tracked = jobs.current, identities = customers.current
    active.current = true
    return () => {
      active.current = false
      for (const job of tracked.values()) clearTimeout(job.timer)
      tracked.clear()
      identities.clear()
    }
  }, [])
  function observe(order) {
    if (!active.current || !order?.id) return
    const id = order.id
    let job = jobs.current.get(id)
    if (job?.issuing) return
    if (!job) { job = { started: Date.now() }; jobs.current.set(id, job) }
    clearTimeout(job.timer)
    if (order.status === 'CONCLUIDO') {
      job.issuing = true
      const row = { id, numero:order.numero, pending:true }
      setReceipts(list => [...list, row])
      const customer = customers.current.get(id) || {}
      customers.current.delete(id)
      const finish = patch => {
        if (jobs.current.get(id) !== job) return
        setReceipts(list => list.map(item => item.id === id ? {...row, pending:false, ...patch} : item))
        if (patch.note) setInvoiceRevision(value => value + 1)
      }
      issueInvoice(id, customer).then(note => finish({note}), error => finish({error:error.message}))
    } else if (order.pagamentos?.some(p => ['PENDENTE','PENDENTE_NA_POINT','EM_TERMINAL','PENDENTE_CONCILIACAO','ACAO_NECESSARIA','CANCELAMENTO_SOLICITADO'].includes(p.status))) {
      const check = async () => {
        if (jobs.current.get(id) !== job || job.issuing) return

        if (!document.hidden) {
          try { const latest = await readCash('pedidos/'+id); if(jobs.current.get(id)===job) observe(latest); return } catch (e) { if ([401,403,404].includes(e.status)) { jobs.current.delete(id); return } }
        }
        if(jobs.current.get(id)===job) job.timer=setTimeout(check,Date.now()-job.started < 60000 ? 5000 : 30000)
      }
      job.timer=setTimeout(check,Date.now()-job.started < 60000 ? 5000 : 30000)
    } else { jobs.current.delete(id) }
  }
  return <FiscalContext.Provider value={{ observe, confirmWatched:order=>{if(order?.status==='CONCLUIDO'&&jobs.current.has(order.id))observe(order)}, customers, receipts, invoiceRevision, dismiss, download:note=>downloadInvoice(note).catch(e=>toast(e.message,{type:'error',title:'Falha ao baixar XML'})) }}>{children}</FiscalContext.Provider>
}

export function FiscalReceipts() {
  const { receipts, dismiss, download } = useFiscalCheckout()
  return receipts.map(receipt => <FiscalReceipt key={receipt.id} receipt={receipt} dismiss={dismiss} download={download} />)
}

function FiscalReceipt({ receipt: { id, numero, pending, note, error }, dismiss, download }) {
  const issued = !pending && !!note
  useEffect(() => {
    if (!issued) return
    const timer = setTimeout(() => dismiss(id), RECEIPT_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [dismiss, id, issued])

  return <section className={'card '+s.receipt} aria-live="polite">
    <h3><ReceiptText size={18}/> Pedido {numero ? '#'+numero : ''} concluído</h3>
    <p>{pending ? 'Emitindo NFC-e…' : note ? 'NFC-e nº '+note.numero+' · '+(note.ambiente==='HOMOLOGACAO'?'Homologação':note.ambiente) : 'Emissão pendente. '+error}</p>
    {!pending && <div className={s.actions}><button type="button" className="gold" onClick={()=>dismiss(id)}>Continuar no caixa</button>{note ? <button onClick={()=>download(note)}><Download size={15}/> Baixar</button> : <a href={'#/pedidos?pedidoId='+encodeURIComponent(id)} onClick={()=>dismiss(id)}>Conferir emissão</a>}</div>}
  </section>
}
