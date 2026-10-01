import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { Download, ArrowUp, ArrowDown } from 'lucide-react'
import { Stat } from '../../components/ui.jsx'
import { METAS, toneHigher, toneLower, fracaoExpediente } from '../../lib/kpi.js'
import { useToast } from '../../components/useToast.js'
import { fmtBRL, fmtNum, fmtDateTime } from '../../lib/format.js'
import { downloadCSV, stamp } from '../../lib/csv.js'
import { monthData } from './mock.js'
import { useStore } from './useStore.js'
import { caixaResumo, FORMAS } from './caixa.js'
import { isCritical, getStatus, movDelta, fmtMovQty } from './estoque.js'
import { ChartTip } from './components/ChartTip.jsx'
import { axisTick, legendStyle } from './components/chartStyles.js'
import s from './dash.module.css'

/* ─── Dashboard ─── */
export function Dashboard({ navigate }) {
  const { products, movements, sales, caixa } = useStore()
  const toast = useToast()
  const critical = products.filter(isCritical)

  const today = new Date().toDateString()
  const vendasHoje = sales.filter(v => new Date(v.em).toDateString() === today)
  const fatHoje = vendasHoje.reduce((a, v) => a + v.total, 0)

  const porForma = Object.fromEntries(FORMAS.map(f => [f, 0]))
  vendasHoje.forEach(v => {
    v.pagamentos.forEach(p => { porForma[p.forma] += p.valor })
    porForma.Dinheiro -= v.troco || 0
  })
  const totalFormas = Object.values(porForma).reduce((a, b) => a + b, 0)

  /* ─── Semáforo dos KPIs ─── */
  const meta = METAS.faturamentoDiario
  const frac = fracaoExpediente()
  const pctMeta = Math.round((fatHoje / meta) * 100)
  const ritmo = frac ? (fatHoje / (meta * frac)) * 100 : null
  const toneFat = frac === null ? 'neutral' : pctMeta >= 100 ? 'ok' : toneHigher(ritmo, METAS.ritmoFaturamento)
  const badgeFat = frac === null ? 'Antes do expediente'
    : pctMeta >= 100 ? 'Meta batida'
    : { ok: 'No ritmo', warn: 'Abaixo do ritmo', bad: 'Muito abaixo' }[toneFat]

  const toneCaixa = caixa ? 'ok' : frac !== null && frac < 1 ? 'warn' : 'neutral'

  const zerados = products.filter(p => getStatus(p) === 'Zerado').length
  const toneCrit = zerados ? 'bad' : toneLower(critical.length, METAS.itensCriticos)

  const estaveis = products.filter(p => getStatus(p) === 'Estável').length
  const saude = products.length ? Math.round((estaveis / products.length) * 100) : 100
  const toneSaude = toneHigher(saude, METAS.saudeEstoque)

  function exportChart() {
    downloadCSV(`movimentacao-estoque-${stamp()}`, ['Mês', 'Entradas', 'Saídas'], monthData.map(m => [m.m, m.entradas, m.saidas]))
    toast('Arquivo CSV gerado.', { title: 'Exportação concluída' })
  }

  return (
    <>
      <div className="stats">
        <Stat
          a="Faturamento hoje" b={fmtBRL(fatHoje)} tone={toneFat} badge={badgeFat}
          progress={pctMeta} progressLabel="Faturamento em relação à meta diária"
          c={`${pctMeta}% da meta diária (${fmtBRL(meta)}) · ${vendasHoje.length} venda${vendasHoje.length === 1 ? '' : 's'}`}
          title={`Ritmo: compara o faturado com o esperado até agora no expediente (${METAS.expediente.abre}h–${METAS.expediente.fecha}h). Bom ≥ ${METAS.ritmoFaturamento.ok}% · Atenção ≥ ${METAS.ritmoFaturamento.warn}%`}
        />
        <Stat
          a="Caixa" b={caixa ? 'Aberto' : 'Fechado'} tone={toneCaixa}
          badge={caixa ? 'Operando' : toneCaixa === 'warn' ? 'Fechado' : undefined}
          c={caixa ? `Esperado em dinheiro: ${fmtBRL(caixaResumo(caixa, sales).dinheiroEsperado)}` : toneCaixa === 'warn' ? 'Em horário de expediente — abra para vender' : 'Abra o caixa para vender'}
        />
        <Stat
          a="Estoque crítico" b={critical.length} tone={toneCrit}
          badge={zerados ? `${zerados} zerado${zerados > 1 ? 's' : ''}` : undefined}
          c={critical.length ? 'Itens abaixo do estoque mínimo' : 'Nenhum item abaixo do mínimo'}
          title={`Bom: nenhum item · Atenção: até ${METAS.itensCriticos.warn} · Crítico: mais de ${METAS.itensCriticos.warn} ou algum zerado`}
        />
        <Stat
          a="Saúde do estoque" b={saude + '%'} tone={toneSaude}
          progress={saude} progressLabel="Percentual de produtos com estoque estável"
          c={`${estaveis} de ${products.length} produtos estáveis · meta ≥ ${METAS.saudeEstoque.ok}%`}
        />
      </div>
      <div className={s.dash}>
        <article className="card">
          <div className={s.cardTitleRow}>
            <h3>Movimentação de estoque · 6 meses</h3>
            <button onClick={exportChart}>Exportar <Download size={13} aria-hidden="true" /></button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthData} barSize={16} barGap={4} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(201,162,39,.08)" />
              <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(201,162,39,.05)' }} />
              <Legend iconType="square" iconSize={8} wrapperStyle={legendStyle} />
              <Bar dataKey="entradas" name="Entradas" fill="#c9a227" radius={[3, 3, 0, 0]} />
              <Bar dataKey="saidas"   name="Saídas"   fill="#7a5a22" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className={'card ' + s.feed}>
          <div className={s.cardTitleRow}>
            <h3>Últimas movimentações</h3>
            <a href="#/movimentacoes" className={s.link} onClick={e => { e.preventDefault(); navigate('movimentacoes') }}>Ver todas</a>
          </div>
          {movements.slice(0, 5).map(m => {
            const delta = movDelta(m)
            const up = delta >= 0
            return (
              <div key={m.id}>
                <i className={up ? s.feedUp : s.feedDown} aria-label={up ? 'Entrada' : 'Saída'}>
                  {up ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                </i>
                <span><b>{m.produto}</b><small>{fmtDateTime(m.em)} · {m.tipo} · {m.operador}</small></span>
                <strong style={{ color: up ? 'var(--green)' : 'var(--red)' }}>
                  {fmtMovQty(m, products, fmtNum)}
                </strong>
              </div>
            )
          })}
        </article>

        <article className={'card ' + s.alerts}>
          <h3>Estoque crítico</h3>
          {critical.slice(0, 5).map(p => (
            <div key={p.id}>
              <span><b>{p.name}</b><small>{p.cat} · mín. {p.min} {p.unit}</small></span>
              <strong>{fmtNum(p.qty)} {p.unit}</strong>
            </div>
          ))}
          {critical.length === 0 && (
            <p className={s.okMsg}>Todos os produtos estão acima do mínimo.</p>
          )}
          {critical.length > 0 && (
            <button className={s.fullBtn} onClick={() => navigate('reposicao')}>
              Ver lista de reposição ({critical.length})
            </button>
          )}
        </article>

        <article className={'card ' + s.pay}>
          <h3>Formas de pagamento · hoje</h3>
          {totalFormas === 0 && <p className={s.muted}>Nenhuma venda registrada hoje.</p>}
          {totalFormas > 0 && FORMAS.map(f => {
            const pct = Math.round((porForma[f] / totalFormas) * 100)
            return (
              <div key={f}>
                <span>{f} <b>{pct}%</b><small className={s.payVal}>{fmtBRL(porForma[f])}</small></span>
                <i><em style={{ width: pct + '%' }} /></i>
              </div>
            )
          })}
          <div className={s.payTicket}>
            <span>Ticket médio (hoje)</span>
            <b>{vendasHoje.length ? fmtBRL(fatHoje / vendasHoje.length) : '—'}</b>
          </div>
        </article>
      </div>
    </>
  )
}
