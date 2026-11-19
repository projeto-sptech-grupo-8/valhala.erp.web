import { test } from 'node:test'
import assert from 'node:assert/strict'
import { expiryAppearance, appearanceFor, validDate, validCopies, stripeTextColor } from '../src/features/catalog/product-labels/model/labelSettings.js'

test('faixas de validade respeitam hoje, 7, 8, 30 e 31 dias', () => {
  const cases = [['2026-11-13', '#dc2626'], ['2026-11-14', '#f97316'], ['2026-11-21', '#f97316'], ['2026-11-22', '#eab308'], ['2026-12-14', '#eab308'], ['2026-12-15', '#16a34a'], [null, '#64748b']]
  for (const [date, color] of cases) assert.equal(expiryAppearance(date, '2026-11-14').color, color)
  assert.equal(expiryAppearance('2026-11-14', '2026-11-14').text, 'Vence hoje')
})

test('data inválida é desconhecida e não gera prazo fictício', () => {
  assert.equal(validDate('2026-02-31'), false)
  assert.equal(validDate('2028-02-29'), true)
  assert.equal(expiryAppearance('2026-02-31').text, 'Validade não informada')
  assert.equal(appearanceFor({ mode: 'validade' }, { validade: 'inválida', lote: 'L1' }).validade, null)
})

test('somente inteiros entre 1 e 99 são quantidades imprimíveis', () => {
  for (const value of [1, '2', 99]) assert.equal(validCopies(value), true)
  for (const value of ['', 0, -1, 1.5, 100, Infinity, 'texto']) assert.equal(validCopies(value), false)
})

test('configuração padrão não atribui cor e cor manual preserva contraste', () => {
  assert.equal(appearanceFor({ mode: 'padrao' }).color, null)
  assert.equal(appearanceFor({ mode: 'manual', color: '#123456' }).color, '#123456')
  assert.equal(stripeTextColor('#ffffff'), '#111111')
  assert.equal(stripeTextColor('#000000'), '#ffffff')
})
