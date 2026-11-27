import { useMemo, useState } from 'react'
import { ArrowUp, ArrowDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import s from '@/shared/ui/data-table/DataTable.module.css'

/*
 * Tabela padrão do ERP (padrão "List Report" do SAP Fiori):
 * <table> semântica, ordenação por coluna, cabeçalho fixo, paginação,
 * seleção de linhas com barra de ações em lote e estado vazio.
 *
 * columns: [{ key, header, render?(row), sort?(row) → valor | false, width?, align?, className? }]
 */
export function DataTable({
  columns,
  rows,
  rowKey = (r) => r.id,
  pageSize = 10,
  paginationControls,
  initialSort,
  selectable = false,
  bulkActions,
  emptyText = 'Nenhum registro encontrado.',
  caption,
  onRowClick,
  rowClassName,
  remote,
  compactColumns,
}) {
  const [localSort, setSort] = useState(initialSort || null) // { key, dir: 'asc' | 'desc' }
  const [rawPage, setPage] = useState(0)
  const [selected, setSelected] = useState(() => new Set())
  const [showAllColumns, setShowAllColumns] = useState(false)

  const sort = remote ? remote.sort : localSort
  const sorted = useMemo(() => {
    if (remote || !sort) return rows
    const col = columns.find(c => c.key === sort.key)
    if (!col) return rows
    const get = typeof col.sort === 'function' ? col.sort : (r) => r[col.key]
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = get(a), y = get(b)
      if (x == null) return 1
      if (y == null) return -1
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir
      return String(x).localeCompare(String(y), 'pt-BR', { numeric: true }) * dir
    })
  }, [rows, columns, sort, remote])

  const total = remote ? remote.total : sorted.length
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const page = remote ? remote.page : Math.min(rawPage, pages - 1) // filtro reduziu a lista → volta para a última página válida
  const visible = remote ? rows : sorted.slice(page * pageSize, page * pageSize + pageSize)

  // só conta como selecionado o que ainda está na lista filtrada
  const selectedRows = rows.filter(r => selected.has(rowKey(r)))

  function toggleSort(col) {
    if (col.sort === false) return
    if (remote) { remote.onSort({ key: col.key, dir: sort?.key === col.key && sort.dir === 'asc' ? 'desc' : 'asc' }); return }
    setSort(prev => prev?.key === col.key
      ? (prev.dir === 'asc' ? { key: col.key, dir: 'desc' } : null)
      : { key: col.key, dir: 'asc' })
  }

  function toggleRow(key) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const allVisibleSelected = visible.length > 0 && visible.every(r => selected.has(rowKey(r)))
  function toggleAllVisible() {
    setSelected(prev => {
      const next = new Set(prev)
      visible.forEach(r => allVisibleSelected ? next.delete(rowKey(r)) : next.add(rowKey(r)))
      return next
    })
  }

  const from = visible.length ? page * pageSize + 1 : 0
  const to = Math.min(total, page * pageSize + visible.length)

  return (
    <div className={s.wrap} data-compact-table={compactColumns ? true : undefined} data-all-columns={showAllColumns || undefined}>
      {selectable && selectedRows.length > 0 && (
        <div className={s.bulk} role="region" aria-label="Ações em lote">
          <span><b>{selectedRows.length}</b> selecionado{selectedRows.length > 1 ? 's' : ''}</span>
          <div className={s.bulkActions}>
            {bulkActions?.(selectedRows, () => setSelected(new Set()))}
            <button onClick={() => setSelected(new Set())}>Limpar seleção</button>
          </div>
        </div>
      )}

      {compactColumns && <button type="button" className={s.columnToggle} aria-expanded={showAllColumns} onClick={() => setShowAllColumns(value => !value)}>
        {showAllColumns ? 'Mostrar colunas principais' : 'Mostrar todas as colunas'}
      </button>}
      <div className={s.scroll}>
        <table className={s.table}>
          {caption && <caption className={s.caption}>{caption}</caption>}
          <thead>
            <tr>
              {selectable && (
                <th className={s.check} scope="col">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Selecionar todos desta página" />
                </th>
              )}
              {columns.map(col => {
                const active = sort?.key === col.key
                const sortable = col.sort !== false
                return (
                  <th
                    key={col.key}
                    scope="col"
                    data-secondary-column={compactColumns && !compactColumns.includes(col.key) || undefined}
                    style={{ width: col.width, textAlign: col.align }}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {sortable ? (
                      <button className={s.sortBtn} onClick={() => toggleSort(col)} style={{ justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                        {col.header}
                        {active
                          ? (sort.dir === 'asc' ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)
                          : <ChevronsUpDown size={12} className={s.sortIdle} aria-hidden="true" />}
                      </button>
                    ) : col.header}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map(row => {
              const key = rowKey(row)
              const isSel = selected.has(key)
              return (
                <tr key={key} className={`${isSel ? s.selected : ''} ${onRowClick ? s.clickable : ''} ${rowClassName?.(row) || ''}`} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                  {selectable && (
                    <td className={s.check} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleRow(key)} aria-label="Selecionar linha" />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className={col.className} style={{ textAlign: col.align }} data-secondary-column={compactColumns && !compactColumns.includes(col.key) || undefined}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className={s.empty}>{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(total > 0 || remote?.page > 0 || paginationControls) && (
        <div className={s.pager}>
          {(total > 0 || remote?.page > 0) && <span>{from}–{to} de {total}</span>}
          {(paginationControls || pages > 1 || page > 0) && (
            <div className={s.pageControls}>
              {paginationControls}
              {(pages > 1 || page > 0) && (
                <div className={s.pageNavigation}>
                  <button onClick={() => remote ? remote.onPage(page - 1) : setPage(page - 1)} disabled={page === 0 || remote?.loading} aria-label="Página anterior"><ChevronLeft size={14} /></button>
                  <span>Página {page + 1} de {pages}</span>
                  <button onClick={() => remote ? remote.onPage(page + 1) : setPage(page + 1)} disabled={page >= pages - 1 || remote?.loading} aria-label="Próxima página"><ChevronRight size={14} /></button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
