import { ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useEffect, useState } from 'react'

export function SearchInput({ value = '', onChange, label = 'Buscar por nome ou código', ...props }) {
  const [text, setText] = useState(value)
  // Synchronize the draft when browser back/forward changes the URL.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setText(value), [value])
  useEffect(() => {
    if (text === value) return
    const timer = setTimeout(() => onChange(text), 300)
    return () => clearTimeout(timer)
  }, [text, value, onChange])
  return <input type="search" aria-label={label} placeholder={label} value={text} onChange={e => setText(e.target.value)} {...props} />
}

export function QueryFeedback({ query }) {
  if (query.loading) return <LoadingBlock lines={2} label="Atualizando dados…" />
  if (query.error) return <ErrorBlock error={query.error} onRetry={query.reload} />
  return null
}

export function PageSize({ value, onChange }) {
  return <label>Por página <select aria-label="Itens por página" value={value} onChange={e => onChange(Number(e.target.value))}>{[10, 20, 50].map(n => <option key={n}>{n}</option>)}</select></label>
}
