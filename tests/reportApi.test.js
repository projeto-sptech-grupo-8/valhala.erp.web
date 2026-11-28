import test from 'node:test'
import assert from 'node:assert/strict'
import { horarioReport, perdasReport, pertenceAoHorario } from '../src/pages/finance/reports/model/reportTransform.js'

test('pertenceAoHorario aceita LocalDateTime sem offset e timestamps UTC convertidos pelo fuso horário', () => {
  // 2026-11-23 é segunda-feira (diaSemana 0)
  assert.equal(
    pertenceAoHorario({ concluidoEm: '2026-11-23T19:45:00' }, '2026-11-01', '2026-11-30', 0, 19, 'America/Sao_Paulo'),
    true,
  )
  // 2026-11-24T01:30:00Z corresponde a 2026-11-23 22:30 em America/Sao_Paulo (-03:00)
  assert.equal(
    pertenceAoHorario({ concluidoEm: '2026-11-24T01:30:00Z' }, '2026-11-01', '2026-11-30', 0, 22, 'America/Sao_Paulo'),
    true,
  )
  assert.equal(
    pertenceAoHorario({ concluidoEm: '2026-11-24T01:30:00Z' }, '2026-11-01', '2026-11-30', 1, 1, 'America/Sao_Paulo'),
    false,
  )
})

test('horarioReport organiza grade semanal e destaca picos', () => {
  const report = horarioReport([
    { diaSemana: 4, hora: 20, vendas: 12, receita: 960 },
    { diaSemana: 5, hora: 21, vendas: 18, receita: 1440 },
  ])
  assert.equal(report.max, 18)
  assert.equal(report.picos[0].dia, 'Sáb')
  assert.equal(report.picos[0].hora, 21)
  assert.equal(report.porDia[4].tickets, 12)
  assert.equal(report.porDia[5].tickets, 18)
})

test('perdasReport agrega motivos por período mantendo ordem cronológica e total', () => {
  const report = perdasReport([
    { periodo: '2026-11-02', motivo: 'Vencimento', valor: 40 },
    { periodo: '2026-11-01', motivo: 'Perda / quebra', valor: 25 },
    { periodo: '2026-11-02', motivo: 'Consumo interno', valor: 10 },
  ], 'dia')
  assert.deepEqual(report.rows.map(r => r.label), ['01/11', '02/11'])
  assert.equal(report.total, 75)
  assert.equal(report.rows[1].total, 50)
})
