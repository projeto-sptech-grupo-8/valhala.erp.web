import test from 'node:test'
import assert from 'node:assert/strict'
import { minimumMetrics } from '../src/pages/inventory/restock/model/restockAlerts.js'

const rows = [
  { nome: 'Z', quantidadeAtual: 0, estoqueMinimo: 10, status: 'ZERADO', categoria: 'A' },
  { nome: 'B', quantidadeAtual: 25, estoqueMinimo: 100, status: 'CRITICO', categoria: 'A' },
  { nome: 'A', quantidadeAtual: 50, estoqueMinimo: 100, status: 'CRITICO', categoria: 'B' },
]

test('percentual e falta preservam zero e rejeitam dados indisponíveis', () => {
  assert.deepEqual(minimumMetrics(rows[0]), { percentage: 0, missing: 10 })
  assert.deepEqual(minimumMetrics(rows[1]), { percentage: 25, missing: 75 })
  assert.deepEqual(minimumMetrics(rows[2]), { percentage: 50, missing: 50 })
  assert.deepEqual(minimumMetrics({ quantidadeAtual: 300, estoqueMinimo: 1000 }), { percentage: 30, missing: 700 })
  assert.deepEqual(minimumMetrics({ quantidadeAtual: 150, estoqueMinimo: 100 }), { percentage: 150, missing: 0 })
  for (const value of [null, undefined, '', false, 'inválido', Infinity, NaN]) {
    assert.deepEqual(minimumMetrics({ quantidadeAtual: value, estoqueMinimo: 10 }), { percentage: null, missing: null })
  }
  assert.deepEqual(minimumMetrics({ quantidadeAtual: 2, estoqueMinimo: 0 }), { percentage: null, missing: null })
  assert.deepEqual(minimumMetrics({ quantidadeAtual: 2, estoqueMinimo: -5 }), { percentage: null, missing: null })
})
