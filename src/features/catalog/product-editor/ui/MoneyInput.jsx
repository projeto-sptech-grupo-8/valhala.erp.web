import { useEffect, useRef, useState } from 'react'
import { formatMoneyInput, maskMoneyDraft } from '../model/moneyInput.js'

export function MoneyInput({ value, onValueChange, ...props }) {
  const [draft, setDraft] = useState(() => formatMoneyInput(value))
  const focused = useRef(false)
  const input = useRef(null)
  useEffect(() => { if (!focused.current) setDraft(formatMoneyInput(value)) }, [value])
  function change(event) {
    const raw = event.target.value
    const significant = raw.slice(0, event.target.selectionStart ?? raw.length).replace(/[^\d,]/g, '').length
    const next = maskMoneyDraft(raw)
    setDraft(next.display)
    onValueChange(next.value)
    requestAnimationFrame(() => {
      if (!input.current || !focused.current) return
      let seen = 0, position = 0
      while (position < next.display.length && seen < significant) { if (/[\d,]/.test(next.display[position])) seen++; position++ }
      input.current.setSelectionRange(position, position)
    })
  }
  return <input {...props} ref={input} type="text" inputMode="decimal" value={draft} onFocus={() => { focused.current = true }} onChange={change} onBlur={() => { focused.current = false; setDraft(formatMoneyInput(value)) }} />
}
