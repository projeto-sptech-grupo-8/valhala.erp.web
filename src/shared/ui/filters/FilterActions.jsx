import { FilterX, RefreshCw } from 'lucide-react'
import s from './FilterActions.module.css'

export function FilterHeader({ children, className = '' }) {
  return <div className={`${className} ${s.header}`} data-filter-header>{children}</div>
}

export function FilterActions({ onClear, onRefresh, refreshing = false, compact = false, clearLabel = 'Limpar filtros', refreshLabel = 'Atualizar', children }) {
  return <div className={s.actions} data-filter-actions>
    <button type="button" className={[s.utility, compact && s.icon].filter(Boolean).join(' ')} onClick={onClear} aria-label={clearLabel} title={clearLabel}><FilterX size={17} aria-hidden="true" />{!compact && clearLabel}</button>
    <button type="button" className={[s.utility, compact && s.icon].filter(Boolean).join(' ')} onClick={onRefresh} disabled={refreshing} aria-label={refreshLabel} title={refreshLabel}><RefreshCw size={17} aria-hidden="true" />{!compact && refreshLabel}</button>
    {children}
  </div>
}
