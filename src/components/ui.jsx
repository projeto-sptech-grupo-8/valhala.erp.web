import { ChevronDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { TONE_LABEL } from '../lib/kpi.js'
import k from './kpi.module.css'

const toneClass = (tone = 'neutral') => k[`tone-${tone}`]

/* Selo de desempenho: ícone + texto (não depende só da cor) */
export function ToneBadge({ tone = 'neutral', label, trend }) {
  const text = label ?? TONE_LABEL[tone]
  if (!text) return null
  const Arrow = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null
  return (
    <em className={`${k.badge} ${toneClass(tone)} ${Arrow ? k.trend : ''}`}>
      {Arrow && <Arrow size={13} aria-hidden="true" />}
      {text}
    </em>
  )
}

/* Barra de progresso em direção à meta */
export function Meter({ pct, label }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <div className={k.meter} role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <i style={{ width: v + '%' }} />
    </div>
  )
}

/*
 * Card de KPI
 * a: rótulo · b: valor · c: contexto
 * tone: ok | warn | bad | neutral · badge: texto do selo · trend: up | down · progress: 0–100
 */
export const Stat = ({ a, b, c, tone = 'neutral', badge, trend, progress, progressLabel, title }) => (
  <article className={`stat ${k.stat} ${toneClass(tone)}`} title={title}>
    <div className={k.head}>
      <p>{a}</p>
      <ToneBadge tone={tone} label={badge} trend={trend} />
    </div>
    <b>{b}</b>
    {progress != null && <Meter pct={progress} label={progressLabel || a} />}
    <span>{c}</span>
  </article>
)

/* Faixa horizontal de KPIs */
export function KpiStrip({ items, label }) {
  return (
    <section className={`card ${k.strip}`} aria-label={label}>
      {items.map(it => (
        <div key={it.label} className={`${k.item} ${toneClass(it.tone)}`} title={it.title}>
          <div className={k.itemHead}>
            <p>{it.label}</p>
            {(it.badge || (it.tone && it.tone !== 'neutral')) && <ToneBadge tone={it.tone} label={it.badge} trend={it.trend} />}
          </div>
          <b>{it.value}</b>
          {it.progress != null && <Meter pct={it.progress} label={it.label} />}
          <span>{it.sub}</span>
        </div>
      ))}
    </section>
  )
}

export function Sel({ children, className, style, ...props }) {
  return (
    <div style={{ position: 'relative', display: 'grid', ...style }} className={className}>
      <select style={{ width: '100%' }} {...props}>{children}</select>
      <ChevronDown
        size={13}
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: 'var(--faint)',
          flexShrink: 0,
        }}
      />
    </div>
  )
}
