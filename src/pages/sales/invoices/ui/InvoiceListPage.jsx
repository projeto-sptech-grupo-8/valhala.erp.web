import { TaxDocumentInput } from './TaxDocumentInput.jsx'
import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Download, Eye, ReceiptText, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { ActionMenu } from '@/entities/access/ui'
import { useStore } from '@/entities/store'
import { readCash } from '@/entities/sales/api/cashApi.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { ErrorBlock, Notice, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { fmtBRL, fmtDateTime } from '@/shared/lib/format.js'
import { DateRangeFilter } from '@/shared/ui/filters/DateRangeFilter.jsx'
import { FilterActions, FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import { invoices, downloadInvoice } from '../fiscalApi.js'
import { InvoiceDetail } from './InvoiceDetail.jsx'
import sales from '../../remote/SalesRemote.module.css'
import s from './Invoices.module.css'

const defaults={numero:'',documentoCliente:'',status:''}
const statusNames={AUTORIZADA:'Autorizada',CANCELADA:'Cancelada',REJEITADA:'Rejeitada'}
export function Listing(){
  const [search, setSearch] = useSearchParams()
  if (search.get('aba') === 'pendentes') return <Navigate to="/pedidos?status=CONCLUIDO&nfcePendente=true" replace />
  function selectDetail(id) {
    setSearch(previous => {
      const next = new URLSearchParams(previous)
      if (id) next.set('notaId', id)
      else next.delete('notaId')
      return next
    }, { replace: true })
  }
  return <InvoiceTable detail={search.get('notaId')} selectDetail={selectDetail} />
}
function InvoiceTable({detail, selectDetail}){
  const {can}=useStore()
  const [page,setPage]=useState(0),[draft,setDraft]=useState(defaults),[filters,setFilters]=useState(defaults),[expanded,setExpanded]=useState(true)
  const [period, setPeriod] = useState('todos')
  const [error,setError]=useState('')
  const query=useQueryResource(signal=>readCash(invoices,{...filters,pagina:page,tamanho:10},signal),[page,filters])
  const rows=query.data?.itens || []
  const hasFilters = Object.values(filters).some(value => value.trim() !== '')
  function emptyMessage() {
    if (page > 0 && query.data?.totalItens > 0) return 'Esta página está vazia. Volte à página anterior.'
    if (hasFilters) return 'Nenhuma nota fiscal corresponde aos filtros aplicados.'
    return 'Nenhuma nota fiscal foi emitida neste estabelecimento até o momento.'
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

  function changeStatus(event) {
    const status = event.target.value
    setPage(0)
    setFilters(previous => ({ ...previous, status }))
  }
  function changePeriod({ id, dataInicio, dataFim }) {
    setPeriod(id)
    setPage(0)
    setFilters(previous => ({ ...previous, dataInicio, dataFim }))
  }
  function clear(){setPage(0);setDraft(defaults);setFilters(defaults);setPeriod('todos');setError('')}
  const columns = [
    { key: 'numero', header: 'Nota / série', render: row => <><b>{row.numero} / {row.serie}</b><small>{row.ambiente === 'HOMOLOGACAO' ? 'Homologação' : row.ambiente}</small></> },
    { key: 'pedidoNumero', header: 'Pedido', render: row => row.pedidoId && row.pedidoNumero != null
      ? <Link to={'/pedidos?pedidoId=' + encodeURIComponent(row.pedidoId)}>#{row.pedidoNumero}</Link> : row.pedidoNumero == null ? '—' : '#' + row.pedidoNumero },
    { key: 'emitidaEm', header: 'Emissão', render: row => row.emitidaEm ? fmtDateTime(row.emitidaEm) : '—' },
    { key: 'contraparteNome', header: 'Consumidor', render: row => row.contraparteNome || row.contraparteDocumento || 'Consumidor não identificado' },
    { key: 'valorTotal', header: 'Total', align: 'right', render: row => fmtBRL(row.valorTotal) },
    { key: 'status', header: 'Situação', render: row => <span data-status={row.status}>{statusNames[row.status] || row.status}</span> },
    { key: 'acoes', header: 'Ações', render: row => <ActionMenu label={'Ações da nota ' + row.numero} items={[
      { label: 'Ver detalhes', icon: Eye, onClick: () => selectDetail(row.id) },
      { label: 'Baixar XML', icon: Download, onClick: () => { setError(''); downloadInvoice(row).catch(e => setError(e.message)) } },
    ]} /> },
  ].map(column => ({ ...column, sort: false }))
  return <>
    <section className={sales.panel + ' ' + s.invoiceFilters}>
      <FilterHeader className={sales.filterHeading}><h2><button className={sales.collapse} type="button" aria-controls="invoice-filter-fields" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><SlidersHorizontal size={17} aria-hidden="true"/>Filtros de notas fiscais<ChevronDown size={17} aria-hidden="true" className={expanded?sales.rotated:undefined}/></button></h2><FilterActions compact onClear={clear} onRefresh={query.reload} refreshing={query.loading}/></FilterHeader>
      {expanded&&<div id="invoice-filter-fields" className={sales.grid + ' ' + s.invoiceFilterGrid}>
        <label>Número da nota<input value={draft.numero} placeholder="Ex.: 328"
          onChange={({ target: { value } }) => setDraft(previous => ({ ...previous, numero: value }))} /></label><label>CPF ou CNPJ<TaxDocumentInput value={draft.documentoCliente} onChange={documentoCliente=>setDraft(previous=>({...previous,documentoCliente}))}/></label>
        <label>Situação<select value={filters.status} onChange={changeStatus}><option value="">Todas</option>{Object.entries(statusNames).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <DateRangeFilter label="Período de emissão" className={s.emissionFilter} selected={period} onChange={changePeriod} />
      </div>}
    </section>
    {error&&<Notice title="Falha ao baixar XML">{error}</Notice>}
    {query.loading?<LoadingBlock label="Consultando o servidor…"/>:query.error?<ErrorBlock error={query.error} onRetry={query.reload}/>:<section className={'card '+s.panel}>
      <h2 className={s.listTitle}><ReceiptText size={18} aria-hidden="true"/>Notas emitidas</h2>
      {rows.some(row => row.ambiente === 'HOMOLOGACAO') && <Notice tone="info" title="Homologação · sem valor fiscal">As notas identificadas como Homologação pertencem ao ambiente de teste.</Notice>}
      <div className={s.invoiceTable}><DataTable caption="Notas emitidas" columns={columns} rows={rows}
        compactColumns={['numero', 'valorTotal', 'status', 'acoes']} pageSize={10}
        remote={{ page, total: query.data?.totalItens || 0, onPage: setPage }} emptyText={emptyMessage()} /></div>
    </section>}
    {detail&&<InvoiceDetail key={detail} id={detail} close={()=>selectDetail(null)} canCancel={can('CAIXA_CANCELAR')} canOperate={can('CAIXA_OPERAR') || can('CAIXA_ESTORNAR')} refresh={query.reload}/>}
  </>
}
