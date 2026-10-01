import { Tag, Pencil, Eye, Plus } from 'lucide-react'
import { useToast, PENDING_BACKEND } from '../../components/useToast.js'
import { useStore } from './useStore.js'
import { canEdit } from './pages.js'
import { getStatus } from './estoque.js'
import { METAS, toneHigher } from '../../lib/kpi.js'
import { ToneBadge } from '../../components/ui.jsx'
import s from './dash.module.css'

/* ─── Categorias ─── */
export function Cards({ navigate }) {
  const { products, drinks, role } = useStore()
  const toast = useToast()
  const all = [...products, ...drinks]
  const catNames = [...new Set(all.map(p => p.cat))]

  const data = catNames.map(cat => {
    const items = products.filter(p => p.cat === cat)
    const total = all.filter(p => p.cat === cat).length
    const saudaveis = items.filter(p => getStatus(p) === 'Estável').length
    const pct = items.length ? Math.round((saudaveis / items.length) * 100) : 100
    return { cat, total, pct, tracked: items.length > 0 }
  })

  return (
    <div className={s.cards}>
      {data.map(c => (
        <article className="card" key={c.cat}>
          <div className={s.cardHead}>
            <Tag size={16} style={{ color: 'var(--gold)' }} aria-hidden="true" />
            <div className={s.cardBtns}>
              {canEdit(role) && (
                <button className={s.iconBtn} title="Editar categoria" aria-label={`Editar categoria ${c.cat}`} onClick={() => toast(PENDING_BACKEND, { type: 'info', title: 'Editar categoria' })}>
                  <Pencil size={13} />
                </button>
              )}
              <button className={s.iconBtn} title="Ver produtos" aria-label={`Ver produtos de ${c.cat}`} onClick={() => navigate('produtos', { cat: c.cat })}>
                <Eye size={13} />
              </button>
            </div>
          </div>
          <h3>{c.cat}</h3>
          <p>{c.total} {c.total === 1 ? 'produto' : 'produtos'}</p>
          {c.tracked && (
            <>
              <div className={s.barTrack} role="meter" aria-valuenow={c.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Itens com estoque saudável">
                <span style={{ width: c.pct + '%' }} />
              </div>
              <div className={s.cardFoot}><small className={s.hint}>{c.pct}% com estoque saudável</small><ToneBadge tone={toneHigher(c.pct, METAS.saudeEstoque)} /></div>
            </>
          )}
        </article>
      ))}
      {canEdit(role) && (
        <button className={s.cardNew} onClick={() => toast(PENDING_BACKEND, { type: 'info', title: 'Nova categoria' })}>
          <Plus size={22} style={{ color: 'var(--gold)' }} aria-hidden="true" />
          <span>Nova categoria</span>
        </button>
      )}
    </div>
  )
}
