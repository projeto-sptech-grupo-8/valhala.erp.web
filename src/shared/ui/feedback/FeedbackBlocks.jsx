import { useState } from 'react'
import { AlertTriangle, RefreshCw, SearchX, ShieldOff } from 'lucide-react'
import { Modal } from '@/shared/ui/modal/Modal.jsx'
import s from '@/shared/ui/feedback/feedback.module.css'

export function LoadingBlock({ lines = 5, label = 'Carregando…' }) {
  return (
    <div className={s.skeleton} role="status" aria-live="polite" aria-label={label}>
      {Array.from({ length: lines }, (_, i) => <i key={i} style={{ width: `${92 - (i % 3) * 14}%` }} />)}
    </div>
  )
}

export function ErrorBlock({ error, onRetry, onBack, backLabel = 'Voltar' }) {
  const forbidden = error?.status === 403
  const notFound = error?.status === 404
  const Icon = forbidden ? ShieldOff : notFound ? SearchX : AlertTriangle
  return (
    <article className={`card ${s.stateCard}`} role="alert">
      <Icon size={26} aria-hidden="true" />
      <h3>{forbidden ? 'Sem permissão' : notFound ? 'Registro não encontrado' : 'Não foi possível carregar'}</h3>
      <p>{error?.message || 'Erro inesperado.'}</p>
      <div>
        {onBack && <button onClick={onBack}>{backLabel}</button>}
        {onRetry && !forbidden && !notFound && <button className="gold" onClick={onRetry}><RefreshCw size={13} aria-hidden="true" /> Tentar novamente</button>}
      </div>
    </article>
  )
}

export function ConfirmModal({ title, subtitle, children, confirmLabel, danger, busy, disabled, requireText, onConfirm, onClose, extraActions, width = 480 }) {
  const [typed, setTyped] = useState('')
  const ok = !requireText || typed.trim().toLowerCase() === requireText.trim().toLowerCase()
  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={busy ? () => {} : onClose}
      width={width}
      footer={<>
        {extraActions}
        <button type="button" onClick={onClose} disabled={busy} data-autofocus={requireText ? undefined : true}>Cancelar</button>
        <button type="button" className={danger ? s.dangerSolid : 'gold'} disabled={!ok || busy || disabled} onClick={onConfirm} aria-busy={busy || undefined}>
          {busy ? 'Processando…' : confirmLabel}
        </button>
      </>}
    >
      {children}
      {requireText && (
        <label>
          <span>Para confirmar, digite <b className={s.mono}>{requireText}</b></span>
          <input value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" spellCheck={false} data-autofocus
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (ok && !busy) onConfirm() } }} />
        </label>
      )}
    </Modal>
  )
}
