import { Wine, ArrowDownToLine, Pencil } from 'lucide-react'
import { fmtBRL, fmtNum, fmtDateTime } from '../../../lib/format.js'
import { useStore } from '../useStore.js'
import { canEdit } from '../pages.js'
import { getStatus, getEstoqueML, movDelta, fmtMovQty, rendColor } from '../estoque.js'
import { Drawer } from './Drawer.jsx'
import { ToneBadge } from '../../../components/ui.jsx'
import { fefoOrder, lotStatus } from '../lotes.js'
import { StatusChip } from './StatusChip.jsx'
import s from '../dash.module.css'

/* ─── Drawer de insumo (produto padrão) ─── */
export function InsumoDrawer({ product: p, onClose, navigate }) {
  const { products, drinks, movements, role } = useStore()
  const st = getStatus(p)
  const margin = p.cost > 0 ? Math.round((p.price - p.cost) / p.price * 100) : null
  const pct = Math.min(100, Math.round((p.qty / (p.min * 2)) * 100))
  const mlDisp = getEstoqueML(p)

  const recentMovs = movements.filter(m => m.produtoId === p.id).slice(0, 3)
  const usadoEm = drinks.filter(d => d.receita.some(r => r.produtoId === p.id && !r.livre))

  return (
    <Drawer onClose={onClose} title={`Detalhes de ${p.name}`}>
      <div>
        <span className={s.stockCode}>{p.id}</span>
        <h2 className={s.drawerTitle}>{p.name}</h2>
        <div className={s.drawerTags}>
          <StatusChip status={st} />
          <span className={s.muted}>{p.cat}</span>
        </div>
      </div>

      <div className={s.drawerStats}>
        <div><b>{fmtNum(p.qty)}</b><small>{p.unit} em estoque</small></div>
        <div><b>{p.min}</b><small>mínimo</small></div>
        <div><b style={{ color: 'var(--gold2)' }}>{fmtBRL(p.price)}</b><small>Venda</small></div>
        {margin !== null && (
          <div>
            <b style={{ color: margin >= 30 ? 'var(--green)' : 'var(--red)' }}>{margin}%</b>
            <small>Margem</small>
          </div>
        )}
      </div>

      <div>
        <p className={s.drawerLabel}>Nível de estoque</p>
        <div className={s.levelBar} style={{ margin: '6px 0 0' }} role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Nível de estoque">
          <div style={{ width: pct + '%' }} />
        </div>
        <p className={s.hint}>{pct}% do nível ideal{mlDisp ? ` · ${fmtNum(mlDisp)}ml disponíveis` : ''}</p>
      </div>

      {[
        ['Custo unitário', fmtBRL(p.cost)],
        ['Localização',    p.local],
        ['Unidade',        p.unit],
        ...(mlDisp ? [['Volume da embalagem', `${p.volumeEmbalagem}ml`]] : []),
      ].map(([label, val]) => (
        <div key={label}>
          <p className={s.drawerLabel}>{label}</p>
          <p className={s.drawerValue}>{val}</p>
        </div>
      ))}

      {p.lotes?.length > 0 && (
        <div>
          <p className={s.drawerLabel}>Lotes · ordem de saída (FEFO)</p>
          {fefoOrder(p.lotes).map(l => {
            const st = lotStatus(l)
            return (
              <div key={l.id} className={s.drawerLot}>
                <span><code>{l.lote}</code><small>{l.validade ? `val. ${l.validade.slice(8, 10)}/${l.validade.slice(5, 7)}/${l.validade.slice(0, 4)}` : 'sem validade'}</small></span>
                {st.key !== 'sem' && st.key !== 'ok' ? <ToneBadge tone={st.tone} label={st.key === 'vencido' ? 'Vencido' : `${st.dias}d`} /> : <span />}
                <b>{fmtNum(l.qty)}</b>
              </div>
            )
          })}
        </div>
      )}

      {recentMovs.length > 0 && (
        <div>
          <p className={s.drawerLabel}>Últimas movimentações</p>
          {recentMovs.map(m => {
            const delta = movDelta(m)
            return (
              <div key={m.id} className={s.drawerMov}>
                <span className={s.muted}>{fmtDateTime(m.em)}</span>
                <span>{m.tipo}</span>
                <span style={{ fontWeight: 600, color: delta >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {fmtMovQty(m, products, fmtNum)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {usadoEm.length > 0 && (
        <div>
          <p className={s.drawerLabel}>Usado em drinks</p>
          {usadoEm.map(drink => {
            const dose = drink.receita.find(r => r.produtoId === p.id)?.quantidade
            const rend = mlDisp && dose ? Math.floor(mlDisp / dose) : 0
            return (
              <div key={drink.id} className={s.drawerUsadoEmRow}>
                <span>
                  <b><Wine size={11} style={{ color: 'var(--gold)', marginRight: 5 }} aria-hidden="true" />{drink.name}</b>
                  <small>{dose}ml/{drink.unit}</small>
                </span>
                <em style={{ color: rendColor(rend), fontStyle: 'normal', fontSize: 12, fontWeight: 600 }}>
                  {rend} {drink.unit}s
                </em>
              </div>
            )
          })}
        </div>
      )}

      {canEdit(role) && (
        <div className={s.drawerActions}>
          <button onClick={() => { onClose(); navigate('movimentacoes', { produto: p.id, novo: 1 }) }}>
            Registrar entrada <ArrowDownToLine size={13} aria-hidden="true" />
          </button>
          <button className="gold" onClick={() => { onClose(); navigate('editar', { id: p.id }) }}>
            Editar produto <Pencil size={13} aria-hidden="true" />
          </button>
        </div>
      )}
    </Drawer>
  )
}
