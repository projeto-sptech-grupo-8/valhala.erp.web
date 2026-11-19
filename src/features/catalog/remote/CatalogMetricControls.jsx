import { useId, useState } from 'react'
import { Percent, TrendingUp } from 'lucide-react'
import { fmtNum } from '@/shared/lib/format.js'
import s from './CatalogMetrics.module.css'

export function CatalogMetricControls({ margem, giro, onMargin, onTurnover, period }) {
  const [help, setHelp] = useState(null)
  return <div className={s.controls}><span>Exibir indicadores</span><div className={s.buttons}>
    <MetricToggle helpOpen={help === 'margem'} setHelp={setHelp} kind="margem" active={margem} onClick={onMargin} />
    <MetricToggle helpOpen={help === 'giro'} setHelp={setHelp} kind="giro" active={giro} onClick={onTurnover} period={period} />
  </div></div>
}
function MetricToggle({ kind, active, onClick, period, helpOpen, setHelp }) {
  const id = useId()
  const [position, setPosition] = useState({})
  const margin = kind === 'margem'
  const Icon = margin ? Percent : TrendingUp
  function positionHelp(event) {
    setHelp(kind)
    const rect = event.currentTarget.getBoundingClientRect()
    const width = Math.min(360, window.innerWidth - 32)
    setPosition({ left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)), bottom: window.innerHeight - rect.top, width, maxHeight: Math.max(100, rect.top - 24) })
  }
  const bands = margin ? [['red', 'Abaixo do custo', 'Menos de 0%'], ['orange', 'Margem baixa', '0% a menos de 20%'], ['yellow', 'Margem intermediária', '20% a menos de 40%'], ['green', 'Margem alta', 'A partir de 40%']] : [['red', 'Reposição urgente', 'Menos de 7 dias'], ['yellow', 'Acompanhar', '7 a 30 dias'], ['green', 'Faixa proposta', 'Acima de 30 até 60 dias'], ['orange', 'Possível excesso', 'Acima de 60 dias']]
  return <div className={s.toggleGroup} data-active={active} data-help-open={helpOpen} onMouseEnter={positionHelp} onFocus={positionHelp} onMouseLeave={() => setHelp(current => current === kind ? null : current)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(':hover')) setHelp(current => current === kind ? null : current) }} onKeyDown={event => { if (event.key === 'Escape') { setHelp(null); event.stopPropagation() } }}>
    <button type="button" aria-pressed={active} aria-describedby={id} onClick={onClick}><Icon size={16} aria-hidden="true" />{margin ? 'Margem' : 'Giro'}</button>
    <div id={id} role="tooltip" className={s.tooltip} style={position}>
      <strong className={s.helpTitle}>{margin ? 'Margem bruta do produto' : 'Giro e cobertura de estoque'}</strong>
      <p>{margin ? 'Mostra quanto do preço de venda sobra depois de descontar o custo do produto.' : 'Mostra o consumo dos últimos 30 dias completos e por quantos dias o saldo atual pode durar nesse ritmo.'}</p>
      <div className={s.formula}>{margin ? '(Preço − custo) ÷ preço × 100' : 'Cobertura = saldo atual ÷ (consumo em 30 dias ÷ 30)'}</div>
      <ul className={s.bands}>{bands.map(([tone, label, range]) => <li key={tone} data-tone={tone}><span className={s.dot} aria-hidden="true" /><span><b>{label}</b><small>{range}</small></span></li>)}</ul>
      {margin ? <p><b>Exemplo:</b> venda de R$ 20 e custo de R$ 12 resultam em margem de 40%. Em drinks, o custo é estimado pela receita. Sem custo informado, não há classificação. Não inclui impostos, taxas e despesas.</p> : <>
        {period && <p><b>Período:</b> {period.dataInicial.split('-').reverse().join('/')} a {period.dataFinal.split('-').reverse().join('/')} (até ontem).</p>}
        <p><b>Exemplo:</b> consumo de 60 unidades em 30 dias e saldo de 20 unidades indicam cobertura de 10 dias.</p>
        <p>Inclui saídas diretas e ingredientes consumidos em drinks. Exclui entradas, perdas e ajustes. Sem consumo: <b>Sem giro</b>. Drinks: <b>sem total seguro por preparo</b>; o histórico repete a receita por ingrediente. A cobertura usa saldo físico, sem descontar reservas e vencidos. Ajustes de estorno não são abatidos do consumo.</p>
      </>}
      <p className={s.footnote}>Clique para {active ? 'ocultar' : 'mostrar'} as colunas. As cores são faixas iniciais de atenção. Dados indisponíveis não equivalem a zero.{!margin && ' Cálculo no navegador para os produtos desta página; cobertura estimada com saldo atual.'} Use Atualizar para recalcular.</p>
    </div>
  </div>
}

export function MarginCell({ data, loading }) {
  if (loading) return <span className={s.neutral}>Calculando…</span>
  if (!data?.margin || data.marginError) return <span className={s.neutral} title={data?.marginError}>Indisponível</span>
  const metric = data.margin
  return <div className={s.metric} data-tone={metric.tone}>
    {metric.value != null && <strong>{fmtNum(metric.value)}%{metric.estimated ? ' (est.)' : ''}</strong>}
    <span>{metric.label}</span>
    {metric.value != null && <i className={s.bar} aria-hidden="true"><i style={{ width: Math.min(100, Math.max(0, metric.value)) + '%' }} /></i>}
  </div>
}
export function TurnoverCell({ data, loading, product, coverage = false }) {
  if (loading) return <span className={s.neutral}>Calculando…</span>
  const metric = data?.turnover
  if (!metric || metric.unavailable) return <span className={s.neutral} title={metric?.unavailable}>Indisponível</span>
  const unit = product.fracionado ? 'ml' : product.unit
  return <div className={s.metric} data-tone={metric.coverage.tone}>{coverage ? <>
    {metric.coverage.value != null && <strong>{fmtNum(metric.coverage.value)} dias</strong>}<span>{metric.coverage.label}</span>
  </> : <><strong>{fmtNum(metric.outgoing)} {unit}</strong><span>{metric.outgoing === 0 ? 'Sem giro' : 'Consumo em 30 dias'}</span></>}</div>
}
