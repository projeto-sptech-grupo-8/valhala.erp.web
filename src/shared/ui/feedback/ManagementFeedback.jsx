import { useRef, useEffect, useState } from 'react'
import { AlertTriangle, Info, LoaderCircle, RefreshCw, ShieldOff, SearchX, Trash2, CheckCircle2 } from 'lucide-react'
import { Modal as BaseModal } from '@/shared/ui/modal/Modal.jsx'
import s from './managementFeedback.module.css'

// Opt-in feedback for catalogue, inventory and access management.
export function Notice({ children, title, tone = 'error', onRetry, focus = false }) {
  const ref = useRef(null)
  useEffect(() => { if (focus) ref.current?.focus() }, [focus, children])
  const Icon = tone === 'loading' ? LoaderCircle : tone === 'info' ? Info : AlertTriangle
  return <div ref={ref} className={s.notice} data-tone={tone} role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'} tabIndex={-1}>
    <Icon size={20} aria-hidden="true" className={tone === 'loading' ? s.spin : undefined} />
    <div>{title && <strong>{title}</strong>}<div className={s.message}>{children}</div>{onRetry && <button type="button" onClick={onRetry}><RefreshCw size={14} aria-hidden="true" />Tentar novamente</button>}</div>
  </div>
}
export function LoadingBlock({ lines = 4, label = 'Carregando dados…' }) {
  return <div className={s.loading} role="status" aria-live="polite" aria-busy="true"><div><LoaderCircle size={19} className={s.spin} aria-hidden="true" /><span>{label}</span></div><div className={s.skeleton} aria-hidden="true">{Array.from({ length: lines }, (_, i) => <i key={i} style={{ width: (92 - i % 3 * 14) + '%' }} />)}</div></div>
}
export function ErrorBlock({ error, onRetry, onBack, backLabel = 'Voltar' }) {
  const status = error?.status
  const title = status === 401 ? 'Sua sessão expirou' : status === 403 ? 'Acesso não permitido' : status === 404 ? 'Registro não encontrado' : status === 0 ? 'Não foi possível conectar' : 'Não foi possível carregar os dados'
  const Icon = status === 403 ? ShieldOff : status === 404 ? SearchX : AlertTriangle
  return <section className={s.error} role="alert"><Icon size={25} aria-hidden="true" /><h3>{title}</h3><p>{error?.message || 'O servidor não respondeu como esperado.'}</p><p className={s.hint}>{status === 401 ? 'Entre novamente para continuar.' : status === 403 ? 'Solicite ao responsável a permissão necessária.' : status === 404 ? 'O registro pode ter sido removido. Volte à lista e atualize a consulta.' : 'Confira sua conexão e tente carregar novamente. Nenhum formulário será enviado por esta ação.'}</p><div className={s.actions}>{onBack && <button type="button" onClick={onBack}>{backLabel}</button>}{status === 401 ? <a href="#/login">Entrar novamente</a> : onRetry && status !== 403 && status !== 404 && <button type="button" onClick={onRetry}><RefreshCw size={15} aria-hidden="true" />Tentar novamente</button>}</div></section>
}
export function Modal({ busy = false, onClose, ...props }) {
  return <BaseModal {...props} busy={busy} onClose={busy ? () => {} : onClose} />
}
export function ConfirmModal({ title, subtitle, children, confirmLabel, danger, busy, disabled, requireText, onConfirm, onClose, extraActions, error, width = 480 }) {
  const [typed, setTyped] = useState('')
  const ok = !requireText || typed.trim().toLowerCase() === requireText.trim().toLowerCase()
  const Icon = danger ? Trash2 : CheckCircle2
  const sending = useRef(false)
  async function confirm() {
    if (sending.current || busy || disabled || !ok) return
    sending.current = true
    try { await onConfirm() } finally { sending.current = false }
  }
  return <Modal title={<span className={s.title}><Icon size={20} aria-hidden="true" />{title}</span>} subtitle={subtitle} busy={busy} onClose={onClose} width={width} footer={<>{extraActions}<button type="button" disabled={busy} onClick={onClose} data-autofocus={!requireText || undefined}>Cancelar</button><button type="button" className={danger ? s.danger : 'gold'} disabled={!ok || busy || disabled} aria-busy={busy || undefined} onClick={confirm}>{busy ? <><LoaderCircle size={15} className={s.spin} aria-hidden="true" />Processando…</> : <><Icon size={15} aria-hidden="true" />{confirmLabel}</>}</button></>}>
    {error && <Notice title="Não foi possível concluir" focus>{error}</Notice>}
    {children}
    {requireText && <label><span>Para confirmar, digite <b>{requireText}</b></span><input disabled={busy} value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" spellCheck={false} data-autofocus onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirm() } }} /></label>}
    {busy && <Notice tone="loading" title="Aguarde a confirmação do servidor">Mantenha esta janela aberta até a operação terminar.</Notice>}
  </Modal>
}
