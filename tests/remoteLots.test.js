import test from 'node:test'
import assert from 'node:assert/strict'
import { lossBody, expiryFilter, lotDeadline, lotDate } from '../src/entities/inventory/model/remoteLots.js'

test('baixa do lote utiliza identidade remota e quantidade-base sem converter ml', () => {
  assert.deepEqual(lossBody({ id: 43, produtoId: 'p', codigo: 'VENCIDO-ML', quantidadeAtual: 100, situacao: 'VENCIDO' }), { produtoId: 'p', loteId: 43, tipo: 'PERDA', quantidade: 100, motivo: 'Perda por vencimento do lote VENCIDO-ML' })
  assert.throws(() => lossBody({ id: 43, produtoId: 'p', quantidadeAtual: 0, situacao: 'VENCIDO' }))
  assert.throws(() => lossBody({ id: 43, produtoId: 'p', quantidadeAtual: 100, situacao: 'VALIDO' }))
})
test('filtros respeitam as faixas exclusivas do servidor', () => {
  assert.deepEqual(expiryFilter('atencao'), { venceEmDias: 30 })
  assert.deepEqual(expiryFilter('VENCE_EM_30_DIAS'), { situacao: 'VENCE_EM_30_DIAS' })
  assert.deepEqual(expiryFilter('todos'), {})
  assert.equal(lotDeadline(0), 'Vence hoje')
  assert.equal(lotDeadline(null), 'Sem data de validade')
  assert.equal(lotDate(null), 'Não informada')
})
