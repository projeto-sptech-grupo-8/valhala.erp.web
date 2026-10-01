import { useCallback, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { ToastCtx } from './useToast.js'
import s from './toast.module.css'

const icons = { success: CheckCircle2, warning: AlertTriangle, error: AlertTriangle, info: Info }

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const seq = useRef(0)

  const dismiss = useCallback((id) => setItems((xs) => xs.filter((t) => t.id !== id)), [])

  const toast = useCallback((message, { type = 'success', title, duration = 4000 } = {}) => {
    const id = ++seq.current
    setItems((xs) => [...xs.slice(-3), { id, message, type, title }])
    if (duration) setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className={s.region} role="status" aria-live="polite">
        {items.map((t) => {
          const Icon = icons[t.type] || Info
          return (
            <div key={t.id} className={`${s.toast} ${s[t.type]}`}>
              <Icon size={16} aria-hidden="true" />
              <span>
                {t.title && <b>{t.title}</b>}
                {t.message}
              </span>
              <button onClick={() => dismiss(t.id)} aria-label="Fechar aviso"><X size={13} /></button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
