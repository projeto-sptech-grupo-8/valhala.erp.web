import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, LabelList,
} from 'recharts'
import { Download, Info, Table2, Grid3x3 } from 'lucide-react'
import { Stat, ToneBadge } from '../../components/ui.jsx'
import { useToast } from '../../components/useToast.js'
import { fmtBRL, fmtNum } from '../../lib/format.js'
import { downloadCSV, stamp } from '../../lib/csv.js'
import { METAS } from '../../lib/kpi.js'
import { useStore } from './useStore.js'
import { getHistorico, CANAIS, MOTIVOS_PERDA } from './historico.js'
import {
  mergeSales, inPeriod, curvaABC, margemPorCategoria, rupturas, mapaHorarios, binOf, porCanal, perdas, WEEKDAYS, HOURS,
} from './relatorios.js'
import { axisTick, legendStyle } from './components/chartStyles.js'
import { DataTable } from './components/DataTable.jsx'
import s from './dash.module.css'

const ABAS = [
  ['abc', 'Curva ABC'], ['margem', 'Margem por categoria'], ['ruptura', 'Ruptura'],
  ['horarios', 'Vendas por horário'], ['canais', 'Canais'], ['perdas', 'Perdas por motivo'],
]
const PERIODOS = [[7, '7 dias'], [30, '30 dias'], [90, '90 dias']]
const CAT_VAR = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)']
const pct = (n, d = 0) => `${n.toFixed(d).replace('.', ',')}%`

/* tooltip padrão: texto em tinta, nunca na cor da série */
function Tip({ active, payload, label, fmt = fmtBRL, title }) {
  if (!active || !payload?.length) return null
  return (
    <div className={s.tip}>
      <span className={s.tipLabel}>{title ? title(payload[0].payload) : label}</span>
      {payload.map(p => (
        <span key={p.dataKey} className={s.tipRow}>
          <i style={{ background: p.color }} aria-hidden="true" />{p.name}: <b>{fmt(p.value, p.payload)}</b>
        </span>
      ))}
    </div>
  )
}

const grid = <CartesianGrid vertical={false} stroke="var(--grid)" />

/* ─── abas ─── */
function ABC({ sales, exportar }) {
  const rows = curvaABC(sales)
  const cls = (c) => rows.filter(r => r.classe === c)
  const resumo = ['A', 'B', 'C'].map(c => {
    const l = cls(c)
    return { c, itens: l.length, receita: l.reduce((a, r) => a + r.receita, 0), mix: rows.length ? (l.length / rows.length) * 100 : 0 }
  })
  const total = rows.reduce((a, r) => a + r.receita, 0) || 1
  const columns = [
    { key: 'pos', header: '#', width: 50, align: 'right' },
    { key: 'name', header: 'Produto', render: r => <b className={s.cellStrong}>{r.name}</b> },
    { key: 'cat', header: 'Categoria', width: 120 },
    { key: 'qty', header: 'Unidades', width: 90, align: 'right', render: r => fmtNum(r.qty) },
    { key: 'receita', header: 'Faturamento', width: 130, align: 'right', render: r => fmtBRL(r.receita) },
    { key: 'pct', header: '% do total', width: 100, align: 'right', render: r => pct(r.pct, 1) },
    { key: 'acumulado', header: '% acumulado', width: 110, align: 'right', render: r => pct(r.acumulado, 1) },
    { key: 'classe', header: 'Classe', width: 80, render: r => <ToneBadge tone={r.classe === 'A' ? 'ok' : r.classe === 'B' ? 'warn' : 'neutral'} label={r.classe} /> },
  ]
  return (
    <>
      <div className="stats">
        {resumo.map(r => (
          <Stat key={r.c} a={`Classe ${r.c}`} b={`${r.itens} ${r.itens === 1 ? 'item' : 'itens'}`}
            c={`${pct(r.mix)} do mix · ${pct((r.receita / total) * 100)} do faturamento`}
            tone="neutral" />
        ))}
      </div>
      <article className="card">
        <div className={s.cardTitleRow}>
          <h3>Faturamento acumulado por produto (do maior para o menor)</h3>
          <button onClick={() => exportar('curva-abc', ['Posição', 'Produto', 'Categoria', 'Unidades', 'Faturamento', '% do total', '% acumulado', 'Classe'], rows.map(r => [r.pos, r.name, r.cat, r.qty, r.receita, r.pct.toFixed(2), r.acumulado.toFixed(2), r.classe]))}>Exportar <Download size={13} aria-hidden="true" /></button>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={rows} margin={{ top: 12, right: 24, left: 4, bottom: 4 }}>
            {grid}
            <XAxis dataKey="pos" tick={axisTick} axisLine={false} tickLine={false} label={{ value: 'posição no ranking', position: 'insideBottomRight', offset: -2, style: { fill: 'var(--dim)', fontSize: 11 } }} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 80, 95, 100]} tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={44} />
            <ReferenceLine y={80} stroke="var(--dim)" strokeWidth={1} label={{ value: 'A até 80%', position: 'insideTopLeft', style: { fill: 'var(--dim)', fontSize: 11 } }} />
            <ReferenceLine y={95} stroke="var(--dim)" strokeWidth={1} label={{ value: 'B até 95%', position: 'insideTopLeft', style: { fill: 'var(--dim)', fontSize: 11 } }} />
            <Tooltip content={<Tip fmt={(v, p) => `${pct(v, 1)} · ${fmtBRL(p.receita)}`} title={p => `${p.pos}º · ${p.name} (classe ${p.classe})`} />} cursor={{ stroke: 'var(--grid)' }} />
            <Line type="monotone" dataKey="acumulado" name="% acumulado" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4, fill: 'var(--series-1)', stroke: 'var(--card)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
        <p className={s.chartNote}>Classe A são os poucos itens que trazem 80% do faturamento — <b>nunca podem faltar</b>. Classe C é cauda: revise mix e estoque parado.</p>
      </article>
      <DataTable caption="Curva ABC" columns={columns} rows={rows} initialSort={{ key: 'pos', dir: 'asc' }} pageSize={20} />
    </>
  )
}

function Margem({ sales, exportar }) {
  const rows = margemPorCategoria(sales)
  const meta = METAS.margemBruta.ok
  const total = rows.reduce((a, r) => ({ receita: a.receita + r.receita, cmv: a.cmv + r.cmv }), { receita: 0, cmv: 0 })
  const margemGeral = total.receita ? ((total.receita - total.cmv) / total.receita) * 100 : 0
  const abaixo = rows.filter(r => r.margem < meta)
  const columns = [
    { key: 'cat', header: 'Categoria', render: r => <b className={s.cellStrong}>{r.cat}</b> },
    { key: 'receita', header: 'Faturamento', width: 130, align: 'right', render: r => fmtBRL(r.receita) },
    { key: 'cmv', header: 'CMV', width: 120, align: 'right', render: r => fmtBRL(r.cmv) },
    { key: 'lucro', header: 'Lucro bruto', width: 130, align: 'right', render: r => fmtBRL(r.lucro) },
    { key: 'margem', header: 'Margem', width: 90, align: 'right', render: r => pct(r.margem, 1) },
    { key: 'share', header: '% do faturamento', width: 140, align: 'right', render: r => pct(r.share, 1) },
    { key: 'sit', header: 'Situação', width: 130, sort: r => r.margem, render: r => <ToneBadge tone={r.margem >= meta ? 'ok' : r.margem >= METAS.margemBruta.warn ? 'warn' : 'bad'} label={r.margem >= meta ? 'Na meta' : 'Abaixo da meta'} /> },
  ]
  const xmax = Math.max(60, Math.ceil(Math.max(...rows.map(r => r.margem), 0) / 10) * 10 + 10)
  return (
    <>
      <div className="stats">
        <Stat a="Margem bruta geral" b={pct(margemGeral, 1)} tone={margemGeral >= meta ? 'ok' : 'warn'} c={`Meta ≥ ${meta}%`} />
        <Stat a="Lucro bruto" b={fmtBRL(total.receita - total.cmv)} c={`sobre ${fmtBRL(total.receita)} faturados`} />
        <Stat a="Categorias abaixo da meta" b={abaixo.length} tone={abaixo.length ? 'warn' : 'ok'} c={abaixo.length ? abaixo.map(r => r.cat).join(', ') : 'Todas na meta'} />
      </div>
      <article className="card">
        <div className={s.cardTitleRow}>
          <h3>Margem bruta por categoria</h3>
          <button onClick={() => exportar('margem-categoria', ['Categoria', 'Faturamento', 'CMV', 'Lucro bruto', 'Margem %', '% do faturamento'], rows.map(r => [r.cat, r.receita, r.cmv, r.lucro, r.margem.toFixed(2), r.share.toFixed(2)]))}>Exportar <Download size={13} aria-hidden="true" /></button>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 44 + 40)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 56, left: 8, bottom: 4 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} stroke="var(--grid)" />
            <XAxis type="number" domain={[0, xmax]} tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="cat" tick={axisTick} axisLine={false} tickLine={false} width={96} />
            <ReferenceLine x={meta} stroke="var(--dim)" label={{ value: `meta ${meta}%`, position: 'top', style: { fill: 'var(--dim)', fontSize: 11 } }} />
            <Tooltip content={<Tip fmt={(v, p) => `${pct(v, 1)} · lucro ${fmtBRL(p.lucro)}`} />} cursor={{ fill: 'rgb(var(--ink) / .04)' }} />
            <Bar dataKey="margem" name="Margem" fill="var(--series-1)" radius={[0, 4, 4, 0]} barSize={18}>
              <LabelList dataKey="margem" position="right" formatter={v => pct(v)} style={{ fill: 'var(--text)', fontSize: 12 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </article>
      <DataTable caption="Margem por categoria" columns={columns} rows={rows} rowKey={r => r.cat} initialSort={{ key: 'margem', dir: 'desc' }} />
    </>
  )
}

function Ruptura({ dias, products, exportar }) {
  const hist = getHistorico()
  const rows = rupturas(hist.rupturaDiaria, dias, products)
  const comRuptura = rows.filter(r => r.dias > 0)
  const top = comRuptura.slice(0, 10).map(r => ({ ...r, nome: r.name.length > 22 ? r.name.slice(0, 21) + '…' : r.name }))
  const perdido = rows.reduce((a, r) => a + r.vendaPerdida, 0)
  const columns = [
    { key: 'name', header: 'Produto', render: r => <b className={s.cellStrong}>{r.name}</b> },
    { key: 'dias', header: 'Dias zerado', width: 110, align: 'right', render: r => `${r.dias} de ${dias}` },
    { key: 'ocorrencias', header: 'Ocorrências', width: 110, align: 'right' },
    { key: 'perdidas', header: 'Unid. não vendidas', width: 150, align: 'right', render: r => fmtNum(r.perdidas) },
    { key: 'vendaPerdida', header: 'Venda perdida', width: 130, align: 'right', render: r => fmtBRL(r.vendaPerdida) },
    { key: 'estoqueAtual', header: 'Estoque hoje', width: 120, align: 'right', render: r => `${fmtNum(r.estoqueAtual)} / mín. ${r.min}` },
    { key: 'sit', header: 'Situação', width: 120, sort: r => r.pctDias, render: r => <ToneBadge tone={r.pctDias > 10 ? 'bad' : r.dias ? 'warn' : 'ok'} label={r.pctDias > 10 ? 'Crônica' : r.dias ? 'Pontual' : 'Sem ruptura'} /> },
  ]
  return (
    <>
      <div className="stats">
        <Stat a="Venda perdida estimada" b={fmtBRL(perdido)} tone={perdido > 0 ? 'bad' : 'ok'} c={`Clientes que não acharam o produto em ${dias} dias`} />
        <Stat a="Produtos com ruptura" b={comRuptura.length} tone={comRuptura.length ? 'warn' : 'ok'} c={`de ${rows.length} no catálogo`} />
        <Stat a="Ruptura crônica" b={rows.filter(r => r.pctDias > 10).length} tone={rows.some(r => r.pctDias > 10) ? 'bad' : 'ok'} c="Zerado em mais de 10% dos dias" />
      </div>
      <article className="card">
        <div className={s.cardTitleRow}>
          <h3>Dias com o produto zerado</h3>
          <button onClick={() => exportar('ruptura', ['Produto', 'Dias zerado', 'Ocorrências', 'Unidades não vendidas', 'Venda perdida', 'Estoque hoje'], rows.map(r => [r.name, r.dias, r.ocorrencias, r.perdidas, r.vendaPerdida, r.estoqueAtual]))}>Exportar <Download size={13} aria-hidden="true" /></button>
        </div>
        {top.length === 0 ? <p className={s.muted}>Nenhuma ruptura no período.</p> : (
          <ResponsiveContainer width="100%" height={top.length * 38 + 40}>
            <BarChart data={top} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke="var(--grid)" />
              <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" tick={axisTick} axisLine={false} tickLine={false} width={170} />
              <Tooltip content={<Tip fmt={(v, p) => `${v} dia(s) · ${fmtBRL(p.vendaPerdida)} perdidos`} title={p => p.name} />} cursor={{ fill: 'rgb(var(--ink) / .04)' }} />
              <Bar dataKey="dias" name="Dias zerado" fill="var(--series-1)" radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="dias" position="right" style={{ fill: 'var(--text)', fontSize: 12 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className={s.chartNote}>Venda perdida = unidades procuradas enquanto o produto estava zerado × preço. Ruptura crônica pede rever estoque mínimo ou fornecedor.</p>
      </article>
      <DataTable caption="Ruptura por produto" columns={columns} rows={rows} initialSort={{ key: 'vendaPerdida', dir: 'desc' }} pageSize={15} />
    </>
  )
}

function Horarios({ sales, dias, exportar }) {
  const { grid: g, max, picos, porDia } = mapaHorarios(sales)
  const [tabela, setTabela] = useState(false)
  const [hover, setHover] = useState(null)
  const melhorDia = [...porDia].sort((a, b) => b.tickets - a.tickets)[0]
  const piorDia = [...porDia].sort((a, b) => a.tickets - b.tickets)[0]
  const isPico = (ri, ci) => picos.some(p => p.ri === ri && p.ci === ci)
  const bins = [1, 2, 3, 4, 5].map(b => ({ b, de: Math.ceil(((b - 1) / 5) * max) || 1, ate: Math.floor((b / 5) * max) }))

  return (
    <>
      <div className="stats">
        <Stat a="Horário de pico" b={`${picos[0]?.dia} ${picos[0]?.hora}h`} c={`${picos[0]?.tickets ?? 0} vendas no período · ${fmtBRL(picos[0]?.receita ?? 0)}`} />
        <Stat a="Dia mais forte" b={melhorDia?.dia} c={`${melhorDia?.tickets} vendas em ${dias} dias`} />
        <Stat a="Dia mais fraco" b={piorDia?.dia} c={`${piorDia?.tickets} vendas — bom para folga e inventário`} />
      </div>
      <article className="card">
        <div className={s.cardTitleRow}>
          <h3>Vendas por dia da semana e hora</h3>
          <div className={s.rowActions}>
            <button onClick={() => setTabela(t => !t)} aria-pressed={tabela}>{tabela ? <><Grid3x3 size={13} aria-hidden="true" /> Ver mapa</> : <><Table2 size={13} aria-hidden="true" /> Ver tabela</>}</button>
            <button onClick={() => exportar('vendas-por-horario', ['Dia', ...HOURS.map(h => `${h}h`)], WEEKDAYS.map((d, ri) => [d, ...g[ri].map(c => c.tickets)]))}>Exportar <Download size={13} aria-hidden="true" /></button>
          </div>
        </div>
        <p className={s.heatInfo} aria-live="polite">
          {hover ? <><b>{hover.dia} {hover.hora}h</b> · {hover.tickets} venda(s) · {fmtBRL(hover.receita)}</> : 'Passe o mouse sobre uma célula para ver o detalhe.'}
        </p>
        <div className={s.heatWrap}>
          <table className={tabela ? s.heatTable : s.heat}>
            <caption className={s.srOnly}>Número de vendas por dia da semana e hora, nos últimos {dias} dias</caption>
            <thead><tr><th scope="col"><span className={s.srOnly}>Dia</span></th>{HOURS.map(h => <th key={h} scope="col">{h}h</th>)}</tr></thead>
            <tbody>
              {WEEKDAYS.map((d, ri) => (
                <tr key={d}>
                  <th scope="row">{d}</th>
                  {g[ri].map((c, ci) => (
                    <td
                      key={ci}
                      className={tabela ? undefined : `${s['heat' + binOf(c.tickets, max)]} ${isPico(ri, ci) ? s.heatPeak : ''}`}
                      aria-label={`${d} ${HOURS[ci]}h: ${c.tickets} vendas`}
                      onMouseEnter={() => setHover({ dia: d, hora: HOURS[ci], ...c })}
                      onMouseLeave={() => setHover(null)}
                    >
                      {tabela ? c.tickets : <span className={s.srOnly}>{c.tickets}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!tabela && (
          <div className={s.heatLegend} aria-label="Escala de cores">
            <span>Menos</span>
            <i className={s.heat0} title="0 vendas" />
            {bins.map(b => <i key={b.b} className={s['heat' + b.b]} title={`${b.de}–${b.ate} vendas`} />)}
            <span>Mais</span>
            <small>Contorno = 3 horários de pico</small>
          </div>
        )}
        <p className={s.chartNote}>
          <b>Escala sugerida:</b> reforçar a equipe em {picos.map(p => `${p.dia} ${p.hora}h`).join(', ')}; usar {piorDia?.dia} para inventário e recebimento de mercadoria.
        </p>
      </article>
    </>
  )
}

function Canais({ sales, exportar }) {
  const rows = porCanal(sales, CANAIS)
  const melhor = [...rows].sort((a, b) => b.ticket - a.ticket)[0]
  return (
    <>
      <div className="stats">
        {rows.map(r => (
          <Stat key={r.canal} a={r.canal} b={fmtBRL(r.ticket)} tone="neutral"
            badge={melhor && r.canal === melhor.canal ? 'Maior ticket' : undefined}
            c={`ticket médio · ${r.vendas} vendas · ${fmtBRL(r.faturamento)} (${pct(r.share)})`} />
        ))}
      </div>
      <article className="card">
        <div className={s.cardTitleRow}>
          <h3>Comparativo por canal</h3>
          <button onClick={() => exportar('canais', ['Canal', 'Vendas', 'Faturamento', 'Ticket médio', '% do faturamento', 'Itens por venda'], rows.map(r => [r.canal, r.vendas, r.faturamento, r.ticket.toFixed(2), r.share.toFixed(2), r.itensPorVenda.toFixed(2)]))}>Exportar <Download size={13} aria-hidden="true" /></button>
        </div>
        <table className={s.simpleTable}>
          <thead><tr><th scope="col">Canal</th><th scope="col">Vendas</th><th scope="col">Faturamento</th><th scope="col">% do faturamento</th><th scope="col">Ticket médio</th><th scope="col">Itens por venda</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.canal}><td><b>{r.canal}</b></td><td>{fmtNum(r.vendas)}</td><td>{fmtBRL(r.faturamento)}</td><td>{pct(r.share, 1)}</td><td>{fmtBRL(r.ticket)}</td><td>{fmtNum(r.itensPorVenda)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className={s.chartNote}>São três números por canal: cartões e tabela comunicam melhor que um gráfico. Use o ticket por canal para definir taxa de entrega e mínimo do delivery.</p>
      </article>
    </>
  )
}

function Perdas({ dias, movements, products, receita, exportar }) {
  const hist = getHistorico()
  const { rows, porMotivo, total, gran } = perdas(hist.perdas, movements, products, dias)
  const maior = [...porMotivo].sort((a, b) => b.valor - a.valor)[0]
  const pctReceita = receita ? (total / receita) * 100 : 0
  const columns = [
    { key: 'label', header: gran === 'mes' ? 'Mês' : gran === 'semana' ? 'Semana' : 'Dia', sort: r => r.k, render: r => <b className={s.cellStrong}>{r.label}</b> },
    ...MOTIVOS_PERDA.map((m, k) => ({ key: m, header: m, align: 'right', render: r => <span className={s.legendCell}><i style={{ background: CAT_VAR[k] }} aria-hidden="true" />{fmtBRL(r[m])}</span> })),
    { key: 'total', header: 'Total', width: 110, align: 'right', render: r => <b>{fmtBRL(r.total)}</b> },
  ]
  return (
    <>
      <div className="stats">
        <Stat a="Perdas no período" b={fmtBRL(total)} tone={pctReceita > 2 ? 'bad' : pctReceita > 1 ? 'warn' : 'ok'} c={`${pct(pctReceita, 1)} do faturamento · meta ≤ 1%`} />
        <Stat a="Maior motivo" b={maior?.valor ? maior.motivo : '—'} c={maior?.valor ? fmtBRL(maior.valor) : 'Sem perdas'} />
        {porMotivo.filter(m => m.motivo !== maior?.motivo).slice(0, 2).map(m => <Stat key={m.motivo} a={m.motivo} b={fmtBRL(m.valor)} c={total ? `${pct((m.valor / total) * 100)} das perdas` : '—'} />)}
      </div>
      <article className="card">
        <div className={s.cardTitleRow}>
          <h3>Perdas a custo por motivo</h3>
          <button onClick={() => exportar('perdas-por-motivo', ['Período', ...MOTIVOS_PERDA, 'Total'], rows.map(r => [r.label, ...MOTIVOS_PERDA.map(m => r[m]), r.total]))}>Exportar <Download size={13} aria-hidden="true" /></button>
        </div>
        {rows.length === 0 ? <p className={s.muted}>Sem perdas no período.</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 4 }} barCategoryGap="28%">
              {grid}
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => `R$${Math.round(v)}`} width={56} />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgb(var(--ink) / .04)' }} />
              <Legend iconType="square" iconSize={10} wrapperStyle={legendStyle} />
              {MOTIVOS_PERDA.map((m, k) => (
                <Bar key={m} dataKey={m} name={m} stackId="p" fill={CAT_VAR[k]} stroke="var(--card)" strokeWidth={2}
                  radius={k === MOTIVOS_PERDA.length - 1 ? [4, 4, 0, 0] : 0} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </article>
      <DataTable caption="Perdas por motivo" columns={columns} rows={rows} rowKey={r => r.k} initialSort={{ key: 'label', dir: 'asc' }} pageSize={20} />
    </>
  )
}

/* ─── Relatórios ─── */
export function Relatorios({ navigate, pageParams }) {
  const { sales: real, products, drinks, movements } = useStore()
  const toast = useToast()
  const [aba, setAba] = useState(ABAS.some(a => a[0] === pageParams?.aba) ? pageParams.aba : 'abc')
  const [dias, setDias] = useState([7, 30, 90].includes(Number(pageParams?.dias)) ? Number(pageParams.dias) : 30)

  const hist = getHistorico()
  const sales = mergeSales(hist, real, products, drinks).filter(v => inPeriod(v.em, dias))
  const receita = sales.reduce((a, v) => a + v.total, 0)

  const set = (patch) => {
    const next = { aba, dias, ...patch }
    setAba(next.aba); setDias(next.dias)
    navigate('relatorios', next, { replace: true })
  }
  const exportar = (nome, headers, rows) => {
    downloadCSV(`${nome}-${dias}d-${stamp()}`, headers, rows)
    toast(`${rows.length} linha(s) exportada(s).`, { title: 'Exportação concluída' })
  }

  return (
    <>
      <div className={s.reportFilters}>
        <div className={s.segRow} role="radiogroup" aria-label="Período">
          {PERIODOS.map(([d, l]) => (
            <button key={d} type="button" role="radio" aria-checked={dias === d} className={dias === d ? s.segRowOn : undefined} onClick={() => set({ dias: d })}>{l}</button>
          ))}
        </div>
        <span className={s.muted}>{fmtNum(sales.length)} vendas · {fmtBRL(receita)}</span>
      </div>

      <nav className={s.reportTabs} aria-label="Relatórios">
        {ABAS.map(([id, label]) => (
          <a key={id} href={`#/relatorios?aba=${id}&dias=${dias}`} aria-current={aba === id ? 'page' : undefined} className={aba === id ? s.reportTabOn : undefined}
            onClick={e => { e.preventDefault(); set({ aba: id }) }}>{label}</a>
        ))}
      </nav>

      <p className={s.ruleNote}><Info size={14} aria-hidden="true" /> Dados de demonstração: 90 dias simulados a partir do giro de cada produto + as vendas reais desta sessão. Com o backend, os números passam a vir do banco.</p>

      {aba === 'abc' && <ABC sales={sales} exportar={exportar} />}
      {aba === 'margem' && <Margem sales={sales} exportar={exportar} />}
      {aba === 'ruptura' && <Ruptura dias={dias} products={products} exportar={exportar} />}
      {aba === 'horarios' && <Horarios sales={sales} dias={dias} exportar={exportar} />}
      {aba === 'canais' && <Canais sales={sales} exportar={exportar} />}
      {aba === 'perdas' && <Perdas dias={dias} movements={movements} products={products} receita={receita} exportar={exportar} />}
    </>
  )
}
