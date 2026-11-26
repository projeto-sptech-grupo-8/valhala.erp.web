import { TaxDocumentInput } from './TaxDocumentInput.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Eye, ReceiptText, ClipboardList, SlidersHorizontal, ChevronDown, FilePlus2, ChevronLeft, ChevronRight } from 'lucide-react'
import { ActionMenu } from '@/entities/access/ui'
import { useStore } from '@/entities/store'
import { readCash } from '@/entities/sales/api/cashApi.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { Modal, ErrorBlock, Notice, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { fmtBRL, fmtDateTime } from '@/shared/lib/format.js'
import { FilterActions, FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import { invoices, issueInvoice, downloadInvoice } from '../fiscalApi.js'
import { InvoiceDetail } from './InvoiceDetail.jsx'
import { ConsumerFields } from './FiscalCheckout.jsx'
import access from '@/entities/access/ui/access.module.css'
import sales from '../../remote/SalesRemote.module.css'
import s from './Invoices.module.css'

const defaults={numero:'',documentoCliente:'',status:'',dataInicio:'',dataFim:''}
const statusNames={AUTORIZADA:'Autorizada',CANCELADA:'Cancelada',REJEITADA:'Rejeitada'}
export function Listing(){
  const [search]=useSearchParams()
  const eligible=search.get('aba')==='pendentes'
  return <><nav className={access.tabs} aria-label="Seções de notas fiscais">
    {[[false,'Notas emitidas',ReceiptText],[true,'Pedidos para emissão',ClipboardList]].map(([tab,label,Icon])=>(
      <Link key={label} to={tab?'/notafiscal?aba=pendentes':'/notafiscal'} aria-current={tab===eligible?'page':undefined} className={tab===eligible?access.tabOn:access.tab}>
        <Icon size={14} aria-hidden="true"/> {label}
      </Link>
    ))}
  </nav>
    <InvoiceTable key={String(eligible)} eligible={eligible}/></>
}
function InvoiceTable({eligible}){
  const {can}=useStore(), lock=useRef(false)
  const [page,setPage]=useState(0),[draft,setDraft]=useState(defaults),[filters,setFilters]=useState(defaults),[expanded,setExpanded]=useState(true)
  const [detail,setDetail]=useState(null),[order,setOrder]=useState(null),[customer,setCustomer]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[issueError,setIssueError]=useState('')
  const path=invoices+(eligible?'/pedidos-elegiveis':'')
  const query=useQueryResource(signal=>readCash(path,{...filters,pagina:page,tamanho:10},signal),[path,page,filters])
  const rows=query.data?.itens || []
  const hasFilters = Object.values(filters).some(value => value.trim() !== '')
  function emptyMessage() {
    if (page > 0 && query.data?.totalItens > 0) return 'Esta página está vazia. Volte à página anterior.'
    if (hasFilters) return eligible
      ? 'Nenhum pedido para emissão corresponde aos filtros aplicados.'
      : 'Nenhuma nota fiscal corresponde aos filtros aplicados.'
    return eligible
      ? 'Não há pedidos aguardando emissão de NFC-e no momento.'
      : 'Nenhuma nota fiscal foi emitida neste estabelecimento até o momento.'
  }
  const { numero, documentoCliente } = draft
  useEffect(() => {
    if (numero === filters.numero && documentoCliente === filters.documentoCliente) return
    const timer = setTimeout(() => {
      setPage(0)
      setFilters(previous => ({ ...previous, numero, documentoCliente }))
    }, 300)
    return () => clearTimeout(timer)
  }, [numero, documentoCliente, filters.numero, filters.documentoCliente])

  function field(key) {
    return { value:draft[key], onChange:event => {
      const value = event.target.value
      const next = { ...draft, [key]:value }
      setDraft(next)
      if (key === 'numero') return
      if (key !== 'status' && next.dataFim && next.dataInicio > next.dataFim) return
      setPage(0)
      setFilters(previous => key === 'status' ? { ...previous, status:value }
        : { ...previous, dataInicio:next.dataInicio, dataFim:next.dataFim })
    }}
  }
  function clear(){setPage(0);setDraft(defaults);setFilters(defaults);setError('')}
  async function issue(){
    if(lock.current)return
    lock.current=true;setBusy(true);setIssueError('')
    try{const note=await issueInvoice(order.id,customer);setOrder(null);setDetail(note.id);setPage(0);query.reload()}
    catch(e){setIssueError(e.message)}
    finally{lock.current=false;setBusy(false)}
  }
  return <>
    <section className={sales.panel}>
      <FilterHeader className={sales.filterHeading}><h2><button className={sales.collapse} type="button" aria-controls="invoice-filter-fields" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><SlidersHorizontal size={17} aria-hidden="true"/>Filtros de {eligible?'pedidos para emissão':'notas fiscais'}<ChevronDown size={17} aria-hidden="true" className={expanded?sales.rotated:undefined}/></button></h2><FilterActions compact onClear={clear} onRefresh={query.reload} refreshing={query.loading}/></FilterHeader>
      {expanded&&<div id="invoice-filter-fields" className={sales.grid}>
        {!eligible&&<><label>Número da nota<input {...field('numero')} placeholder="Ex.: 328"/></label><label>CPF ou CNPJ<TaxDocumentInput value={draft.documentoCliente} onChange={documentoCliente=>setDraft(previous=>({...previous,documentoCliente}))}/></label>
        <label>Situação<select {...field('status')}><option value="">Todas</option>{Object.entries(statusNames).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></>}
        <label>{eligible?'Conclusão':'Emissão'} de<input type="date" {...field('dataInicio')} max={draft.dataFim||undefined}/></label>
        <label>Até<input type="date" {...field('dataFim')} min={draft.dataInicio||undefined}/></label>
        {draft.dataFim && draft.dataInicio > draft.dataFim && <small role="alert">A data final deve ser igual ou posterior à inicial.</small>}
      </div>}
    </section>
    {error&&<Notice title="Falha ao baixar XML">{error}</Notice>}
    {query.loading?<LoadingBlock label="Consultando o servidor…"/>:query.error?<ErrorBlock error={query.error} onRetry={query.reload}/>:<section className={'card '+s.panel}>
      <h2 className={s.listTitle}>{eligible?<ClipboardList size={18} aria-hidden="true"/>:<ReceiptText size={18} aria-hidden="true"/>}{eligible?'Pedidos para emissão':'Notas emitidas'}</h2>
      {eligible&&rows.length>0&&<p className={s.listMessage}>Selecione um pedido concluído para emitir a NFC-e.</p>}
      {rows.length?<div className={s.scroll}><table><thead><tr>{(eligible?['Pedido','Conclusão','Total','Ações']:['Nota / série','Pedido','Emissão','Consumidor','Total','Situação','Ações']).map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>
        {rows.map(row=><tr key={row.id}>{!eligible&&<td><b>{row.numero} / {row.serie}</b><small>{row.ambiente==='HOMOLOGACAO'?'Homologação':row.ambiente}</small></td>}
          <td>#{eligible?row.numero:row.pedidoNumero}</td><td>{fmtDateTime(eligible?row.concluidoEm:row.emitidaEm)}</td>{!eligible&&<td>{row.contraparteNome || row.contraparteDocumento || 'Consumidor não identificado'}</td>}<td>{fmtBRL(eligible?row.total:row.valorTotal)}</td>
          {!eligible&&<td><span data-status={row.status}>{statusNames[row.status]||row.status}</span></td>}
          <td>{eligible && !can('CAIXA_OPERAR') ? 'Somente consulta' : (
            <ActionMenu label={(eligible ? 'Ações do pedido ' : 'Ações da nota ') + row.numero}
              items={eligible ? [
                { label:'Emitir NFC-e', icon:FilePlus2, onClick:()=>{setOrder(row);setCustomer({});setIssueError('')} },
              ] : [
                { label:'Ver detalhes', icon:Eye, onClick:()=>setDetail(row.id) },
                { label:'Baixar', icon:Download, onClick:()=>{setError('');downloadInvoice(row).catch(e=>setError(e.message))} },
              ]}/>
          )}</td>
        </tr>)}</tbody></table></div>:<p className={s.listMessage}>{emptyMessage()}</p>}
      <div className={s.actions}><button disabled={!page} onClick={()=>setPage(page-1)}><ChevronLeft size={15} aria-hidden="true"/>Anterior</button><span>Página {page+1}</span><button disabled={page+1>=(query.data?.totalPaginas||0)} onClick={()=>setPage(page+1)}>Próxima<ChevronRight size={15} aria-hidden="true"/></button></div>
    </section>}
    {detail&&<InvoiceDetail id={detail} close={()=>setDetail(null)} canCancel={can('CAIXA_CANCELAR')} canOperate={can('CAIXA_OPERAR') || can('CAIXA_ESTORNAR')} refresh={query.reload}/>}
    {order&&<Modal title={'Emitir NFC-e · Pedido #'+order.numero} onClose={()=>{if(!lock.current)setOrder(null)}} busy={busy} footer={<><button disabled={busy} onClick={()=>setOrder(null)}>Voltar</button><button className="gold" disabled={busy} onClick={issue}>{busy?'Emitindo…':'Confirmar emissão'}</button></>}>
      <p>Total do pedido <strong>{fmtBRL(order.total)}</strong></p><ConsumerFields value={customer} onChange={setCustomer} disabled={busy}/>{issueError&&<Notice title="Confira a emissão">{issueError}</Notice>}
    </Modal>}
  </>
}
