import { useId, useState } from 'react'
import { ChevronDown, FilterX, SlidersHorizontal } from 'lucide-react'
import { fmtNum } from '@/shared/lib/format.js'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import { Sel, ToneBadge } from '@/shared/ui/primitives/ui.jsx'
import s from './ReportsPage.module.css'

const PAGE_SIZES = [10, 20, 50]

function normalizarBusca(texto) {
  return (texto ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').trim()
}

function ReportFilter({ id, filter, value, onChange }) {
  const { label, allLabel, options, segmented } = filter

  return (
    <div className={s.tableFilterField}>
      {segmented ? (
        <>
          <span id={id}>{label}</span>
          <div className={`${s.segment} ${s.tableFilterButtons}`} role="group" aria-labelledby={id}>
            <button type="button" aria-pressed={!value} onClick={() => onChange('')}>{allLabel}</button>
            {options.map(option => (
              <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
                <ToneBadge tone={option.tone} label={option.label} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <label htmlFor={id}>{label}</label>
          <Sel id={id} value={value} onChange={event => onChange(event.target.value)}>
            <option value="">{allLabel}</option>
            {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Sel>
        </>
      )}
    </div>
  )
}

export function ReportTable({ title, rows, search, filters, singular, plural, emptyText, ...tableProps }) {
  const id = useId()
  const [expanded, setExpanded] = useState(true)
  const [text, setText] = useState('')
  const [selected, setSelected] = useState({})
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const activeFilters = filters.filter(({ key, options }) => options.some(option => option.value === selected[key]))
  if (activeFilters.length !== Object.keys(selected).length) {
    setSelected(Object.fromEntries(activeFilters.map(({ key }) => [key, selected[key]])))
  }
  const term = normalizarBusca(text)
  const visibleRows = rows.filter(row =>
    (!term || normalizarBusca(row[search.key]).includes(term))
    && activeFilters.every(({ key, matches }) => matches ? matches(row, selected[key]) : row[key] === selected[key]),
  )
  const hasFilter = Boolean(text || activeFilters.length)

  function clearFilters() {
    setText('')
    setSelected({})
  }

  return (
    <section className={s.details} aria-label={title}>
      <h3>{title}</h3>
      <div className={s.tableFilters}>
        <FilterHeader>
          <div>
            <button type="button" className={s.tableFilterToggle} aria-expanded={expanded} aria-controls={id}
              onClick={() => setExpanded(current => !current)}>
              <SlidersHorizontal size={17} aria-hidden="true" />Filtros da tabela
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            <p role="status" className={s.tableFilterCount}>
              {fmtNum(visibleRows.length)} de {fmtNum(rows.length)} {rows.length === 1 ? singular : plural}
            </p>
          </div>
          <button type="button" className={s.tableClearFilters} disabled={!hasFilter} onClick={clearFilters}>
            <FilterX size={17} aria-hidden="true" />Limpar filtros
          </button>
        </FilterHeader>
        <div id={id} className={s.tableFilterFields} data-filter-count={filters.length} hidden={!expanded}>
          <label className={s.tableFilterField}>
            {search.label}
            <input type="search" placeholder={search.placeholder} value={text} onChange={event => setText(event.target.value)} />
          </label>
          {filters.map(filter => (
            <ReportFilter key={filter.key} id={id + '-' + filter.key} filter={filter} value={selected[filter.key] ?? ''}
              onChange={value => setSelected(current => ({ ...current, [filter.key]: value }))} />
          ))}
          <div className={s.tableFilterField}>
            <label htmlFor={id + '-tamanho'}>Itens por página</label>
            <Sel id={id + '-tamanho'} value={pageSize} onChange={event => setPageSize(Number(event.target.value))}>
              {PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
            </Sel>
          </div>
        </div>
      </div>
      <p className={s.tableHint}>Deslize a tabela para ver todas as colunas.</p>
      <DataTable {...tableProps} rows={visibleRows} pageSize={pageSize}
        emptyText={rows.length ? 'Nenhum resultado para os filtros aplicados.' : emptyText} />
    </section>
  )
}
