export const POLICY_BOOLEAN_FIELDS=['pointHabilitado','dinheiroHabilitado','debitoHabilitado','creditoHabilitado','pixHabilitado','parcelamentoHabilitado','imprimirComprovante','permitirPagamentoManual']
export const POLICY_NUMBER_FIELDS=['parcelasMinimas','parcelasMaximas','validadeCobrancaSegundos','limiteDescontoPercentual','limiteDescontoValor']
export const MAX_CHARGE_SECONDS=600
export function policyDraft(config) {
 return {...Object.fromEntries(POLICY_BOOLEAN_FIELDS.map(key=>[key,!!config[key]])),...Object.fromEntries(POLICY_NUMBER_FIELDS.map(key=>[key,config[key]==null?'':String(config[key])])),valorMinimoParcela:config.valorMinimoParcela==null?'':String(config.valorMinimoParcela),politicaJuros:config.politicaJuros||'ABSORVIDA_PELA_LOJA'}
}
function number(value) {return value==null||String(value).trim()===''?NaN:Number(String(value).replace(',','.'))}
export function validatePolicy(values) {
 const errors={}
 if(!['dinheiroHabilitado','debitoHabilitado','creditoHabilitado','pixHabilitado'].some(key=>values[key]))errors.formas='Mantenha pelo menos uma forma de pagamento habilitada.'
 if(values.parcelamentoHabilitado&&!values.creditoHabilitado)errors.parcelamentoHabilitado='Habilite crédito para permitir o parcelamento.'
 for(const key of ['parcelasMinimas','parcelasMaximas']){
  const n=number(values[key])
  if(!Number.isInteger(n)||n<1||n>12)errors[key]='Informe um número inteiro entre 1 e 12.'
 }
 if(!errors.parcelasMinimas&&!errors.parcelasMaximas&&number(values.parcelasMaximas)<number(values.parcelasMinimas))errors.parcelasMaximas='O máximo deve ser maior ou igual ao mínimo de parcelas.'
 const validity=number(values.validadeCobrancaSegundos)
 if(!Number.isInteger(validity)||validity<60||validity>MAX_CHARGE_SECONDS)errors.validadeCobrancaSegundos='Informe um prazo inteiro entre 60 e 600 segundos.'
 const percentage=number(values.limiteDescontoPercentual)
 if(!Number.isFinite(percentage)||percentage<0||percentage>100||Math.abs(percentage*100-Math.round(percentage*100))>0.00001)errors.limiteDescontoPercentual='Informe de 0 a 100%, com até duas casas decimais.'
 for(const key of ['limiteDescontoValor','valorMinimoParcela']){
  if(key==='valorMinimoParcela'&&(values[key]==null||values[key]===''))continue
  const n=number(values[key])
  if(!Number.isFinite(n)||n<0||n>=1e10||Math.abs(n*100-Math.round(n*100))>0.00001||(key==='valorMinimoParcela'&&n===0))errors[key]=key==='valorMinimoParcela'?'Informe um valor maior que zero ou deixe em branco para não limitar.':'Informe um valor a partir de R$ 0,00, com até duas casas decimais.'
 }
 if(!['ABSORVIDA_PELA_LOJA','REPASSADA_AO_CLIENTE'].includes(values.politicaJuros))errors.politicaJuros='Selecione quem absorve os juros.'
 return errors
}
export function policyPayload(values) {
 return {...Object.fromEntries(POLICY_BOOLEAN_FIELDS.map(key=>[key,!!values[key]])),...Object.fromEntries(POLICY_NUMBER_FIELDS.map(key=>[key,number(values[key])])),valorMinimoParcela:values.valorMinimoParcela==null||values.valorMinimoParcela===''?null:number(values.valorMinimoParcela),politicaJuros:values.politicaJuros}
}
