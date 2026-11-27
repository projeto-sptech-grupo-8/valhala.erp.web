import { reconcileComandaSlots } from '@/entities/sales/model/comandaSlots.js'
import { useEffect, useRef, useState } from 'react'
import { Package, Wine, Search, Plus, ChevronLeft, ChevronRight, Receipt, ShoppingBasket, TriangleAlert } from 'lucide-react'
import { useStore } from '@/entities/store'
import { api } from '@/shared/api/api.js'
import { PageSizeControl } from '@/shared/ui/data-table/PageSizeControl.jsx'
import { readCash, writeCash, createCashOrder, MAX_OPEN_CASH_ORDERS, OPEN_CASH_ORDER_STATES } from '@/entities/sales/api/cashApi.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { RecordAutocomplete } from '@/features/catalog/product-editor/ui/CategoryAutocomplete.jsx'
import { LoadingBlock, ErrorBlock, Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { canEditOrderItems } from '@/features/sales/payments/model/paymentRules.js'
import { fmtBRL, fmtNum } from '@/shared/lib/format.js'
import s from './CashWorkspace.module.css'
const statuses={EM_ATENDIMENTO:'Em atendimento',AGUARDANDO_MAQUINA:'Aguardando maquininha',AGUARDANDO_PAGAMENTO:'Aguardando pagamento',PAGAMENTO_PARCIAL:'Pagamento parcial',CONCLUIDO:'Concluído',CANCELADO:'Cancelado',ESTORNADO:'Estornado'}

function isOutOfStock(product) {
 if (product?.estoqueEsgotado != null) return product.estoqueEsgotado
 return product?.tipo === 'padrao' && Number.isFinite(product.quantidadeEstoqueBase) && product.quantidadeEstoqueBase <= 0
}

export function CashWorkspace({sessionId,selectedId,onSelect,creationRevision,canOperate,onChanged,openOrders,OrderView,StatusView}) {
 const { can } = useStore()
 const stockAccess = can('VISUALIZAR_ESTOQUE')
 const products = stockAccess ? api.produtos : api.produtosVenda
 const [search,setSearch]=useState(''),[debounced,setDebounced]=useState(''),[category,setCategory]=useState(''),[type,setType]=useState(''),[page,setPage]=useState(0),[pageSize,setPageSize]=useState(9)
 const [snapshot,setSnapshot]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(null),[uncertain,setUncertain]=useState(false),[mobile,setMobile]=useState('products')
 const [draft,setDraft]=useState(null)
 const lock=useRef(false),searchRef=useRef(null)
 useEffect(()=>{const timer=setTimeout(()=>{setDebounced(search);setPage(0)},300);return()=>clearTimeout(timer)},[search])
 const catalog=useQueryResource(signal=>products.pagina({busca:debounced,categoriaId:category,tipo:type||undefined,ativo:true,pagina:page,tamanho:pageSize,ordenarPor:'nome',direcao:'ASC'},signal),[stockAccess,debounced,category,type,page,pageSize],{refreshKey:creationRevision})
 const { loading: catalogLoading, reload: reloadCatalog } = catalog
 useEffect(() => {
  if (catalogLoading) return
  function refreshVisibleCatalog() { if (!document.hidden) reloadCatalog() }
  const timer = setInterval(refreshVisibleCatalog, 20_000)
  document.addEventListener('visibilitychange', refreshVisibleCatalog)
  return () => {
   clearInterval(timer)
   document.removeEventListener('visibilitychange', refreshVisibleCatalog)
  }
 }, [catalogLoading, reloadCatalog])
 const queue=useQueryResource(async signal=>{
  const [pages,selected]=await Promise.all([Promise.all(OPEN_CASH_ORDER_STATES.map(status=>readCash('pedidos',{sessaoCaixaId:sessionId,status,pagina:0,tamanho:5,ordenarPor:'criadoEm',direcao:'ASC'},signal))),selectedId?readCash('pedidos/'+selectedId,{},signal).catch(error=>{if(error.status===404)return null;throw error}):null])
  signal.throwIfAborted()
  if(pages.some(page=>!Array.isArray(page?.itens)))throw new Error('Não foi possível consultar os pedidos abertos.')
  const orders=[...new Map(pages.flatMap(page=>page.itens).filter(order=>OPEN_CASH_ORDER_STATES.includes(order.status)).map(order=>[order.id,order])).values()]
  const storageKey='cash-visual-slots:'+sessionId
  let previous=[]
  try{previous=JSON.parse(sessionStorage.getItem(storageKey)||'[]')}catch{ /* invalid preference */ }
  const activeCount=orders.length
  // Keep the finalized selection visible until the operator leaves it.
  if(selected&&selected.sessaoCaixaId===sessionId&&['CONCLUIDO','CANCELADO','ESTORNADO'].includes(selected.status)&&Array.isArray(previous)&&previous.includes(selected.id))orders.push(selected)
  const slots=reconcileComandaSlots(Array.isArray(previous)?previous:[],orders)
  try{sessionStorage.setItem(storageKey,JSON.stringify(slots))}catch{ /* visual positions still work without storage */ }
  return {slots:slots.map(id=>orders.find(order=>order.id===id)||null),overflow:activeCount>5||pages.some(page=>page.ultima===false)}
 },[sessionId,selectedId,creationRevision])
 const query=useQueryResource(async signal=>{
  if(!selectedId)return null
  const selected=await readCash('pedidos/'+selectedId,{},signal)
  return selected?.sessaoCaixaId===sessionId?selected:null
 },[sessionId,selectedId])
 const order=snapshot?.order?.sessaoCaixaId===sessionId&&snapshot?.order?.id===selectedId&&snapshot.source===query.data?snapshot.order:query.data?.id===selectedId&&!query.loading&&!query.error?query.data:null
 const finalizedOrderId=['CONCLUIDO','CANCELADO'].includes(order?.status)?order.id:null
 useEffect(()=>{
  if(!finalizedOrderId)return
  const timer=setTimeout(()=>{onSelect(null);setDraft(null);setSnapshot(null);setError(null);setUncertain(false)},5000)
  return()=>clearTimeout(timer)
 },[finalizedOrderId,sessionId,onSelect])
 const slots=queue.data?.slots||Array(5).fill(null)
 const capacityLabel = openOrders.loading ? 'Conferindo pedidos…' : openOrders.error
  ? 'Contagem indisponível' : `${openOrders.data} de ${MAX_OPEN_CASH_ORDERS} pedidos abertos`
 const atCapacity = !openOrders.loading && !openOrders.error && openOrders.data >= MAX_OPEN_CASH_ORDERS
 const queueHint = canOperate && !queue.loading && !queue.error && (atCapacity
  ? 'Conclua ou cancele um pedido para liberar uma posição.'
  : !selectedId && !draft && !queue.data?.overflow && slots.some(slot => !slot) ? 'Selecione uma posição livre.' : null)
 const slotIndex=draft?draft.position:slots.findIndex(slot=>slot?.id===selectedId)
 const displayTitle=slotIndex>=0?'Pedido '+(slotIndex+1):order&&!OPEN_CASH_ORDER_STATES.includes(order.status)?'Atendimento finalizado':'Pedido'
 const editable=!order||canEditOrderItems(order)
 const catalogInitialLoading = catalogLoading && !catalog.refreshing
 const rows = catalogInitialLoading || catalog.error ? [] : catalog.data?.itens ?? []
 const addingDisabled = !canOperate || busy || uncertain || !editable || !order || Boolean(selectedId && (query.loading || query.error))
 function refresh(){setSnapshot(null);if(selectedId)setUncertain(false);query.reload();queue.reload();onChanged?.()}
 function choose(id){if(lock.current)return;setDraft(null);onSelect(id);setError(null);setUncertain(false)}
 function chooseFree(position){if(lock.current||!canOperate)return;onSelect(null);setSnapshot(null);setDraft({position,canal:'BALCAO',identificadorAtendimento:''});setError(null);setUncertain(false);setMobile('order')}
 async function startOrder(event){
  event.preventDefault()
  if(lock.current||uncertain||!canOperate||!draft||queue.loading||queue.error)return
  if(draft.canal==='MESA'&&!draft.identificadorAtendimento.trim()){setError(new Error('Informe a identificação da mesa.'));return}
  lock.current=true;setBusy(true);setError(null)
  try{
   const created=await createCashOrder({sessaoCaixaId:sessionId,canal:draft.canal,identificadorAtendimento:draft.identificadorAtendimento.trim()||null})
   const key='cash-visual-slots:'+sessionId
   try{const saved=JSON.parse(sessionStorage.getItem(key)||'[]');const mapping=Array.from({length:5},(_,i)=>saved[i]||null);const position=mapping[draft.position]?mapping.indexOf(null):draft.position;if(position>=0){mapping[position]=created.id;sessionStorage.setItem(key,JSON.stringify(mapping))}}catch{ /* positions are recovered from the server */ }
   setDraft(null);onSelect(created.id);setSnapshot({order:created,source:query.data});queue.reload();onChanged?.()
  }catch(ex){setError(ex);if(ex.status===0&&!ex.mutationNotStarted)setUncertain(true)}finally{lock.current=false;setBusy(false)}
 }
 async function update(product,quantity,absolute=false){
  if (lock.current || addingDisabled) return
  const catalogProduct = absolute ? rows.find(row => row.id === product.id) : product
  if (isOutOfStock(catalogProduct) && (!absolute || quantity > Number(order.itens.find(item => item.produtoId === product.id)?.quantidade ?? 0))) {
   setError(new Error(`${catalogProduct.name} está com o estoque esgotado.`))
   return
  }
  lock.current=true;setBusy(true);setError(null)
  try {
   const items=order.itens.map(i=>({produtoId:i.produtoId,quantidade:Number(i.quantidade)}))
   const current=items.find(i=>i.produtoId===product.id)
   if(current)current.quantidade=absolute?quantity:current.quantidade+quantity
   else items.push({produtoId:product.id,quantidade:quantity})
   const updated=await writeCash('pedidos/'+order.id,{itens:items.filter(i=>i.quantidade>0)},'PUT')
   setSnapshot({order:updated,source:query.data});queue.reload();onChanged?.()
  }catch(ex){setError(ex);if(ex.status===409)reloadCatalog();if(ex.status===0&&!ex.mutationNotStarted)setUncertain(true)}finally{lock.current=false;setBusy(false)}
 }
 function searchKey(event){if(event.key!=='Enter')return;event.preventDefault();if(catalog.loading||search!==debounced)return;const exact=rows.find(p=>p.sku?.toLowerCase()===search.trim().toLowerCase());if(exact||rows.length===1)update(exact||rows[0],1)}
 const itemCount = (order?.itens || []).reduce((total, item) => total + (Number(item.quantidade) || 0), 0)
 return <section className={s.workspace} aria-label="Atendimento do caixa">
  <div className={s.mobileTabs}>
   <button type="button" aria-pressed={mobile==='products'} onClick={()=>setMobile('products')}><Package size={16} aria-hidden="true" />Produtos</button>
   <button type="button" aria-label="Exibir atendimento" aria-description={order ? `${fmtNum(itemCount)} itens · ${fmtBRL(order.total)}` : undefined} aria-pressed={mobile==='order'} onClick={()=>setMobile('order')}>
    <Receipt size={16} aria-hidden="true" /><span>{order ? 'Ver pedido' : displayTitle}{order && <small>{fmtNum(itemCount)} {itemCount === 1 ? 'item' : 'itens'} · {fmtBRL(order.total)}</small>}</span>
   </button>
  </div>
  <article className={s.catalog} data-mobile-hidden={mobile!=='products'}>
   <header><h2><ShoppingBasket size={21} aria-hidden="true"/>Selecione os itens</h2><p>Clique em um produto ou drink para adicionar ao pedido.</p></header>
   <div className={s.filters}><label className={s.search}><span>Buscar nome ou SKU</span><div><Search size={17} aria-hidden="true"/><input ref={searchRef} type="search" aria-label="Buscar produto ou SKU" value={search} placeholder="Ex.: Cerveja, caipirinha ou SKU" onChange={e=>setSearch(e.target.value)} onKeyDown={searchKey}/></div></label><RecordAutocomplete kind={stockAccess ? 'categorias' : 'categoriasVenda'} label="Categoria" required={false} value={category} onChange={id=>{setCategory(id);setPage(0)}} placeholder="Todas as categorias"/></div>
   <div className={s.types} aria-label="Tipos de produto">{[['','Todos'],['PADRAO','Produtos'],['DRINK','Drinks']].map(([value,label])=><button key={value} aria-pressed={type===value} onClick={()=>{setType(value);setPage(0)}}>{value==='DRINK'?<Wine size={15} aria-hidden="true"/>:<Package size={15} aria-hidden="true"/>}{label}</button>)}{category&&<button onClick={()=>{setCategory('');setPage(0)}}>Limpar categoria</button>}</div>
   {catalogInitialLoading ? <LoadingBlock label="Carregando produtos…" /> : catalog.error ? <ErrorBlock error={catalog.error} onRetry={reloadCatalog} /> : !rows.length ? <p className={s.empty}>Nenhum item encontrado. Tente outro nome ou categoria.</p> : (
    <div className={s.products}>
     {rows.map(product => {
      const outOfStock = isOutOfStock(product)
      const isDrink = product.tipo === 'drink'
      return <button key={product.id} type="button" className={s.product} data-out-of-stock={outOfStock || undefined}
        disabled={outOfStock || addingDisabled} onClick={() => update(product, 1)}
        aria-label={outOfStock ? `${product.name} · Estoque esgotado` : `Adicionar ${product.name}`}>
       <span className={s.productIcon}>{isDrink ? <Wine size={23} aria-hidden="true" /> : <Package size={23} aria-hidden="true" />}</span>
       <small>{isDrink ? 'Drink' : product.cat || 'Produto'}</small>
       <strong>{product.name}</strong>
       <span className={s.price}>{fmtBRL(product.price)}</span>
       {outOfStock ? <span className={s.stockAlert}><TriangleAlert size={14} aria-hidden="true" />Estoque esgotado</span>
        : <span className={s.add}><Plus size={14} aria-hidden="true" />Adicionar</span>}
      </button>
     })}
    </div>
   )}
   <footer className={s.pager}>
    <PageSizeControl ariaLabel="Itens por página do catálogo do caixa" value={pageSize} options={[9, 12, 18]} onChange={size=>{setPageSize(size);setPage(0)}} />
    <div className={s.pagerNavigation}><button disabled={!page||catalog.loading} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={15}/>Anterior</button><span>Página {page+1}</span><button disabled={catalog.loading||catalog.error||catalog.data?.ultima!==false} onClick={()=>setPage(p=>p+1)}>Próxima<ChevronRight size={15}/></button></div>
   </footer><p className={s.hint}>A disponibilidade dos itens é confirmada ao adicionar ao pedido.</p>
  </article>
  <article className={s.cart} data-mobile-hidden={mobile!=='order'}>
   <header><div className={s.orderHeading}><h2><Receipt size={21} aria-hidden="true"/>{displayTitle}</h2>{order&&StatusView&&<StatusView value={order.status}/>}</div><p>{order?.identificadorAtendimento||'Atendimento de balcão'}</p></header>
   <div className={s.queue}>
    <div className={s.queueHeading}>
     <span className={s.queueLabel}>Atendimentos</span>
     <span className={s.queueCapacity} role="status">{capacityLabel}</span>
    </div>
    {queueHint && <p className={s.queueHint}>{queueHint}</p>}
    {queue.error?<ErrorBlock error={queue.error} onRetry={queue.reload}/>:<div className={s.orderTabs}>{slots.map((slot,index)=><button key={index} type="button" disabled={busy||queue.loading||!!queue.error||(!slot&&(!canOperate||queue.data?.overflow))} aria-label={'Pedido '+(index+1)+(slot?'':', livre')} aria-description={slot ? statuses[slot.status] || slot.status : undefined} aria-pressed={slot?selectedId===slot.id:draft?.position===index} data-finalized={!!slot&&!OPEN_CASH_ORDER_STATES.includes(slot.status)} data-canceled={slot?.status==='CANCELADO'} title={slot?(statuses[slot.status]||slot.status)+(slot.identificadorAtendimento?' · '+slot.identificadorAtendimento:''):'Posição livre para o próximo atendimento'} onClick={()=>slot?choose(slot.id):chooseFree(index)}><strong>{index+1}</strong><small>{slot?(statuses[slot.status] || slot.status):'Livre'}</small></button>)}</div>}{queue.loading&&<small role="status">Atualizando pedidos…</small>}{queue.data?.overflow&&<Notice tone="warning">Há mais pedidos do que as cinco posições de atendimento. Consulte Pedidos do turno para ver a lista completa.</Notice>}</div>
   {error&&<Notice title="Não foi possível atualizar o pedido" focus>{error.message}</Notice>}{uncertain&&<Notice tone="warning">A resposta não foi confirmada. Atualize os pedidos antes de repetir.<button onClick={refresh}>Conferir pedido</button></Notice>}{!editable&&<Notice tone="info">{finalizedOrderId?`Pedido ${order.status==='CANCELADO'?'cancelado':'concluído'}. Em 5 segundos, o atendimento será liberado para a próxima venda.`:'Este pedido não permite alterar itens enquanto houver pagamento em andamento ou após o encerramento. Selecione outro pedido para atender.'}</Notice>}
   {draft?<form className={s.newOrderForm} onSubmit={startOrder}><h3>Iniciar pedido na posição {draft.position+1}</h3><p>Escolha o canal de atendimento. Depois, adicione os produtos ao pedido.</p><fieldset disabled={busy||uncertain}><label>Canal<select aria-label="Canal" value={draft.canal} onChange={e=>setDraft(v=>({...v,canal:e.target.value}))}>{[['BALCAO','Balcão'],['MESA','Mesa'],['RETIRADA','Retirada'],['DELIVERY','Delivery']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Identificação do atendimento {draft.canal==='MESA'?<b className={s.required}>*</b>:'(opcional)'}<input aria-label="Identificação do atendimento" required={draft.canal==='MESA'} maxLength={100} placeholder={draft.canal==='MESA'?'Ex.: Mesa 3':'Ex.: Nome do cliente'} value={draft.identificadorAtendimento} onChange={e=>setDraft(v=>({...v,identificadorAtendimento:e.target.value}))}/></label></fieldset><div className={s.draftActions}><button type="button" disabled={busy} onClick={()=>setDraft(null)}>Cancelar</button><button type="submit" className="gold" disabled={busy||uncertain||queue.loading||!!queue.error}>{busy?'Iniciando…':'Iniciar pedido'}</button></div></form>:query.loading&&!order?<LoadingBlock label="Carregando pedido…"/>:query.error?<ErrorBlock error={query.error} onRetry={refresh}/>:order?<fieldset disabled={busy} className={s.cartBody}>{busy&&<p role="status">Salvando itens…</p>}<OrderView hideStatus order={order} refresh={refresh} onQuantity={(item,quantity)=>update({id:item.produtoId},quantity,true)} itemBusy={busy}/></fieldset>:<div className={s.empty}><Receipt size={34} aria-hidden="true"/><h3>Sua próxima venda começa aqui</h3><p>Selecione uma posição livre acima para informar os dados do atendimento e iniciar o pedido.</p></div>}
  </article>
 </section>
}
