import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

// Bounded state: only the current response; abort requests and reject stale responses.
export function useQueryResource(loader, deps) {
  const [revision, setRevision] = useState(0)
  const key = JSON.stringify(deps) + ':' + revision
  const load = useRef(loader)
  useEffect(() => { load.current = loader })
  const [state, setState] = useState({ key: null, data: null, error: null })
  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => load.current(controller.signal)).then(
      data => { if (!controller.signal.aborted) setState({ key, data, error: null }) },
      error => { if (!controller.signal.aborted) setState(s => ({ ...s, key, error })) },
    )
    return () => controller.abort()
  }, [key])
  return { data: state.data, error: state.key === key ? state.error : null,
    loading: state.key !== key, reload: () => setRevision(v => v + 1) }
}

export function useListParams(defaultSort = 'nome', defaultDirection = 'ASC') {
  const [search, setSearch] = useSearchParams()
  const values = Object.fromEntries(search)
  const pagina = Math.max(0, Number.parseInt(values.pagina, 10) || 0)
  const tamanho = [10, 20, 50].includes(Number(values.tamanho)) ? Number(values.tamanho) : 20
  const params = { ...values, pagina, tamanho, ordenarPor: values.ordenarPor || defaultSort,
    direcao: values.direcao === 'ASC' || values.direcao === 'DESC' ? values.direcao : defaultDirection }
  function update(patch, reset = true) {
    setSearch(previous => {
      const next = new URLSearchParams(previous)
      if (reset) next.set('pagina', '0')
      Object.entries(patch).forEach(([key, value]) => value === '' || value == null ? next.delete(key) : next.set(key, String(value)))
      return next
    }, { replace: true })
  }
  return { params, update, clear: () => setSearch({}, { replace: true }) }
}
