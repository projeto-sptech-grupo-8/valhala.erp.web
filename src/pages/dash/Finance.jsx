import { useState } from 'react'
import {
  BarChart, Bar, AreaChart, Area,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { Sel, Stat, KpiStrip } from '../../components/ui.jsx'
import { METAS, toneHigher, toneLower, TONE_COLOR } from '../../lib/kpi.js'
import { fmtBRL } from '../../lib/format.js'
import { TODAY, vencimentosData, centroColors, dreData, cashFlowData, salesByCategory } from './mock.js'
import { ChartTip } from './components/ChartTip.jsx'
import { axisTick, legendStyle } from './components/chartStyles.js'
import { useToast, PENDING_BACKEND } from '../../components/useToast.js'
import s from './dash.module.css'

/* fundo translúcido a partir de uma cor (funciona com var()) */
const tint = (color, pct = 18) => `color-mix(in srgb, ${color} ${pct}%, transparent)`

function diasAte(dateStr) {
  return Math.round((new Date(dateStr) - TODAY) / 86400000)
}

function agingColor(dias, tipo) {
  if (tipo === 'receber') return dias <= 3 ? 'var(--green)' : 'var(--green)'
  if (dias <= 3)  return 'var(--red)'
  if (dias <= 7)  return 'var(--gold2)'
  return 'var(--green)'
}

/* Saldos consolidados (mock — virão de /financeiro/resumo) */
const SALDO_CAIXA = 18420
const A_RECEBER_30D = 12860
const A_PAGAR_30D = 6310
const CRESCIMENTO_MES = 12 // % vs. mês anterior

/* ─── Financeiro ─── */
const finTabList = [
  ['visao',  'Visão geral'],
  ['dre',    'Resultado'],
  ['vendas', 'Análise de vendas'],
]

export function Finance() {
  const toast = useToast()
  const [finTab,      setFinTab]      = useState('visao')
  const [centroCusto, setCentroCusto] = useState('Todos')
  const [drePeriodo,  setDrePeriodo]  = useState('Set 2026')

  const centros      = ['Todos', ...new Set(vencimentosData.map(v => v.centro))]
  const vencFiltrados = vencimentosData.filter(v => centroCusto === 'Todos' || v.centro === centroCusto)

  const receitaLiq  = dreData.receitaBruta - dreData.devolucoes
  const lucroBruto  = receitaLiq - dreData.cmv
  const lucroLiq    = lucroBruto - dreData.despesasFixas - dreData.despesasVariaveis
  const margemBruta = Math.round(lucroBruto / receitaLiq * 100)
  const margemLiq   = Math.round(lucroLiq   / receitaLiq * 100)
  const cmvPct      = Math.round(dreData.cmv / dreData.receitaBruta * 100)

  const cobertura   = SALDO_CAIXA / A_PAGAR_30D
  const pagarProx   = vencimentosData.filter(v => v.tipo === 'pagar')
  const vencidos    = pagarProx.filter(v => diasAte(v.vence) < 0).length
  const venceSemana = pagarProx.filter(v => diasAte(v.vence) >= 0 && diasAte(v.vence) <= 7).length
  const tonePagar   = vencidos ? 'bad' : venceSemana ? 'warn' : 'ok'
  const toneMargemLiq = toneHigher(margemLiq, METAS.margemLiquida)

  return (
    <>
      {/* ── Tab bar ── */}
      <div className={s.finTabs}>
        {finTabList.map(([id, label]) => (
          <button
            key={id}
            className={finTab === id ? s.finTabActive : s.finTabBtn}
            onClick={() => setFinTab(id)}
          >
            {label}
          </button>
        ))}
        <div className={s.finTabActions}>
          <button onClick={() => toast(PENDING_BACKEND, { type: 'info', title: 'Nova conta a pagar' })}>Nova conta a pagar</button>
          <button className="gold" onClick={() => toast(PENDING_BACKEND, { type: 'info', title: 'Nova conta a receber' })}>Nova conta a receber</button>
        </div>
      </div>

      {/* ── Tab: Visão geral ── */}
      {finTab === 'visao' && (
        <>
          <KpiStrip label="Indicadores financeiros" items={[
            {
              label: 'Saldo em caixa', value: fmtBRL(SALDO_CAIXA), tone: toneHigher(cobertura, METAS.coberturaPagar),
              sub: `Cobre ${cobertura.toFixed(1).replace('.', ',')}× o a pagar (30d)`,
              title: `Meta: saldo ≥ ${METAS.coberturaPagar.ok}× as contas a pagar em 30 dias`,
            },
            { label: 'A receber (30d)', value: fmtBRL(A_RECEBER_30D), sub: '7 títulos em aberto', tone: 'neutral' },
            {
              label: 'A pagar (30d)', value: fmtBRL(A_PAGAR_30D), tone: tonePagar,
              sub: vencidos ? `${vencidos} título(s) vencido(s)` : `${venceSemana} vence(m) em até 7 dias`,
              badge: vencidos ? 'Vencido' : venceSemana ? 'Esta semana' : 'Em dia',
            },
            {
              label: 'Faturamento (mês)', value: fmtBRL(dreData.receitaBruta), tone: toneHigher(CRESCIMENTO_MES, METAS.crescimento),
              sub: 'vs. mês anterior', badge: `${CRESCIMENTO_MES > 0 ? '+' : ''}${CRESCIMENTO_MES}%`, trend: CRESCIMENTO_MES >= 0 ? 'up' : 'down',
            },
            {
              label: 'CMV (mês)', value: fmtBRL(dreData.cmv), tone: toneLower(cmvPct, METAS.cmv),
              sub: `${cmvPct}% da receita · meta ≤ ${METAS.cmv.ok}%`,
            },
          ]} />

          <div className={s.finVisao}>
            {/* Fluxo de caixa */}
            <article className="card">
              <h3>Fluxo de caixa · 6 meses</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={cashFlowData} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="recFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#c9a227" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#c9a227" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="despFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#b75b4a" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#b75b4a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(201,162,39,.08)" />
                  <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => 'R$' + (v / 1000).toFixed(0) + 'k'} />
                  <Tooltip content={<ChartTip money />} cursor={{ stroke: 'rgba(201,162,39,.15)', strokeWidth: 1 }} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={legendStyle} />
                  <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#c9a227" strokeWidth={1.5} fill="url(#recFill)" dot={false} />
                  <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#b75b4a" strokeWidth={1.5} fill="url(#despFill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </article>

            {/* Próximos vencimentos */}
            <article className="card">
              <div className={s.vencHead}>
                <h3>Próximos vencimentos</h3>
                <div className={s.centroFilters}>
                  {centros.map(c => (
                    <button
                      key={c}
                      className={centroCusto === c ? s.centroActive : s.centroBtn}
                      onClick={() => setCentroCusto(c)}
                    >
                      {c !== 'Todos' && <span className={s.centroDot} style={{ background: centroColors[c] }} />}
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              {vencFiltrados.map((v) => {
                const dias  = diasAte(v.vence)
                const cor   = agingColor(dias, v.tipo)
                const sinal = v.tipo === 'receber' ? '+' : '−'
                return (
                  <div key={v.nome} className={s.venc}>
                    <span>
                      <b>{v.nome}</b>
                      <small style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        <span className={s.centroTag} style={{ background: tint(centroColors[v.centro]), color: centroColors[v.centro] }}>
                          {v.centro}
                        </span>
                        <span style={{ color: 'var(--faint)' }}>
                          {v.vence.slice(8)}/{v.vence.slice(5, 7)}
                        </span>
                      </small>
                    </span>
                    <div className={s.vencRight}>
                      <em className={s.agingBadge} style={{ color: cor, borderColor: tint(cor, 40) }}>
                        {dias >= 0 ? dias + 'd' : 'Vencido'}
                      </em>
                      <em style={{ color: 'var(--text)', fontStyle: 'normal', fontSize: 13, fontWeight: 600, minWidth: 92, textAlign: 'right' }}>
                        {sinal} {fmtBRL(v.valor)}
                      </em>
                    </div>
                  </div>
                )
              })}
            </article>
          </div>
        </>
      )}

      {/* ── Tab: DRE ── */}
      {finTab === 'dre' && (
        <div className={s.dreTab}>
          <article className={'card ' + s.dreCard}>
            <div className={s.dreHeader}>
              <h3>Resultado do exercício</h3>
              <Sel value={drePeriodo} onChange={e => setDrePeriodo(e.target.value)} className={s.dreSelect}>
                {['Set 2026', 'Ago 2026', 'Jul 2026', 'Trim. Q3'].map(p => <option key={p}>{p}</option>)}
              </Sel>
            </div>

            <div className={s.dreBody}>
              <div className={s.dreRow}>
                <span>Receita bruta</span>
                <b>{fmtBRL(dreData.receitaBruta)}</b>
              </div>
              <div className={s.dreRowSub}>
                <span>Devoluções</span>
                <span>− {fmtBRL(dreData.devolucoes)}</span>
              </div>
              <div className={`${s.dreRow} ${s.dreSubtotal}`}>
                <span>Receita líquida</span>
                <b>{fmtBRL(receitaLiq)}</b>
              </div>

              <div className={s.dreDivider} />

              <div className={`${s.dreRow} ${s.dreCmv}`}>
                <span>Custo das mercadorias vendidas (CMV)</span>
                <b>− {fmtBRL(dreData.cmv)}</b>
              </div>

              <div className={s.dreDivider} />

              <div className={`${s.dreRow} ${s.dreSubtotal}`}>
                <span>Lucro bruto</span>
                <div style={{ textAlign: 'right' }}>
                  <b>{fmtBRL(lucroBruto)}</b>
                  <em className={s.dreMargem}>margem {margemBruta}%</em>
                </div>
              </div>

              <div className={s.dreDivider} />

              <div className={s.dreRow}>
                <span>
                  Despesas fixas
                  <em className={s.dreCentroTag} style={{ background: tint(centroColors.Operacional), color: centroColors.Operacional }}>Operacional</em>
                </span>
                <span className={s.dreNeg}>− {fmtBRL(dreData.despesasFixas)}</span>
              </div>
              <div className={s.dreRow}>
                <span>
                  Despesas variáveis
                  <em className={s.dreCentroTag} style={{ background: tint(centroColors.Compras), color: centroColors.Compras }}>Compras</em>
                </span>
                <span className={s.dreNeg}>− {fmtBRL(dreData.despesasVariaveis)}</span>
              </div>

              <div className={s.dreDivider} />

              <div className={`${s.dreRow} ${s.dreLucroLiq}`}>
                <span>Lucro líquido</span>
                <div style={{ textAlign: 'right' }}>
                  <b>{fmtBRL(lucroLiq)}</b>
                  <em className={s.dreMargem} style={{ color: TONE_COLOR[toneMargemLiq] }}>{toneMargemLiq === 'ok' ? '↑' : '↓'} margem {margemLiq}%</em>
                </div>
              </div>
            </div>
          </article>

          {/* KPIs rápidos ao lado */}
          <div className={s.dreKpis}>
            <Stat a="Margem bruta" b={margemBruta + '%'} tone={toneHigher(margemBruta, METAS.margemBruta)} c={`Meta ≥ ${METAS.margemBruta.ok}% · crítico abaixo de ${METAS.margemBruta.warn}%`} progress={margemBruta / METAS.margemBruta.ok * 100} progressLabel="Margem bruta em relação à meta" />
            <Stat a="Margem líquida" b={margemLiq + '%'} tone={toneMargemLiq} c={`Meta ≥ ${METAS.margemLiquida.ok}% · crítico abaixo de ${METAS.margemLiquida.warn}%`} progress={margemLiq / METAS.margemLiquida.ok * 100} progressLabel="Margem líquida em relação à meta" />
            <Stat a="CMV / Receita" b={cmvPct + '%'} tone={toneLower(cmvPct, METAS.cmv)} c={`Meta ≤ ${METAS.cmv.ok}% · crítico acima de ${METAS.cmv.warn}%`} />
            <Stat a="Lucro líquido" b={fmtBRL(lucroLiq)} tone={lucroLiq > 0 ? toneMargemLiq : 'bad'} c={lucroLiq > 0 ? 'Resultado positivo no período' : 'Prejuízo no período'} />
          </div>
        </div>
      )}

      {/* ── Tab: Análise de vendas ── */}
      {finTab === 'vendas' && (
        <div className={s.vendasTab}>
          <article className="card">
            <h3>Vendas por categoria · {drePeriodo}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={salesByCategory} layout="vertical" barSize={18} margin={{ top: 4, right: 16, left: 60, bottom: 0 }}>
                <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => 'R$' + (v / 1000).toFixed(0) + 'k'} />
                <YAxis type="category" dataKey="cat" tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip money />} cursor={{ fill: 'rgba(201,162,39,.05)' }} />
                <Bar dataKey="valor" name="Vendas" fill="#c9a227" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </article>

          <article className="card">
            <h3>Participação por categoria</h3>
            {(() => {
              const total = salesByCategory.reduce((a, c) => a + c.valor, 0)
              return salesByCategory.map(c => {
                const pct = Math.round(c.valor / total * 100)
                return (
                  <div key={c.cat} className={s.catShare}>
                    <span>{c.cat}</span>
                    <div className={s.catShareBar}>
                      <div style={{ width: pct + '%', background: 'var(--gold)' }} />
                    </div>
                    <span className={s.catSharePct}>{pct}%</span>
                    <span className={s.catShareVal}>{fmtBRL(c.valor)}</span>
                  </div>
                )
              })
            })()}
          </article>
        </div>
      )}
    </>
  )
}
