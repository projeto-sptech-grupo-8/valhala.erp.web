import { useEffect, useRef, useState } from 'react'
import { ShieldOff, Compass, Menu } from 'lucide-react'
import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { usePanelNavigate } from '@/shared/lib/navigation/usePanelNavigate.js'
import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery.js'
import Brand from '@/shared/ui/brand/Brand.jsx'
import { useStore } from '@/entities/store'
import { pages, canAccess, firstAllowed } from '@/entities/access'
import { Sidebar } from '@/widgets/sidebar/ui/Sidebar.jsx'
import { PageHeader } from '@/widgets/page-header/ui/PageHeader.jsx'
import { PrintHost } from '@/features/printing'
import s from '@/shared/styles/panel.module.css'

const MENU_KEY = 'valhalla:menu-recolhido'

function Blocked({ icon: Icon, title, text, action, onAction }) {
  return (
    <article className={'card ' + s.blocked}>
      <Icon size={30} aria-hidden="true" />
      <h1>{title}</h1>
      <p>{text}</p>
      <button className="gold" onClick={onAction}>{action}</button>
    </article>
  )
}

function Shell({ exit }) {
  const { user, role, can, products, drinks } = useStore()
  const home = firstAllowed(role)
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const navigate = usePanelNavigate()
  const page = pathname.split('/').filter(Boolean).at(-1) || ''
  const params = Object.fromEntries(searchParams)

  const known = !!pages[page]
  const allowed = known && canAccess(role, page, can)

  // título do breadcrumb com o nome do registro em edição
  const editName = page === 'editar' ? [...products, ...drinks].find(p => p.id === params.id)?.name : null

  // títulos definidos pela própria página (ex.: nome do usuário no detalhe), por rota
  const routeKey = page + JSON.stringify(params)
  const [titles, setTitles] = useState({})
  const setTitle = (t) => setTitles(s => (s[routeKey] === t ? s : { ...s, [routeKey]: t }))

  /* ─── Menu lateral: recolhido (desktop) / gaveta (mobile) ─── */
  const mobile = useMediaQuery('(max-width: 900px)')
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(MENU_KEY) === '1')
  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem(MENU_KEY, next ? '1' : '0') } catch { /* storage indisponível */ }
  }
  // a gaveta fica aberta só para a rota em que foi aberta → fecha sozinha ao navegar
  const [drawerFor, setDrawerFor] = useState(null)
  const drawerOpen = mobile && drawerFor === routeKey
  const menuBtnRef = useRef(null)
  const closeDrawer = () => { setDrawerFor(null); menuBtnRef.current?.focus() }

  // Ctrl+B (⌘+B no Mac) alterna o menu
  const toggleRef = useRef(null)
  useEffect(() => {
    toggleRef.current = () => (mobile ? setDrawerFor(d => (d === routeKey ? null : routeKey)) : toggleCollapsed())
  })
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleRef.current?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={[s.app, collapsed && !mobile && s.collapsed, drawerOpen && s.drawerOpen].filter(Boolean).join(' ')}>
      <a href="#conteudo" className={s.skipLink} onClick={e => { e.preventDefault(); document.getElementById('conteudo')?.focus() }}>Pular para o conteúdo</a>

      {mobile && (
        <header className={s.mobileBar}>
          <button ref={menuBtnRef} className={s.collapseBtn} onClick={() => setDrawerFor(routeKey)}
            aria-label="Abrir menu" aria-controls="menu-lateral" aria-expanded={drawerOpen}>
            <Menu size={20} aria-hidden="true" />
          </button>
          <Brand />
          <span className={s.mobileTitle}>{pages[page]?.title}</span>
        </header>
      )}

      <Sidebar
        page={page} navigate={navigate} exit={exit} user={user} role={role} can={can}
        collapsed={collapsed} onToggle={toggleCollapsed}
        mobile={mobile} open={drawerOpen} onClose={closeDrawer}
      />
      {drawerOpen && <div className={s.scrim} onClick={closeDrawer} aria-hidden="true" />}
      <PrintHost />

      <main className={s.content} id="conteudo" tabIndex={-1}>
        {!known && (
          <Blocked icon={Compass} title="Página não encontrada" text="O endereço acessado não existe no painel." action="Ir para o início" onAction={() => navigate(home)} />
        )}
        {known && !allowed && (
          <Blocked
            icon={ShieldOff}
            title="Acesso restrito"
            text={`O perfil ${role} não tem permissão para "${pages[page].title}". Fale com um administrador se precisar deste acesso.`}
            action="Voltar ao início"
            onAction={() => navigate(home)}
          />
        )}
        {allowed && (
          <>
            <PageHeader page={page} navigate={navigate} extra={editName || titles[routeKey]} />
            <Outlet context={{ setTitle }} />
          </>
        )}
      </main>
    </div>
  )
}

/* ─── Root ─── */
export default function PanelLayout({ exit }) {
  return <Shell exit={exit} />
}
