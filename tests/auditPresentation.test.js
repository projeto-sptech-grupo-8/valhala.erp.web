import test from 'node:test'
import assert from 'node:assert/strict'
import { auditComparison, auditEvent, auditReference } from '../src/entities/sales/model/auditPresentation.js'

test('comparação preserva zero e falso e oculta identificadores e credenciais aninhados',()=>{
 const rows=auditComparison(JSON.stringify({valor:0,ativo:false,usuarioId:'private-user',itens:[{produtoId:'private-product',quantidade:1}],token:'private-token'}),{valor:10,ativo:true,itens:[{produtoId:'private-product',quantidade:2}]})
 assert.deepEqual(rows.find(r=>r.label==='Valor'),{label:'Valor',before:0,after:10,changed:true})
 assert.equal(rows.find(r=>r.label==='Ativo').before,false)
 assert.equal(rows.find(r=>r.label==='Itens · Item 1 · Quantidade').after,2)
 assert.doesNotMatch(JSON.stringify(rows),/private-/)
 assert.deepEqual(auditComparison('invalid JSON',null),[])
})

test('eventos futuros têm apresentação legível sem atribuir resultado positivo',()=>{
 assert.deepEqual(auditEvent('NOVO_EVENTO_FUTURO'),{label:'Novo evento futuro',group:'Outros',tone:'neutral'})
 assert.equal(auditEvent('PAGAMENTO_REGISTRADO').tone,'info')
 assert.equal(auditEvent('PAGAMENTO_POINT_APROVADO').tone,'success')
 assert.equal(auditReference({pedidoId:'private-id'}),'Pedido vinculado')
 assert.equal(auditReference({pedidoIdentificador:'Mesa 3'}),'Mesa 3')
 assert.equal(auditReference({}),'—')
})
