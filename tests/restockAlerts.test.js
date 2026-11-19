import test from 'node:test'
import assert from 'node:assert/strict'
import { minimumMetrics, filterRestockAlerts } from '../src/pages/inventory/restock/model/restockAlerts.js'

const rows = [
  { nome: 'Z', quantidadeAtual: 0, estoqueMinimo: 10, status: 'ZERADO', categoria: 'A' },
  { nome: 'B', quantidadeAtual: 25, estoqueMinimo: 100, status: 'CRITICO', categoria: 'A' },
  { nome: 'A', quantidadeAtual: 50, estoqueMinimo: 100, status: 'CRITICO', categoria: 'B' },
  { nome: 'C', quantidadeAtual: 60, estoqueMinimo: 100, status: 'CRITICO', categoria: 'A' },
  { nome: 'D', quantidadeAtual: null, estoqueMinimo: 100, status: 'CRITICO', categoria: 'B' },
]
test('percentual e falta preservam zero e rejeitam dados indisponíveis', () => {
  assert.deepEqual(minimumMetrics(rows[0]), { percentage: 0, missing: 10 })
  assert.deepEqual(minimumMetrics({ quantidadeAtual: 300, estoqueMinimo: 1000 }), { percentage: 30, missing: 700 })
  for (const value of [null, undefined, '', false, 'inválido', Infinity]) assert.equal(minimumMetrics({ quantidadeAtual: value, estoqueMinimo: 10 }).missing, null)
  assert.equal(minimumMetrics({ quantidadeAtual: 2, estoqueMinimo: 0 }).percentage, null)
})
test('faixas não se sobrepõem e filtros combinados só reduzem os alertas recebidos', () => {
  assert.deepEqual(filterRestockAlerts(rows, { range: '25' }).map(r => r.nome), ['Z', 'B'])
  assert.deepEqual(filterRestockAlerts(rows, { range: '50' }).map(r => r.nome), ['A'])
  assert.deepEqual(filterRestockAlerts(rows, { range: 'above50' }).map(r => r.nome), ['C'])
  assert.deepEqual(filterRestockAlerts(rows, { category: 'A', status: 'CRITICO', search: ' b ', range: '25' }).map(r => r.nome), ['B'])
})
test('prioridade mantém ordem do servidor e ordenação por percentual não compara unidades', () => {
  assert.deepEqual(filterRestockAlerts(rows, {}).map(r => r.nome), ['Z', 'B', 'A', 'C', 'D'])
  assert.deepEqual(filterRestockAlerts(rows, { order: 'name' }).map(r => r.nome), ['A', 'B', 'C', 'D', 'Z'])
  assert.deepEqual(filterRestockAlerts(rows, { order: 'percentage' }).map(r => r.nome), ['Z', 'B', 'A', 'C', 'D'])
  assert.deepEqual(rows.map(r => r.nome), ['Z', 'B', 'A', 'C', 'D'])
})
