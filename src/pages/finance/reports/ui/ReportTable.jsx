import { useId, useState } from 'react'
import { ChevronDown, Download, FilterX, SlidersHorizontal } from 'lucide-react'
import access from '@/entities/access/ui/access.module.css'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import { Sel } from '@/shared/ui/primitives/ui.jsx'
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
          <div className={`${access.segFilter} ${s.tableFilterButtons}`} role="group" aria-labelledby={id}>
            <button type="button" className={!value ? access.segFilterOn : undefined} aria-pressed={!value} onClick={() => onChange('')}>{allLabel}</button>
            {options.map(option => (
              <button key={option.value} type="button" data-tone={option.tone} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
                {option.label}
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

export function ReportTable({ title, columns, rows, searches, filters, emptyText, onExport, minColumnWidth = 136, ...tableProps }) {
  const id = useId()
  const [expanded, setExpanded] = useState(true)
  const [searchTerms, setSearchTerms] = useState({})
  const [selected, setSelected] = useState({})
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const activeFilters = filters.filter(({ key, options }) => options.some(option => option.value === selected[key]))
  if (activeFilters.length !== Object.keys(selected).length) {
    setSelected(Object.fromEntries(activeFilters.map(({ key }) => [key, selected[key]])))
  }
  const activeSearches = searches.map(({ key }) => ({ key, term: normalizarBusca(searchTerms[key]) })).filter(({ term }) => term)
  const visibleRows = rows.filter(row =>
    activeSearches.every(({ key, term }) => normalizarBusca(row[key]).includes(term))
    && activeFilters.every(({ key, matches }) => matches ? matches(row, selected[key]) : row[key] === selected[key]),
  )
  const hasFilter = Object.values(searchTerms).some(Boolean) || activeFilters.length > 0
  const minTableWidth = columns.reduce((total, column) => total + (column.width ?? minColumnWidth), 0)

  function clearFilters() {
    setSearchTerms({})
    setSelected({})
  }

  return (
    <section className={s.details} aria-label={title} style={{ '--report-table-min-width': `${minTableWidth}px` }}>
      <div className={s.tableFilters}>
        <FilterHeader>
          <button type="button" className={s.tableFilterToggle} aria-expanded={expanded} aria-controls={id}
            onClick={() => setExpanded(current => !current)}>
            <SlidersHorizontal size={17} aria-hidden="true" />Filtros da tabela
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          <div className={s.tableFilterActions}>
            <button type="button" disabled={!hasFilter} onClick={clearFilters}>
              <FilterX size={17} aria-hidden="true" />Limpar filtros
            </button>
            {onExport && <button type="button" onClick={onExport}><Download size={15} aria-hidden="true" />Exportar</button>}
          </div>
        </FilterHeader>
        <div id={id} className={s.tableFilterFields} data-field-count={searches.length + filters.length + 1} hidden={!expanded}>
          {searches.map(({ key, label, placeholder }) => (
            <label key={key} className={s.tableFilterField}>
              {label}
              <input type="search" placeholder={placeholder} value={searchTerms[key] ?? ''}
                onChange={event => setSearchTerms(current => ({ ...current, [key]: event.target.value }))} />
            </label>
          ))}
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
      <DataTable {...tableProps} columns={columns} rows={visibleRows} pageSize={pageSize}
        emptyText={rows.length ? 'Nenhum resultado para os filtros aplicados.' : emptyText} />
    </section>
  )
}
