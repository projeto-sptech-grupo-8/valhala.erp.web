import { useId } from 'react'
import { X } from 'lucide-react'
import { useDialog } from './useDialog.js'
import s from './Modal.module.css'

/* ─── Modal centralizado (pagamento, abertura/fechamento de caixa, confirmações) ─── */
export function Modal({ title, subtitle, onClose, children, footer, width = 480 }) {
  const ref = useDialog(onClose)
  const titleId = useId()
  return (
    <div className={s.wrap}>
      <div className={s.overlay} onClick={onClose} aria-hidden="true" />
      <div ref={ref} className={s.panel} style={{ width }} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={s.head}>
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className={s.close} onClick={onClose} aria-label="Fechar" title="Fechar (Esc)"><X size={16} /></button>
        </header>
        <div className={s.body}>{children}</div>
        {footer && <footer className={s.foot}>{footer}</footer>}
      </div>
    </div>
  )
}
