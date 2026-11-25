import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import {
  ArrowDownLeft, ArrowUpRight, CalendarClock, CalendarDays, ChartNoAxesCombined, Check, ChevronDown,
  CircleCheck, CircleMinus, CircleX, LayoutDashboard, ReceiptText, Wallet,
} from 'lucide-react'
import { METAS, TONE_COLOR, toneHigher, toneLower } from '@/entities/reports'
import { fmtBRL, fmtNum } from '@/shared/lib/format.js'
import { ChartTip } from '@/shared/ui/charts/ChartTip.jsx'
import { axisTick } from '@/shared/ui/charts/chartStyles.js'
import { useStore } from '@/entities/store'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { financeApi } from '../model/financeApi.js'
import { acrescentarDias, CENTROS_CUSTO, diaBR, periodosFinanceiro, rotuloMes } from '../model/financePresentation.js'
import { FinanceAccounts } from './FinanceAccounts.jsx'
import s from './FinancePage.module.css'

const tabs = [
  { id: 'visao', label: 'Visão geral', Icon: LayoutDashboard },
  { id: 'dre', label: 'Resultado', Icon: ReceiptText },
]
const centros = [['', 'Todos'], ...Object.entries(CENTROS_CUSTO)]
const statusIndicador = {
  ok: { label: 'Bom', Icon: CircleCheck },
  warn: { label: 'Médio', Icon: CircleMinus },
  bad: { label: 'Ruim', Icon: CircleX },
  neutral: { label: 'Sem meta' },
}

const fmtPct = value => value == null ? '—' : fmtNum(value) + '%'

function prazoTone(dias, tipo) {
  if (tipo === 'RECEBER') return 'ok'
  if (dias <= 3) return 'bad'
  if (dias <= 7) return 'warn'
  return 'ok'
}

function SeloIndicador({ tone }) {
  const status = statusIndicador[tone] ?? statusIndicador.neutral

  return (
    <span className={s.metricStatus}>
      {status.Icon && <status.Icon size={17} aria-hidden="true" />}
      {status.label}
    </span>
  )
}

function Indicador({ label, value, description, tone = 'neutral', Icon, featured, title }) {
  return (
    <article className={s.metric} data-tone={tone} data-featured={featured || undefined} title={title}>
      <div className={s.metricTitleRow}>
        <h3>{Icon && <span className={s.metricIcon}><Icon size={18} aria-hidden="true" /></span>}{label}</h3>
        <SeloIndicador tone={tone} />
      </div>
      <strong>{value}</strong>
      <p>{description}</p>
    </article>
  )
}

function FluxoDeCaixa({ fluxo }) {
  const cashFlowData = fluxo.map(item => ({ ...item, m: rotuloMes(item.mes) }))
  return (
    <section className={s.card} aria-labelledby="finance-fluxo">
      <header className={s.cardHead}>
        <div>
          <h2 id="finance-fluxo"><ChartNoAxesCombined size={18} aria-hidden="true" />Fluxo de caixa</h2>
          <p>Receitas e despesas em 6 meses</p>
        </div>
        <ul className={s.legend} aria-label="Legenda do gráfico">
          <li data-series="receitas">Receitas</li>
          <li data-series="despesas">Despesas</li>
        </ul>
      </header>
      <div className={s.chart}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cashFlowData} margin={{ top: 8, right: 16, left: 0, bottom: 2 }}>
            <defs>
              <linearGradient id="finance-receitas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--finance-receitas)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--finance-receitas)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="4 4" />
            <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} tickMargin={8} />
            <YAxis width={65} tick={axisTick} axisLine={false} tickLine={false}
              tickFormatter={value => value === 0 ? 'R$\u00a00' : 'R$\u00a0' + value / 1000 + '\u00a0mil'} />
            <Tooltip content={<ChartTip money />} cursor={{ stroke: 'var(--accent-line)' }} />
            <Area type="monotone" dataKey="receitas" name="Receitas" stroke="var(--finance-receitas)"
              strokeWidth={2.25} fill="url(#finance-receitas)" dot={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="despesas" name="Despesas" stroke="var(--finance-despesas)"
              strokeWidth={2} strokeDasharray="6 4" fill="none" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className={s.monthDetails}>
        <summary>Ver valores por mês <ChevronDown size={16} aria-hidden="true" /></summary>
        <table>
          <thead><tr><th scope="col">Mês</th><th scope="col">Receitas</th><th scope="col">Despesas</th></tr></thead>
          <tbody>
            {cashFlowData.map(mes => (
              <tr key={mes.m}><th scope="row">{mes.m}</th><td>{fmtBRL(mes.receitas)}</td><td>{fmtBRL(mes.despesas)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

function Vencimentos({ referencia, revision, onOpen }) {
  const [centroCusto, setCentroCusto] = useState('')
  const consulta = useQueryResource(signal => financeApi.contas({
    status: 'ABERTA', centroCusto, vencimentoAte: acrescentarDias(referencia, 30), pagina: 0, tamanho: 5,
  }, signal), [referencia, centroCusto, revision])
  const contas = !consulta.loading && !consulta.error ? consulta.data?.itens : null

  return (
    <section className={s.card} aria-labelledby="finance-vencimentos">
      <header className={s.cardHead}>
        <div>
          <h2 id="finance-vencimentos"><CalendarClock size={18} aria-hidden="true" />Próximos vencimentos</h2>
          <p>Contas a pagar e a receber</p>
        </div>
        <button type="button" onClick={event => onOpen(event, { mode: 'list' })}>Ver todas as contas</button>
      </header>
      <div className={s.filters} role="group" aria-label="Filtrar por centro de custo">
        {centros.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={centroCusto === value} onClick={() => setCentroCusto(value)}>
            {label}
          </button>
        ))}
      </div>
      {consulta.loading && <LoadingBlock label="Consultando vencimentos…" lines={2} />}
      {consulta.error && <ErrorBlock error={consulta.error} onRetry={consulta.reload} />}
      {contas?.length === 0 && <p className={s.financeEmpty}>Nenhuma conta em aberto para os próximos 30 dias.</p>}
      {contas?.length > 0 && <ul className={s.dueList}>
        {contas.map(conta => {
          const dias = conta.diasParaVencer
          const receber = conta.tipo === 'RECEBER'
          const prazo = dias < 0 ? 'Vencido' : dias === 0 ? 'Vence hoje' : dias === 1 ? 'Em 1 dia' : 'Em ' + dias + ' dias'
          return (
            <li key={conta.id} className={s.dueRow}>
              <div className={s.dueDate}>
                <time dateTime={conta.vencimento}>{diaBR(conta.vencimento).slice(0, 5)}</time>
              </div>
              <div className={s.dueName}>
                <button className={s.accountLink} type="button" aria-label={`Ver conta ${conta.descricao}`}
                  onClick={event => onOpen(event, { mode: 'detail', id: conta.id })}>{conta.descricao}</button>
                <span>{CENTROS_CUSTO[conta.centroCusto]}</span>
              </div>
              <div className={s.dueAmount}>
                <strong>{receber ? '+' : '−'} {fmtBRL(conta.valor)}</strong>
                <span>{receber ? 'A receber' : 'A pagar'}</span>
              </div>
              <span className={s.dueStatus} data-tone={prazoTone(dias, conta.tipo)}>{prazo}</span>
            </li>
          )
        })}
      </ul>}
    </section>
  )
}

function IndicadoresResultado({ resultado, percentual, setPercentual }) {
  const { lucroBruto, lucroLiquido: lucroLiq, cmv, margemBrutaPercentual: margemBruta,
    margemLiquidaPercentual: margemLiq, cmvPercentual: cmvPct } = resultado
  const toneMargemLiq = toneHigher(margemLiq, METAS.margemLiquida)
  const indicadores = [
    {
      label: 'Lucro líquido',
      labelPercentual: 'Margem líquida',
      valor: lucroLiq,
      margem: margemLiq,
      base: 'da receita líquida',
      meta: `Meta de ${METAS.margemLiquida.ok}% ou mais · ruim abaixo de ${METAS.margemLiquida.warn}%`,
      tone: lucroLiq < 0 ? 'bad' : toneMargemLiq,
    },
    {
      label: 'Lucro bruto',
      labelPercentual: 'Margem bruta',
      valor: lucroBruto,
      margem: margemBruta,
      base: 'da receita líquida',
      meta: `Meta de ${METAS.margemBruta.ok}% ou mais · ruim abaixo de ${METAS.margemBruta.warn}%`,
      tone: toneHigher(margemBruta, METAS.margemBruta),
    },
    {
      label: 'Custo das mercadorias vendidas',
      labelPercentual: 'Custo sobre a receita',
      valor: cmv,
      margem: cmvPct,
      base: 'da receita líquida',
      meta: `Meta de até ${METAS.cmv.ok}% · ruim acima de ${METAS.cmv.warn}%`,
      tone: toneLower(cmvPct, METAS.cmv),
    },
  ]
  return (
    <section aria-labelledby="finance-indicadores-resultado">
      <div className={s.resultControls}>
        <div>
          <h3 id="finance-indicadores-resultado">Indicadores do resultado</h3>
          <p className={s.resultScrollHint}>Deslize para ver mais.</p>
        </div>
        <div className={s.resultUnits} role="group" aria-label="Exibir indicadores">
          <button type="button" aria-pressed={!percentual} onClick={() => setPercentual(false)}>Reais</button>
          <button type="button" aria-pressed={percentual} onClick={() => setPercentual(true)}>Porcentagem</button>
        </div>
      </div>
      <div className={s.resultMetrics} role="region" aria-label="Indicadores em linha" tabIndex={0}>
        {indicadores.map(({ label, labelPercentual, valor, margem, base, meta, tone }) => (
          <article key={label} className={s.resultMetric} data-tone={tone}>
            <div className={s.metricTitleRow}>
              <h4>{percentual ? labelPercentual : label}</h4>
              <SeloIndicador tone={tone} />
            </div>
            <div>
              <strong>{percentual ? fmtPct(margem) : fmtBRL(valor)}</strong>
              <span className={s.resultMetricBase}>{margem == null ? 'Sem receita de referência' : percentual ? base : fmtPct(margem) + ' ' + base}</span>
            </div>
            <p>{meta}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function PeriodoResultado({ periodos, periodo, onChange }) {
  const id = useId()
  const container = useRef(null)
  const trigger = useRef(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function handleOutside(event) {
      if (!container.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [open])

  function close() {
    setOpen(false)
    trigger.current?.focus()
  }

  return (
    <div ref={container} className={s.period}
      onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={event => {
        if (open && event.key === 'Escape') {
          event.preventDefault()
          close()
        }
      }}>
      <button ref={trigger} className={s.periodTrigger} type="button" aria-expanded={open} aria-controls={id}
        aria-label={`Período (${periodo.label})`} aria-describedby="finance-periodo-ajuda" title={periodo.label}
        onClick={() => { trigger.current?.focus(); setOpen(current => !current) }}>
        <CalendarDays size={19} aria-hidden="true" />
        <span>Período</span>
      </button>
      <div id={id} className={s.periodOptions} role="group" aria-label="Opções de período" hidden={!open}>
        {periodos.map(opcao => (
          <button key={opcao.id} type="button" aria-pressed={opcao.id === periodo.id}
            onClick={() => { onChange(opcao.id); close() }}>
            {opcao.label}
            {opcao.id === periodo.id && <Check size={15} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  )
}

function Resultado({ periodos, periodo, onPeriodoChange, acoes, resumo, consulta }) {
  const [percentual, setPercentual] = useState(false)
  const resultado = !consulta.loading && !consulta.error && periodo ? consulta.data : null
  return (
    <section className={s.resultGrid} aria-labelledby="finance-resultado">
      <header className={s.cardHead + ' ' + s.resultHeader}>
        <div>
          <h2 id="finance-resultado"><ReceiptText size={18} aria-hidden="true" />Resultado do exercício</h2>
          <p id="finance-periodo-ajuda">{periodo ? `${diaBR(periodo.inicio)} a ${diaBR(periodo.fim)}` : 'Receitas e despesas por período'}</p>
        </div>
        <div className={s.resultHeaderControls}>
          {periodo && <PeriodoResultado periodos={periodos} periodo={periodo} onChange={onPeriodoChange} />}
          {acoes}
        </div>
      </header>
      {((resumo.loading && !periodo) || consulta.loading) && <LoadingBlock label="Consultando resultado…" />}
      {!periodo && resumo.error && <ErrorBlock error={resumo.error} onRetry={resumo.reload} />}
      {consulta.error && <ErrorBlock error={consulta.error} onRetry={consulta.reload} />}
      {resultado && <>
        <IndicadoresResultado resultado={resultado} percentual={percentual} setPercentual={setPercentual} />
        <section className={s.card} aria-labelledby="finance-resultado-detalhe">
          <header className={s.cardHead}>
            <div>
              <h3 id="finance-resultado-detalhe" className={s.resultDetailTitle}>Detalhamento do resultado</h3>
              <p>Das vendas ao lucro líquido</p>
            </div>
          </header>
          <dl className={s.resultRows}>
            <div><dt>Receita bruta</dt><dd>{fmtBRL(resultado.receitaBruta)}</dd></div>
            <div><dt>Cancelamentos</dt><dd>− {fmtBRL(resultado.cancelamentos)}</dd></div>
            <div className={s.subtotal}><dt>Receita líquida</dt><dd>{fmtBRL(resultado.receitaLiquida)}</dd></div>
            <div><dt>Custo das mercadorias vendidas (CMV)</dt><dd>− {fmtBRL(resultado.cmv)}</dd></div>
            <div className={s.subtotal}><dt>Lucro bruto</dt><dd>{fmtBRL(resultado.lucroBruto)}</dd></div>
            <div><dt>Despesas fixas</dt><dd>− {fmtBRL(resultado.despesasFixas)}</dd></div>
            <div><dt>Despesas variáveis</dt><dd>− {fmtBRL(resultado.despesasVariaveis)}</dd></div>
            <div className={s.resultTotal}><dt>Lucro líquido</dt><dd>{fmtBRL(resultado.lucroLiquido)}</dd></div>
          </dl>
        </section>
      </>}
    </section>
  )
}

function VendasPorCategoria({ resultado }) {
  return (
    <section className={s.card} aria-labelledby="finance-vendas">
      <header className={s.cardHead}>
        <div>
          <h2 id="finance-vendas"><ChartNoAxesCombined size={18} aria-hidden="true" />Vendas por categoria</h2>
          <p>{diaBR(resultado.inicio)} a {diaBR(resultado.fim)}</p>
        </div>
        <div className={s.salesTotal}><span>Total vendido</span><strong>{fmtBRL(resultado.receitaLiquida)}</strong></div>
      </header>
      {resultado.vendasPorCategoria.length ? <table className={s.salesTable}>
        <thead><tr><th scope="col">Categoria</th><th scope="col">Participação</th><th scope="col">Valor vendido</th></tr></thead>
        <tbody>
          {resultado.vendasPorCategoria.map(categoria => {
            const pct = categoria.participacaoPercentual
            const tone = toneHigher(pct, METAS.participacaoCategoria)
            return (
              <tr key={categoria.categoria}>
                <th scope="row">{categoria.categoria}</th>
                <td>
                  <div className={s.share}>
                    <span className={s.shareTrack} aria-hidden="true">
                      <i style={{ width: Math.min(100, Math.max(0, pct ?? 0)) + '%', backgroundColor: TONE_COLOR[tone] }} />
                    </span>
                    <span>{fmtPct(pct)}</span>
                  </div>
                </td>
                <td>{fmtBRL(categoria.valor)}</td>
              </tr>
            )
          })}
        </tbody>
      </table> : <p className={s.financeEmpty}>Nenhuma venda por categoria no período.</p>}
    </section>
  )
}

export function Finance({ pageParams }) {
  const { can } = useStore()
  const canManage = can('GERENCIAR_FINANCEIRO')
  const finTab = pageParams?.aba === 'dre' ? 'dre' : 'visao'
  const [drePeriodo, setDrePeriodo] = useState('0')
  const [dialog, setDialog] = useState(null)
  const [revision, setRevision] = useState(0)
  const resumo = useQueryResource(financeApi.resumo, [])
  const data = resumo.error ? null : resumo.data
  const periodos = periodosFinanceiro(resumo.data?.referencia)
  const periodo = finTab === 'dre' ? periodos.find(item => item.id === drePeriodo) : periodos[0]
  const resultado = useQueryResource(signal => periodo ? financeApi.resultado(periodo.inicio, periodo.fim, signal) : null,
    [periodo?.inicio, periodo?.fim])
  const { vencidas, vencemEmAte7Dias } = data?.aPagar30Dias ?? {}
  const tonePagar = vencidas ? 'bad' : vencemEmAte7Dias ? 'warn' : 'ok'
  const crescimento = data?.faturamento.crescimentoPercentual
  const cmvPct = data?.faturamento.cmvPercentual
  const cobertura = data?.coberturaContasAPagar

  function abrirConta(event, options) {
    event.currentTarget.focus({ preventScroll: true })
    setDialog(options)
  }

  function atualizarFinanceiro() {
    resumo.reload()
    resultado.reload()
    setRevision(value => value + 1)
  }

  const acoes = canManage && (
    <div className={s.actions}>
      <button type="button" onClick={event => abrirConta(event, { mode: 'create', tipo: 'PAGAR' })}>
        <ArrowUpRight size={16} aria-hidden="true" />Nova conta a pagar
      </button>
      <button type="button" className="gold" onClick={event => abrirConta(event, { mode: 'create', tipo: 'RECEBER' })}>
        <ArrowDownLeft size={16} aria-hidden="true" />Nova conta a receber
      </button>
    </div>
  )

  return (
    <div className={s.finance}>
      <nav className={s.tabs} aria-label="Seções do Financeiro">
        {tabs.map(({ id, label, Icon }) => (
          <Link key={id} to={{ pathname: '/financeiro', search: '?aba=' + id }} aria-current={finTab === id ? 'page' : undefined}>
            <Icon size={17} aria-hidden="true" />{label}
          </Link>
        ))}
      </nav>
      {finTab === 'visao' && (
        <>
          <div className={s.viewHeading}>
            <h2>Saldos e compromissos</h2>
            {acoes}
          </div>
          {resumo.loading && !data && <LoadingBlock label="Consultando o resumo financeiro…" />}
          {resumo.error && <ErrorBlock error={resumo.error} onRetry={resumo.reload} />}
          {data && <>
            <section className={s.balanceGrid} aria-label="Saldos e compromissos" aria-busy={resumo.loading}>
              <Indicador label="Saldo em caixa" value={fmtBRL(data.saldoRealizado)} Icon={Wallet} featured
                tone={toneHigher(cobertura, METAS.coberturaPagar)}
                description={cobertura == null ? 'Sem contas a pagar no intervalo' : `Equivale a ${fmtNum(cobertura)}× as contas a pagar em 30 dias`} />
              <Indicador label="A pagar em 30 dias" value={fmtBRL(data.aPagar30Dias.valor)} Icon={ArrowUpRight} tone={tonePagar}
                description={vencidas ? (vencidas === 1 ? '1 conta vencida' : vencidas + ' contas vencidas')
                  : (vencemEmAte7Dias === 1 ? '1 conta vence em até 7 dias' : vencemEmAte7Dias + ' contas vencem em até 7 dias')} />
              <Indicador label="A receber em 30 dias" value={fmtBRL(data.aReceber30Dias.valor)} Icon={ArrowDownLeft}
                description={data.aReceber30Dias.quantidade === 1 ? '1 conta em aberto' : data.aReceber30Dias.quantidade + ' contas em aberto'} />
            </section>
            <div className={s.overviewGrid}>
              <FluxoDeCaixa fluxo={data.fluxoCaixa} />
              <Vencimentos referencia={data.referencia} revision={revision} onOpen={abrirConta} />
            </div>
            <section className={s.monthGrid} aria-labelledby="finance-mes">
              <h2 id="finance-mes">Indicadores do mês</h2>
              <Indicador label="Faturamento" value={fmtBRL(data.faturamento.mesAtual)} Icon={ChartNoAxesCombined}
                tone={toneHigher(crescimento, METAS.crescimento)}
                description={crescimento == null ? 'Sem faturamento de referência no mês anterior'
                  : `${crescimento > 0 ? '+' : ''}${fmtPct(crescimento)} em relação ao mesmo intervalo do mês anterior`} />
              <Indicador label="Custo das mercadorias vendidas" value={fmtBRL(data.faturamento.cmvMesAtual)} Icon={ReceiptText}
                tone={toneLower(cmvPct, METAS.cmv)} description={cmvPct == null ? 'Sem faturamento de referência' : `${fmtPct(cmvPct)} do faturamento · meta de até ${METAS.cmv.ok}%`} />
            </section>
            {resultado.loading && <LoadingBlock label="Consultando vendas por categoria…" />}
            {resultado.error && <ErrorBlock error={resultado.error} onRetry={resultado.reload} />}
            {!resultado.loading && !resultado.error && resultado.data && <VendasPorCategoria resultado={resultado.data} />}
          </>}
        </>
      )}

      {finTab === 'dre' && (
        <Resultado periodos={periodos} periodo={periodo} onPeriodoChange={setDrePeriodo}
          resumo={resumo} consulta={resultado} acoes={acoes} />
      )}
      {dialog && <FinanceAccounts initial={dialog} canManage={canManage} referencia={resumo.data?.referencia}
        onChange={atualizarFinanceiro} onClose={() => setDialog(null)} />}
    </div>
  )
}
