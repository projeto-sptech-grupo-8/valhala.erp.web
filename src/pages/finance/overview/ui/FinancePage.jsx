import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import {
  ArrowUpRight, CalendarClock, CalendarDays, ChartNoAxesCombined, Check, ChevronDown, ChevronRight, ChevronLeft,
  Info, Banknote, Percent, CircleCheck, CircleHelp, CircleMinus, CircleX, LayoutDashboard, Package, ReceiptText, TrendingUp, Wallet,
} from 'lucide-react'
import { METAS, toneHigher, toneLower } from '@/entities/reports'
import { fmtBRL, fmtNum } from '@/shared/lib/format.js'
import { ChartTip } from '@/shared/ui/charts/ChartTip.jsx'
import { PeriodSelector } from '@/shared/ui/period-selector/PeriodSelector.jsx'
import { axisTick } from '@/shared/ui/charts/chartStyles.js'
import { ActionMenu } from '@/entities/access/ui'
import { useStore } from '@/entities/store'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { financeApi } from '../model/financeApi.js'
import { acrescentarDias, CENTROS_CUSTO, diaBR, periodosFinanceiro, rotuloMes } from '../model/financePresentation.js'
import { FinanceAccounts, AccountList } from './FinanceAccounts.jsx'
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
}

const fmtPct = value => value == null ? '—' : fmtNum(value) + '%'

function prazoTone(dias) {
  if (dias == null) return 'neutral'
  if (dias < 0) return 'bad'
  if (dias <= 7) return 'warn'
  return 'ok'
}

function SeloIndicador({ tone }) {
  const status = statusIndicador[tone]
  if (!status) return null

  return (
    <span className={s.metricStatus}>
      {status.Icon && <status.Icon size={17} aria-hidden="true" />}
      {status.label}
    </span>
  )
}

function Indicador({ label, value, description, tone = 'neutral', Icon, featured, title, statusLabel, neutralBorder = false, toneIcon = false }) {
  return (
    <article className={s.metric} data-tone={tone} data-neutral-border={neutralBorder || undefined} data-featured={featured || undefined} title={title}>
      <div className={s.metricTitleRow}>
        <h3>{Icon && <span className={s.metricIcon} data-tone-icon={toneIcon || undefined}><Icon size={18} aria-hidden="true" /></span>}{label}{title && <span tabIndex={0} aria-label={title} title={title} className={s.metricHelp}><Info size={14} aria-hidden="true"/></span>}</h3>
        {statusLabel ? <span className={s.metricStatus}>{statusLabel}</span> : <SeloIndicador tone={tone} />}
      </div>
      <strong>{value}</strong>
      <p>{description}</p>
    </article>
  )
}

function FluxoDeCaixa({ fluxo }) {
  const cashFlowData = fluxo.map(item => ({ ...item, m: rotuloMes(item.mes) }))
  return (
    <section className={s.overviewSection} aria-labelledby="finance-fluxo">
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
    </section>
  )
}

function Vencimentos({ referencia, revision, onOpen }) {
  const [centroCusto, setCentroCusto] = useState('')
  const consulta = useQueryResource(signal => financeApi.contas({
    tipo: 'PAGAR', status: 'ABERTA', centroCusto, vencimentoAte: acrescentarDias(referencia, 30), pagina: 0, tamanho: 5,
  }, signal), [referencia, centroCusto, revision])
  const contas = !consulta.loading && !consulta.error ? consulta.data?.itens : null

  return (
    <details className={s.overviewSection + ' ' + s.collapsibleDue}>
      <summary aria-label="Expandir ou recolher próximos vencimentos" title="Expandir ou recolher próximos vencimentos"><CalendarClock size={18} aria-hidden="true"/><span>Próximos vencimentos</span><ChevronRight size={17} aria-hidden="true"/></summary>
      <header className={s.cardHead + ' ' + s.dueHeading}>
        <div>
          <p>Vencidas e a vencer em até 30 dias</p>
        </div>
        <div className={s.dueFilter}>
          <ActionMenu label="Filtrar vencimentos por centro de custo"
            trigger={<><span>{CENTROS_CUSTO[centroCusto] || 'Centro de custo'}</span><ChevronDown size={15} aria-hidden="true"/></>}
            items={centros.map(([value,label])=>({ label, icon:centroCusto===value?Check:undefined, onClick:()=>setCentroCusto(value) }))}/>
        </div>
      </header>
      {consulta.loading && <LoadingBlock label="Consultando vencimentos…" lines={2} />}
      {consulta.error && <ErrorBlock error={consulta.error} onRetry={consulta.reload} />}
      {contas?.length === 0 && <p className={s.financeEmpty}>Nenhuma conta em aberto para os próximos 30 dias.</p>}
      {contas?.length > 0 && <ul className={s.dueList}>
        {contas.map(conta => {
          const dias = conta.diasParaVencer
          const prazo = dias == null ? 'Prazo não informado' : dias < 0 ? 'Vencida há ' + Math.abs(dias) + (dias === -1 ? ' dia' : ' dias') : dias === 0 ? 'Vence hoje' : 'Vence em ' + dias + (dias === 1 ? ' dia' : ' dias')
          return (
            <li key={conta.id} className={s.dueRow}>
              <div className={s.dueName}>
                <button className={s.accountLink} type="button" aria-label={`Ver conta ${conta.descricao}`}
                  onClick={event => onOpen(event, { mode: 'detail', id: conta.id })}>{conta.descricao}</button>
                <span>{CENTROS_CUSTO[conta.centroCusto]} · <time dateTime={conta.vencimento}>{diaBR(conta.vencimento).slice(0,5)}</time></span>
              </div>
              <div className={s.dueAmount}>
                <strong>{fmtBRL(conta.valor)}</strong>
              </div>
              <span className={s.dueStatus} data-tone={prazoTone(dias)}><CalendarClock size={13} aria-hidden="true"/>{prazo}</span>
            </li>
          )
        })}
      </ul>}
    </details>
  )
}

function IndicadoresResultado({ resultado, percentual }) {
  const helpId = useId()
  const { lucroBruto, lucroLiquido: lucroLiq, cmv, margemBrutaPercentual: margemBruta,
    margemLiquidaPercentual: margemLiq, cmvPercentual: cmvPct } = resultado
  const toneMargemLiq = toneHigher(margemLiq, METAS.margemLiquida)
  const indicadores = [
    {
      label: 'Lucro líquido',
      labelPercentual: 'Margem líquida',
      Icon: Wallet,
      ajuda: 'Lucro bruto menos as despesas fixas e variáveis do período. Quando essas despesas somam R$ 0,00, os dois lucros são iguais. A margem é o lucro líquido dividido pela receita líquida, vezes 100.',
      valor: lucroLiq,
      margem: margemLiq,
      base: 'da receita líquida',
      meta: `Meta de ${METAS.margemLiquida.ok}% ou mais · ruim abaixo de ${METAS.margemLiquida.warn}%`,
      tone: lucroLiq < 0 ? 'bad' : toneMargemLiq,
    },
    {
      label: 'Lucro bruto',
      labelPercentual: 'Margem bruta',
      Icon: TrendingUp,
      ajuda: 'Receita líquida menos o custo das mercadorias vendidas (CMV). A margem é o lucro bruto dividido pela receita líquida, vezes 100.',
      valor: lucroBruto,
      margem: margemBruta,
      base: 'da receita líquida',
      meta: `Meta de ${METAS.margemBruta.ok}% ou mais · ruim abaixo de ${METAS.margemBruta.warn}%`,
      tone: toneHigher(margemBruta, METAS.margemBruta),
    },
    {
      label: 'Custo das mercadorias vendidas',
      labelPercentual: 'Custo sobre a receita',
      Icon: Package,
      valor: cmv,
      margem: cmvPct,
      base: 'da receita líquida',
      meta: `Meta de até ${METAS.cmv.ok}% · ruim acima de ${METAS.cmv.warn}%`,
      tone: toneLower(cmvPct, METAS.cmv),
    },
  ]
  return (
    <section aria-label="Indicadores do resultado">
      <div className={s.resultMetrics} role="region" aria-label="Indicadores em linha" tabIndex={0}>
        {indicadores.map(({ label, labelPercentual, Icon, ajuda, valor, margem, base, meta, tone }, index) => (
          <article key={label} className={s.resultMetric} data-tone={tone}>
            <div className={s.metricTitleRow}>
              <h4>
                <span className={s.metricIcon} data-tone-icon><Icon size={18} aria-hidden="true" /></span>
                {percentual ? labelPercentual : label}
                {ajuda && <span className={s.resultHelp}>
                  <button type="button" aria-label={`Sobre ${percentual ? labelPercentual : label}`} aria-describedby={`${helpId}-${index}`}>
                    <CircleHelp size={15} aria-hidden="true" />
                  </button>
                  <span id={`${helpId}-${index}`} role="tooltip">{ajuda}</span>
                </span>}
              </h4>
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

function ComparacaoMensal({ data }) {
  if (!(data.faturamento.vendasMesAtual > 0)) return null
  const crescimento = data.faturamento.crescimentoPercentual
  const tone = crescimento == null || crescimento === 0 ? 'neutral' : crescimento > 0 ? 'positive' : 'negative'
  return <section className={s.monthComparison} aria-labelledby="month-comparison">
    <header><h3 id="month-comparison"><CalendarDays size={17} aria-hidden="true"/>Faturamento — mês atual</h3>
      <p>Até {diaBR(data.referencia)} · mesmo intervalo do mês anterior</p></header>
    <dl>
      <div className={s.monthCurrent}><dt>Faturamento do mês</dt><dd>{fmtBRL(data.faturamento.mesAtual)}</dd></div>
      <div><dt>Mesmo intervalo anterior</dt><dd>{fmtBRL(data.faturamento.mesAnteriorMesmoPeriodo)}</dd></div>
      <div data-change={tone}><dt>Variação</dt><dd>{crescimento == null ? 'Sem base para comparação' : (crescimento>0?'+':'')+fmtPct(crescimento)}</dd></div>
    </dl>
  </section>
}

function Resultado({ periodos, periodo, onPeriodoChange, resumo, consulta }) {
  const [percentual, setPercentual] = useState(false)
  const resultado = !consulta.loading && !consulta.error && periodo ? consulta.data : null
  return (
    <section className={s.resultGrid} aria-labelledby="finance-resultado">
      <header className={s.cardHead + ' ' + s.resultHeader}>
        <div>
          <h2 id="finance-resultado"><ReceiptText size={18} aria-hidden="true" />Resultado do período</h2>
          <p id="finance-periodo-ajuda">{periodo ? `${diaBR(periodo.inicio)} a ${diaBR(periodo.fim)}` : 'Receitas e despesas por período'}</p>
        </div>
        <div className={s.resultHeaderControls}>
          <div className={s.resultUnits} role="group" aria-label="Exibir indicadores">
            <button type="button" title="Exibir em reais (R$)" aria-label="Exibir em reais" aria-pressed={!percentual} onClick={()=>setPercentual(false)}><Banknote size={18} aria-hidden="true"/></button>
            <button type="button" title="Exibir em porcentagem (%)" aria-label="Exibir em porcentagem" aria-pressed={percentual} onClick={()=>setPercentual(true)}><Percent size={18} aria-hidden="true"/></button>
          </div>
          {periodo && <PeriodSelector options={periodos} selected={periodo} onChange={onPeriodoChange} describedBy="finance-periodo-ajuda" />}
        </div>
      </header>
      {((resumo.loading && !periodo) || consulta.loading) && <LoadingBlock label="Consultando resultado…" />}
      {!periodo && resumo.error && <ErrorBlock error={resumo.error} onRetry={resumo.reload} />}
      {consulta.error && <ErrorBlock error={consulta.error} onRetry={consulta.reload} />}
      {resultado && <>
        <IndicadoresResultado resultado={resultado} percentual={percentual} />
        {!resumo.loading && !resumo.error && resumo.data && <ComparacaoMensal data={resumo.data}/>}
        <div className={s.resultContent}>
        <section className={s.card + ' ' + s.resultComposition} aria-labelledby="result-composition">
          <h3 id="result-composition"><ReceiptText size={17} aria-hidden="true"/>Composição do resultado</h3>
          <dl className={s.resultRows}>
            <div><dt>Receita bruta</dt><dd>{fmtBRL(resultado.receitaBruta)}</dd></div>
            <div><dt>Cancelamentos</dt><dd>− {fmtBRL(resultado.cancelamentos)}</dd></div>
            <div className={s.subtotal}><dt>Receita líquida</dt><dd>{fmtBRL(resultado.receitaLiquida)}</dd></div>
            <div><dt>Custo das mercadorias vendidas (CMV)</dt><dd>− {fmtBRL(resultado.cmv)}</dd></div>
            <div className={s.subtotal}><dt>Lucro bruto</dt><dd>{fmtBRL(resultado.lucroBruto)}</dd></div>
            <div><dt>Despesas fixas</dt><dd>− {fmtBRL(resultado.despesasFixas)}</dd></div>
            <div><dt>Despesas variáveis</dt><dd>− {fmtBRL(resultado.despesasVariaveis)}</dd></div>
            <div className={s.resultTotal} data-result={resultado.lucroLiquido<0?'negative':resultado.lucroLiquido>0?'positive':'zero'}><dt>Lucro líquido</dt><dd>{fmtBRL(resultado.lucroLiquido)}</dd></div>
          </dl>
        </section>
        <VendasPorCategoria key={resultado.inicio + '/' + resultado.fim} resultado={resultado}/>
        </div>
      </>}
    </section>
  )
}

function VendasPorCategoria({ resultado }) {
  const [page, setPage] = useState(0)
  const categories = [...resultado.vendasPorCategoria].sort((a,b)=>b.valor-a.valor)
  const pages = Math.max(1, Math.ceil(categories.length / 3))
  const currentPage = Math.min(page, pages - 1)
  return (
    <section className={s.card + ' ' + s.categoryCard} aria-labelledby="finance-vendas">
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
          {categories.slice(currentPage * 3, currentPage * 3 + 3).map(categoria => {
            const pct = categoria.participacaoPercentual
            return (
              <tr key={categoria.categoria}>
                <th scope="row">{categoria.categoria}</th>
                <td>
                  <div className={s.share}>
                    <span className={s.shareTrack} aria-hidden="true">
                      <i style={{ width: Math.min(100, Math.max(0, pct ?? 0)) + '%', backgroundColor: 'var(--gold)' }} />
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
      {pages > 1 && <nav className={s.categoryPagination} aria-label="Paginação das categorias">
        <button type="button" aria-label="Categorias anteriores" disabled={currentPage === 0} onClick={()=>setPage(currentPage-1)}><ChevronLeft size={16} aria-hidden="true"/></button>
        <span aria-live="polite">{currentPage+1} de {pages}</span>
        <button type="button" aria-label="Próximas categorias" disabled={currentPage === pages-1} onClick={()=>setPage(currentPage+1)}><ChevronRight size={16} aria-hidden="true"/></button>
      </nav>}


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
  const periodo = finTab === 'dre' ? periodos.find(item => item.id === drePeriodo) : null
  const resultado = useQueryResource(signal => periodo ? financeApi.resultado(periodo.inicio, periodo.fim, signal) : null,
    [periodo?.inicio, periodo?.fim])
  const { vencidas, vencemEmAte7Dias } = data?.aPagar30Dias ?? {}
  const tonePagar = vencidas ? 'bad' : vencemEmAte7Dias ? 'warn' : 'info'
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
      <button type="button" className="gold" onClick={event => abrirConta(event, { mode: 'create', tipo: 'PAGAR' })}>
        <ArrowUpRight size={16} aria-hidden="true" />Nova conta
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
            <h2 className={s.overviewTitle}><Wallet size={20} aria-hidden="true"/>Saldos e compromissos</h2>
            {acoes}
          </div>
          {resumo.loading && !data && <LoadingBlock label="Consultando o resumo financeiro…" />}
          {resumo.error && <ErrorBlock error={resumo.error} onRetry={resumo.reload} />}
          {data && <>
            <section className={s.balanceGrid} aria-label="Saldos e compromissos" aria-busy={resumo.loading}>
              <Indicador label="Saldo financeiro acumulado" neutralBorder toneIcon value={fmtBRL(data.saldoRealizado)} Icon={Wallet} title="Recebimentos acumulados das vendas somados às baixas das contas financeiras. A gaveta do turno é consultada na tela Caixa."
                tone={data.saldoRealizado > 0 ? 'ok' : data.saldoRealizado < 0 ? 'bad' : 'neutral'}
                statusLabel={data.saldoRealizado > 0 ? 'Positivo' : data.saldoRealizado < 0 ? 'Negativo' : 'Zerado'}
                description={cobertura == null ? 'Sem contas a pagar no intervalo' : `Equivale a ${fmtNum(cobertura)}× as contas a pagar em 30 dias`} />
              <Indicador label="A pagar em 30 dias" value={fmtBRL(data.aPagar30Dias.valor)} Icon={ArrowUpRight} tone={tonePagar} statusLabel={vencidas ? 'Contas vencidas' : vencemEmAte7Dias ? 'Vencimentos próximos' : 'Sem urgências'}
                description={vencidas ? (vencidas === 1 ? '1 conta vencida' : vencidas + ' contas vencidas')
                  : (vencemEmAte7Dias === 1 ? '1 conta vence em até 7 dias' : vencemEmAte7Dias + ' contas vencem em até 7 dias')} />
            </section>
            <div className={s.card + ' ' + s.overviewGrid} role="group" aria-label="Vencimentos e fluxo financeiro">
              <FluxoDeCaixa fluxo={data.fluxoCaixa} />
              <Vencimentos referencia={data.referencia} revision={revision} onOpen={abrirConta} />
            </div>
          </>}
        </>
      )}

      {finTab === 'visao' && <AccountList revision={revision} canManage={canManage}
        onSelect={(id, mode) => setDialog({ id, mode })} />}

      {finTab === 'dre' && (
        <>
          <Resultado periodos={periodos} periodo={periodo} onPeriodoChange={setDrePeriodo}
            resumo={resumo} consulta={resultado} />

        </>
      )}
      {dialog && <FinanceAccounts initial={dialog} canManage={canManage} referencia={resumo.data?.referencia}
        onChange={atualizarFinanceiro} onClose={() => setDialog(null)} />}
    </div>
  )
}
