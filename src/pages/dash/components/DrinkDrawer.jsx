import { Wine, AlertTriangle, ArrowDownToLine, Pencil } from 'lucide-react'
import { fmtBRL, fmtNum } from '../../../lib/format.js'
import { useStore } from '../useStore.js'
import { canEdit } from '../pages.js'
import { getStatus, getRendimentoDrink, getGargalo, getStatusDrink, getCustoDrink, rendColor } from '../estoque.js'
import { Drawer } from './Drawer.jsx'
import { StatusChip } from './StatusChip.jsx'
import s from '../dash.module.css'

/* ─── Drawer de drink ─── */
export function DrinkDrawer({ drink: d, onClose, navigate }) {
  const { products, role } = useStore()
  const rendimento = getRendimentoDrink(d, products)
  const gargalo = getGargalo(d, products)
  const st = getStatusDrink(d, products)
  const custoPorCopo = getCustoDrink(d.receita, products)

  const margem = d.price > 0 && custoPorCopo > 0
    ? Math.round((d.price - custoPorCopo) / d.price * 100)
    : null

  return (
    <Drawer onClose={onClose} title={`Detalhes de ${d.name}`}>
      <div>
        <span className={s.stockCode}>{d.id}</span>
        <h2 className={s.drawerTitle}>{d.name}</h2>
        <div className={s.drawerTags}>
          <em className={`${s.chip} ${s.chipDrink}`}><Wine size={11} aria-hidden="true" /> Drink</em>
          <StatusChip status={st} />
        </div>
      </div>

      <div className={s.drawerStats}>
        <div>
          <b style={{ color: rendColor(rendimento) }}>{rendimento !== null ? `~${rendimento}` : '—'}</b>
          <small>{d.unit}s possíveis</small>
        </div>
        <div><b style={{ color: 'var(--gold2)' }}>{fmtBRL(d.price)}</b><small>Venda</small></div>
        <div>
          <b style={{ color: margem >= 50 ? 'var(--green)' : margem >= 30 ? 'var(--gold2)' : 'var(--red)' }}>
            {margem !== null ? margem + '%' : '—'}
          </b>
          <small>Margem</small>
        </div>
        <div><b>{custoPorCopo > 0 ? fmtBRL(custoPorCopo) : '—'}</b><small>Custo/{d.unit}</small></div>
      </div>

      <div>
        <p className={s.drawerLabel}>Receita · ingredientes</p>
        {d.receita.map((r, i) => {
          const ins = products.find(p => p.id === r.produtoId)
          const mlDisp = ins?.volumeEmbalagem ? Math.round(ins.qty * ins.volumeEmbalagem) : 0
          const rendIngr = ins?.volumeEmbalagem && r.quantidade > 0
            ? Math.floor(mlDisp / r.quantidade) : null
          const isGargalo = gargalo?.insumo?.id === r.produtoId

          return (
            <div key={i} className={`${s.drawerReceitaRow} ${isGargalo ? s.drawerReceitaGargalo : ''}`}>
              <div>
                <b>{r.livre ? <span style={{ color: 'var(--faint)' }}>{r.produtoId || 'Insumo livre'}</span> : (ins?.name || r.produtoId)}</b>
                {!r.livre && ins && (
                  <small>{r.quantidade}ml/{d.unit} · {fmtNum(mlDisp)}ml disponíveis</small>
                )}
                {r.livre && <small>não rastreado</small>}
              </div>
              {!r.livre && rendIngr !== null && (
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: rendColor(rendIngr) }}>
                    {rendIngr} {d.unit}s
                  </span>
                  <StatusChip status={ins ? getStatus(ins) : 'Estável'} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {gargalo && rendimento < 20 && (
        <div className={s.gargaloBox} role="note">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>
            <b>Gargalo: {gargalo.insumo.name}</b>
            <br />
            {gargalo.rendimento} {d.unit}s possíveis com {fmtNum(gargalo.insumo.qty * gargalo.insumo.volumeEmbalagem)}ml disponíveis ({gargalo.dose}ml/{d.unit})
          </span>
        </div>
      )}

      {canEdit(role) && (
        <div className={s.drawerActions}>
          <button onClick={() => { onClose(); navigate('movimentacoes', { produto: gargalo?.insumo?.id, novo: 1 }) }}>
            {gargalo ? `Repor ${gargalo.insumo.name.split(' ')[0]}` : 'Registrar entrada'}
            <ArrowDownToLine size={13} aria-hidden="true" />
          </button>
          <button className="gold" onClick={() => { onClose(); navigate('editar', { id: d.id }) }}>
            Editar receita <Pencil size={13} aria-hidden="true" />
          </button>
        </div>
      )}
    </Drawer>
  )
}
