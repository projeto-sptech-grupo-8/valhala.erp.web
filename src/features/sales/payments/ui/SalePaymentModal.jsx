import { useFiscalCheckout } from '@/pages/sales/invoices/fiscalContext.js'
import { ConsumerFields } from '@/pages/sales/invoices/ui/FiscalCheckout.jsx'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CreditCard, CheckCircle2, Clock3, Wallet, RefreshCw } from 'lucide-react'
import { readCash, writeCash } from '@/entities/sales/api/cashApi.js'
import { useStore } from '@/entities/store'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { Modal, Notice, LoadingBlock, ErrorBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { MoneyInput } from '@/features/catalog/product-editor/ui/MoneyInput.jsx'
import { fmtBRL } from '@/shared/lib/format.js'
import { PAYMENT_NAMES, PENDING_PAYMENT_STATES, cents, availablePaymentCents, enabledPaymentForms, allowedInstallments, validatePaymentEntry, paymentPayload, chargePreview, splitPaymentCents, rebalancePaymentEntries } from '../model/paymentRules.js'
import { CardPaymentStatus } from './CardPaymentStatus.jsx'
import s from './SalePaymentModal.module.css'
const ordinal=['primeiro','segundo','terceiro','quarto']
const feminine=['primeira','segunda','terceira','quarta']
const isCard = form => form === 'CREDITO' || form === 'DEBITO'
const terminalFailure=['RECUSADO','EXPIRADO','CANCELADO']
const emptyEntry=(forma,valor)=>({forma,valor,parcelas:1,valorRecebido:'',terminalCaixaId:'',contingenciaManual:false,comprovanteReferencia:''})
function hasCardConfirmation(order, payload) {
 return isCard(payload.forma) && order.pagamentos?.some(payment =>
  payment.chaveIdempotencia === payload.chaveIdempotencia && payment.status === 'APROVADO')
}
function restore(key,order) {
 try {
  const saved=JSON.parse(sessionStorage.getItem(key)||'null')
  if(saved?.version===1&&saved.orderId===order.id&&Array.isArray(saved.entries)&&saved.entries.length>=1&&saved.entries.length<=4&&Array.isArray(saved.attempts))return saved
  const legacy=JSON.parse(sessionStorage.getItem('cash-payment-'+order.id)||'null')
  if(legacy?.chaveIdempotencia&&!order.pagamentos?.some(p=>p.chaveIdempotencia===legacy.chaveIdempotencia))return {version:1,orderId:order.id,split:false,entries:[legacy],attempts:[legacy]}
 }catch { /* Ignore invalid local preferences; the server remains authoritative. */ }
 return null
}
export function SalePaymentModal({order,onClose}) {
 const fiscal=useFiscalCheckout()
 const [customer,setCustomer]=useState(()=>fiscal.customers.current.get(order.id)||{})
 function identify(value){setCustomer(value);fiscal.customers.current.set(order.id,value)}
 const {user,invalidateCatalog}=useStore(),formId=useId(),lock=useRef(false)
 const storageKey='cash-payment-plan:'+user?.id+':'+order.id
 const [plan,setPlan]=useState(()=>restore(storageKey,order))
 const [split,setSplit]=useState(()=>!!restore(storageKey,order)?.split)
 const [partCount,setPartCount]=useState(()=>Math.max(2,restore(storageKey,order)?.entries?.length||2))
 const [drafts,setDrafts]=useState(()=>restore(storageKey,order)?.entries||[emptyEntry('DINHEIRO',order.saldoRestante),emptyEntry('PIX',0)])
 const [snapshot,setSnapshot]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(null),[fields,setFields]=useState({})
 const query=useQueryResource(signal=>readCash('pedidos/'+encodeURIComponent(order.id),{},signal),[order.id])
 const config=useQueryResource(signal=>readCash('configuracao',{},signal),[])
 const equipment=useQueryResource(signal=>config.data?.pointHabilitado&&order.sessaoCaixaId?readCash('sessoes/'+encodeURIComponent(order.sessaoCaixaId),{},signal).then(session=>readCash('caixas/'+encodeURIComponent(session.caixaId),{},signal)):null,[order.sessaoCaixaId,config.data?.pointHabilitado])
 const current=snapshot?.source===query.data?snapshot.order:query.data
 useEffect(()=>{fiscal.confirmWatched(current)},[current,fiscal])
 const cfg=config.data,terminals=equipment.data?.terminais?.filter(t=>t.ativo)||[]
 const entries=plan?.entries||drafts.slice(0,split?partCount:1).map(entry=>cfg&&!enabledPaymentForms(cfg).includes(entry.forma)?{...entry,forma:enabledPaymentForms(cfg)[0]||''}:entry)
 const payments=current?.pagamentos||[]
 const results=entries.map((_,index)=>{const key=plan?.attempts?.[index]?.chaveIdempotencia;return key?payments.find(p=>p.chaveIdempotencia===key):undefined})
 const stage=plan?results.findIndex(p=>p?.status!=='APROVADO'):0
 const needsTerminals=!!cfg?.pointHabilitado&&entries.some((entry,index)=>(!plan||index===stage)&&entry.forma!=='DINHEIRO'&&!entry.contingenciaManual)
 const allDone=!!plan&&stage===-1
 const activeResult=stage>=0?results[stage]:null
 const waiting=activeResult&&PENDING_PAYMENT_STATES.includes(activeResult.status)
 const otherPending=payments.find(p=>PENDING_PAYMENT_STATES.includes(p.status)&&p.id!==activeResult?.id)
 const terminalFailed=!!activeResult&&terminalFailure.includes(activeResult.status)
 const fiscalRow=fiscal.receipts.find(row=>row.id===order.id)
 const completedPayment=allDone?results.at(-1):null
 const statusPayment=waiting||terminalFailed?activeResult:otherPending||completedPayment
 const cardStatus=isCard(statusPayment?.forma)?statusPayment:null
 const finalOrder=current&&['CONCLUIDO','CANCELADO','ESTORNADO'].includes(current.status)
 const available=current?availablePaymentCents(current):0
 const ready=!!current&&!!cfg&&!query.loading&&!query.error&&!config.loading&&!config.error
 const poll=!!waiting&&['PENDENTE','PENDENTE_NA_POINT','EM_TERMINAL','CANCELAMENTO_SOLICITADO','ESTORNO_EM_ANDAMENTO'].includes(activeResult.status)
 const reloadRef=useRef(query.reload);useEffect(()=>{reloadRef.current=query.reload},[query.reload])
 useEffect(()=>{if(!poll||busy||query.loading)return;const timer=setInterval(()=>{if(!document.hidden)reloadRef.current()},5000);return()=>clearInterval(timer)},[poll,busy,query.loading])
 useEffect(()=>{if(allDone){try{sessionStorage.removeItem(storageKey);sessionStorage.removeItem('cash-payment-'+order.id)}catch{ /* server already confirmed */ }}},[allDone,storageKey,order.id])
 function persist(next) {sessionStorage.setItem(storageKey,JSON.stringify(next));setPlan(next)}
 function configure(value,count=partCount) {
  if(plan)return
  setSplit(value);setPartCount(count);setError(null);setFields({})
  const forms=cfg?enabledPaymentForms(cfg):['DINHEIRO','PIX']
  const amounts=splitPaymentCents(available,value?count:1)
  setDrafts(amounts.map((amount,index)=>emptyEntry(forms[index%Math.max(forms.length,1)]||'',amount/100)))
 }
 function change(index,key,value) {
  let values=entries.map(e=>({...e}))
  values[index][key]=value
  if(key==='forma')values[index].parcelas=1
  if(split&&key==='valor')values=rebalancePaymentEntries(values,index,value,available,plan?stage:0)
  setDrafts(values);setFields({});setError(null)
  if(plan){try{persist({...plan,entries:values})}catch{setError(new Error('Não foi possível preservar a tentativa neste navegador. Nenhuma nova cobrança foi enviada.'))}}
 }
 function revisedAttempt() {
  const next={...plan,attempts:[...plan.attempts]};next.attempts[stage]=null
  try{persist(next);setError(null)}catch(ex){setError(ex)}
 }
 async function submit(event) {
  event.preventDefault();if(lock.current||!ready||waiting||otherPending||allDone||finalOrder)return
  lock.current=true;setBusy(true);setError(null);setFields({})
  try {
   if(customer.documentoCliente?.trim() && ![11,14].includes(customer.documentoCliente.replace(/\D/g,'').length))throw new Error('Confira o CPF ou CNPJ do consumidor antes de continuar.')
   // Re-read immediately before charging; do not trust the displayed balance.
   const fresh=await readCash('pedidos/'+encodeURIComponent(order.id))
   setSnapshot({order:fresh,source:query.data})
   if(fresh.statusDesconto==='PENDENTE_AUTORIZACAO')throw new Error('Decida ou remova o desconto pendente antes de receber.')
   if(['CONCLUIDO','CANCELADO','ESTORNADO'].includes(fresh.status))throw new Error('O estado atual deste pedido não permite outro pagamento.')
   const index=plan?stage:0,attempt=plan?.attempts?.[index]
   if(attempt&&fresh.pagamentos?.some(p=>p.chaveIdempotencia===attempt.chaveIdempotencia))return
   if(fresh.pagamentos?.some(p=>PENDING_PAYMENT_STATES.includes(p.status)))throw new Error('Há uma cobrança pendente. Confira ou conclua esse recebimento antes de continuar.')
   const total=availablePaymentCents(fresh)
   if(!Number.isFinite(total)||total<=0)throw new Error('Não há saldo confirmado disponível para outra cobrança. Atualize o pedido.')
   const values=entries.map(e=>({...e,terminalCaixaId:e.terminalCaixaId||(terminals.length===1?terminals[0].id:'')}))
   const validation={}
   if(!plan){values.forEach((entry,i)=>{const errors=validatePaymentEntry(entry,cfg,terminals);if(i>0&&entry.forma==='DINHEIRO'&&(entry.valorRecebido===''||entry.valorRecebido==null))delete errors.valorRecebido;if(Object.keys(errors).length)validation[i]=errors})
    if(split&&values.reduce((sum,e)=>sum+cents(e.valor),0)!==total)throw new Error('Os valores das partes devem somar exatamente o saldo disponível do pedido.')
   }else if(!attempt){const errors=validatePaymentEntry(values[index],cfg,terminals);if(Object.keys(errors).length)validation[index]=errors}
   if(Object.keys(validation).length){setFields(validation);throw new Error('Confira os campos destacados antes de receber.')}
   const payload=attempt||paymentPayload(values[index],crypto.randomUUID(),cfg)
   if(!(cents(payload.valor)>0)||cents(payload.valor)>total)throw new Error('O valor excede o saldo atual. Atualize o pedido e confira os valores.')
   if(split&&values.slice(index).reduce((sum,entry)=>sum+cents(entry.valor),0)!==total)throw new Error('As partes restantes devem somar exatamente o saldo atualizado do pedido.')
   const next=plan?{...plan,attempts:[...plan.attempts]}:{version:1,orderId:order.id,split,entries:values.slice(0,split?partCount:1),attempts:[]}
   next.attempts[index]=payload
   try{persist(next)}catch{throw new Error('Não foi possível preservar a chave desta cobrança. Nenhum pagamento novo foi enviado.')}
   try {
    const updated=await writeCash('pedidos/'+encodeURIComponent(order.id)+'/pagamentos',payload)
    fiscal.observe(updated);setSnapshot({order:updated,source:query.data});invalidateCatalog?.()
    if(updated.status==='CONCLUIDO'&&!hasCardConfirmation(updated,payload)){
     try{sessionStorage.removeItem(storageKey);sessionStorage.removeItem('cash-payment-'+order.id)}catch{ /* receipt confirmed */ }
     onClose()
    }
   }catch(ex){
    // Reconcile a rejected/uncertain request before allowing any change of payload.
    try {const checked=await readCash('pedidos/'+encodeURIComponent(order.id));setSnapshot({order:checked,source:query.data})
     if(checked.pagamentos?.some(p=>p.chaveIdempotencia===payload.chaveIdempotencia)){fiscal.observe(checked);invalidateCatalog?.();if(checked.status==='CONCLUIDO'&&!hasCardConfirmation(checked,payload)){try{sessionStorage.removeItem(storageKey)}catch{ /* storage restricted */ }onClose()}return}
     if(ex.status>=400&&ex.status<500){
      const retry={...next,attempts:[...next.attempts]};retry.attempts[index]=null;persist(retry)
     }
    }catch{ /* Preserve the original payload and idempotency key. */ }
    throw ex
   }
  }catch(ex){setError(ex)}finally{lock.current=false;setBusy(false)}
 }
 const label=allDone?'Pagamento registrado':plan?.attempts?.[stage]&&!activeResult?'Reenviar mesma tentativa':split?'Receber '+ordinal[Math.max(stage,0)]+' pagamento':'Confirmar'
 return createPortal(<Modal title={<span className={s.title}><CreditCard size={21} aria-hidden="true"/>Receber pagamento</span>} subtitle={cardStatus ? undefined : "Cada parte é registrada separadamente. Só os pagamentos aprovados quitam o pedido."} className={s.paymentDialog} width="min(760px, calc(100vw - 40px))" busy={busy} onClose={onClose} footer={<><button type="button" className={cardStatus?.status === 'APROVADO' ? "gold" : undefined} onClick={()=>{if(fiscalRow?.note)fiscal.dismiss(order.id);onClose()}} disabled={busy}>{current?.status==='CONCLUIDO'?'Continuar no caixa':'Voltar ao pedido'}</button>{!allDone&&!waiting&&!otherPending&&!finalOrder&&<button type="submit" form={formId} className="gold" disabled={!ready||busy||needsTerminals&&(equipment.loading||!!equipment.error)||!!activeResult||!enabledPaymentForms(cfg).length}>{busy?'Confirmando no servidor…':label}</button>}</>}>
  {query.loading&&!current?<LoadingBlock label="Conferindo saldo do pedido…"/>:query.error?<ErrorBlock error={query.error} onRetry={query.reload}/>:null}
  {config.loading?<LoadingBlock label="Carregando formas de pagamento…"/>:config.error?<ErrorBlock error={config.error} onRetry={config.reload}/>:null}
  {needsTerminals&&equipment.error&&<ErrorBlock error={equipment.error} onRetry={equipment.reload}/>}
  {current&&!finalOrder&&!waiting&&<ConsumerFields value={customer} onChange={identify} disabled={busy}/>}
  {current&&!cardStatus&&<div className={s.summary}>{[['Total do pedido',current.total],['Recebido aprovado',current.totalPago],['Saldo restante',current.saldoRestante]].map(([name,value])=><div key={name}><span>{name}</span><strong>{fmtBRL(value??0)}</strong></div>)}</div>}
  {error&&<Notice title="Não foi possível concluir este recebimento" focus>{error.message}</Notice>}
  {cardStatus&&<CardPaymentStatus payment={cardStatus} order={current}
    checking={busy||query.loading}
    onCheck={waiting||otherPending?query.reload:undefined}
    onRetry={terminalFailed?revisedAttempt:undefined} />}
  {cardStatus && finalOrder && fiscalRow && <Notice tone={fiscalRow.error?'warning':'info'} title={fiscalRow.pending?'Emitindo NFC-e…':fiscalRow.note?'NFC-e nº '+fiscalRow.note.numero:'Emissão pendente'}>
    {fiscalRow.note && <>{fiscalRow.note.ambiente==='HOMOLOGACAO'?'Homologação · sem valor fiscal':'Produção'} <button type="button" onClick={()=>fiscal.download(fiscalRow.note)}>Baixar</button></>}
    {fiscalRow.error && <a href={'#/pedidos?pedidoId='+encodeURIComponent(order.id)} onClick={()=>{fiscal.dismiss(order.id);onClose()}}>Conferir emissão no pedido</a>}
  </Notice>}
  {!cardStatus&&allDone&&<Notice tone="info" title="Pagamento confirmado">O recebimento foi registrado. {current?.saldoRestante>0?'Ainda há saldo a receber neste pedido.':'Confira o estado atualizado do pedido.'}</Notice>}
  {!cardStatus&&(waiting||otherPending)&&<Notice tone="info" title={activeResult?.status==='PENDENTE_CONCILIACAO'?'Recebimento externo precisa de conferência':'Aguardando confirmação do pagamento'}>A próxima parte fica bloqueada até a confirmação. Você pode voltar ao pedido para acompanhar, sincronizar ou conciliar a cobrança.<button type="button" disabled={busy||query.loading} onClick={query.reload}><RefreshCw size={14} aria-hidden="true"/>Atualizar pagamento</button></Notice>}
  {!cardStatus&&terminalFailed&&<Notice title="Esta tentativa não foi aprovada">Confira o motivo no pedido. Uma nova tentativa usa outra chave e preserva as partes já aprovadas.<button type="button" onClick={revisedAttempt}>Nova tentativa desta parte</button></Notice>}
  {ready&&!cardStatus&&<form id={formId} onSubmit={submit} noValidate className={s.form}>
   <fieldset disabled={busy||!!plan} className={s.mode}><legend>Dividir o pagamento?</legend><div className={s.modeRow}><div className={s.modeButtons}>{[[false,'Não'],[true,'Sim']].map(([value,text])=><button type="button" key={text} aria-pressed={split===value} onClick={()=>configure(value)}>{text}</button>)}</div>{split&&<label className={s.partCount}><span>Quantidade de partes</span><select aria-label="Quantidade de partes do pagamento" value={partCount} onChange={e=>configure(true,Number(e.target.value))}>{[2,3,4].map(count=><option key={count} value={count}>{count} partes</option>)}</select></label>}</div><small>{plan?'As partes confirmadas ficam protegidas. Continue somente com o valor que ainda falta receber.':split?'Os valores começam divididos igualmente. Ao ajustar uma parte, a última acompanha o restante. Se editar a última, a penúltima é ajustada.':'Informe a forma para receber o saldo, ou um valor menor para um pagamento parcial.'}</small></fieldset>
   {entries.map((entry,index)=><PaymentPart key={index} entry={entry} index={index} split={split} config={cfg} terminals={terminals} equipmentLoading={equipment.loading} error={fields[index]||((stage===index&&error?.fieldErrors)||{})} result={results[index]} locked={busy||!!plan&&(index!==stage||!!plan.attempts[index])||allDone||!!finalOrder} onChange={(key,value)=>change(index,key,value)}/>)}
   {plan&&!plan.attempts.some(Boolean)&&<button type="button" disabled={busy} onClick={()=>{try{sessionStorage.removeItem(storageKey)}catch{ /* storage restricted */ }setDrafts(plan.entries);setPlan(null);setError(null)}}>Revisar divisão do pagamento</button>}
  </form>}
 </Modal>, document.body)
}
function PaymentPart({entry,index,split,config,terminals,equipmentLoading,error,result,locked,onChange}) {
 const formId=useId(),money=entry.forma==='DINHEIRO',credit=entry.forma==='CREDITO'
 const rates=useQueryResource(signal=>money?null:readCash('taxas',{forma:entry.forma,ativo:true,pagina:0,tamanho:50},signal),[money,entry.forma])
 const rate=rates.data?.itens?.find(item=>Number(item.parcelas)===Number(entry.parcelas||1))
 const preview=chargePreview(entry,rate)
 const integrated=!money&&config.pointHabilitado&&!entry.contingenciaManual
 const terminalId=entry.terminalCaixaId||(terminals.length===1?terminals[0].id:'')
 function input(key,label,required=true) {return <label><span>{label}{required&&<b className={s.required}> *</b>}</span><MoneyInput value={entry[key]} onValueChange={value=>onChange(key,value)} aria-label={label} aria-invalid={!!error[key]} required={required} placeholder="Ex.: 50,00"/>{error[key]&&<small role="alert">{error[key]}</small>}</label>}
 return <section className={s.part} aria-labelledby={formId}>
  <header><span className={s.number}>{index+1}</span><div><h3 id={formId}>{split?ordinal[index][0].toUpperCase()+ordinal[index].slice(1)+' pagamento':'Forma de recebimento'}</h3><small>{result?.status==='APROVADO'?'Recebimento confirmado':result?'Acompanhe a situação desta cobrança':index>0?'Receba esta parte depois da confirmação das anteriores.':'Confira a forma e o valor antes de confirmar.'}</small></div>{result?.status==='APROVADO'?<CheckCircle2 size={20} aria-label="Pagamento aprovado"/>:result?<Clock3 size={20} aria-label="Pagamento em acompanhamento"/>:null}</header><details className={s.partDetails} data-confirmed={result?.status==='APROVADO'} open={result?.status!=='APROVADO'}><summary>Ver detalhes do pagamento confirmado</summary>
  <fieldset disabled={locked} className={s.fields}>
   <label className={s.full}><span>Forma de pagamento <b className={s.required}>*</b></span><select aria-label={split?'Forma do '+ordinal[index]+' pagamento':'Forma de pagamento'} value={entry.forma} onChange={e=>onChange('forma',e.target.value)} aria-invalid={!!error.forma}>{enabledPaymentForms(config).map(form=><option key={form} value={form}>{PAYMENT_NAMES[form]}</option>)}</select>{error.forma&&<small role="alert">{error.forma}</small>}</label>
   {input('valor',split?'Valor do '+ordinal[index]+' pagamento':'Valor aplicado ao pedido')}
   {money&&input('valorRecebido',split?'Dinheiro entregue na '+feminine[index]+' parte':'Valor entregue em dinheiro')}
   {credit&&<label><span>Parcelas no crédito <b className={s.required}>*</b></span><select aria-label={split?'Parcelas do '+ordinal[index]+' pagamento':'Parcelas no crédito'} value={entry.parcelas||1} onChange={e=>onChange('parcelas',Number(e.target.value))} aria-invalid={!!error.parcelas}>{allowedInstallments(config).map(n=><option key={n} value={n} disabled={n>1&&config.valorMinimoParcela!=null&&Math.round(cents(entry.valor||0)/n)<cents(config.valorMinimoParcela)}>{n}x{n>1?' · aproximadamente '+fmtBRL(Number(entry.valor||0)/n)+' por parcela':''}</option>)}</select><small>{config.valorMinimoParcela>0?'Mínimo por parcela: '+fmtBRL(config.valorMinimoParcela):'Parcelamento conforme a política do caixa.'}</small>{error.parcelas&&<small role="alert">{error.parcelas}</small>}</label>}
   {!money&&config.pointHabilitado&&config.permitirPagamentoManual&&<label className={s.check}><input type="checkbox" checked={!!entry.contingenciaManual} onChange={e=>onChange('contingenciaManual',e.target.checked)}/><span>Registrar fora da Point (contingência manual)</span></label>}
   {integrated&&<label className={s.full}><span>Maquininha <b className={s.required}>*</b></span><select value={terminalId} aria-label={'Maquininha do pagamento '+(index+1)} aria-invalid={!!error.terminalCaixaId} disabled={locked||equipmentLoading} onChange={e=>onChange('terminalCaixaId',e.target.value)}><option value="">{equipmentLoading?'Carregando maquininhas…':'Selecione uma maquininha'}</option>{terminals.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}</select>{error.terminalCaixaId&&<small role="alert">{error.terminalCaixaId}</small>}</label>}
   {!money&&(!config.pointHabilitado||entry.contingenciaManual)&&<><label className={s.full}><span>Referência do comprovante (opcional)</span><input value={entry.comprovanteReferencia||''} maxLength={255} placeholder="Ex.: NSU ou código do comprovante" onChange={e=>onChange('comprovanteReferencia',e.target.value)}/></label><p className={s.help}>O registro manual exige conciliação. Ele não confirma o recebimento automaticamente.</p></>}
  </fieldset>
  {money?<div className={s.preview}><Wallet size={20} aria-hidden="true"/><span>Troco desta parte<strong>{fmtBRL(Math.max(0,Number(entry.valorRecebido||0)-Number(entry.valor||0)))}</strong></span></div>:rates.loading||rates.error||rates.data?.ultima===false?<p className={s.help}>Prévia de taxas indisponível. O servidor confirma o valor oficial da cobrança.</p>:preview?<div className={s.preview}><CreditCard size={20} aria-hidden="true"/><span>Prévia do valor cobrado<strong>{fmtBRL(preview.charged)}</strong><small>Aplicado ao pedido: {fmtBRL(entry.valor||0)} · Acréscimo: {fmtBRL(preview.extra)}. Parcelas finais são confirmadas pela maquininha.</small></span></div>:<Notice>Taxa de repasse inválida. Confira a configuração antes de cobrar.</Notice>}
  </details>{result&&<p className={s.help}>Situação no servidor: {result.status}{result.statusDetalhe?' · '+result.statusDetalhe:''}</p>}
 </section>
}
