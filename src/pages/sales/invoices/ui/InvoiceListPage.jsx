import { Plus, Download } from 'lucide-react'
import { useToast, PENDING_BACKEND } from '@/shared/ui/notifications/useToast.js'
import { downloadCSV, stamp } from '@/shared/lib/csv.js'
import { lists } from '@/shared/mocks/dashboardData.js'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { StatusChip } from '@/entities/inventory'
import s from '@/shared/styles/panel.module.css'

/* ─── Listing genérico (notas fiscais) ─── */
export function Listing({ page }) {
  const toast = useToast()
  const x = lists[page]
  const statusIdx = x.heads.indexOf('Status')
  const rows = x.rows.map((r, i) => ({ id: `${page}-${i}`, cells: r }))

  const columns = x.heads.map((h, i) => ({
    key: String(i),
    header: h,
    sort: r => r.cells[i],
    render: r => i === statusIdx ? <StatusChip status={r.cells[i]} /> : i === 0 ? <b className={s.cellStrong}>{r.cells[i]}</b> : r.cells[i],
  }))

  return (
    <div className={s.listingWrap}>
      <div className={s.listingBar}>
        <button onClick={() => { downloadCSV(`${page}-${stamp()}`, x.heads, x.rows); toast('Arquivo CSV gerado.', { title: 'Exportação concluída' }) }}>
          Exportar <Download size={13} aria-hidden="true" />
        </button>
        <button className="gold" onClick={() => toast(PENDING_BACKEND, { type: 'info', title: 'Emitir NF-e' })}>
          Novo <Plus size={13} aria-hidden="true" />
        </button>
      </div>
      <DataTable columns={columns} rows={rows} />
    </div>
  )
}
