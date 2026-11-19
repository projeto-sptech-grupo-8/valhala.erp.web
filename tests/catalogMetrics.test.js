import test from 'node:test'
import assert from 'node:assert/strict'
import { marginMetric, coverageMetric, turnoverPeriod, loadTurnover } from '../src/features/catalog/remote/catalogMetrics.js'

test('margem trata limites e custo desconhecido', () => {
  assert.equal(marginMetric(10, 11).tone, 'red')
  assert.equal(marginMetric(10, 10).tone, 'orange')
  assert.equal(marginMetric(10, 8).tone, 'yellow')
  assert.equal(marginMetric(10, 6).tone, 'green')
  assert.equal(marginMetric(10, 0).value, null)
  assert.equal(marginMetric(Infinity, 1).value, null)
})
test('cobertura usa limites exatos e não divide por zero', () => {
  for (const [days, tone] of [[0, 'red'], [6, 'red'], [7, 'yellow'], [30, 'yellow'], [31, 'green'], [60, 'green'], [61, 'orange']]) assert.equal(coverageMetric(days, 30).tone, tone)
  assert.equal(coverageMetric(20, 0).label, 'Sem giro')
  assert.equal(coverageMetric(null, 20).label, 'Indisponível')
  assert.deepEqual(turnoverPeriod(new Date(2026, 2, 1)), { dataInicial: '2026-01-30', dataFinal: '2026-02-28' })
})
const p = { id: 'p', tipo: 'padrao', fracionado: true, quantidadeEstoqueBase: 1000 }
const period = { dataInicial: '2026-10-01', dataFinal: '2026-10-30' }
const movement = (id, tipo, quantidade, extra = {}) => ({ id, tipo, quantidade, produtoId: 'p', unidadeEstoque: 'ML', ocorridoEm: '2026-10-15T12:00:00', ...extra })
test('giro soma todas as páginas e inclui só consumo compatível no período', async () => {
  const requests = []
  const data = await loadTurnover(p, period, async params => {
    requests.push(params)
    return params.pagina === 0 ? { itens: [movement(1, 'SAIDA', 100), movement(2, 'PERDA', 500), movement(3, 'ENTRADA', 600)], ultima: false } : { itens: [movement(4, 'SAIDA_DRINK', 50), movement(5, 'SAIDA', 100, { produtoId: 'outro' }), movement(6, 'SAIDA', 100, { ocorridoEm: '2026-09-30' })], ultima: true }
  })
  assert.equal(data.outgoing, 150)
  assert.equal(data.coverage.value, 200)
  assert.equal(requests.length, 2)
  assert.equal(requests[0].produtoId, p.id)
})
test('giro não publica parcial ou drinks e rejeita unidade incorreta', async () => {
  let calls = 0
  const data = await loadTurnover(p, period, async () => { calls++; return { itens: [], ultima: false } })
  assert.equal(calls, 10)
  assert.ok(data.unavailable)
  await assert.rejects(loadTurnover(p, period, async () => ({ itens: [movement(1, 'SAIDA', 2, { unidadeEstoque: 'UN' })], ultima: true })), /incompatível/)
  assert.ok((await loadTurnover({ tipo: 'drink' }, period, () => assert.fail())).unavailable)
})

 test('giro aceita a unidade cadastrada no produto padrão sem confundir unidades', async () => {
  for (const unit of ['un', 'garrafa']) {
    const product = { ...p, fracionado: false, unit, quantidadeEstoqueBase: 20 }
    const result = await loadTurnover(product, period, async () => ({ itens: [movement(1, 'SAIDA', 2, { unidadeEstoque: unit })], ultima: true }))
    assert.equal(result.outgoing, 2)
    assert.equal(result.coverage.value, 300)
    await assert.rejects(loadTurnover(product, period, async () => ({ itens: [movement(1, 'SAIDA', 2)], ultima: true })), /incompatível/)
  }
})
