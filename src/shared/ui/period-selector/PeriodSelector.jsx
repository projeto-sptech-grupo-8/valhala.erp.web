import { useEffect, useId, useRef, useState } from 'react'
import { CalendarDays, Check } from 'lucide-react'
import s from './PeriodSelector.module.css'

export function PeriodSelector({ options, selected, onChange, describedBy, alignEnd = false }) {
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
    <div ref={container} className={s.period} data-align-end={alignEnd || undefined}
      onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={event => {
        if (open && event.key === 'Escape') {
          event.preventDefault()
          close()
        }
      }}>
      <button ref={trigger} className={s.trigger} type="button" aria-expanded={open} aria-controls={id}
        aria-label={`Período (${selected.label})`} aria-describedby={describedBy}
        title={selected.label} onClick={() => { trigger.current?.focus(); setOpen(current => !current) }}>
        <CalendarDays size={19} aria-hidden="true" />
        <span>{selected.label}</span>
      </button>
      <div id={id} className={s.options} role="group" aria-label="Opções de período" hidden={!open}>
        {options.map(option => (
          <button key={option.id} type="button" aria-pressed={option.id === selected.id}
            onClick={() => { onChange(option.id); close() }}>
            {option.label}
            {option.id === selected.id && <Check size={15} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  )
}
