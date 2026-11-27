import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MoreHorizontal, KeyRound, Users } from 'lucide-react'
import a from '@/entities/access/ui/access.module.css'

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

/* ─── Menu de ações (⋯) — teclado: ↑ ↓ Enter Esc ─── */
export function ActionMenu({ label = 'Mais ações', items, trigger, focusTriggerOnSelect = false }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const list = items.filter(Boolean).filter((it, i, arr) =>
    !it.divider || (i > 0 && i < arr.length - 1 && !arr[i - 1].divider))

  useLayoutEffect(() => {
    if (!open) return
    const triggerBounds = btnRef.current.getBoundingClientRect()
    const menu = menuRef.current
    const { offsetWidth: width, offsetHeight: height } = menu
    const padding = 8
    const maxTop = window.innerHeight - height - padding
    const below = triggerBounds.bottom + 4
    const above = triggerBounds.top - height - 4
    const top = below <= maxTop ? below : above >= padding ? above : maxTop
    const left = Math.min(triggerBounds.right - width, window.innerWidth - width - padding)
    menu.style.top = `${Math.max(padding, top)}px`
    menu.style.left = `${Math.max(padding, left)}px`
    menu.querySelector('[role=menuitem]:not([disabled])')?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onScroll = event => { if (event.target !== menuRef.current) close() }
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
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <span className={a.menuWrap} onClick={e => e.stopPropagation()}>
      <button ref={btnRef} type="button" className={trigger ? undefined : a.menuBtn} aria-haspopup="menu" aria-expanded={open} aria-label={trigger ? undefined : label} title={trigger ? undefined : label} onClick={() => setOpen(value => !value)}>
        {trigger || <MoreHorizontal size={16} aria-hidden="true" />}
      </button>
      {open && (
        <div ref={menuRef} role="menu" aria-label={label} className={a.menu}>
          {list.map((it, i) => it.divider
            ? <hr key={`d${i}`} />
            : (
              <button key={it.label} type="button" role="menuitem" disabled={it.disabled} className={it.danger ? a.menuDanger : undefined}
                onClick={() => {
                  setOpen(false)
                  if (focusTriggerOnSelect) btnRef.current?.focus({ preventScroll: true })
                  it.onClick()
                }}>
                {it.icon && <it.icon size={14} aria-hidden="true" />}
                <span>{it.label}{it.disabled && it.hint && <small>{it.hint}</small>}</span>
              </button>
            ))}
        </div>
      )}
    </span>
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
