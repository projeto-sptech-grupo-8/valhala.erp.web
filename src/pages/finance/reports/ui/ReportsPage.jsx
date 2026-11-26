import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, LabelList, Rectangle, Dot,
} from 'recharts'
import {
  AlarmClock, Banknote, Bike, CalendarArrowDown, CalendarArrowUp, CalendarClock, CalendarX, ChartNoAxesCombined, CircleCheck, CircleMinus, CircleX, Clock3,
  CupSoda, Eye, Grid3x3, Package, PackageX, Percent, Repeat, ShoppingBag, Store, Table2, TrendingDown, TrendingUp, Utensils,
} from 'lucide-react'
import { ToneBadge } from '@/shared/ui/primitives/ui.jsx'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { fmtBRL, fmtNum } from '@/shared/lib/format.js'
import { downloadCSV, stamp } from '@/shared/lib/csv.js'
import { LIMITE_FALTA_RECORRENTE, METAS, PRIORIDADES_ABC, TONE_COLOR, toneHigher, toneLower } from '@/entities/reports'
import { useStore } from '@/entities/store'
import { binOf, WEEKDAYS } from '@/entities/reports'
import { axisTick, legendStyle } from '@/shared/ui/charts/chartStyles.js'
import { Drawer } from '@/shared/ui/drawer/Drawer.jsx'
import { PeriodSelector } from '@/shared/ui/period-selector/PeriodSelector.jsx'
import p from '@/shared/styles/panel.module.css'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { ErrorBlock, LoadingBlock, Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { readReport, estoqueAtual, horarioReport, perdasReport, produtosDoHorario } from '../model/reportApi.js'
import { ReportTable } from './ReportTable.jsx'
import s from './ReportsPage.module.css'

const ABAS = [
  { id: 'abc', label: 'Curva ABC', Icon: ChartNoAxesCombined, title: 'Produtos que mais faturam',
    description: 'Veja quais produtos mais contribuem para o faturamento.' },
  { id: 'margem', endpoint: 'margem-categorias', label: 'Margem por categoria', Icon: Percent, title: 'Margem por categoria',
    description: 'Compare quanto sobra das vendas depois de descontar o custo dos produtos.' },
  { id: 'ruptura', label: 'Falta de estoque', Icon: PackageX, title: 'Falta de estoque',
    description: 'Veja quais produtos ficaram sem estoque e quanto isso pode ter custado.' },
  { id: 'horarios', label: 'Horários de venda', Icon: Clock3, title: 'Horários de venda',
    description: 'Identifique os dias e horários em que o caixa fica mais movimentado.' },
  { id: 'canais', label: 'Canais de venda', Icon: Store, title: 'Canais de venda',
    description: 'Compare balcão, mesa e delivery.' },
  { id: 'perdas', label: 'Perdas por motivo', Icon: TrendingDown, title: 'Perdas por motivo',
    description: 'Veja quanto foi perdido a preço de custo e quais motivos mais pesaram.' },
]
const PERIODOS = [7, 30, 90].map(id => ({ id, label: `${id} dias` }))
const BUSCA_PRODUTO = { key: 'name', label: 'Buscar produto', placeholder: 'Digite o nome do produto' }
const BUSCA_CATEGORIA = { key: 'cat', label: 'Buscar categoria', placeholder: 'Digite o nome da categoria' }
const SITUACAO_RUPTURA = { ok: 'Sem registro', warn: 'Pontual', bad: 'Recorrente' }
const ICONES_CANAL = new Map([['Balcão', Store], ['Mesa', Utensils], ['Retirada', ShoppingBag], ['Delivery', Bike]])
const ESTILO_POR_MOTIVO = {
  'Perda / quebra': { color: TONE_COLOR.bad, accent: 'red', Icon: PackageX },
  Vencimento: { color: TONE_COLOR.warn, accent: 'gold', Icon: CalendarX },
  'Consumo interno': { color: TONE_COLOR.ok, accent: 'green', Icon: CupSoda },
}
const pct = (n, d = 0) => n == null ? '—' : `${n.toFixed(d).replace('.', ',')}%`
const HEATMAP_DIRECTIONS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
const DIAS_POR_EXTENSO = {
  Seg: 'Segunda-feira', Ter: 'Terça-feira', Qua: 'Quarta-feira', Qui: 'Quinta-feira',
  Sex: 'Sexta-feira', Sáb: 'Sábado', Dom: 'Domingo',
}

const KPI_STATUS = {
  ok: { label: 'Bom', Icon: CircleCheck },
  warn: { label: 'Médio', Icon: CircleMinus },
  bad: { label: 'Ruim', Icon: CircleX },
  neutral: { label: 'Sem referência' },
}

function percentual(parte, total) {
  return total ? pct(parte / total * 100, 1) : null
}

function Indicadores({ unidade, items }) {
  return (
    <div className={s.metrics} data-four-columns={items.length === 4 || undefined} role="region" aria-label="Indicadores do relatório">
      {items.map(({ label, value, percent, percentLabel, description, tone, statusLabel, featured, accent, Icon }) => {
        const status = KPI_STATUS[tone]
        const badgeLabel = statusLabel ?? status?.label
        const exibirPercentual = unidade === 'percentual' && percent !== undefined
        return (
          <article key={label} className={s.stat} data-featured={featured || undefined} data-tone={tone ?? 'neutral'} data-accent={accent}>
            <div className={s.statTitleRow}>
              <h3>{Icon && <span className={s.statIcon}><Icon size={18} aria-hidden="true" /></span>}{label}</h3>
              {badgeLabel && <span className={s.kpiStatus} data-priority={statusLabel ? true : undefined}>
                {!statusLabel && status?.Icon && <status.Icon size={17} aria-hidden="true" />}
                {badgeLabel}
              </span>}
            </div>
            <div>
              <strong className={s.statValue}>{exibirPercentual ? percent ?? '—' : value}</strong>
              {exibirPercentual && percent != null && <span className={s.statUnit}>{percentLabel}</span>}
            </div>
            <p>{description}</p>
          </article>
        )
      })}
    </div>
  )
}

function Tip({ active, payload, label, fmt = fmtBRL, title, color }) {
  if (!active || !payload?.length) return null
  return (
    <div className={p.tip}>
      <span className={p.tipLabel}>{title ? title(payload[0].payload) : label}</span>
      {payload.map(p => (
        <span key={p.dataKey} className={p.tipRow}>
          <i style={{ background: color?.(p.payload) ?? p.color }} aria-hidden="true" />{p.name}: <b>{fmt(p.value, p.payload)}</b>
        </span>
      ))}
    </div>
  )
}

const grid = <CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="4 4" />
const reportBarColor = row => TONE_COLOR[row.tone]

function ReportBarShape(props) {
  return <Rectangle {...props} fill={reportBarColor(props.payload)} />
}

function ClasseABC({ classe }) {
  const { tone, label } = PRIORIDADES_ABC[classe]
  return <span className={s.abcClassBadge} data-tone={tone} title={label}><ToneBadge tone={tone} label={'Classe ' + classe} /></span>
}

const corClasseABC = row => TONE_COLOR[PRIORIDADES_ABC[row.classe].tone]

function PontoABC({ cx, cy, r, payload }) {
  if (!payload?.classe) return null
  return <Dot cx={cx} cy={cy} r={r} fill={corClasseABC(payload)} stroke="var(--card)" strokeWidth={1.5} />
}

function TooltipABC({ active, payload }) {
  const produto = payload?.[0]?.payload
  if (!active || !produto?.classe) return null
  return <div className={`${p.tip} ${s.abcTooltip}`}>
    <strong className={p.tipLabel}>{produto.pos}º · {produto.name}</strong>
    <span style={{ color: corClasseABC(produto) }}>Classe {produto.classe}</span>
    <dl>
      <div><dt>Faturamento do produto</dt><dd>{fmtBRL(produto.receita)}</dd></div>
      <div><dt>Participação no total</dt><dd>{pct(produto.pct, 1)}</dd></div>
      <div><dt>Percentual acumulado</dt><dd>{pct(produto.acumulado, 1)}</dd></div>
    </dl>
  </div>
}

function ParticipacaoABC({ value }) {
  const width = Math.max(0, Math.min(100, value))
  return (
    <span className={s.abcShare}>
      <span>{pct(value, 1)}</span>
      <span className={s.abcShareTrack} aria-hidden="true"><span style={{ width: width + '%' }} /></span>
    </span>
  )
}

function DetalhesProdutoABC({ produto, dias, onClose }) {
  return createPortal(
    <Drawer title={`Curva ABC de ${produto.name}`} onClose={onClose}>
      <header className={s.abcDetailHeader}>
        <ClasseABC classe={produto.classe} />
        <h2>{produto.name}</h2>
        <p>{produto.cat || 'Categoria não informada'} · Últimos {dias} dias</p>
      </header>
      <section className={s.drawerRevenue} aria-label="Faturamento do produto">
        <span>Faturamento no período</span>
        <strong>{fmtBRL(produto.receita)}</strong>
      </section>
      <section className={s.abcDetailSection}>
        <h3>Desempenho na Curva ABC</h3>
        <dl className={s.abcDetailMetrics}>
          <div><dt>Posição no ranking</dt><dd>{fmtNum(produto.pos)}º</dd></div>
          <div><dt>Unidades vendidas</dt><dd>{fmtNum(produto.qty)}</dd></div>
          <div><dt>% do faturamento total</dt><dd>{pct(produto.pct, 1)}</dd></div>
          <div><dt>% acumulado no ranking</dt><dd>{pct(produto.acumulado, 1)}</dd></div>
        </dl>
        <p>O acumulado soma a participação deste produto à dos itens que aparecem antes dele no ranking por faturamento.</p>
      </section>
    </Drawer>,
    document.body,
  )
}

function TabelaProdutosABC({ rows, dias, exportar }) {
  const [produtoAbertoId, setProdutoAbertoId] = useState(null)
  const produtoAberto = rows.find(row => row.id === produtoAbertoId)

  function abrirProduto(event, id) {
    event.currentTarget.focus({ preventScroll: true })
    setProdutoAbertoId(id)
  }

  const columns = [
    { key: 'pos', header: '#', width: 60, align: 'left' },
    {
      key: 'name', header: 'Produto', width: 200,
      render: row => (
        <button type="button" className={s.abcProductLink} aria-haspopup="dialog"
          onClick={event => abrirProduto(event, row.id)}>
          <span>{row.name}</span>
        </button>
      ),
    },
    { key: 'cat', header: 'Categoria' },
    { key: 'qty', header: 'Unidades', align: 'right', render: r => fmtNum(r.qty) },
    { key: 'receita', header: 'Faturamento', align: 'right', render: r => <strong className={s.abcMoney}>{fmtBRL(r.receita)}</strong> },
    { key: 'pct', header: '% do total', align: 'right', render: r => <ParticipacaoABC value={r.pct} /> },
    { key: 'acumulado', header: '% acumulado', align: 'right', render: r => pct(r.acumulado, 1) },
    { key: 'classe', header: 'Classe', render: r => <ClasseABC classe={r.classe} /> },
    {
      key: 'acoes', header: 'Detalhes', align: 'center', sort: false,
      render: row => (
        <button type="button" className={s.abcAction} aria-haspopup="dialog" aria-label={`Ver detalhes de ${row.name}`}
          onClick={event => abrirProduto(event, row.id)}>
          <Eye size={15} aria-hidden="true" />Ver detalhes
        </button>
      ),
    },
  ]

  const filtros = [
    {
      key: 'classe', label: 'Classe ABC', allLabel: 'Todas', segmented: true,
      options: Object.entries(PRIORIDADES_ABC).map(([value, { tone }]) => ({ value, label: value, tone })),
    },
  ]

  return (
    <>
      <ReportTable title="Detalhamento por produto" caption="Curva ABC" searches={[BUSCA_PRODUTO, BUSCA_CATEGORIA]} filters={filtros}
        columns={columns} rows={rows} minColumnWidth={152}
        onExport={() => exportar('curva-abc', ['Posição', 'Produto', 'Categoria', 'Unidades', 'Faturamento', '% do total', '% acumulado', 'Classe'],
          rows.map(r => [r.pos, r.name, r.cat, r.qty, r.receita, r.pct?.toFixed(2), r.acumulado?.toFixed(2), r.classe]))}
        initialSort={{ key: 'pos', dir: 'asc' }} emptyText="Nenhum produto vendido no período."
        rowClassName={row => row.id === produtoAbertoId ? s.abcSelectedRow : undefined} />
      {produtoAberto && <DetalhesProdutoABC produto={produtoAberto} dias={dias} onClose={() => setProdutoAbertoId(null)} />}
    </>
  )
}

/* ─── abas ─── */
function ABC({ data, exportar, unidade, dias }) {
  const rows = data.itens.map(r => ({
    id: r.produtoId, name: r.nome, cat: r.categoria, qty: r.quantidade, receita: r.receita,
    pos: r.posicao, pct: r.percentual, acumulado: r.acumulado, classe: r.classe,
  }))
  const resumo = Object.keys(PRIORIDADES_ABC).map(classe => {
    const itens = rows.filter(row => row.classe === classe)
    return { classe, count: itens.length, receita: itens.reduce((sum, row) => sum + row.receita, 0) }
  })
  const total = rows.reduce((a, r) => a + r.receita, 0)
  const curva = [{ pos: 0, acumulado: 0 }, ...rows]
  return (
    <>
      <Indicadores unidade={unidade} items={resumo.map(({ classe, count, receita }) => ({
        label: `Classe ${classe}`,
        value: fmtBRL(receita),
        percent: percentual(receita, total),
        percentLabel: 'do faturamento',
        description: `${count} ${count === 1 ? 'produto' : 'produtos'} · ${pct(rows.length ? count / rows.length * 100 : 0)} dos produtos vendidos`,
        tone: PRIORIDADES_ABC[classe].tone,
        statusLabel: PRIORIDADES_ABC[classe].label,
      }))} />
      <article className={s.card} aria-labelledby="abc-revenue-title">
        <div className={s.cardHead}>
          <div><h3 id="abc-revenue-title"><ChartNoAxesCombined size={18} aria-hidden="true" />Faturamento acumulado</h3><p>Participação acumulada dos produtos, do maior para o menor faturamento.</p></div>
        </div>
        {rows.length ? (
          <div className={s.abcGrid}>
            <figure className={s.abcChart} aria-labelledby="abc-revenue-title">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={curva} margin={{ top: 12, right: 14, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reports-abc-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  {grid}
                  <XAxis dataKey="pos" type="number" domain={[0, 'dataMax']} allowDecimals={false} minTickGap={20}
                    tickFormatter={valor => valor === 0 ? '' : valor} tick={axisTick} axisLine={false} tickLine={false} tickMargin={8} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 100]} tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => pct(v)} width={44} />
                  <ReferenceLine y={80} stroke="var(--red)" strokeDasharray="5 4"
                    label={{ value: '80%', position: 'insideBottomRight', fill: 'var(--red)', fontSize: 11, fontWeight: 650 }} />
                  <ReferenceLine y={95} stroke="var(--gold2)" strokeDasharray="5 4"
                    label={{ value: '95%', position: 'insideBottomRight', fill: 'var(--gold2)', fontSize: 11, fontWeight: 650 }} />
                  <Tooltip content={<TooltipABC />} cursor={{ stroke: 'var(--accent-line)', strokeDasharray: '4 4' }} />
                  <Area type="linear" dataKey="acumulado" name="Faturamento acumulado" stroke="var(--series-1)" strokeWidth={2.5}
                    fill="url(#reports-abc-fill)" dot={rows.length <= 40 && <PontoABC r={4} />} activeDot={<PontoABC r={6} />} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
              <figcaption className={s.axisNote}>Posição do produto no ranking</figcaption>
              <ul className={s.abcLegend} aria-label="Classes do gráfico">
                {Object.entries(PRIORIDADES_ABC).map(([classe, { tone }]) => (
                  <li key={classe}><i style={{ background: TONE_COLOR[tone] }} aria-hidden="true" />Classe {classe}</li>
                ))}
              </ul>
            </figure>
            <section className={s.ranking} aria-label="Maiores faturamentos">
              <h4>Maiores faturamentos</h4>
              <ol>
                {rows.slice(0, 3).map(row => (
                  <li key={row.id}>
                    <span><strong>{row.name}</strong><small>{row.cat}</small></span>
                    <span className={s.rankingAmount}><b>{fmtBRL(row.receita)}</b><small>{pct(row.pct, 1)} do total</small></span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        ) : <p className={s.empty}>Nenhuma venda registrada neste período.</p>}
        <p className={s.chartNote}>O produto que atinge ou ultrapassa 80% ou 95% ainda faz parte da classe que completa aquele limite.</p>
      </article>
      <TabelaProdutosABC rows={rows} dias={dias} exportar={exportar} />
    </>
  )
}

function Margem({ data, unidade }) {
  const { ok: meta, warn: minimo } = METAS.margemBruta
  const rows = data.itens.map(row => ({
    ...row, cat: row.categoria, share: row.participacao, tone: toneHigher(row.margem, METAS.margemBruta),
  }))
  const total = rows.reduce((a, r) => ({ receita: a.receita + r.receita, cmv: a.cmv + r.cmv }), { receita: 0, cmv: 0 })
  const lucroBruto = total.receita - total.cmv
  const margemGeral = total.receita ? (lucroBruto / total.receita) * 100 : null
  const cmvPct = total.receita ? (total.cmv / total.receita) * 100 : null
  const abaixo = rows.filter(r => r.tone === 'warn' || r.tone === 'bad')
  const temReferencia = rows.some(r => r.tone !== 'neutral')
  const receitaAbaixoDaMeta = abaixo.reduce((soma, row) => soma + row.receita, 0)
  const columns = [
    { key: 'cat', header: 'Categoria', render: r => <b className={p.cellStrong}>{r.cat}</b> },
    { key: 'receita', header: 'Faturamento', align: 'right', render: r => fmtBRL(r.receita) },
    { key: 'cmv', header: 'CMV', align: 'right', render: r => fmtBRL(r.cmv) },
    { key: 'lucro', header: 'Lucro bruto', align: 'right', render: r => fmtBRL(r.lucro) },
    { key: 'margem', header: 'Margem', align: 'right', render: r => pct(r.margem, 1) },
    { key: 'share', header: '% do faturamento', align: 'right', render: r => pct(r.share, 1) },
    { key: 'sit', header: 'Situação', sort: r => r.margem, render: r => <ToneBadge tone={r.tone}
      label={r.tone === 'neutral' ? 'Sem referência' : r.tone === 'ok' ? 'Na meta' : 'Abaixo da meta'} /> },
  ]
  const filtros = [{
    key: 'situacao', label: 'Situação', allLabel: 'Todas as situações',
    options: [{ value: 'ok', label: 'Na meta' }, { value: 'abaixo', label: 'Abaixo da meta' }, { value: 'neutral', label: 'Sem referência' }],
    matches: (row, value) => value === 'abaixo' ? row.tone === 'warn' || row.tone === 'bad' : row.tone === value,
  }]
  const xmax = Math.max(60, Math.ceil(Math.max(...rows.map(r => r.margem), 0) / 10) * 10 + 10)
  return (
    <>
      <Indicadores unidade={unidade} items={[
        {
          label: 'Lucro bruto', Icon: TrendingUp, value: fmtBRL(lucroBruto), percent: percentual(lucroBruto, total.receita),
          percentLabel: 'de margem bruta', description: `Meta de margem de ${meta}% ou mais`,
          featured: true, tone: toneHigher(margemGeral, METAS.margemBruta),
        },
        {
          label: 'Custo dos produtos', Icon: Package, value: fmtBRL(total.cmv), percent: percentual(total.cmv, total.receita),
          percentLabel: 'do faturamento', description: `Meta de até ${METAS.cmv.ok}% do faturamento`,
          tone: toneLower(cmvPct, METAS.cmv),
        },
        {
          label: 'Categorias abaixo da meta', Icon: TrendingDown, value: fmtBRL(receitaAbaixoDaMeta),
          percent: percentual(receitaAbaixoDaMeta, total.receita), percentLabel: 'do faturamento',
          description: abaixo.length ? abaixo.map(r => r.cat).join(', ') : temReferencia ? 'Nenhuma categoria com margem medida abaixo da meta' : 'Sem margem de referência',
          tone: abaixo.length ? 'warn' : temReferencia ? 'ok' : 'neutral',
        },
      ]} />
      <article className={s.card}>
        <div className={s.cardHead}>
          <div><h3><Percent size={18} aria-hidden="true" />Margem bruta por categoria</h3><p>A linha indica a meta de {meta}%.</p></div>
        </div>
        {rows.length ? <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 44 + 40)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 10, right: 38, left: 0, bottom: 4 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} stroke="var(--grid)" />
            <XAxis type="number" domain={[0, xmax]} tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="cat" tick={axisTick} axisLine={false} tickLine={false} width={82} />
            <ReferenceLine x={meta} stroke="var(--dim)" strokeDasharray="5 5" />
            <Tooltip content={<Tip color={reportBarColor} fmt={(v, p) => `${pct(v, 1)} · lucro ${fmtBRL(p.lucro)}`} />}
              cursor={{ fill: 'rgb(var(--ink) / .04)' }} />
            <Bar dataKey="margem" name="Margem" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}
              shape={ReportBarShape}>
              <LabelList dataKey="margem" position="right" formatter={v => pct(v)} style={{ fill: 'var(--text)', fontSize: 12 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer> : <p className={s.empty}>Nenhuma venda registrada neste período.</p>}
        {rows.length > 0 && (
          <div className={s.chartLegend} role="group" aria-label="Faixas de margem">
            <ToneBadge tone="ok" label={`Bom · ${meta}% ou mais`} />
            <ToneBadge tone="warn" label={`Médio · de ${minimo}% a menos de ${meta}%`} />
            <ToneBadge tone="bad" label={`Ruim · abaixo de ${minimo}%`} />
          </div>
        )}
      </article>
      <ReportTable title="Detalhamento por categoria" caption="Margem por categoria"
        searches={[BUSCA_CATEGORIA]} filters={filtros}
        columns={columns} rows={rows} rowKey={r => r.cat}
        initialSort={{ key: 'margem', dir: 'desc' }} emptyText="Nenhuma categoria com vendas no período." />
    </>
  )
}

function Ruptura({ data, dias, receita, exportar, unidade }) {
  const { can } = useStore()
  const consultarEstoque = can('VISUALIZAR_ESTOQUE')
  const estoque = useQueryResource(signal => consultarEstoque ? estoqueAtual(signal) : null, [consultarEstoque])
  const rows = data.itens.map(row => ({
    ...row, id: row.produtoId, name: row.nome, cat: row.categoria, pctDias: row.percentualDias, perdidas: row.unidadesPerdidas,
    estoque: estoque.error ? null : estoque.data?.get(row.produtoId),
    tone: row.percentualDias > LIMITE_FALTA_RECORRENTE ? 'bad' : row.dias ? 'warn' : 'ok',
  }))
  const comRuptura = rows.filter(r => r.dias > 0)
  const recorrentes = comRuptura.filter(r => r.tone === 'bad').length
  const top = comRuptura.slice(0, 10).map(r => ({ ...r, nome: r.name.length > 22 ? r.name.slice(0, 21) + '…' : r.name }))
  const perdido = rows.reduce((a, r) => a + r.vendaPerdida, 0)
  const columns = [
    { key: 'name', header: 'Produto', render: r => <b className={p.cellStrong}>{r.name}</b> },
    { key: 'cat', header: 'Categoria' },
    { key: 'dias', header: 'Dias sem estoque', align: 'right', render: r => `${r.dias} de ${dias}` },
    { key: 'ocorrencias', header: 'Ocorrências', align: 'right' },
    { key: 'perdidas', header: 'Unid. não vendidas', align: 'right', render: r => fmtNum(r.perdidas) },
    { key: 'vendaPerdida', header: 'Venda perdida', align: 'right', render: r => fmtBRL(r.vendaPerdida) },
    ...(consultarEstoque ? [{
      key: 'estoqueAtual', header: 'Estoque hoje', align: 'right', sort: r => r.estoque?.qty,
      render: r => r.estoque ? `${fmtNum(r.estoque.qty)} / mín. ${fmtNum(r.estoque.min)}` : '—',
    }] : []),
    { key: 'sit', header: 'Situação', sort: r => r.pctDias, render: r => <ToneBadge tone={r.tone} label={SITUACAO_RUPTURA[r.tone]} /> },
  ]
  const filtros = [
    {
      key: 'tone', label: 'Situação', allLabel: 'Todas as situações',
      options: Object.entries(SITUACAO_RUPTURA).map(([value, label]) => ({ value, label })),
    },
  ]
  return (
    <>
      <Indicadores unidade={unidade} items={[
        {
          label: 'Vendas perdidas', Icon: TrendingDown, value: fmtBRL(perdido), percent: percentual(perdido, receita),
          percentLabel: 'do faturamento registrado', description: `Estimativa nos últimos ${dias} dias`,
          tone: perdido > 0 ? 'bad' : rows.length ? 'ok' : 'neutral', featured: true,
        },
        {
          label: 'Produtos que faltaram', Icon: PackageX, value: fmtNum(comRuptura.length),
          percent: percentual(comRuptura.length, rows.length), percentLabel: 'do catálogo',
          description: `De ${rows.length} produtos no catálogo`,
          tone: comRuptura.length ? 'warn' : rows.length ? 'ok' : 'neutral',
        },
        {
          label: 'Falta recorrente', Icon: Repeat, value: fmtNum(recorrentes),
          percent: percentual(recorrentes, rows.length), percentLabel: 'do catálogo',
          description: `Sem estoque em mais de ${LIMITE_FALTA_RECORRENTE}% dos dias`, tone: recorrentes ? 'bad' : rows.length ? 'ok' : 'neutral',
        },
      ]} />
      <article className={s.card}>
        <div className={s.cardHead}>
          <h3><PackageX size={18} aria-hidden="true" />Dias sem estoque por produto</h3>
        </div>
        {top.length === 0 ? <p className={s.empty}>Nenhum dia sem estoque registrado neste período.</p> : (
          <ResponsiveContainer width="100%" height={top.length * 38 + 40}>
            <BarChart data={top} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke="var(--grid)" />
              <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" tick={axisTick} axisLine={false} tickLine={false} width={105} />
              <Tooltip content={<Tip color={reportBarColor} fmt={(v, p) => `${v} dia(s) · ${fmtBRL(p.vendaPerdida)} perdidos`}
                title={p => p.name} />} cursor={{ fill: 'rgb(var(--ink) / .04)' }} />
              <Bar dataKey="dias" name="Dias sem estoque" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}
                shape={ReportBarShape}>
                <LabelList dataKey="dias" position="right" style={{ fill: 'var(--text)', fontSize: 12 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {top.length > 0 && (
          <div className={s.chartLegend} role="group" aria-label="Faixas de falta de estoque">
            <ToneBadge tone="ok" label="Sem falta registrada · 0 dias" />
            <ToneBadge tone="warn" label={`Pontual · falta em até ${LIMITE_FALTA_RECORRENTE}% dos dias`} />
            <ToneBadge tone="bad" label={`Recorrente · mais de ${LIMITE_FALTA_RECORRENTE}% dos dias`} />
          </div>
        )}
        <p className={s.chartNote}>A estimativa multiplica as unidades que deixaram de ser vendidas pelo preço do produto.</p>
      </article>
      <ReportTable title="Detalhamento por produto" caption="Falta de estoque por produto"
        searches={[BUSCA_PRODUTO, BUSCA_CATEGORIA]} filters={filtros} columns={columns} rows={rows}
        onExport={() => exportar('ruptura', ['Produto', 'Dias zerado', 'Ocorrências', 'Unidades não vendidas', 'Venda perdida', ...(consultarEstoque ? ['Estoque hoje'] : [])],
          rows.map(r => [r.name, r.dias, r.ocorrencias, r.perdidas, r.vendaPerdida, ...(consultarEstoque ? [r.estoque?.qty] : [])]))}
        initialSort={{ key: 'vendaPerdida', dir: 'desc' }} emptyText="Nenhum produto no catálogo." />
    </>
  )
}

function DetalhesVendasHorario({ celula, diaSemana, hora, referencia, onClose, onRefresh }) {
  const { can } = useStore()
  const permitido = can('CAIXA_VISUALIZAR')
  const consulta = useQueryResource(signal => permitido
    ? produtosDoHorario(referencia, diaSemana, hora, celula, signal)
    : null, [permitido, referencia, diaSemana, hora, celula.tickets, celula.receita])
  const dia = WEEKDAYS[diaSemana]
  const titulo = `${DIAS_POR_EXTENSO[dia]} · ${hora}h`
  const produtos = permitido && !consulta.loading && !consulta.error ? consulta.data : null

  return createPortal(
    <Drawer title={`Vendas de ${titulo}`} onClose={onClose}>
      <header className={s.hourDetailHeader}>
        <h2>{DIAS_POR_EXTENSO[dia]} <span>· {hora}h</span></h2>
        <p>{fmtNum(celula.tickets)} {celula.tickets === 1 ? 'venda' : 'vendas'} nos últimos {referencia.dias} dias</p>
      </header>
      <section className={s.drawerRevenue} aria-label="Faturamento do horário">
        <span>Faturamento total</span>
        <strong>{fmtBRL(celula.receita)}</strong>
      </section>
      <section className={s.hourProducts}>
        <header>
          <h3>Produtos vendidos</h3>
          {produtos?.length > 0 && <span>Subtotal</span>}
        </header>
        {!permitido && <Notice tone="info">A lista de produtos requer permissão para consultar os pedidos do caixa.</Notice>}
        {permitido && consulta.loading && <LoadingBlock label="Consultando os pedidos deste horário…" />}
        {consulta.error && <Notice title="Não foi possível consultar os produtos" onRetry={consulta.reload}>
          <p>{consulta.error.message}</p>
          <button type="button" onClick={onRefresh}>Atualizar relatório</button>
        </Notice>}
        {produtos?.length > 0 && (
          <ul>
            {produtos.map(produto => (
              <li key={produto.id}>
                <div>
                  <strong>{produto.name}</strong>
                  <small>{fmtNum(produto.qty)} {produto.qty === 1 ? 'unidade vendida' : 'unidades vendidas'}</small>
                </div>
                <b><span className={p.srOnly}>Subtotal do produto </span>{fmtBRL(produto.receita)}</b>
              </li>
            ))}
          </ul>
        )}
        {produtos?.length === 0 && <p className={s.empty}>Nenhum item detalhado para este horário.</p>}
      </section>
    </Drawer>,
    document.body,
  )
}

function Horarios({ data, dias, receita, unidade, onRefresh }) {
  const { grid: g, horas, max, picos, porDia } = useMemo(() => horarioReport(data.itens), [data.itens])
  const [tabela, setTabela] = useState(false)
  const [hover, setHover] = useState(null)
  const [selecionado, setSelecionado] = useState(null)
  const melhorDia = [...porDia].sort((a, b) => b.tickets - a.tickets)[0]
  const piorDia = [...porDia].sort((a, b) => a.tickets - b.tickets)[0]
  const pico = picos[0]
  const temVendas = pico.tickets > 0
  const receitaDoDia = ({ dia }) => g[WEEKDAYS.indexOf(dia)].reduce((total, celula) => total + celula.receita, 0)
  const cards = [
    { label: 'Horário de pico', Icon: AlarmClock, accent: 'gold', total: pico.receita, detalhe: `${pico.dia} ${pico.hora}h · ${pico.tickets} vendas` },
    { label: 'Dia com mais vendas', Icon: CalendarArrowUp, accent: 'green', total: receitaDoDia(melhorDia), detalhe: `${melhorDia.dia} · ${melhorDia.tickets} vendas` },
    { label: 'Dia com menos vendas', Icon: CalendarArrowDown, accent: 'red', total: receitaDoDia(piorDia), detalhe: `${piorDia.dia} · ${piorDia.tickets} vendas` },
  ]
  const isPico = (ri, ci) => picos.some(p => p.tickets > 0 && p.ri === ri && p.ci === ci)
  const colunaHover = horas.indexOf(hover?.hora)
  const destaque = colunaHover >= 0 ? { ...g[hover.ri][colunaHover], dia: WEEKDAYS[hover.ri], hora: hover.hora } : null
  const celulaSelecionada = selecionado && g[selecionado.ri][horas.indexOf(selecionado.hora)]
  if (selecionado && !celulaSelecionada?.tickets) setSelecionado(null)

  function abrirHorario(event, ri, ci) {
    setHover({ ri, hora: horas[ci] })
    if (!g[ri][ci].tickets) return
    event.currentTarget.focus({ preventScroll: true })
    setSelecionado({ ri, hora: horas[ci] })
  }

  function moverFoco(event, linha, coluna) {
    const direcao = HEATMAP_DIRECTIONS[event.key]
    if (!direcao) return
    event.preventDefault()
    const proximaLinha = Math.max(0, Math.min(linha + direcao[0], WEEKDAYS.length - 1))
    const proximaColuna = Math.max(0, Math.min(coluna + direcao[1], horas.length - 1))
    event.currentTarget.closest('table').tBodies[0].rows[proximaLinha].cells[proximaColuna + 1].querySelector('button').focus()
  }

  return (
    <>
      <Indicadores unidade={unidade} items={cards.map(({ label, Icon, accent, total, detalhe }) => ({
        label, Icon, accent, value: fmtBRL(total), percent: percentual(total, receita), percentLabel: 'do faturamento',
        description: temVendas ? detalhe : 'Sem vendas nos horários exibidos',
      }))} />
      <article className={s.card}>
        <div className={s.cardHead}>
          <h3><CalendarClock size={18} aria-hidden="true" />Vendas por dia da semana e hora</h3>
          <button type="button" onClick={() => setTabela(t => !t)} aria-pressed={tabela}>{tabela ? <><Grid3x3 size={13} aria-hidden="true" /> Ver mapa</> : <><Table2 size={13} aria-hidden="true" /> Ver tabela</>}</button>
        </div>
        <p className={p.heatInfo} aria-live="polite">
          {destaque ? <>
            <b>{destaque.dia} {destaque.hora}h</b> · {destaque.tickets} {destaque.tickets === 1 ? 'venda' : 'vendas'} · {fmtBRL(destaque.receita)}
            {destaque.tickets > 0 && <span className={s.heatDetailHint}>Ver produtos vendidos</span>}
          </> : 'Selecione uma célula com vendas para ver os produtos. Use as setas para navegar pelo teclado.'}
        </p>
        <p className={s.tableHint}>Deslize a grade para ver todos os horários.</p>
        <div className={s.heatScroll} role="region" aria-label="Grade de horários" tabIndex={0}>
          <table className={s.heatmap} data-table={tabela || undefined}>
            <caption className={p.srOnly}>Número de vendas por dia da semana e hora, nos últimos {dias} dias</caption>
            <thead><tr><th scope="col"><span className={p.srOnly}>Dia</span></th>{horas.map(h => <th key={h} scope="col">{h}h</th>)}</tr></thead>
            <tbody>
              {WEEKDAYS.map((d, ri) => (
                <tr key={d}>
                  <th scope="row">{d}</th>
                  {g[ri].map((c, ci) => (
                    <td key={ci}>
                      <button type="button" data-level={binOf(c.tickets, max)} data-peak={!tabela && isPico(ri, ci) || undefined}
                        tabIndex={(colunaHover >= 0 ? hover.ri : 0) === ri && Math.max(0, colunaHover) === ci ? 0 : -1}
                        aria-label={`${d} ${horas[ci]}h: ${c.tickets} ${c.tickets === 1 ? 'venda' : 'vendas'}${c.tickets > 0 ? ' · Ver produtos vendidos' : ''}`}
                        aria-haspopup={c.tickets > 0 ? 'dialog' : undefined}
                        onMouseEnter={() => setHover({ ri, hora: horas[ci] })}
                        onFocus={() => setHover({ ri, hora: horas[ci] })}
                        onKeyDown={event => moverFoco(event, ri, ci)}
                        onClick={event => abrirHorario(event, ri, ci)}>
                        {tabela ? c.tickets : <span className={p.srOnly}>{c.tickets}</span>}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!tabela && (
          <div className={s.heatLegend}>
            <span>Menos vendas</span>
            {[0, 1, 2, 3, 4, 5].map(level => <i key={level} data-level={level} aria-hidden="true" />)}
            <span>Mais vendas</span>
            {temVendas && <small>Contorno indica os horários de pico</small>}
          </div>
        )}
        {temVendas && <p className={s.chartNote}><b>Horários com mais movimento:</b> {picos.filter(p => p.tickets > 0).map(p => `${p.dia} ${p.hora}h`).join(', ')}.</p>}
      </article>
      {celulaSelecionada?.tickets > 0 && (
        <DetalhesVendasHorario celula={celulaSelecionada} diaSemana={selecionado.ri} hora={selecionado.hora}
          referencia={data.referencia} onClose={() => setSelecionado(null)} onRefresh={() => {
            setSelecionado(null)
            onRefresh()
          }} />
      )}
    </>
  )
}

function Canais({ data, unidade }) {
  const rows = data.itens.map(row => ({ ...row, ticket: row.ticketMedio, share: row.participacao }))
  const melhor = [...rows].sort((a, b) => b.ticket - a.ticket)[0]
  const porCanal = new Map(rows.map(row => [row.canal, row]))
  const canais = new Set([...ICONES_CANAL.keys(), ...porCanal.keys()])
  return (
    <>
      <Indicadores unidade={unidade} items={Array.from(canais, canal => {
        const row = porCanal.get(canal)
        const vendas = row?.vendas ?? 0
        const featured = vendas > 0 && row === melhor
        const share = row?.share ?? (data.totais.faturamento > 0 ? 0 : null)
        return {
          label: canal, Icon: ICONES_CANAL.get(canal) ?? Store, value: fmtBRL(row?.faturamento), percent: pct(share, 1),
          percentLabel: 'do faturamento',
          description: vendas ? `${vendas} vendas · ${fmtBRL(row.ticket)} em média por venda${featured ? ' · Maior valor médio' : ''}` : '0 vendas',
          featured,
        }
      })} />
      <article className={s.card}>
        <div className={s.cardHead}>
          <div><h3><Store size={18} aria-hidden="true" />Comparativo por canal</h3><p>Valor médio por venda e participação de cada canal no faturamento.</p></div>
        </div>
        <p className={s.tableHint}>Deslize a tabela para ver todas as colunas.</p>
        <div className={s.channelScroll} role="region" aria-label="Comparativo por canal" tabIndex={0}>
          <table className={s.channelTable}>
            <thead><tr><th scope="col">Canal</th><th scope="col">Vendas</th><th scope="col">Faturamento</th><th scope="col">% do faturamento</th><th scope="col">Valor médio por venda</th><th scope="col">Itens por venda</th></tr></thead>
            <tbody>
              {!rows.length && <tr><td colSpan={6}>Nenhuma venda registrada no período.</td></tr>}
              {rows.map(r => (
                <tr key={r.canal}><th scope="row">{r.canal}</th><td>{fmtNum(r.vendas)}</td><td>{fmtBRL(r.faturamento)}</td><td>{pct(r.share, 1)}</td><td>{fmtBRL(r.ticket)}</td><td>{fmtNum(r.itensPorVenda)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </>
  )
}

function Perdas({ data, receita, unidade }) {
  const { rows, motivos, porMotivo, total, gran } = perdasReport(data.itens, data.granularidade)
  const maior = [...porMotivo].sort((a, b) => b.valor - a.valor)[0]
  const pctReceita = receita ? (total / receita) * 100 : null
  const columns = [
    { key: 'label', header: gran === 'mes' ? 'Mês' : gran === 'semana' ? 'Semana' : 'Dia', sort: r => r.k, render: r => <b className={p.cellStrong}>{r.label}</b> },
    ...motivos.map(motivo => ({
      key: motivo,
      header: motivo,
      align: 'right',
      render: row => (
        <span className={p.legendCell}>
          <i style={{ backgroundColor: ESTILO_POR_MOTIVO[motivo]?.color }} aria-hidden="true" />
          {fmtBRL(row[motivo])}
        </span>
      ),
    })),
    { key: 'total', header: 'Total', align: 'right', render: r => <b>{fmtBRL(r.total)}</b> },
  ]
  const filtros = [{
    key: 'motivo', label: 'Motivo', allLabel: 'Todos os motivos',
    options: motivos.map(value => ({ value, label: value })),
    matches: (row, value) => row[value] > 0,
  }]
  return (
    <>
      <Indicadores unidade={unidade} items={[
        {
          label: 'Perdas no período', Icon: TrendingDown, value: fmtBRL(total), percent: percentual(total, receita),
          percentLabel: 'do faturamento', description: receita ? `Meta de até ${METAS.perdasFaturamento.ok}% do faturamento` : 'Sem faturamento de referência',
          featured: true, tone: toneLower(pctReceita, METAS.perdasFaturamento),
        },
        ...[maior, ...porMotivo.filter(item => item !== maior)].map(item => {
          const { motivo, valor } = item
          const { Icon = Package, accent } = ESTILO_POR_MOTIVO[motivo] ?? {}
          return {
            label: motivo, Icon, accent, value: fmtBRL(valor), percent: percentual(valor, total),
            percentLabel: 'do custo das perdas', description: item === maior && valor > 0 ? 'Maior causa de perda' : 'Valor a preço de custo',
          }
        }),
      ]} />
      <article className={s.card}>
        <div className={s.cardHead}>
          <div><h3><TrendingDown size={18} aria-hidden="true" />Perdas por motivo</h3><p>Valor calculado pelo custo dos produtos.</p></div>
        </div>
        {rows.length === 0 ? <p className={s.empty}>Sem perdas no período.</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 4 }} barCategoryGap="28%">
              {grid}
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => `R$${Math.round(v)}`} width={56} />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgb(var(--ink) / .04)' }} />
              <Legend iconType="square" iconSize={10} wrapperStyle={legendStyle} />
              {motivos.map((motivo, index) => (
                <Bar key={motivo} dataKey={motivo} name={motivo} stackId="p" fill={ESTILO_POR_MOTIVO[motivo]?.color ?? 'var(--dim)'} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}
                  radius={index === motivos.length - 1 ? [4, 4, 0, 0] : 0} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </article>
      <ReportTable title="Detalhamento por período" caption="Perdas por motivo"
        searches={[{ key: 'label', label: 'Buscar período', placeholder: 'Digite o período exibido na tabela' }]} filters={filtros}
        columns={columns} rows={rows} rowKey={r => r.k}
        initialSort={{ key: 'label', dir: 'asc' }} emptyText="Sem perdas no período." />
    </>
  )
}

export function Relatorios({ navigate, pageParams, headerActionsElement }) {
  const toast = useToast()
  const aba = ABAS.find(tab => tab.id === pageParams?.aba) ?? ABAS[0]
  const periodo = PERIODOS.find(opcao => opcao.id === Number(pageParams?.dias)) ?? PERIODOS[1]
  const dias = periodo.id
  const unidade = pageParams?.unidade === 'percentual' ? 'percentual' : 'reais'
  const endpoint = aba.endpoint ?? aba.id
  const consulta = useQueryResource(signal => readReport(endpoint, dias, signal), [endpoint, dias])
  const data = !consulta.loading && !consulta.error ? consulta.data : null
  const filtros = { aba: aba.id, dias, unidade }
  const alterar = (patch) => navigate('relatorios', { ...filtros, ...patch }, { replace: true })
  const exportar = (nome, headers, rows) => {
    downloadCSV(`${nome}-${dias}d-${stamp()}`, headers, rows)
    toast(`${rows.length} linha(s) exportada(s).`, { title: 'Exportação concluída' })
  }
  const seletorPeriodo = <PeriodSelector options={PERIODOS} selected={periodo} onChange={dias => alterar({ dias })} alignEnd />

  return (
    <div className={s.reports}>
      {headerActionsElement ? createPortal(seletorPeriodo, headerActionsElement) : seletorPeriodo}
      <nav className={s.tabs} aria-label="Tipos de relatório">
        {ABAS.map(({ id, label, Icon }) => (
          <Link key={id} to={{ pathname: '/relatorios', search: new URLSearchParams({ ...filtros, aba: id }).toString() }}
            replace aria-current={aba.id === id ? 'page' : undefined}>
            <Icon size={17} aria-hidden="true" />{label}
          </Link>
        ))}
      </nav>

      <header className={s.heading}>
        <div>
          <h2><aba.Icon size={18} aria-hidden="true" />{aba.title}</h2>
          <p>{aba.description}</p>
        </div>
        <div className={`${s.segment} ${s.units}`} role="group" aria-label="Exibir indicadores">
          <button type="button" title="Exibir em reais (R$)" aria-label="Exibir em reais" aria-pressed={unidade === 'reais'} onClick={() => alterar({ unidade: 'reais' })}><Banknote size={18} aria-hidden="true" /></button>
          <button type="button" title="Exibir em porcentagem (%)" aria-label="Exibir em porcentagem" aria-pressed={unidade === 'percentual'} onClick={() => alterar({ unidade: 'percentual' })}><Percent size={18} aria-hidden="true" /></button>
        </div>
      </header>

      {consulta.loading && <LoadingBlock label="Consultando o relatório…" />}
      {consulta.error && <ErrorBlock error={consulta.error} onRetry={consulta.reload} />}
      {data && aba.id === 'abc' && <ABC data={data} unidade={unidade} exportar={exportar} dias={dias} />}
      {data && aba.id === 'margem' && <Margem data={data} unidade={unidade} />}
      {data && aba.id === 'ruptura' && <Ruptura data={data} unidade={unidade} dias={dias} receita={data.totais.faturamento} exportar={exportar} />}
      {data && aba.id === 'horarios' && <Horarios data={data} unidade={unidade} dias={dias} receita={data.totais.faturamento}
        onRefresh={consulta.reload} />}
      {data && aba.id === 'canais' && <Canais data={data} unidade={unidade} />}
      {data && aba.id === 'perdas' && <Perdas data={data} unidade={unidade} receita={data.totais.faturamento} />}
    </div>
  )
}
