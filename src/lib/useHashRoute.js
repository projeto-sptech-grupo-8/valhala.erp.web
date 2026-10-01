import { useEffect, useState } from 'react'

/*
 * Roteamento por hash — sem dependência externa.
 * Formato: #/<pagina>?chave=valor  (ex.: #/produtos?status=Crítico, #/editar?id=BEB-001)
 * Dá suporte a voltar/avançar do navegador, F5, favoritos e abrir em nova aba.
 */
export function parseHash(hash = window.location.hash) {
  const raw = hash.replace(/^#\/?/, '')
  const [path, query = ''] = raw.split('?')
  return { page: path || '', params: Object.fromEntries(new URLSearchParams(query)) }
}

export function buildHash(page, params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  const qs = new URLSearchParams(clean).toString()
  return `#/${page}${qs ? '?' + qs : ''}`
}

export function useHashRoute(defaultPage) {
  const [route, setRoute] = useState(() => parseHash())

  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  /* replace: atualiza a URL sem criar entrada no histórico (ex.: filtros de uma lista) */
  function navigate(page, params = {}, { replace = false } = {}) {
    const next = buildHash(page, params)
    if (next === window.location.hash) return
    if (replace) {
      window.history.replaceState(null, '', next)
      setRoute(parseHash(next))
      return
    }
    window.location.hash = next
    window.scrollTo(0, 0)
  }

  return { page: route.page || defaultPage, params: route.params, navigate }
}
