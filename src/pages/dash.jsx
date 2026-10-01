import { useEffect, useRef, useState } from 'react'
import { ShieldOff, Compass, Menu } from 'lucide-react'
import { useHashRoute } from '../lib/useHashRoute.js'
import { useMediaQuery } from '../lib/useMediaQuery.js'
import Brand from '../components/Brand.jsx'
import { ConfigPage } from './config.jsx'
import { StoreProvider } from './dash/store.jsx'
import { useStore } from './dash/useStore.js'
import { pages, canAccess, firstAllowed } from './dash/pages.js'
import { Sidebar } from './dash/components/Sidebar.jsx'
import { PageHeader } from './dash/components/PageHeader.jsx'
import { Dashboard } from './dash/Dashboard.jsx'
import { Products } from './dash/Products.jsx'
import { ProductForm } from './dash/ProductForm.jsx'
import { Cards } from './dash/Cards.jsx'
import { Movimentacoes } from './dash/Movimentacoes.jsx'
import { Reposicao } from './dash/Reposicao.jsx'
import { Finance } from './dash/Finance.jsx'
import { Cash } from './dash/Cash.jsx'
import { Listing } from './dash/Listing.jsx'
import { Validades } from './dash/Validades.jsx'
import { EntradaNF } from './dash/EntradaNF.jsx'
import { Inventario } from './dash/Inventario.jsx'
import { Auditoria } from './dash/Auditoria.jsx'
import { Relatorios } from './dash/Relatorios.jsx'
import { PrintHost } from './dash/components/Print.jsx'
import { UsersList } from './dash/acesso/UsersList.jsx'
import { UserForm } from './dash/acesso/UserForm.jsx'
import { UserDetail } from './dash/acesso/UserDetail.jsx'
import { ProfilesList } from './dash/acesso/ProfilesList.jsx'
import { ProfileForm } from './dash/acesso/ProfileForm.jsx'
import { ProfileDetail } from './dash/acesso/ProfileDetail.jsx'
import s from './dash/dash.module.css'

const MENU_KEY = 'valhalla:menu-recolhido'

/* ─── Router ─── */
const configPages = ['seguranca', 'notificacoes', 'geral']

function Page({ page, navigate, pageParams, setTitle }) {
  if (page === 'dashboard')     return <Dashboard navigate={navigate} />
  if (page === 'produtos')      return <Products navigate={navigate} pageParams={pageParams} />
  if (page === 'novo')          return <ProductForm navigate={navigate} />
  if (page === 'editar')        return <ProductForm navigate={navigate} editId={pageParams.id} />
  if (page === 'categorias')    return <Cards navigate={navigate} />
  if (page === 'movimentacoes') return <Movimentacoes pageParams={pageParams} />
  if (page === 'reposicao')     return <Reposicao navigate={navigate} />
  if (page === 'financeiro')    return <Finance />
  if (page === 'validades')     return <Validades navigate={navigate} />
  if (page === 'entradanf')     return <EntradaNF navigate={navigate} />
  if (page === 'inventario')    return <Inventario navigate={navigate} pageParams={pageParams} />
  if (page === 'auditoria')     return <Auditoria />
  if (page === 'relatorios')    return <Relatorios navigate={navigate} pageParams={pageParams} />
  if (page === 'caixa')         return <Cash />
  if (['orcamento', 'notafiscal'].includes(page)) return <Listing page={page} />
  if (page === 'usuarios')      return <UsersList navigate={navigate} setTitle={setTitle} pageParams={pageParams} />
  if (page === 'novousuario')   return <UserForm navigate={navigate} setTitle={setTitle} />
  if (page === 'editarusuario') return <UserForm navigate={navigate} setTitle={setTitle} userId={pageParams.id} />
  if (page === 'usuario')       return <UserDetail navigate={navigate} setTitle={setTitle} userId={pageParams.id} />
  if (page === 'perfis')        return <ProfilesList navigate={navigate} setTitle={setTitle} />
  if (page === 'novoperfil')    return <ProfileForm navigate={navigate} setTitle={setTitle} copyFrom={pageParams.copiar} />
  if (page === 'perfil')        return <ProfileDetail navigate={navigate} setTitle={setTitle} profileId={pageParams.id} />
  if (configPages.includes(page)) return <ConfigPage page={page} />
  return null
}

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
  const { page, params, navigate } = useHashRoute(home)

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
            <Page key={page + (params.id || '')} page={page} navigate={navigate} pageParams={params} setTitle={setTitle} />
          </>
        )}
      </main>
    </div>
  )
}

/* ─── Root ─── */
export default function Dash({ user, exit, onUserChange }) {
  return (
    <StoreProvider user={user} onUserChange={onUserChange} onLogout={exit}>
      <Shell exit={exit} />
    </StoreProvider>
  )
}
