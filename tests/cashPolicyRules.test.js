import test from 'node:test'
import assert from 'node:assert/strict'
import { policyDraft, policyPayload, validatePolicy } from '../src/features/sales/cash-settings/model/cashPolicyRules.js'
const initial={pointHabilitado:false,dinheiroHabilitado:true,debitoHabilitado:true,creditoHabilitado:true,pixHabilitado:true,parcelamentoHabilitado:true,imprimirComprovante:true,permitirPagamentoManual:false,parcelasMinimas:1,parcelasMaximas:6,valorMinimoParcela:10,politicaJuros:'ABSORVIDA_PELA_LOJA',validadeCobrancaSegundos:300,limiteDescontoPercentual:10,limiteDescontoValor:20}

test('prazo aceita somente inteiros de 60 a 600 segundos e não altera configuração antiga',()=>{
 for(const seconds of [60,300,600])assert.equal(validatePolicy({...policyDraft(initial),validadeCobrancaSegundos:String(seconds)}).validadeCobrancaSegundos,undefined)
 for(const seconds of ['',59,601,900,60.5])assert.ok(validatePolicy({...policyDraft(initial),validadeCobrancaSegundos:String(seconds)}).validadeCobrancaSegundos)
 assert.equal(policyDraft({...initial,validadeCobrancaSegundos:900}).validadeCobrancaSegundos,'900')
})
test('regras dependentes e limites não aceitam configurações incompatíveis',()=>{
 const draft=policyDraft(initial)
 assert.deepEqual(validatePolicy(draft),{})
 assert.ok(validatePolicy({...draft,dinheiroHabilitado:false,pixHabilitado:false,creditoHabilitado:false,debitoHabilitado:false}).formas)
 assert.ok(validatePolicy({...draft,creditoHabilitado:false}).parcelamentoHabilitado)
 assert.ok(validatePolicy({...draft,parcelasMinimas:'7',parcelasMaximas:'6'}).parcelasMaximas)
 assert.ok(validatePolicy({...draft,parcelasMaximas:'13'}).parcelasMaximas)
 assert.ok(validatePolicy({...draft,parcelasMinimas:'1.5'}).parcelasMinimas)
 assert.ok(validatePolicy({...draft,limiteDescontoPercentual:'100,01'}).limiteDescontoPercentual)
 assert.ok(validatePolicy({...draft,valorMinimoParcela:'0'}).valorMinimoParcela)
 assert.equal(validatePolicy({...draft,valorMinimoParcela:'',limiteDescontoValor:'0'}).valorMinimoParcela,undefined)
})
test('payload mantém limites ocultos, aceita decimal com vírgula e omite metadados',()=>{
 const values={...policyDraft(initial),parcelamentoHabilitado:false,limiteDescontoPercentual:'10,50',valorMinimoParcela:'',id:'private',atualizadoPorUsuarioId:'private'}
 const payload=policyPayload(values)
 assert.equal(payload.parcelasMaximas,6)
 assert.equal(payload.parcelasMinimas,1)
 assert.equal(payload.politicaJuros,'ABSORVIDA_PELA_LOJA')
 assert.equal(payload.limiteDescontoPercentual,10.5)
 assert.equal(payload.valorMinimoParcela,null)
 assert.equal(payload.id,undefined)
 assert.equal(payload.atualizadoPorUsuarioId,undefined)
 assert.equal(Object.keys(payload).length,15)
})
