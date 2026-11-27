import { useId } from 'react'
import { CircleCheck, CircleHelp, CircleMinus, CircleX } from 'lucide-react'
import s from './MetricCard.module.css'

const statusIcons = { ok: CircleCheck, warn: CircleMinus, bad: CircleX }

export function MetricGrid(props) {
  return <section {...props} className={s.grid} />
}

export function MetricCard({ label, value, reference, description, tone = 'neutral', Icon, help, statusLabel }) {
  const helpId = useId()
  const StatusIcon = statusIcons[tone] ?? CircleCheck

  return (
    <article className={s.metric} data-tone={tone}>
      <div className={s.metricTitleRow}>
        <h3>
          <span className={s.metricIcon}><Icon size={18} aria-hidden="true" /></span>
          {label}
          {help && <span className={s.help}>
            <button type="button" aria-label={`Sobre ${label}`} aria-describedby={helpId}>
              <CircleHelp size={15} aria-hidden="true" />
            </button>
            <span id={helpId} role="tooltip">{help}</span>
          </span>}
        </h3>
        {statusLabel && <span className={s.metricStatus}>
          <StatusIcon size={14} aria-hidden="true" />
          {statusLabel}
        </span>}
      </div>
      <div className={s.metricValue}>
        <strong>{value}</strong>
        {reference && <span className={s.reference}>{reference}</span>}
      </div>
      <p>{description}</p>
    </article>
  )
}
