export function dashboardNumber(value) {
 if(value==null||typeof value==='boolean'||(typeof value==='string'&&!value.trim()))return null
 const number=Number(value)
 return Number.isFinite(number)?number:null
}
export function dashboardHealth(stock) {
 const base=dashboardNumber(stock?.produtosComMinimoDefinido)
 const percent=dashboardNumber(stock?.saudePercentual)
 if(base===0||percent==null)return {percent:null,tone:'neutral'}
 return {percent,tone:percent<25?'bad':percent<75?'warn':'ok'}
}
export function dashboardDate(value) {
 if(!value)return 'Não informado'
 const date=new Date(value)
 return Number.isNaN(date.getTime())?'Não informado':new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(date)
}
export const DASHBOARD_PAYMENT_FORMS={DINHEIRO:'Dinheiro',PIX:'Pix',DEBITO:'Débito',CREDITO:'Crédito'}
