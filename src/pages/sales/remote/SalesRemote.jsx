import { DateRangeFilter } from '@/shared/ui/filters/DateRangeFilter.jsx'
import { useFiscalCheckout } from '@/pages/sales/invoices/fiscalContext.js'
import { needsInvoice } from '@/pages/sales/invoices/fiscalApi.js'
import { OrderInvoice } from '@/pages/sales/invoices/ui/OrderInvoice.jsx'
import { FilterActions, FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import { SearchInput } from '@/features/catalog/remote/RemoteControls.jsx'
import { CashRatesPanel } from '@/features/sales/cash-settings/ui/CashRatesPanel.jsx'
import { CashEquipmentPanel } from '@/features/sales/cash-settings/ui/CashEquipmentPanel.jsx'
import { CashPolicyModal } from '@/features/sales/cash-settings/ui/CashPolicyModal.jsx'
import accessStyles from '@/entities/access/ui/access.module.css'
import { auditReference, auditDateLabel } from '@/entities/sales/model/auditPresentation.js'
import { AuditEventBadge, AuditFilters, AuditResponsible, CashAuditDetail } from './CashAudit.jsx'
import { CashBoxRegistration } from './CashBoxRegistration.jsx'
import { SalePaymentModal } from '@/features/sales/payments/ui/SalePaymentModal.jsx'
import { PENDING_PAYMENT_STATES, canApplyOrderDiscount, canCancelOrder, canCancelPointPayment, canConciliatePayment, canEditOrderItems, canRefundPayment, canSyncPointPayment, hasRefundInProgress } from '@/features/sales/payments/model/paymentRules.js'
import { CashWorkspace } from './CashWorkspace.jsx'
import { useEffect, useRef, useState, useId } from 'react'
import { readCash as read, writeCash as write, countOpenCashOrders } from '@/entities/sales/api/cashApi.js'
import { CashOpening } from './CashOpening.jsx'
import { CashHistory } from './CashHistory.jsx'
import { CashSessionBadge } from './CashSessionBadge.jsx'
import { CashSessionDetail } from './CashSessionDetail.jsx'
import { useStore } from '@/entities/store'
import { useListParams, useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { PageSizeControl } from '@/shared/ui/data-table/PageSizeControl.jsx'
import { Drawer } from '@/shared/ui/drawer/Drawer.jsx'
import { Modal, Notice, LoadingBlock, ErrorBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'

import { ArrowRight, Eye, RefreshCw, SlidersHorizontal, ChevronDown, Wallet, Receipt, CreditCard, Settings2, History, LockKeyhole, ArrowUpCircle, ArrowDownCircle, Clock3, CheckCircle2, AlertCircle, Package } from 'lucide-react'
import { fmtBRL, fmtDateTime } from '@/shared/lib/format.js'
import s from './SalesRemote.module.css'
const states={PENDENTE:'Pendente',PENDENTE_NA_POINT:'Aguardando Point',EM_TERMINAL:'Cliente pagando',APROVADO:'Aprovado',RECUSADO:'Recusado',EXPIRADO:'Expirado',CANCELAMENTO_SOLICITADO:'Cancelamento solicitado',PENDENTE_CONCILIACAO:'Conferir recebimento',ACAO_NECESSARIA:'Precisa de atenção',ESTORNO_EM_ANDAMENTO:'Estorno em andamento',EM_ATENDIMENTO:'Em atendimento',AGUARDANDO_MAQUINA:'Na maquininha',AGUARDANDO_PAGAMENTO:'Aguardando pagamento',PAGAMENTO_PARCIAL:'Pagamento parcial',CONCLUIDO:'Concluído',CANCELADO:'Cancelado',ESTORNADO:'Estornado',ABERTA:'Aberta',EM_FECHAMENTO:'Divergência pendente',FECHADA:'Fechada'}

const paymentNames={DINHEIRO:'Dinheiro',PIX:'Pix',DEBITO:'Cartão de débito',CREDITO:'Cartão de crédito',VALOR:'Valor em reais (R$)',PERCENTUAL:'Percentual (%)'}
const channels={BALCAO:'Balcão',MESA:'Mesa',RETIRADA:'Retirada',DELIVERY:'Delivery'}
function Badge({value}) {
 if (['ABERTA','FECHADA','EM_FECHAMENTO','CANCELADA'].includes(value)) return <CashSessionBadge value={value} />
 const good=['APROVADO','CONCLUIDO'].includes(value)
 const bad=['CANCELADO','RECUSADO','EXPIRADO','ESTORNADO'].includes(value)
 const Icon=good?CheckCircle2:bad?AlertCircle:Clock3
 return <span className={s.badge} data-tone={good?'success':bad?'danger':value==='PAGAMENTO_PARCIAL'?'info':'pending'}><Icon size={13} aria-hidden="true"/>{states[value]||value||'Não informado'}</span>
}

function OrderPaymentSummary({order}) {
 const remaining=order.saldoRestante==null?null:Number(order.saldoRestante)
 const paid=order.totalPago==null?null:Number(order.totalPago)
 const total=order.total==null?null:Number(order.total)
 const ended=['CANCELADO','ESTORNADO'].includes(order.status)
 if(ended)return <div className={s.paymentSummary}><span className={s.badge} data-tone="danger"><AlertCircle size={13} aria-hidden="true"/>{states[order.status]}</span></div>
 if(!Number.isFinite(remaining)||remaining<0)return <span className={s.paymentMissing}>Não informado</span>
 const settled=remaining===0&&(paid>0||total===0)
 const partial=remaining>0&&paid>0
 const label=settled?(total===0?'Sem cobrança':'Pago'):partial?'Parcial':'Pendente'
 const Icon=settled?CheckCircle2:partial?CreditCard:Clock3
 return <div className={s.paymentSummary}><span className={s.badge} data-tone={settled?'success':partial?'info':'pending'}><Icon size={13} aria-hidden="true"/>{label}</span>{remaining>0&&<small>Falta <strong>{fmtBRL(remaining)}</strong></small>}</div>
}

const field=(key,label,type='text',required=true)=>({key,label,type,required})
function Feedback({query}){return query.loading?<LoadingBlock label="Carregando dados do servidor…" lines={3}/>:query.error?<ErrorBlock error={query.error} onRetry={query.reload}/>:null}
function TerminalInput({ value, onChange }) {
 const id = useId()
 const devices = useQueryResource(signal => read('terminais/mercado-pago', {}, signal), [])
 return <>
   <input required maxLength={100} list={id} value={value} onChange={event => onChange(event.target.value)} placeholder="Selecione ou digite o identificador" />
   <datalist id={id}>{devices.data?.map(device => <option key={device.id} value={device.id}>{[device.externalPosId, device.operatingMode].filter(Boolean).join(' · ')}</option>)}</datalist>
   <small role="status">{devices.loading ? 'Consultando maquininhas…' : devices.error ? 'Consulta indisponível. Você pode digitar o identificador da maquininha.' : !devices.data?.length ? 'Nenhuma maquininha retornada pela conta. Confira o identificador antes de vincular.' : 'Selecione uma maquininha da conta ou informe o identificador.'}</small>
 </>
}
function FormModal({spec,close,done}){
 const formId=useId()
 const [values,setValues]=useState(spec.initial||{}),[busy,setBusy]=useState(false),[error,setError]=useState(null),[uncertain,setUncertain]=useState(false);const lock=useRef(false)
 const visibleFields=spec.fields.filter(f=>!f.when||f.when(values))
 const isRequired=f=>typeof f.required==='function'?!!f.required(values):!!f.required
 const description=typeof spec.description==='function'?spec.description(values):spec.description
 async function submit(e){
  e.preventDefault();if(lock.current||uncertain)return
  lock.current=true;setBusy(true);setError(null)
  try{
   const v={...values}
   for(const f of spec.fields){
    if(f.when&&!f.when(values)){delete v[f.key];continue}
    if(f.type==='number')v[f.key]=values[f.key]==null||values[f.key]===''?null:Number(values[f.key])
    if(f.type==='checkbox')v[f.key]=!!values[f.key]
   }
   await spec.run(v);done?.();close()
  }catch(ex){setError(ex);if(ex.status===0&&!ex.mutationNotStarted)setUncertain(true)}
  finally{lock.current=false;setBusy(false)}
 }
 return <Modal width={spec.width??640} title={<span className={s.modalTitle}><Wallet size={20} aria-hidden="true"/>{spec.title}</span>} subtitle={description} busy={busy} onClose={close} footer={<><button disabled={busy} onClick={close}>Cancelar</button><button form={formId} type="submit" className={spec.danger?s.danger:'gold'} disabled={busy||uncertain}>{busy?'Processando…':spec.confirm||'Confirmar'}</button></>}><form id={formId} onSubmit={submit} className={s.form}>{error&&<Notice title="Não foi possível concluir" focus>{error.message}</Notice>}{uncertain&&<Notice tone="warning">Atualize a consulta antes de repetir: a operação pode ter sido registrada.</Notice>}<p className={s.formHint}><span className={s.required}>*</span> Campos obrigatórios</p><fieldset disabled={busy||uncertain}>{visibleFields.map(f=>{const required=isRequired(f);return <label className={f.type==='checkbox'?s.checkField:(f.fullWidth||['motivo','observacao','justificativaDivergencia'].includes(f.key))?s.wideField:undefined} key={f.key}><span>{f.label}{required&&<b className={s.required}> *</b>}</span>{f.key==='terminalId'?<TerminalInput value={values[f.key]??''} onChange={value=>setValues(v=>({...v,[f.key]:value}))}/>:f.options?<select required={required} value={values[f.key]??''} onChange={e=>setValues(v=>({...v,[f.key]:e.target.value}))}><option value="">Selecione…</option>{f.options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??states[o]??channels[o]??paymentNames[o]??o}</option>)}</select>:<input type={f.type} min={f.type==='number'?0:undefined} step={f.type==='number'?'0.01':undefined} maxLength={f.maxLength} placeholder={f.placeholder||(f.type==='number'?'Ex.: 50,00':f.type==='password'?'Senha do autorizador':'Informe '+f.label.toLowerCase())} aria-invalid={!!error?.fieldErrors?.[f.key]} required={required} checked={f.type==='checkbox'?!!values[f.key]:undefined} value={f.type==='checkbox'?undefined:values[f.key]??''} onChange={e=>setValues(v=>({...v,[f.key]:f.type==='checkbox'?e.target.checked:e.target.value}))} />}{f.hint&&<small>{f.hint}</small>}{error?.fieldErrors?.[f.key]&&<small role="alert">{error.fieldErrors[f.key]}</small>}</label>})}</fieldset></form></Modal>
}
export function SalesList({kind='pedidos'}){
 const {user,can}=useStore()
 const {invoiceRevision}=useFiscalCheckout()
 const [responsibleName,setResponsibleName]=useState('')
 const {params,update,clear}=useListParams(kind==='sessoes'?'abertaEm':kind==='auditoria'?'ocorridoEm':'atualizadoEm','DESC');const [expanded,setExpanded]=useState(true),[selected,setSelected]=useState(null)
 const invoiceRefreshKey=kind==='pedidos'?invoiceRevision:undefined
 const pendingOnly=kind==='pedidos'&&params.nfcePendente==='true'
 const compactColumns=kind==='pedidos'?['numero','total','status','actions']:kind==='sessoes'?['caixaNome','abertaEm','status','actions']:['tipoEvento','usuarioNome','actions']
 const detailId=kind==='pedidos'?params.pedidoId:selected?.id
 function openDetail(row) {
  if(kind==='pedidos')update({pedidoId:row.id},false)
  else setSelected(row)
 }
 function closeDetail() {
  if(kind==='pedidos')update({pedidoId:null},false)
  else setSelected(null)
 }
 const request={pagina:params.pagina,tamanho:params.tamanho,ordenarPor:params.ordenarPor,direcao:params.direcao,dataInicio:params.dataInicio,dataFim:params.dataFim,...(kind==='pedidos'?{status:pendingOnly?undefined:params.status,canal:params.canal,sessaoCaixaId:params.sessaoCaixaId,numero:params.numero,nfcePendente:pendingOnly||undefined}:kind==='sessoes'?{status:params.status}:{tipoEvento:params.tipoEvento,sessaoCaixaId:params.sessaoCaixaId,usuarioId:params.usuarioId})}
 const query=useQueryResource(signal=>params.dataInicio&&params.dataFim&&params.dataInicio>params.dataFim?Promise.reject(new Error('Confira o período: a data inicial deve ser anterior à final.')):read(kind,request,signal),[kind,request],{refreshKey:invoiceRefreshKey});const rows=query.loading||query.error?[]:query.data?.itens||[]
 const cols=kind==='pedidos'?[
  {key:'numero',header:'Pedido',render:r=><strong className={s.orderNumber}>#{r.numero}</strong>},
  {key:'criadoEm',header:'Data e hora',render:r=><span className={s.orderDate}>{r.criadoEm?fmtDateTime(r.criadoEm):'—'}</span>},
  {key:'canal',header:'Canal / Identificação',sort:false,render:r=><div className={s.orderIdentity}><strong>{channels[r.canal]||r.canal||'Não informado'}</strong>{r.identificadorAtendimento?.trim()&&<span>{r.identificadorAtendimento}</span>}</div>},
  {key:'total',header:'Total',align:'right',render:r=>r.total==null?'—':fmtBRL(r.total)},
  {key:'saldoRestante',header:'Pagamento',sort:false,render:r=><OrderPaymentSummary order={r}/>},
  {key:'status',header:'Situação',render:r=><div className={s.orderStatuses}><Badge value={r.status}/>{needsInvoice(r)&&<Badge value="NFC-e pendente"/>}</div>}
 ]:kind==='sessoes'?[{key:'caixaNome',header:'Caixa',sort:false},{key:'operadorNome',header:'Operador',sort:false},{key:'abertaEm',header:'Abertura',render:r=>fmtDateTime(r.abertaEm)},{key:'diferenca',header:'Diferença',render:r=>r.diferenca==null?'—':fmtBRL(r.diferenca)},{key:'status',header:'Situação',render:r=><Badge value={r.status}/>}]:[
  {key:'ocorridoEm',header:'Data e hora',render:r=><span className={s.orderDate}>{auditDateLabel(r.ocorridoEm)}</span>},
  {key:'tipoEvento',header:'Evento',render:r=><AuditEventBadge code={r.tipoEvento}/>},
  {key:'usuarioNome',header:'Responsável',render:r=><AuditResponsible event={r}/>},
  {key:'pedidoIdentificador',header:'Pedido / Referência',sort:false,render:auditReference},
  {key:'valor',header:'Valor',align:'right',render:r=>r.valor==null?'—':fmtBRL(r.valor)},
  {key:'descricao',header:'Resumo',sort:false,render:r=><span className={s.auditSummary} title={r.descricao||undefined}>{r.descricao||'—'}</span>}
 ]
 cols.push({key:'actions',header:'Ações',sort:false,render:r=><button type="button" onClick={()=>openDetail(r)}><Eye size={15} aria-hidden="true"/>Ver detalhes</button>})
 const filterTitle=kind==='sessoes'?'sessões de caixa':kind==='auditoria'?'auditoria':'pedidos'
 const statusOptions=kind==='sessoes'?['ABERTA','EM_FECHAMENTO','FECHADA']:
  ['EM_ATENDIMENTO','AGUARDANDO_MAQUINA','AGUARDANDO_PAGAMENTO','PAGAMENTO_PARCIAL','CONCLUIDO','CANCELADO','ESTORNADO']
 const divergencia=params.status==='EM_FECHAMENTO'
 const hasExtraFilter=kind==='auditoria' && can('USUARIOS_VISUALIZAR')
 const selectedPeriod=params.periodo || (!params.dataInicio && !params.dataFim ? 'todos' : undefined)
 function changePeriod({id,dataInicio,dataFim}) {
  update({periodo:id==='todos'?'':id,dataInicio,dataFim})
 }
 const pagination={
  page:params.pagina,total:query.data?.totalItens||0,loading:query.loading,
  sort:{key:params.ordenarPor,dir:params.direcao.toLowerCase()},
  onPage:pagina=>update({pagina},false),
  onSort:sort=>update({ordenarPor:sort.key,direcao:sort.dir.toUpperCase()}),
 }
 return <>
  <section className={s.panel + ' ' + s.dateFilters}>
   <FilterHeader className={s.filterHeading}>
    <h2><button type="button" className={s.collapse} onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded} aria-controls="sales-filter-fields">
     <SlidersHorizontal size={17} aria-hidden="true"/>Filtros de {filterTitle}
     <ChevronDown size={17} className={expanded?s.rotated:undefined} aria-hidden="true"/>
    </button></h2>
    <FilterActions onClear={clear} onRefresh={query.reload} refreshing={query.loading}>
     {kind==='pedidos'&&<button type="button" aria-pressed={pendingOnly}
      onClick={()=>update({nfcePendente:pendingOnly?'':'true',status:''})}>
      <Eye size={17} aria-hidden="true"/>NFC-e pendente
     </button>}
     {kind==='sessoes'&&<button type="button" aria-pressed={divergencia}
      onClick={()=>update({status:divergencia?'':'EM_FECHAMENTO'})}>
      <Eye size={17} aria-hidden="true"/>Ver divergências pendentes
     </button>}
    </FilterActions>
   </FilterHeader>
   <div id="sales-filter-fields" hidden={!expanded}>
    <div className={kind==='pedidos' ? s.grid : s.grid + ' ' + s.dateFilterGrid} data-extra-field={hasExtraFilter || undefined}>
     {kind==='auditoria'?<AuditFilters params={params} update={update} user={user} responsibleName={responsibleName}
      canReadUsers={can('USUARIOS_VISUALIZAR')} onResponsibleChange={(id,name)=>{setResponsibleName(name);update({usuarioId:id})}}/>:
      <label>Situação<select disabled={pendingOnly} value={pendingOnly?'CONCLUIDO':params.status||''} onChange={event=>update({status:event.target.value})}>
       <option value="">Todas</option>{statusOptions.map(value=><option key={value} value={value}>{states[value]}</option>)}
      </select></label>}
     {kind==='pedidos'&&<label>Canal<select value={params.canal||''} onChange={event=>update({canal:event.target.value})}>
      <option value="">Todos</option>{['BALCAO','MESA','RETIRADA','DELIVERY'].map(value=><option key={value} value={value}>{channels[value]}</option>)}
     </select></label>}
     {kind!=='pedidos'&&<DateRangeFilter label={kind==='sessoes'?'Período de abertura':'Período'} className={s.dateFilterPeriod}
      selected={selectedPeriod} onChange={changePeriod} />}
    </div>
   </div>
   {kind==='pedidos'&&<div className={s.orderSearch}>
    <label>Número do pedido<SearchInput label="Buscar número do pedido" placeholder="Ex.: 345" inputMode="numeric" maxLength={16}
     value={params.numero||''} onChange={value=>update({numero:value.replace(/\D/g,'').replace(/^0+/,'')})}/></label>
    <DateRangeFilter label="Período" className={s.dateFilterPeriod} selected={selectedPeriod} onChange={changePeriod} />
   </div>}
  </section>
  <Feedback query={query}/>
  <DataTable compactColumns={compactColumns} caption={filterTitle} pageSize={params.tamanho} columns={cols} rows={rows}
   paginationControls={<PageSizeControl value={params.tamanho} onChange={tamanho => update({ tamanho })} />}
   emptyText="Nenhum registro nesta consulta." remote={pagination}/>
  {detailId&&(kind==='auditoria'?<CashAuditDetail event={selected} onClose={closeDetail}/>:
   <Detail key={detailId} kind={kind} id={detailId} close={closeDetail} done={query.reload} invoiceRevision={invoiceRefreshKey}/>)}
 </>
}
function Detail({kind,id,close,done,invoiceRevision}){
 const {can}=useStore()
 const query=useQueryResource(signal=>read(kind+'/'+id,{},signal),[kind,id],{refreshKey:invoiceRevision})
 const [op,setOp]=useState(null)
 const d=query.data
 function refresh() { query.reload(); done() }

 if(kind==='sessoes'){
  const resolve=can('CAIXA_RESOLVER_DIVERGENCIA') ? id=>setOp({
   title:'Resolver divergência',
   fields:[field('observacao','Observação')],
   run:values=>write('sessoes/'+id+'/resolucao-divergencia',values),
  }) : undefined
  return <>
   <CashSessionDetail query={query} onClose={close} onResolve={resolve}/>
   {op&&<FormModal spec={op} close={()=>setOp(null)} done={refresh}/>}
  </>
 }

 return <Drawer title="Detalhes" onClose={close}>
  <h2 className={s.drawerTitle}><Receipt size={22} aria-hidden="true"/>Detalhes do pedido</h2>
  <Feedback query={query}/>
  {!query.loading&&!query.error&&d&&<>
   <h3>{d.caixaNome||d.identificadorAtendimento||d.descricao||'Pedido #'+d.numero}</h3>
   <p>{states[d.status]||d.tipoEvento} · {d.operadorNome||d.usuarioNome}</p>
   <OrderInvoice order={d} canIssue={can('CAIXA_OPERAR')} onIssued={refresh}/>
   <OrderContent order={d} refresh={refresh}/>
  </>}
 </Drawer>
}
export const OrdersPage=p=><SalesList {...p}/>
export const SessionsPage=p=><SalesList {...p} kind="sessoes"/>
export const AuditPage=p=><SalesList {...p} kind="auditoria"/>
function OrderContent({order,refresh,onQuantity,itemBusy,hideStatus=false}){
 const fiscal=useFiscalCheckout()
 const {can,invalidateCatalog}=useStore()
 const [op,setOp]=useState(null),[paymentOpen,setPaymentOpen]=useState(false)
 const base='pedidos/'+order.id
 async function updateCharge(path,body,method='POST'){
   const updated=await write(path,body,method)
   if(updated?.id===order.id){
     fiscal.observe(updated)
     if(['CONCLUIDO','ESTORNADO'].includes(updated.status))invalidateCatalog?.()
   }
   return updated
 }
 const refreshRef=useRef(refresh);useEffect(()=>{refreshRef.current=refresh},[refresh])
 const pendingPayment=order.pagamentos?.some(p=>['PENDENTE','PENDENTE_NA_POINT','EM_TERMINAL','CANCELAMENTO_SOLICITADO','ESTORNO_EM_ANDAMENTO'].includes(p.status))
 useEffect(()=>{if(!pendingPayment||op||paymentOpen)return;const timer=setInterval(()=>{if(!document.hidden)refreshRef.current()},5000);return()=>clearInterval(timer)},[pendingPayment,order.id,op,paymentOpen])
 const config=useQueryResource(signal=>read('configuracao',{},signal),[])
 const auth=[field('motivo','Motivo'),field('autorizadorEmail','E-mail do autorizador, se necessário','email',false),field('autorizadorSenha','Senha do autorizador, se necessário','password',false)]
 const hasItems = !!order.itens?.length
 const canEditItems = canEditOrderItems(order)
 const canCancel = canCancelOrder(order, can('CAIXA_OPERAR'))
 const refundInProgress = hasRefundInProgress(order)
 const orderRefundMotivo = order.pagamentos?.find(p=>p.status==='ESTORNO_EM_ANDAMENTO'&&p.motivoEstorno)?.motivoEstorno || ''
 const cancellationFields = [
   field('motivo', 'Motivo', 'text', hasItems),
   ...(hasItems && !can('CAIXA_CANCELAR') ? [
     field('autorizadorEmail', 'E-mail do autorizador', 'email'),
     field('autorizadorSenha', 'Senha do autorizador', 'password'),
   ] : []),
 ]
 function pay(){setPaymentOpen(true)}
 return <><div className={s.stats}>{[['Total',order.total],['Recebido aprovado',order.totalPago],['Restante',order.saldoRestante]].map(([k,v])=><div key={k}><span>{k}</span><strong>{fmtBRL(v)}</strong></div>)}</div>{!hideStatus&&<div className={s.orderState}><span>Situação do pedido</span><Badge value={order.status}/></div>}{refundInProgress&&<Notice tone="warning" title="Estorno em andamento">Há um estorno aguardando confirmação na maquininha Point. Se a tentativa anterior falhou por comunicação, retome o estorno abaixo sem risco de duplicidade.</Notice>}<h3 className={s.sectionTitle}><Package size={18} aria-hidden="true"/>Itens do pedido</h3>{!order.itens?.length&&<div className={s.empty}><Package size={28} aria-hidden="true"/><b>O pedido está vazio</b><p>Busque um produto acima para adicionar o primeiro item.</p></div>}{order.itens?.map(i=><div className={s.itemRow} key={i.id}>{onQuantity&&can('CAIXA_OPERAR')&&canEditItems?<div className={s.quantityControls}><button type="button" disabled={itemBusy} aria-label={'Diminuir '+i.descricaoProduto} onClick={()=>onQuantity(i,Math.max(0,Number(i.quantidade)-1))}>−</button><span>{i.quantidade}</span><button type="button" disabled={itemBusy} aria-label={'Aumentar '+i.descricaoProduto} onClick={()=>onQuantity(i,Number(i.quantidade)+1)}>+</button></div>:<span className={s.itemQuantity}>{i.quantidade}×</span>}<strong>{i.descricaoProduto}</strong><span className={s.itemAmount}>{fmtBRL(i.subtotal)}</span> {canEditItems&&can('CAIXA_OPERAR')&&<button onClick={()=>setOp({title:'Remover item?',fields:[],danger:true,run:()=>write(base,{itens:order.itens.filter(item=>item.id!==i.id).map(item=>({produtoId:item.produtoId,quantidade:item.quantidade}))},'PUT')})}>Remover</button>}</div>)}<div className={s.discountLine}><span>Desconto aplicado</span><strong>{fmtBRL(order.desconto)}</strong>{order.statusDesconto==='PENDENTE_AUTORIZACAO'&&<Badge value="Aguardando aprovação"/>}</div>
 <div className={s.actions}>{order.status==='CONCLUIDO' && (can('CAIXA_ESTORNAR') || can('CAIXA_OPERAR')) && <button className={s.danger} onClick={()=>setOp({
   title:refundInProgress?'Retomar estorno do pedido?':'Estornar pedido concluído?',
   description:refundInProgress?'Reenvia a solicitação de estorno pendente para concluir a devolução do pedido e retornar os itens ao estoque.':'O estorno é integral e registra a devolução dos itens ao estoque. Confira o pedido antes de confirmar.',
   initial:refundInProgress&&orderRefundMotivo?{motivo:orderRefundMotivo}:{},
   fields:[{...auth[0],maxLength:500},...(can('CAIXA_ESTORNAR')?[]:[field('autorizadorEmail','E-mail do autorizador','email'),field('autorizadorSenha','Senha do autorizador','password')])],
   danger:true, confirm:refundInProgress?'Retomar estorno':'Confirmar estorno', run:values=>updateCharge(base+'/estorno',values)
 })}>{refundInProgress?'Retomar estorno do pedido':'Estornar pedido'}</button>}{can('CAIXA_OPERAR')&&order.saldoRestante>0&&!order.pagamentos?.some(p=>PENDING_PAYMENT_STATES.includes(p.status))&&!['CANCELADO','ESTORNADO','CONCLUIDO'].includes(order.status)&&<button className="gold" disabled={config.loading||!!config.error||order.statusDesconto==='PENDENTE_AUTORIZACAO'} onClick={pay}>Receber pagamento</button>}{canApplyOrderDiscount(order,can('CAIXA_OPERAR'))&&<button onClick={()=>setOp({title:'Desconto',description:'Acima da alçada, informe autorização ou envie somente o motivo para solicitar aprovação.',fields:[{key:'tipoDesconto',label:'Tipo',options:['VALOR','PERCENTUAL'],required:true},field('valorDescontoInformado','Desconto informado','number'),...auth],run:v=>updateCharge(base+'/desconto',v,'PUT')})}>Aplicar desconto</button>}{order.statusDesconto==='PENDENTE_AUTORIZACAO'&&can('CAIXA_OPERAR')&&<button onClick={()=>setOp({title:'Remover solicitação de desconto?',fields:[],run:()=>write(base+'/desconto',undefined,'DELETE')})}>Remover solicitação</button>}{order.statusDesconto==='PENDENTE_AUTORIZACAO'&&(can('CAIXA_AUTORIZAR_DESCONTO')||can('CAIXA_OPERAR'))&&<button onClick={()=>setOp({title:'Decidir desconto',fields:[field('aprovado','Aprovar solicitação','checkbox',false),{...field('observacao','Justificativa','text',v=>!v.aprovado),maxLength:500,placeholder:'Obrigatória ao negar a solicitação'},...(can('CAIXA_AUTORIZAR_DESCONTO')?[]:[field('autorizadorEmail','E-mail do autorizador','email'),field('autorizadorSenha','Senha do autorizador','password')])],run:v=>updateCharge(base+'/desconto/decisao',v)})}>Decidir desconto</button>}{canCancel&&<button className={s.danger} onClick={()=>setOp({title:'Cancelar pedido?',danger:true,fields:cancellationFields,run:v=>write(base+'/cancelamento',v)})}>Cancelar pedido</button>}</div><Feedback query={config}/><h3 className={s.sectionTitle}><CreditCard size={18} aria-hidden="true"/>Pagamentos</h3>{!order.pagamentos?.length&&<p className={s.emptyNote}>Os recebimentos deste pedido aparecerão aqui após o primeiro registro.</p>}{order.pagamentos?.map(p=>{
  const syncable=can('CAIXA_OPERAR')&&canSyncPointPayment(p,order)
  const cancelablePoint=can('CAIXA_OPERAR')&&canCancelPointPayment(p,order)
  const conciliable=canConciliatePayment(p,order,can('CAIXA_OPERAR'),can('CAIXA_RESOLVER_DIVERGENCIA'))
  const refundable=canRefundPayment(p,order,can('CAIXA_OPERAR'),can('CAIXA_ESTORNAR'))
  const retryingPaymentRefund=p.status==='ESTORNO_EM_ANDAMENTO'
  const refundDescription=retryingPaymentRefund
   ?'O estorno anterior deste pagamento não foi confirmado. Reenvie para concluir o estorno na maquininha Point e atualizar o pedido.'
   :p.provedor==='MERCADO_PAGO'
    ?'Solicita o estorno na maquininha Point e recalcula o saldo em aberto do pedido, mantendo os itens.'
    :p.forma==='DINHEIRO'
     ?'Registra a saída em dinheiro na gaveta do caixa aberto e recalcula o saldo em aberto do pedido, mantendo os itens.'
     :'Estorna este pagamento aprovado e recalcula o saldo em aberto do pedido, mantendo os itens.'
  const hasActions=syncable||cancelablePoint||conciliable||refundable
  return <section className={s.panel} key={p.id}><b>{paymentNames[p.forma]||p.forma} · {fmtBRL(p.valorCobrado??p.valor)}</b><div className={s.paymentState}><Badge value={p.status}/>{p.statusDetalhe&&<p>{p.statusDetalhe}</p>}</div>{hasActions&&<div className={s.actions}>{(syncable||cancelablePoint)&&<>{syncable&&<button onClick={()=>setOp({title:'Verificar pagamento',fields:[],run:()=>updateCharge(base+'/pagamentos/'+p.id+'/sincronizar')})}>Verificar agora</button>}{cancelablePoint&&<button onClick={()=>setOp({title:'Solicitar cancelamento na Point?',fields:[],danger:true,run:()=>write(base+'/pagamentos/'+p.id+'/cancelamento-point')})}>Cancelar cobrança</button>}</>}{conciliable&&<button onClick={()=>setOp({title:'Conferir recebimento externo',initial:{aprovado:false,comprovanteReferencia:p.comprovanteReferencia||''},description:v=>v.aprovado&&!can('CAIXA_RESOLVER_DIVERGENCIA')?'Confirmar o recebimento exige autorização gerencial (CAIXA_RESOLVER_DIVERGENCIA).':'Confira o comprovante antes de confirmar ou informe o motivo para cancelar.',fields:[field('aprovado','Recebimento confirmado','checkbox',false),{...field('motivo','Justificativa','text',v=>!v.aprovado),maxLength:500,placeholder:'Obrigatória ao cancelar; opcional ao confirmar'},{...field('comprovanteReferencia','Referência','text',false),maxLength:255,placeholder:'Ex.: NSU ou código do comprovante'},...(!can('CAIXA_RESOLVER_DIVERGENCIA')?[{...field('autorizadorEmail','E-mail do autorizador','email',true),when:v=>!!v.aprovado},{...field('autorizadorSenha','Senha do autorizador','password',true),when:v=>!!v.aprovado}]:[])],run:v=>updateCharge(base+'/pagamentos/'+p.id+'/conciliacao',v)})}>Conciliar recebimento</button>}{refundable&&<button className={s.danger} onClick={()=>setOp({title:retryingPaymentRefund?'Retomar estorno do pagamento?':'Estornar pagamento aprovado?',description:refundDescription,initial:p.motivoEstorno?{motivo:p.motivoEstorno}:{},fields:[{...field('motivo','Motivo'),maxLength:500},...(can('CAIXA_ESTORNAR')?[]:[field('autorizadorEmail','E-mail do autorizador','email'),field('autorizadorSenha','Senha do autorizador','password')])],danger:true,confirm:retryingPaymentRefund?'Retomar estorno':'Confirmar estorno',run:values=>updateCharge(base+'/pagamentos/'+p.id+'/estorno',values)})}>{retryingPaymentRefund?'Retomar estorno':'Estornar pagamento'}</button>}</div>}</section>
 })}{op&&<FormModal spec={op} close={()=>setOp(null)} done={refresh}/ >}{paymentOpen&&<SalePaymentModal order={order} onClose={()=>{setPaymentOpen(false);refresh()}}/>}</>
}
export function CashRemote({navigate,pageParams}){
 const {can}=useStore();const session=useQueryResource(signal=>read('sessoes/atual',{},signal),[])
 const [historyOpen,setHistoryOpen]=useState(false)
 const [turnExpanded,setTurnExpanded]=useState(true)
 const [orderRevision,setOrderRevision]=useState(0)

 const [op,setOp]=useState(null),[id,setId]=useState(pageParams?.pedidoId||null)
 const previousSessionId=useRef(undefined)
 const currentSessionId=session.data?.id||null
 useEffect(()=>{
  if(session.loading||session.error)return
  if(previousSessionId.current!==undefined&&previousSessionId.current!==currentSessionId){setId(null);setHistoryOpen(false);setOp(null)}
  previousSessionId.current=currentSessionId
 },[currentSessionId,session.loading,session.error])
 const openOrders=useQueryResource(signal=>countOpenCashOrders(session.data?.id,signal),[session.data?.id,id,orderRevision])
 function refresh(){session.reload();setOrderRevision(v=>v+1)}
 function operation(title,path,fields,initial={}){setOp({title,fields,initial,run:v=>write(path,v)})}
 if((session.loading&&!session.data)||session.error)return <Feedback query={session}/>
 if(!session.data)return <CashOpening onOpened={session.reload} navigate={navigate}/>
 const turn=session.data,r=turn.resumoAtual||{}
 return <><section className={s.panel + (turnExpanded?'':' '+s.turnCollapsed)}><header className={s.turnHeader}><div className={s.turnTitle}><span className={s.headingIcon}><Wallet size={21} aria-hidden="true"/></span><h2><button type="button" className={s.turnToggle} onClick={()=>setTurnExpanded(value=>!value)} aria-expanded={turnExpanded} aria-controls="cash-turn-summary" title={turnExpanded?'Recolher dados do caixa':'Exibir dados do caixa'}>{turn.caixaNome}<ChevronDown size={17} aria-hidden="true" className={turnExpanded?s.rotated:undefined}/></button></h2></div><div className={s.turnState}><Badge value="ABERTA"/><dl className={s.turnMetadata}><div><dt>Abertura</dt><dd>{turn.abertaEm ? <time dateTime={turn.abertaEm}>{fmtDateTime(turn.abertaEm).replace(' · ', ' às ')}</time> : 'Horário não informado'}</dd></div></dl></div><button type="button" className={s.turnRefresh} onClick={refresh} disabled={session.loading} aria-label="Atualizar caixa" title="Atualizar os dados do caixa" aria-busy={session.loading||undefined}><RefreshCw size={17} aria-hidden="true" className={session.loading?s.turnRefreshing:undefined}/></button></header><div id="cash-turn-summary" hidden={!turnExpanded} className={s.stats}><div><span>Recebido aprovado</span><strong>{fmtBRL(r.totalVendas)}</strong></div><div><span>Dinheiro esperado</span><strong>{fmtBRL(r.dinheiroEsperado)}</strong></div></div><div className={s.actions + ' ' + s.turnActions} aria-label="Ações do turno">{can('CAIXA_OPERAR')&&<div className={s.turnActionGroup} role="group" aria-label="Movimentar dinheiro"><span>Movimentar dinheiro</span><div>{['SANGRIA','REFORCO'].map(tipo=><button key={tipo} onClick={()=>operation(tipo==='SANGRIA'?'Sangria':'Reforço','sessoes/'+turn.id+'/movimentacoes',[{...field('valor','Valor','number'),fullWidth:true},field('motivo','Motivo')],{tipo})}>{tipo==='SANGRIA'?<ArrowUpCircle size={15} aria-hidden="true"/>:<ArrowDownCircle size={15} aria-hidden="true"/>}{tipo==='SANGRIA'?'Sangria':'Reforço'}</button>)}</div></div>}<div className={s.turnActionGroup} role="group" aria-label="Consultar"><span>Consultar</span><div><button type="button" onClick={()=>setHistoryOpen(true)}><History size={15} aria-hidden="true"/>Histórico caixa</button><button onClick={()=>navigate('pedidos',{sessaoCaixaId:turn.id})}><Receipt size={15} aria-hidden="true"/>Pedidos do turno</button></div></div>{can('CAIXA_FECHAR')&&<div className={s.turnActionGroup + ' ' + s.turnEndGroup} role="group" aria-label="Encerrar turno"><span>Encerrar turno</span><div><button type="button" className={s.turnClose} onClick={()=>operation('Conferência de fechamento','sessoes/'+turn.id+'/fechamento',[field('dinheiroContado','Dinheiro contado','number'),field('justificativaDivergencia','Justificativa se houver diferença','text',false),field('observacao','Observação','text',false)])}><LockKeyhole size={15} aria-hidden="true"/>Fechar caixa</button></div></div>}</div></section>
 <CashWorkspace key={turn.id} creationRevision={orderRevision} sessionId={turn.id} selectedId={id} onSelect={setId} canOperate={can('CAIXA_OPERAR')} onChanged={refresh} openOrders={openOrders} OrderView={OrderContent} StatusView={Badge}/>{op&&<FormModal spec={op} close={()=>setOp(null)} done={refresh}/>}<>{historyOpen&&<CashHistory sessionId={turn.id} onClose={()=>setHistoryOpen(false)}/>}</></>
}
export function CashSettings({pageParams,navigate}){
 const [policyOpen,setPolicyOpen]=useState(false),[policySaved,setPolicySaved]=useState(false)
 const [equipmentMessage,setEquipmentMessage]=useState('')
 const {can}=useStore()
 const [creating,setCreating]=useState(pageParams?.cadastrar==='sim'),[created,setCreated]=useState(null)
 const [tab,setTab]=useState(['configuracao','caixas','taxas'].includes(pageParams?.aba)?pageParams.aba:'configuracao'),[op,setOp]=useState(null),[page,setPage]=useState(0)
 const query=useQueryResource(signal=>tab==='taxas'?null:read(tab,tab==='configuracao'?{}:{tamanho:4,pagina:page},signal),[tab,page]),d=query.data
 const booleanFields=['pointHabilitado','dinheiroHabilitado','debitoHabilitado','creditoHabilitado','pixHabilitado','parcelamentoHabilitado','imprimirComprovante','permitirPagamentoManual']
 const names={pointHabilitado:'Point integrada',dinheiroHabilitado:'Dinheiro',debitoHabilitado:'Débito',creditoHabilitado:'Crédito',pixHabilitado:'Pix',parcelamentoHabilitado:'Parcelamento',imprimirComprovante:'Imprimir comprovante no aparelho',permitirPagamentoManual:'Permitir contingência manual'}
 function editBox(box){setOp({title:'Editar caixa',width:'min(640px, calc(100vw - 32px))',description:box.emUso?'Este caixa está com turno aberto e não pode ser inativado.':'Inativar preserva sessões e pagamentos anteriores. Com a Point habilitada, mantenha uma maquininha ativa disponível.',initial:{nome:box.nome,ativo:box.ativo},fields:[{...field('nome','Nome do caixa'),maxLength:100,placeholder:'Ex.: Caixa Principal'},field('ativo','Caixa ativo','checkbox',false)],confirm:'Salvar caixa',run:v=>write('caixas/'+box.id,v,'PATCH')})}
 function addTerminal(box){
  setOp({
   title:'Adicionar maquininha',
   width:'min(640px, calc(100vw - 32px))',
   description:'Vincule um dispositivo do Mercado Pago ao caixa '+box.nome+'. O identificador do dispositivo deve ser único.',
   fields:[
    {...field('nome','Nome da maquininha'),fullWidth:true,maxLength:100,placeholder:'Ex.: Maquininha do balcão'},
    {...field('terminalId','Identificador no Mercado Pago'),fullWidth:true,maxLength:100,placeholder:'Ex.: PAX_A910__SMARTPOS1234567890'},
   ],
   confirm:'Adicionar maquininha',
   run:values=>write('caixas/'+box.id+'/terminais',values),
  })
 }
 function editTerminal(box,terminal){setOp({title:'Editar maquininha',width:'min(640px, calc(100vw - 32px))',description:`Vinculada ao caixa ${box.nome}. Para trocar de dispositivo, desative este vínculo e adicione outro. Com a Point habilitada, mantenha ao menos uma maquininha ativa disponível.`,initial:{nome:terminal.nome,ativo:terminal.ativo},fields:[{...field('nome','Nome da maquininha'),maxLength:100,placeholder:'Ex.: Maquininha do balcão'},field('ativo','Maquininha ativa','checkbox',false)],confirm:'Salvar maquininha',run:v=>write('caixas/'+box.id+'/terminais/'+terminal.id,v,'PATCH')})}
 function changeMode(terminal){setOp({title:'Modo de operação',width:'min(640px, calc(100vw - 32px))',description:'Altera o modo do dispositivo '+terminal.nome+' no Mercado Pago. PDV recebe cobranças integradas ao caixa; independente permite operar pelo aparelho.',fields:[{key:'modoOperacao',label:'Modo do aparelho',options:[{value:'PDV',label:'Integrada ao caixa (PDV)'},{value:'STANDALONE',label:'Uso independente (Standalone)'}],required:true}],confirm:'Alterar modo',run:v=>write('terminais/'+terminal.id+'/modo-operacao',v,'PATCH')})}
 function deleted(box){setEquipmentMessage('O caixa '+box.nome+' foi excluído.');if(page>0&&d?.itens?.length===1)setPage(value=>value-1);else query.reload()}
 return <>
  <nav className={accessStyles.tabs+' '+s.settingsNav} aria-label="Seções de ajustes do caixa">{[['configuracao','Políticas e pagamentos',Settings2],['caixas','Caixas e maquininhas',Wallet],['taxas','Taxas e repasse',CreditCard]].map(([value,label,Icon])=><a key={value} href={'#/ajustescaixa?aba='+value} aria-current={tab===value?'page':undefined} className={tab===value?accessStyles.tabOn:accessStyles.tab} onClick={event=>{event.preventDefault();setTab(value);setPage(0)}}><Icon size={14} aria-hidden="true"/>{label}</a>)}</nav>
  {tab==='caixas'&&can('CAIXA_CONFIGURAR')&&creating&&<CashBoxRegistration onCancel={()=>setCreating(false)} onCreated={box=>{setCreating(false);setCreated(box || {});setPage(0);query.reload()}} onRefresh={query.reload}/>}
  {tab === 'caixas' && created && <section className={'card ' + s.cashCreated} aria-label="Confirmação de cadastro de caixa">
    <span className={s.cashCreatedIcon}><CheckCircle2 size={22} aria-hidden="true" /></span>
    <div className={s.cashCreatedCopy} role="status">
      <h3>Caixa cadastrado</h3>
      <p>{created.nome ? <><strong>{created.nome}</strong> já pode ser selecionado para abrir um turno.</> : 'O novo caixa já pode ser selecionado para abrir um turno.'}</p>
    </div>
    <button type="button" className="gold" onClick={() => navigate('caixa')}>
      Ir para abertura do caixa <ArrowRight size={16} aria-hidden="true" />
    </button>
  </section>}
  {tab==='caixas'&&equipmentMessage&&<Notice tone="info" title="Cadastro atualizado">{equipmentMessage}</Notice>}
  {tab!=='taxas'&&<Feedback query={query}/>}
  {tab==='taxas'&&<CashRatesPanel canConfigure={can('CAIXA_CONFIGURAR')}/>}
  {tab==='configuracao'&&policySaved&&<Notice tone="info" title="Políticas atualizadas">As alterações foram salvas e serão consideradas nas próximas operações do caixa.</Notice>}
  {tab!=='taxas'&&!query.loading&&!query.error&&d&&(tab==='caixas'?<CashEquipmentPanel onGoToCash={()=>navigate('caixa')} data={d} page={page} creating={creating} canConfigure={can('CAIXA_CONFIGURAR')} onPage={setPage} onNewBox={()=>{setCreated(null);setEquipmentMessage('');setCreating(true)}} onEditBox={editBox} onAddTerminal={addTerminal} onEditTerminal={editTerminal} onChangeMode={changeMode} onDeleted={deleted}/>:<section className={s.panel}>
   <header className={s.policyHeading}><h2><Settings2 size={21} aria-hidden="true"/>Políticas e pagamentos</h2><p>Defina as formas de pagamento aceitas, a integração com a maquininha e as regras de parcelamento, juros e descontos usadas nos atendimentos do caixa.</p></header>
   <div className={s.policyGrid}>{booleanFields.map(key=><div className={s.policy} key={key}><span>{names[key]}</span><span className={s.policyValue} data-active={!!d[key]}>{d[key]?'Habilitado':'Desabilitado'}</span></div>)}</div><p>Desconto sem autorização: menor entre {d.limiteDescontoPercentual}% e {fmtBRL(d.limiteDescontoValor)}.</p>{can('CAIXA_CONFIGURAR')&&<button onClick={()=>{setPolicySaved(false);setPolicyOpen(true)}}>Editar políticas</button>}
  </section>)}
  {policyOpen&&d&&<CashPolicyModal config={d} onClose={()=>setPolicyOpen(false)} onSaved={()=>{setPolicyOpen(false);setPolicySaved(true);query.reload()}}/>}
  {op&&<FormModal spec={op} close={()=>setOp(null)} done={query.reload}/>}
 </>
}
