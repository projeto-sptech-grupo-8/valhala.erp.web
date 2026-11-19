import { useEffect, useState } from 'react'

/*
 * Carrega dados assíncronos com estados de carregamento/erro e recarga.
 * Mantém o dado anterior enquanto recarrega (sem "piscar" a tela).
 *
 *   const { data, loading, error, reload, setData } = useResource(() => api.x(id), [id])
 */
export function useResource(loader, deps = []) {
  const [tick, setTick] = useState(0)
  const key = JSON.stringify(deps) + '#' + tick
  const [state, setState] = useState({ key: null, data: undefined, error: null })

  useEffect(() => {
    let alive = true
    Promise.resolve()
      .then(loader)
      .then(
        data => { if (alive) setState({ key, data, error: null }) },
        error => { if (alive) setState(s => ({ key, data: s.data, error })) },
      )
    return () => { alive = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data: state.data,
    error: state.key === key ? state.error : null,
    loading: state.key !== key,
    reload: () => setTick(t => t + 1),
    setData: (fn) => setState(s => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })),
  }
}
