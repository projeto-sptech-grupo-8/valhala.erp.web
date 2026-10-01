import { fmtBRL } from '../../../lib/format.js'
import s from '../dash.module.css'

/* ─── Tooltip de gráficos ─── */
export const ChartTip = ({ active, payload, label, money }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={s.tip}>
      <span className={s.tipLabel}>{label}</span>
      {payload.map((p) => (
        <span key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {money ? fmtBRL(p.value) : `${p.value} un`}
        </span>
      ))}
    </div>
  )
}
