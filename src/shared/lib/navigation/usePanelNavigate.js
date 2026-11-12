import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/** Adapta los identificadores de pantalla del panel a las rutas del React Router. */
export function usePanelNavigate() {
  const routerNavigate = useNavigate()

  return useCallback((page, params = {}, { replace = false } = {}) => {
    const search = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value != null && value !== ''),
    ).toString()

    routerNavigate({ pathname: `/${page}`, search: search ? `?${search}` : '' }, { replace })
    if (!replace) window.scrollTo(0, 0)
  }, [routerNavigate])
}
