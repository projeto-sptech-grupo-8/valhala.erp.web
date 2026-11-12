import { useId } from 'react'
import { X } from 'lucide-react'
import { useDialog } from '@/shared/lib/hooks/useDialog.js'
import s from '@/shared/styles/panel.module.css'

/* ─── Drawer genérico (painel lateral de detalhe) ─── */
export function Drawer({ onClose, title, children }) {
  const ref = useDialog(onClose)
  const titleId = useId()
  return (
    <div className={s.drawer}>
      <div className={s.drawerOverlay} onClick={onClose} aria-hidden="true" />
      <div ref={ref} className={s.drawerPanel} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className={s.drawerClose} onClick={onClose} title="Fechar (Esc)" aria-label="Fechar">
          <X size={16} />
        </button>
        <span id={titleId} className={s.srOnly}>{title}</span>
        {children}
      </div>
    </div>
  )
}
