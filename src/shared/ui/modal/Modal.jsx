import { useId } from 'react'
import { X } from 'lucide-react'
import { useDialog } from '@/shared/lib/hooks/useDialog.js'
import s from '@/shared/ui/modal/Modal.module.css'

/* ─── Modal centralizado (pagamento, abertura/fechamento de caixa, confirmações) ─── */
export function Modal({ title, subtitle, onClose, children, footer, width = 480, className = '', busy = false }) {
  const ref = useDialog(onClose)
  const titleId = useId()
  return (
    <div className={s.wrap}>
      <div className={s.overlay} onClick={onClose} aria-hidden="true" />
      <div ref={ref} className={`${s.panel} ${className}`} style={{ width }} role="dialog" aria-modal="true" aria-busy={busy || undefined} aria-labelledby={titleId}>
        <header className={s.head}>
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className={s.close} disabled={busy} onClick={onClose} aria-label="Fechar" title="Fechar (Esc)"><X size={16} /></button>
        </header>
        <div className={s.body}>{children}</div>
        {footer && <footer className={s.foot}>{footer}</footer>}
      </div>
    </div>
  )
}
