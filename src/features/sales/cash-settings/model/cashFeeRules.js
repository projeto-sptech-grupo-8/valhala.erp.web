export const FEE_FORMS={PIX:'Pix',DEBITO:'Débito',CREDITO:'Crédito'}
export const decimal=value=>value==null||String(value).trim()===''?NaN:Number(String(value).replace(',','.'))
export function feeDraft(rate) {
 return rate?{forma:rate.forma,parcelas:String(rate.parcelas),taxaPercentual:String(rate.taxaPercentual??''),taxaFixa:String(rate.taxaFixa??''),repasse:rate.repassarAoCliente==null?'GLOBAL':rate.repassarAoCliente?'CLIENTE':'LOJA',ativo:!!rate.ativo}:{forma:'',parcelas:'1',taxaPercentual:'',taxaFixa:'',repasse:'GLOBAL',ativo:true}
}
export function effectiveFeeTransfer(values,config) {
 if(values.repasse==='CLIENTE')return true
 if(values.repasse==='LOJA')return false
 if(!config?.politicaJuros)return null
 return config.politicaJuros==='REPASSADA_AO_CLIENTE'
}
export function validateFee(values,config) {
 const errors={}
 if(!Object.hasOwn(FEE_FORMS,values.forma))errors.forma='Selecione Pix, débito ou crédito. Dinheiro não possui taxa.'
 const count=decimal(values.parcelas)
 if(!Number.isInteger(count)||count<1||count>12)errors.parcelas='Informe um número inteiro de 1 a 12.'
 else if(values.forma!=='CREDITO'&&count!==1)errors.parcelas='Pix e débito aceitam somente 1 parcela.'
 const percentage=decimal(values.taxaPercentual),fixed=decimal(values.taxaFixa)
 if(!Number.isFinite(percentage)||percentage<0||percentage>100||Math.abs(percentage*10000-Math.round(percentage*10000))>0.00001)errors.taxaPercentual='Informe de 0 a 100%, com até quatro casas decimais.'
 else if(effectiveFeeTransfer(values,config)===true&&percentage>=100)errors.taxaPercentual='Para repassar ao cliente, o percentual deve ser menor que 100%.'
 if(!Number.isFinite(fixed)||fixed<0||fixed>=1e10||Math.abs(fixed*100-Math.round(fixed*100))>0.00001)errors.taxaFixa='Informe um valor a partir de R$ 0,00, com até duas casas decimais.'
 if(!['GLOBAL','LOJA','CLIENTE'].includes(values.repasse))errors.repasse='Selecione uma regra de repasse.'
 else if(values.repasse==='GLOBAL'&&effectiveFeeTransfer(values,config)==null)errors.repasse='Carregue a política geral para confirmar o repasse.'
 return errors
}
export function feePayload(values,editing=false) {
 return {...(!editing?{forma:values.forma,parcelas:decimal(values.parcelas)}:{}),taxaPercentual:decimal(values.taxaPercentual),taxaFixa:decimal(values.taxaFixa),repassarAoCliente:values.repasse==='GLOBAL'?null:values.repasse==='CLIENTE',ativo:!!values.ativo}
}
export function feeExample(values,config) {
 if(Object.keys(validateFee(values,config)).length)return null
 const rate=decimal(values.taxaPercentual)/100,fixed=decimal(values.taxaFixa)
 if(effectiveFeeTransfer(values,config)){
  const charged=Math.round(((100+fixed)/(1-rate)+Number.EPSILON)*100)/100
  return {charged,cost:Math.round((charged-100)*100)/100,net:100}
 }
 const cost=Math.round((100*rate+fixed+Number.EPSILON)*100)/100
 return {charged:100,cost,net:Math.round((100-cost)*100)/100}
}
