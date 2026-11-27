import { acrescentarDias } from '@/shared/lib/format.js'
import s from './SegmentedFilter.module.css'

const periods = [
  { id: 'todos', label: 'Todas as datas' },
  { id: 'hoje', label: 'Hoje', days: 1 },
  { id: '7dias', label: 'Últimos 7 dias', days: 7 },
  { id: '30dias', label: 'Últimos 30 dias', days: 30 },
]
const currentDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })

export function DateRangeFilter({ label, selected, onChange, className }) {
  function select({ id, days }) {
    if (id === selected) return
    const dataFim = days ? currentDate.format(new Date()) : ''
    const dataInicio = days ? acrescentarDias(dataFim, 1 - days) : ''
    onChange({ id, dataInicio, dataFim })
  }

  return (
    <div className={className}>
      <span>{label}</span>
      <div className={s.options} role="group" aria-label={label}>
        {periods.map(option => (
          <button key={option.id} type="button" aria-pressed={selected === option.id} onClick={() => select(option)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
