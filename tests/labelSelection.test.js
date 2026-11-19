import test from 'node:test'
import assert from 'node:assert/strict'
import { labelSelection } from '../src/features/catalog/product-labels/model/labelSelection.js'
import { appearanceFor } from '../src/features/catalog/product-labels/model/labelSettings.js'

const products = [{ id: 'a' }, { id: 'b' }]
test('impressão separa produtos e lotes de mesmo código e soma cópias por lote', () => {
  const lots = { a: { 1: { lot: { id: '1', lote: 'L001', validade: '2026-11-17' }, copies: '5' }, 2: { lot: { id: '2', lote: 'L002', validade: '2027-01-01' }, copies: '8' } }, b: { 3: { lot: { id: '3', lote: 'L001', validade: null }, copies: 2 } } }
  const result = labelSelection(products, new Set(['a', 'b']), {}, lots, 'validade')
  assert.equal(result.total, 15)
  assert.equal(result.entries.length, 3)
  assert.deepEqual(result.incomplete, [])
  assert.deepEqual(result.entries.map(item => appearanceFor({ mode: 'validade' }, item.lot, '2026-11-15').color), ['#f97316', '#16a34a', '#64748b'])
})
test('seleção incompleta bloqueia impressão e desmarcados não entram no total', () => {
  for (const copies of ['', 0, -1, 100, 1.5]) {
    const result = labelSelection(products, new Set(['a']), {}, { a: { 1: { lot: { id: '1' }, copies } }, b: { 2: { lot: { id: '2' }, copies: 50 } } }, 'validade')
    assert.deepEqual(result.incomplete, ['a'])
    assert.equal(result.total, 0)
  }
  assert.deepEqual(labelSelection(products, new Set(['a']), {}, {}, 'validade').incomplete, ['a'])
})
test('etiqueta de preço ignora os lotes e usa somente cópias por produto', () => {
  const result = labelSelection(products, new Set(['a']), { a: 3 }, { a: { 1: { lot: { id: '1' }, copies: 99 } } }, 'manual')
  assert.equal(result.total, 3)
  assert.equal(result.entries[0].lot, null)
})
