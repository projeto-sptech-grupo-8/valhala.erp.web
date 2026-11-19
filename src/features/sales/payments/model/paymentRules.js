export const PAYMENT_NAMES = { DINHEIRO:'Dinheiro', PIX:'Pix', DEBITO:'Cartão de débito', CREDITO:'Cartão de crédito' }
export const PENDING_PAYMENT_STATES = ['PENDENTE','PENDENTE_NA_POINT','EM_TERMINAL','PENDENTE_CONCILIACAO','CANCELAMENTO_SOLICITADO','ACAO_NECESSARIA','ESTORNO_EM_ANDAMENTO']
const COMMITTED = ['APROVADO','PENDENTE','PENDENTE_NA_POINT','EM_TERMINAL','PENDENTE_CONCILIACAO']
export const cents = value => Math.round(Number(value) * 100)
export function availablePaymentCents(order) {
 return Math.max(0,cents(order.total)-(order.pagamentos||[]).filter(p=>COMMITTED.includes(p.status)).reduce((total,p)=>total+cents(p.valor),0))
}
export function enabledPaymentForms(config) {
 return Object.keys(PAYMENT_NAMES).filter(forma=>config[{DINHEIRO:'dinheiroHabilitado',PIX:'pixHabilitado',DEBITO:'debitoHabilitado',CREDITO:'creditoHabilitado'}[forma]])
}
export function allowedInstallments(config) {
 const result=[1]
 if(config.parcelamentoHabilitado) for(let n=Math.max(2,Number(config.parcelasMinimas)||2);n<=Math.min(12,Number(config.parcelasMaximas)||1);n++) result.push(n)
 return result
}
export function validatePaymentEntry(entry,config,terminals=[]) {
 const errors={}
 if(!enabledPaymentForms(config).includes(entry.forma))errors.forma='Selecione uma forma habilitada.'
 const value=cents(entry.valor)
 if(!Number.isFinite(value)||value<=0||Number(entry.valor)>9999999999.99)errors.valor='Informe um valor maior que zero, com até 10 dígitos inteiros.'
 if(entry.forma==='DINHEIRO') {
  if(!Number.isFinite(Number(entry.valorRecebido))||cents(entry.valorRecebido)<value||Number(entry.valorRecebido)<=0) errors.valorRecebido='O dinheiro entregue deve cobrir o valor deste pagamento.'
 }else{
  if(entry.contingenciaManual&&!config.permitirPagamentoManual)errors.contingenciaManual='Contingência manual não permitida.'
  if(!config.pointHabilitado&&!config.permitirPagamentoManual)errors.forma='Não há recebimento eletrônico habilitado para esta forma.'
  if(config.pointHabilitado&&!entry.contingenciaManual&&!terminals.some(t=>t.ativo&&t.id===entry.terminalCaixaId))errors.terminalCaixaId='Selecione uma maquininha ativa deste caixa.'
 }
 if(entry.forma==='CREDITO') {
  const installments=Number(entry.parcelas||1)
  if(!allowedInstallments(config).includes(installments))errors.parcelas='Selecione uma quantidade de parcelas permitida.'
  else if(installments>1&&config.valorMinimoParcela!=null&&Math.round(value/installments)<cents(config.valorMinimoParcela))errors.parcelas='O valor por parcela é menor que o mínimo configurado.'
 }
 if(String(entry.comprovanteReferencia||'').length>255)errors.comprovanteReferencia='Use até 255 caracteres.'
 return errors
}
export function paymentPayload(entry,key,config) {
 const money=entry.forma==='DINHEIRO'
 return {forma:entry.forma,valor:Number(entry.valor),parcelas:entry.forma==='CREDITO'?Number(entry.parcelas||1):1,valorRecebido:money?Number(entry.valorRecebido):null,terminalCaixaId:!money&&config.pointHabilitado&&!entry.contingenciaManual?entry.terminalCaixaId:null,contingenciaManual:!money&&!!entry.contingenciaManual,comprovanteReferencia:!money?entry.comprovanteReferencia?.trim()||null:null,chaveIdempotencia:key}
}
export function chargePreview(entry,rate) {
 const value=Number(entry.valor)||0
 if(entry.forma==='DINHEIRO'||!rate?.repasseEfetivo)return {charged:value,extra:0}
 const divisor=1-Number(rate.taxaPercentual)/100
 if(!(divisor>0))return null
 const charged=Math.round(((value+Number(rate.taxaFixa||0))/divisor+Number.EPSILON)*100)/100
 return {charged,extra:Math.round((charged-value)*100)/100}
}
export function splitPaymentCents(total,count) {
 if(!Number.isInteger(total)||total<0||![1,2,3,4].includes(count))throw new Error('Divisão de pagamento inválida.')
 const base=Math.floor(total/count)
 return Array.from({length:count},(_,index)=>index===count-1?total-base*(count-1):base)
}
export function rebalancePaymentEntries(entries,index,value,available,start=0) {
 const next=entries.map(entry=>({...entry}))
 next[index].valor=value
 const last=next.length-1
 const balanceIndex=index===last?last-1:last
 if(balanceIndex>=start&&balanceIndex!==index){
  const assigned=next.slice(start).reduce((sum,entry,offset)=>offset+start===balanceIndex?sum:sum+cents(entry.valor||0),0)
  next[balanceIndex].valor=Math.max(0,available-assigned)/100
 }
 return next
}
