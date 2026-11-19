import test from 'node:test'
import assert from 'node:assert/strict'
import { allowedInstallments, validatePaymentEntry, paymentPayload, availablePaymentCents, chargePreview, splitPaymentCents, rebalancePaymentEntries } from '../src/features/sales/payments/model/paymentRules.js'
const config={dinheiroHabilitado:true,pixHabilitado:true,creditoHabilitado:true,debitoHabilitado:true,permitirPagamentoManual:true,pointHabilitado:false,parcelamentoHabilitado:true,parcelasMinimas:2,parcelasMaximas:12,valorMinimoParcela:20}
test('parcelamento é exclusivo do crédito e respeita mínimo e configuração',()=>{
 assert.deepEqual(allowedInstallments({...config,parcelamentoHabilitado:false}),[1])
 assert.equal(validatePaymentEntry({forma:'CREDITO',valor:60,parcelas:3},config).parcelas,undefined)
 assert.ok(validatePaymentEntry({forma:'CREDITO',valor:59.97,parcelas:3},config).parcelas)
 assert.ok(validatePaymentEntry({forma:'CREDITO',valor:60,parcelas:13},config).parcelas)
 assert.equal(paymentPayload({forma:'PIX',valor:40,parcelas:5},'key',config).parcelas,1)
})
test('dinheiro cobre somente sua parte e não manda terminal ou parcelamento',()=>{
 assert.ok(validatePaymentEntry({forma:'DINHEIRO',valor:40,valorRecebido:39},config).valorRecebido)
 const body=paymentPayload({forma:'DINHEIRO',valor:40,valorRecebido:50,parcelas:3,terminalCaixaId:'t'},'key',config)
 assert.equal(body.valor,40);assert.equal(body.valorRecebido,50);assert.equal(body.parcelas,1);assert.equal(body.terminalCaixaId,null)
})
test('saldo disponível desconta aprovados e pendentes sem contar recusados',()=>{
 assert.equal(availablePaymentCents({total:100,pagamentos:[{status:'APROVADO',valor:30},{status:'EM_TERMINAL',valor:20},{status:'PENDENTE_CONCILIACAO',valor:10},{status:'RECUSADO',valor:50}]}),4000)
})
test('Point exige terminal ativo e repasse usa gross-up',()=>{
 assert.ok(validatePaymentEntry({forma:'CREDITO',valor:100,parcelas:1},{...config,pointHabilitado:true},[]).terminalCaixaId)
 assert.deepEqual(chargePreview({forma:'CREDITO',valor:100},{repasseEfetivo:true,taxaPercentual:7.59,taxaFixa:0}),{charged:108.21,extra:8.21})
 assert.equal(chargePreview({forma:'CREDITO',valor:100},{repasseEfetivo:true,taxaPercentual:100,taxaFixa:0}),null)
})

test('divisão em até quatro partes preserva centavos e ajusta somente o complemento',()=>{
 assert.deepEqual(splitPaymentCents(10001,4),[2500,2500,2500,2501])
 assert.deepEqual(splitPaymentCents(10000,3),[3333,3333,3334])
 assert.throws(()=>splitPaymentCents(10000,5))
 const rows=[{valor:25},{valor:25},{valor:25},{valor:25.01}]
 assert.deepEqual(rebalancePaymentEntries(rows,1,'30',7501,1).map(e=>e.valor),[25,'30',25,20.01])
 assert.deepEqual(rebalancePaymentEntries(rows,3,'20',7501,1).map(e=>e.valor),[25,25,30.01,'20'])
})
