import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, KeyRound, AlertTriangle, RefreshCw, Users, ShieldOff, SearchX } from 'lucide-react'
import { Modal } from '../components/Modal.jsx'
import a from './acesso.module.css'

/* ─── Abas do módulo: Usuários | Perfis de acesso ─── */
export function AccessTabs({ active, navigate, can }) {
  const tabs = [
    ['usuarios', 'Usuários', Users, can('USUARIOS_VISUALIZAR')],
    ['perfis', 'Perfis de acesso', KeyRound, can('PERFIS_GERENCIAR')],
  ].filter(t => t[3])
  if (tabs.length < 2) return null
  return (
    <nav className={a.tabs} aria-label="Usuários e perfis">
      {tabs.map(([id, label, Icon]) => (
        <a key={id} href={`#/${id}`} aria-current={active === id ? 'page' : undefined} className={active === id ? a.tabOn : a.tab}
          onClick={e => { e.preventDefault(); navigate(id) }}>
          <Icon size={14} aria-hidden="true" /> {label}
        </a>
      ))}
    </nav>
  )
}

/* ─── Avatar com cor estável por nome ─── */
function hue(str = '') {
  let h = 0
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}
export function Avatar({ name = '', size = 34, inactive }) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const ini = ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
  const h = hue(name)
  return (
    <i className={`${a.avatar} ${inactive ? a.avatarOff : ''}`} aria-hidden="true" style={{
      width: size, height: size, fontSize: size * 0.38, '--h': h,
    }}>{ini}</i>
  )
}

export function UserStatus({ active }) {
  return <em className={`${a.status} ${active ? a.statusOn : a.statusOff}`}>{active ? 'Ativo' : 'Inativo'}</em>
}

export function ProfileChip({ nome, onClick }) {
  if (!nome) return <span className={a.muted}>Sem perfil</span>
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag type={onClick ? 'button' : undefined} className={a.profileChip} onClick={onClick ? (e) => { e.stopPropagation(); onClick() } : undefined}
      title={onClick ? 'Ver perfil' : undefined}>
      <KeyRound size={11} aria-hidden="true" /> {nome}
    </Tag>
  )
}

/* ─── Estados de carregamento / erro / vazio ─── */
export function LoadingBlock({ lines = 5, label = 'Carregando…' }) {
  return (
    <div className={a.skeleton} role="status" aria-live="polite" aria-label={label}>
      {Array.from({ length: lines }, (_, i) => <i key={i} style={{ width: `${92 - (i % 3) * 14}%` }} />)}
    </div>
  )
}

export function ErrorBlock({ error, onRetry, onBack, backLabel = 'Voltar' }) {
  const forbidden = error?.status === 403
  const notFound = error?.status === 404
  const Icon = forbidden ? ShieldOff : notFound ? SearchX : AlertTriangle
  return (
    <article className={`card ${a.stateCard}`} role="alert">
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

/* ─── Menu de ações (⋯) — teclado: ↑ ↓ Enter Esc ─── */
export function ActionMenu({ label = 'Mais ações', items, trigger }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const list = items.filter(Boolean).filter((it, i, arr) =>
    !it.divider || (i > 0 && i < arr.length - 1 && !arr[i - 1].divider))

  // posição fixa: não é cortado por containers com overflow (tabelas)
  function toggle() {
    if (open) { setOpen(false); return }
    const r = btnRef.current.getBoundingClientRect()
    const h = list.length * 40 + 12
    const up = r.bottom + h > window.innerHeight - 8
    setPos({ top: up ? r.top - h - 4 : r.bottom + 4, left: Math.max(8, r.right - 240) })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onDown = (e) => { if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) close() }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); btnRef.current?.focus() }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const els = [...(menuRef.current?.querySelectorAll('[role=menuitem]:not([disabled])') || [])]
        const i = els.indexOf(document.activeElement)
        els[e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length]?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  useEffect(() => {
    if (open && pos) menuRef.current?.querySelector('[role=menuitem]:not([disabled])')?.focus()
  }, [open, pos])

  return (
    <span className={a.menuWrap} onClick={e => e.stopPropagation()}>
      <button ref={btnRef} type="button" className={trigger ? undefined : a.menuBtn} aria-haspopup="menu" aria-expanded={open} aria-label={trigger ? undefined : label} title={trigger ? undefined : label} onClick={toggle}>
        {trigger || <MoreHorizontal size={16} aria-hidden="true" />}
      </button>
      {open && pos && (
        <div ref={menuRef} role="menu" aria-label={label} className={a.menu} style={{ top: pos.top, left: pos.left }}>
          {list.map((it, i) => it.divider
            ? <hr key={`d${i}`} />
            : (
              <button key={it.label} type="button" role="menuitem" disabled={it.disabled} className={it.danger ? a.menuDanger : undefined}
                onClick={() => { setOpen(false); it.onClick() }}>
                {it.icon && <it.icon size={14} aria-hidden="true" />}
                <span>{it.label}{it.disabled && it.hint && <small>{it.hint}</small>}</span>
              </button>
            ))}
        </div>
      )}
    </span>
  )
}

/* ─── Confirmação (com digitação obrigatória para ações destrutivas) ─── */
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
        <button type="button" className={danger ? a.dangerSolid : 'gold'} disabled={!ok || busy || disabled} onClick={onConfirm} aria-busy={busy || undefined}>
          {busy ? 'Processando…' : confirmLabel}
        </button>
      </>}
    >
      {children}
      {requireText && (
        <label>
          <span>Para confirmar, digite <b className={a.mono}>{requireText}</b></span>
          <input value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" spellCheck={false} data-autofocus
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (ok && !busy) onConfirm() } }} />
        </label>
      )}
    </Modal>
  )
}

/* ─── Bloco de seção (object page) ─── */
export function Section({ id, title, desc, actions, children }) {
  return (
    <section id={id} className={`card ${a.section}`} aria-labelledby={id ? `${id}-t` : undefined}>
      <header className={a.sectionHead}>
        <div>
          <h3 id={id ? `${id}-t` : undefined}>{title}</h3>
          {desc && <p>{desc}</p>}
        </div>
        {actions && <div className={a.sectionActions}>{actions}</div>}
      </header>
      {children}
    </section>
  )
}
