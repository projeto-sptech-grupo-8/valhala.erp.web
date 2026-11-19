import test from 'node:test'
import assert from 'node:assert/strict'
import { reconcileComandaSlots } from '../src/entities/sales/model/comandaSlots.js'
const order = (id,numero) => ({id,numero})
test('posições são preenchidas da esquerda para direita sem usar número real',()=>{
 const orders=[order('b',102),order('a',101)]
 assert.deepEqual(reconcileComandaSlots([],orders),['a','b',null,null,null])
 assert.equal(orders[0].numero,102)
})
test('finalizar libera posição e uma nova comanda reutiliza sem mover as outras',()=>{
 const previous=['a','b','c',null,null]
 assert.deepEqual(reconcileComandaSlots(previous,[order('c',103),order('b',102)]),[null,'b','c',null,null])
 assert.deepEqual(reconcileComandaSlots(previous,[order('c',103),order('d',200),order('b',102)]),['d','b','c',null,null])
})
test('reordenação não renumera e dados duplicados não ocupam outra posição',()=>{
 assert.deepEqual(reconcileComandaSlots(['a','b'],[order('b',9),order('a',8),order('a',8)]),['a','b',null,null,null])
 assert.deepEqual(reconcileComandaSlots(['a','a'],[order('a',8),order('b',9)]),['a','b',null,null,null])
})
