import test from 'node:test'
import assert from 'node:assert/strict'
import { dashboardNumber, dashboardHealth, dashboardDate } from '../src/pages/dashboard/model/dashboardPresentation.js'

test('indicadores ausentes ou inválidos não viram zero',()=>{
 for(const value of [undefined,null,'',false,NaN,Infinity,'invalido'])assert.equal(dashboardNumber(value),null)
 assert.equal(dashboardNumber(0),0)
 assert.equal(dashboardNumber('0'),0)
 assert.equal(dashboardNumber('42.5'),42.5)
})
test('saúde mantém o percentual do servidor e diferencia falta de referência',()=>{
 assert.deepEqual(dashboardHealth({produtosComMinimoDefinido:100,saudaveis:63,saudePercentual:63}),{percent:63,tone:'warn'})
 assert.deepEqual(dashboardHealth({produtosComMinimoDefinido:0,saudePercentual:100}),{percent:null,tone:'neutral'})
 assert.deepEqual(dashboardHealth({produtosComMinimoDefinido:10,saudePercentual:0}),{percent:0,tone:'bad'})
 assert.equal(dashboardHealth({produtosComMinimoDefinido:10,saudePercentual:75}).tone,'ok')
 assert.equal(dashboardHealth({produtosComMinimoDefinido:10,saudePercentual:25}).tone,'warn')
 assert.equal(dashboardDate('invalid'),'Não informado')
})
