import test from 'node:test'
import assert from 'node:assert/strict'
import { formatMoneyInput, maskMoneyDraft } from '../src/features/catalog/product-editor/model/moneyInput.js'

test('moeda aceita valores brasileiros sem impedir apagar o campo', () => {
  assert.deepEqual(maskMoneyDraft('1.234,56'), { display: '1.234,56', value: '1234.56' })
  assert.deepEqual(maskMoneyDraft('20'), { display: '20', value: '20' })
  assert.deepEqual(maskMoneyDraft(''), { display: '', value: '' })
  assert.deepEqual(maskMoneyDraft('00080,5'), { display: '80,5', value: '80.5' })
  assert.equal(formatMoneyInput('1234.56'), '1.234,56')
  assert.equal(formatMoneyInput(''), '')
  assert.equal(formatMoneyInput('0'), '0,00')
})
