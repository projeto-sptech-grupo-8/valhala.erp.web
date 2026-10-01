import { useEffect, useRef, useState } from 'react'
import { LogOut, PanelLeftClose, PanelLeftOpen, X, ChevronRight, ChevronDown } from 'lucide-react'
import Brand from '../../../components/Brand.jsx'
import { pages, visibleDomains, accountDomain } from '../pages.js'
import { ThemeSwitch } from './ThemeSwitch.jsx'
import s from '../dash.module.css'

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

const itemsOf = (d) => d.groups.flatMap(g => g.items)

/* ─── Caixa de subopções (abre à direita do menu, por clique) ─── */
function Flyout({ domain, anchor, current, onPick, onClose, footer }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    ;(el?.querySelector('[aria-current="page"]') || el?.querySelector('a'))?.focus()

    const onDown = (e) => {
      if (!el?.contains(e.target) && !anchor.btn.contains(e.target)) onClose(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(true); return }
      // setas navegam entre opções (exceto no seletor de tema, que usa as setas nativas do radio)
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target.type !== 'radio') {
        e.preventDefault()
        const links = [...el.querySelectorAll('a')]
        const i = links.indexOf(document.activeElement)
        links[e.key === 'ArrowDown' ? (i + 1) % links.length : (i - 1 + links.length) % links.length]?.focus()
      }
    }
    const onResize = () => onClose(false)
    document.addEventListener('mousedown', onDown)
    el?.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      el?.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // na metade de baixo da tela, a caixa cresce para cima (nunca sai da viewport)
  const pos = anchor.top > window.innerHeight / 2
    ? { left: anchor.left, bottom: Math.max(8, window.innerHeight - anchor.bottom) }
    : { left: anchor.left, top: Math.max(8, anchor.top) }

  return (
    <div
      ref={ref}
      id={`flyout-${domain.id}`}
      role="region"
      aria-label={`Opções de ${domain.label}`}
      className={s.flyout}
      style={pos}
      tabIndex={-1}
      onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget) && e.relatedTarget !== anchor.btn) onClose(false) }}
    >
      <header>{domain.label}</header>
      {domain.groups.map((g, gi) => (
        <section key={g.label || gi}>
          {g.label && <p>{g.label}</p>}
          <ul>
            {g.items.map(id => {
              const m = pages[id]
              const Icon = m.icon
              return (
                <li key={id}>
                  <a href={`#/${id}`} className={s.flyItem} aria-current={current === id ? 'page' : undefined}
                    onClick={e => { e.preventDefault(); onPick(id) }}>
                    <Icon size={16} aria-hidden="true" />
                    <span><b>{m.title}</b><small>{m.desc}</small></span>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {footer && <div className={s.flyFooter}>{footer}</div>}
    </div>
  )
}

/*
 * Menu lateral por domínio de negócio, sem hover:
 * - desktop: domínio com várias subopções abre a caixa à direita (clique); com uma só, navega direto
 * - recolhido (faixa de ícones): todo domínio abre a caixa — é ela que mostra os nomes
 * - mobile (gaveta): domínios viram acordeão
 * - conta e sistema (fora das regras de negócio) abre pelo rodapé
 */
export function Sidebar({ page, navigate, exit, user, role, can, collapsed, onToggle, mobile, open, onClose }) {
  const current = pages[page]?.parent || page
  const mainDomains = visibleDomains(role, can)
  const account = visibleDomains(role, can, [accountDomain])[0]
  // no mobile a conta vira o último item do acordeão; no desktop abre pelo rodapé
  const domains = mobile && account ? [...mainDomains, account] : mainDomains
  const allDomains = account ? [...mainDomains, account] : mainDomains
  const activeDomain = allDomains.find(d => itemsOf(d).includes(current))?.id
  const rail = collapsed && !mobile

  const [flyout, setFlyout] = useState(null) // { id, anchor }
  // acordeão: só guarda o que o usuário alternou; o domínio atual abre por padrão
  const [toggled, setToggled] = useState({})
  const isExpanded = (id) => (id in toggled ? toggled[id] : id === activeDomain)
  const asideRef = useRef(null)

  // gaveta mobile: foco no item atual ao abrir, Esc fecha, fundo não rola
  useEffect(() => {
    if (!mobile || !open) return
    const el = asideRef.current
    ;(el?.querySelector('[aria-current="page"]') || el?.querySelector('nav a, nav button'))?.focus()
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [mobile, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (id) => { setFlyout(null); navigate(id) }

  function closeFlyout(returnFocus) {
    const btn = flyout?.anchor.btn
    setFlyout(null)
    if (returnFocus) btn?.focus()
  }

  function openFlyout(d, btn) {
    if (flyout?.id === d.id) { setFlyout(null); return }
    const r = btn.getBoundingClientRect()
    const asideRight = asideRef.current.getBoundingClientRect().right
    // a caixa pertence à página em que foi aberta: mudou de rota (voltar, link interno), ela some
    setFlyout({ id: d.id, page, anchor: { btn, top: r.top - 6, bottom: r.bottom + 6, left: asideRight + 8 } })
  }

  function toggleSection(id) {
    setToggled(prev => ({ ...prev, [id]: !isExpanded(id) }))
  }

  const openDomain = flyout && flyout.page === page && allDomains.find(d => d.id === flyout.id)

  return (
    <>
      <aside
        id="menu-lateral"
        ref={asideRef}
        aria-label="Menu lateral"
        inert={mobile && !open ? true : undefined}
        role={mobile && open ? 'dialog' : undefined}
        aria-modal={mobile && open ? true : undefined}
      >
        <div className={s.asideHead}>
          <Brand />
          {mobile ? (
            <button className={s.collapseBtn} onClick={onClose} aria-label="Fechar menu">
              <X size={18} aria-hidden="true" />
            </button>
          ) : (
            <button
              className={s.collapseBtn}
              onClick={() => { setFlyout(null); onToggle() }}
              aria-expanded={!collapsed}
              aria-controls="menu-lateral"
              aria-label={collapsed ? 'Expandir menu (Ctrl+B)' : 'Recolher menu (Ctrl+B)'}
            >
              {collapsed ? <PanelLeftOpen size={17} aria-hidden="true" /> : <PanelLeftClose size={17} aria-hidden="true" />}
            </button>
          )}
        </div>

        <nav aria-label="Menu principal" onScroll={() => setFlyout(null)}>
          <ul className={s.domainList}>
            {domains.map(d => {
              const Icon = d.icon
              const items = itemsOf(d)
              const single = items.length === 1
              const isActive = activeDomain === d.id
              const cls = [s.domainBtn, isActive && s.domainOn, flyout?.id === d.id && s.domainOpen].filter(Boolean).join(' ')

              // link direto: domínio de uma subopção (exceto na faixa recolhida, onde a caixa mostra o nome)
              if (single && !rail) {
                return (
                  <li key={d.id}>
                    <a href={`#/${items[0]}`} className={cls} aria-current={current === items[0] ? 'page' : undefined}
                      onClick={e => { e.preventDefault(); go(items[0]) }}>
                      <Icon size={17} aria-hidden="true" />
                      <span className={s.navLabel}>{d.label}</span>
                    </a>
                  </li>
                )
              }

              // mobile: acordeão
              if (mobile) {
                const isOpen = isExpanded(d.id)
                return (
                  <li key={d.id}>
                    <button type="button" className={cls} aria-expanded={isOpen} aria-controls={`sub-${d.id}`} onClick={() => toggleSection(d.id)}>
                      <Icon size={17} aria-hidden="true" />
                      <span className={s.navLabel}>{d.label}</span>
                      <ChevronDown size={15} className={`${s.domainChevron} ${isOpen ? s.chevronOpen : ''}`} aria-hidden="true" />
                    </button>
                    {isOpen && (
                      <div id={`sub-${d.id}`} className={s.subList}>
                        {d.groups.map((g, gi) => (
                          <div key={g.label || gi}>
                            {g.label && <p className={s.subGroupLabel}>{g.label}</p>}
                            {g.items.map(id => (
                              <a key={id} href={`#/${id}`} aria-current={current === id ? 'page' : undefined}
                                onClick={e => { e.preventDefault(); go(id) }}>
                                {pages[id].title}
                              </a>
                            ))}
                          </div>
                        ))}
                        {d.id === 'conta' && (
                          <div className={s.subTheme}>
                            <p className={s.subGroupLabel}>Aparência</p>
                            <ThemeSwitch compact label="Aparência" />
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                )
              }

              // desktop: abre a caixa à direita
              return (
                <li key={d.id}>
                  <button type="button" className={cls} aria-expanded={flyout?.id === d.id} aria-controls={`flyout-${d.id}`}
                    aria-label={rail ? d.label : undefined}
                    onClick={e => openFlyout(d, e.currentTarget)}>
                    <Icon size={17} aria-hidden="true" />
                    <span className={s.navLabel}>{d.label}</span>
                    <ChevronRight size={15} className={s.domainChevron} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <footer>
          {account && !mobile ? (
            <button
              type="button"
              className={[s.accountBtn, activeDomain === account.id && s.domainOn, flyout?.id === account.id && s.domainOpen].filter(Boolean).join(' ')}
              aria-expanded={flyout?.id === account.id}
              aria-controls={`flyout-${account.id}`}
              aria-label={`${user?.name || 'Usuário'} — conta e sistema`}
              onClick={e => openFlyout(account, e.currentTarget)}
            >
              <i aria-hidden="true">{initials(user?.name)}</i>
              <span className={s.navLabel}><b>{user?.name || 'Usuário'}</b><small>{role}</small></span>
            </button>
          ) : (
            <>
              <i aria-hidden="true">{initials(user?.name)}</i>
              <span className={s.navLabel}><b>{user?.name || 'Usuário'}</b><small>{role}</small></span>
            </>
          )}
          <button onClick={exit} aria-label="Sair" className={s.logoutBtn}>
            <LogOut size={14} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </footer>
      </aside>

      {openDomain && !mobile && (
        <Flyout
          key={openDomain.id} domain={openDomain} anchor={flyout.anchor} current={current} onPick={go} onClose={closeFlyout}
          footer={openDomain.id === 'conta' && (<><span>Aparência</span><ThemeSwitch compact label="Aparência" /></>)}
        />
      )}
    </>
  )
}
