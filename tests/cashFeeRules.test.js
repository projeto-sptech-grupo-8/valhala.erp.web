import test from 'node:test'
import assert from 'node:assert/strict'
import { feeDraft, feePayload, validateFee, effectiveFeeTransfer, feeExample } from '../src/features/sales/cash-settings/model/cashFeeRules.js'
const config={politicaJuros:'ABSORVIDA_PELA_LOJA'}
const values={forma:'CREDITO',parcelas:'3',taxaPercentual:'3,5000',taxaFixa:'0.50',repasse:'GLOBAL',ativo:true}

test('repasse mantém os três estados e a edição não altera a combinação',()=>{
 assert.equal(feePayload(values).repassarAoCliente,null)
 assert.equal(feePayload({...values,repasse:'LOJA'}).repassarAoCliente,false)
 assert.equal(feePayload({...values,repasse:'CLIENTE'}).repassarAoCliente,true)
 assert.deepEqual(Object.keys(feePayload(values,true)).sort(),['ativo','repassarAoCliente','taxaFixa','taxaPercentual'])
 assert.equal(feeDraft({forma:'PIX',parcelas:1,taxaPercentual:0,taxaFixa:0,repassarAoCliente:false,ativo:false}).repasse,'LOJA')
 assert.equal(feePayload({...values,taxaPercentual:'1,2345'}).taxaPercentual,1.2345)
})
test('limites respeitam forma, parcelas, precisão e repasse efetivo',()=>{
 assert.deepEqual(validateFee(values,config),{})
 assert.ok(validateFee({...values,forma:'DINHEIRO'},config).forma)
 assert.ok(validateFee({...values,forma:'PIX'},config).parcelas)
 assert.ok(validateFee({...values,parcelas:'13'},config).parcelas)
 assert.ok(validateFee({...values,parcelas:'1.5'},config).parcelas)
 assert.ok(validateFee({...values,taxaPercentual:'1.23456'},config).taxaPercentual)
 assert.ok(validateFee({...values,taxaFixa:'0.001'},config).taxaFixa)
 assert.ok(validateFee({...values,taxaPercentual:'100',repasse:'CLIENTE'},config).taxaPercentual)
 assert.ok(validateFee({...values,taxaPercentual:'100'},{politicaJuros:'REPASSADA_AO_CLIENTE'}).taxaPercentual)
 assert.ok(validateFee({...values,taxaPercentual:'100',repasse:'LOJA'},config).taxaPercentual)
 assert.equal(validateFee({...values,taxaPercentual:'99.9999',repasse:'LOJA'},config).taxaPercentual,undefined)
 assert.ok(validateFee(values,null).repasse)
 assert.equal(effectiveFeeTransfer(values,null),null)
 assert.deepEqual(validateFee({...values,forma:'PIX',parcelas:'1',taxaPercentual:'0',taxaFixa:'0',repasse:'LOJA'},null),{})
})
test('simulação distingue absorção da loja e cálculo de repasse por divisão',()=>{
 assert.deepEqual(feeExample(values,config),{charged:100,cost:4,net:96})
 assert.deepEqual(feeExample({...values,repasse:'CLIENTE'},config),{charged:104.15,cost:4.15,net:100})
 assert.equal(feeExample({...values,taxaPercentual:'100',repasse:'CLIENTE'},config),null)
})
