import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HashRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { api } from '@/shared/api/api.js'
import { StoreProvider } from '@/app/providers/store'
import Demo from '@/pages/demo'
import Forgot from '@/pages/auth/recovery'
import Login from '@/pages/auth/login'
import Site from '@/pages/landing'
import PanelLayout from '@/pages/panel'
import { PanelRouteElement, panelRoutes } from '@/app/panelRoutes.jsx'

const MODE_PATHS = {
  landing: '/',
  login: '/login',
  forgot: '/forgot',
  demo: '/demo',
  app: '/dashboard',
}

function LoadingSession() {
  return <div className="booting" role="status">Carregando…</div>
}

function RequireSession({ user, status, restoreSession }) {
  const location = useLocation()

  useEffect(() => {
    if (!user && status === 'idle') restoreSession()
  }, [restoreSession, status, user])

  if (status === 'idle' || status === 'loading') return <LoadingSession />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

function clearClientSessionStorage() {
  try {
    localStorage.removeItem('valhalla:store:v2')
  } catch { /* storage indisponível */ }
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i)
      if (key && (key.startsWith('cash-payment-plan:') || key.startsWith('cash-payment-') || key.startsWith('cash-visual-slots:'))) {
        sessionStorage.removeItem(key)
      }
    }
  } catch { /* storage indisponível */ }
}

function PanelStoreProvider({ user, onUserChange, onLogout }) {
  return (
    <StoreProvider key={user?.id || 'anon'} user={user} onUserChange={onUserChange} onLogout={onLogout}>
      <Outlet />
    </StoreProvider>
  )
}

function AppRoutes() {
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [sessionStatus, setSessionStatus] = useState('idle')
  const restorePromise = useRef(null)

  const restoreSession = useCallback(() => {
    if (user) return Promise.resolve(user)
    if (restorePromise.current) return restorePromise.current

    setSessionStatus('loading')
    restorePromise.current = api.me()
      .then((currentUser) => {
        setUser(currentUser)
        setSessionStatus('authenticated')
        return currentUser
      })
      .catch(() => {
        setUser(null)
        setSessionStatus('anonymous')
        return null
      })
      .finally(() => { restorePromise.current = null })

    return restorePromise.current
  }, [user])

  useEffect(() => {
    const userId = user?.id
    if (!userId) return

    let active = true
    let checking = false
    async function checkAccess() {
      if (document.hidden || checking) return
      checking = true
      try {
        const account = await api.me()
        if (active) setUser(current => current?.id === userId ? account : current)
      } catch (error) {
        if (active && error.status === 401) {
          clearClientSessionStorage()
          setSessionStatus('anonymous')
          setUser(null)
        }
      } finally {
        checking = false
      }
    }
    window.addEventListener('focus', checkAccess)
    return () => {
      active = false
      window.removeEventListener('focus', checkAccess)
    }
  }, [user?.id])

  const go = useCallback((mode) => {
    navigate(MODE_PATHS[mode] ?? mode)
  }, [navigate])

  const handleLoginSuccess = useCallback(async (userData) => {
    const fullUser = userData?.profileName ? userData : await api.me().catch(() => userData)
    setUser(fullUser)
    setSessionStatus('authenticated')
    const destination = location.state?.from
    navigate(destination?.pathname ? `${destination.pathname}${destination.search || ''}` : '/dashboard', { replace: true })
  }, [location.state, navigate])

  const handleLogout = useCallback(async ({ force = false, redirectTo = '/' } = {}) => {
    try {
      await api.logout()
    } catch (error) {
      if (error.status !== 401 && !force) {
        toast(error.message, { title: 'Não foi possível confirmar a saída', type: 'error' })
        return false
      }
    }
    clearClientSessionStorage()
    restorePromise.current = null
    setUser(null)
    setSessionStatus('anonymous')
    navigate(redirectTo, { replace: true })
    return true
  }, [navigate, toast])

  return (
    <Routes>
      <Route path="/" element={<Site go={go} />} />
      <Route path="/login" element={<Login go={go} onSuccess={handleLoginSuccess} />} />
      <Route path="/forgot" element={<Forgot go={go} />} />
      <Route path="/demo" element={<Demo go={go} />} />

      <Route element={<RequireSession user={user} status={sessionStatus} restoreSession={restoreSession} />}>
        <Route element={<PanelStoreProvider user={user} onUserChange={setUser} onLogout={handleLogout} />}>
          <Route element={<PanelLayout exit={handleLogout} />}>
            {panelRoutes.map((route) => (
              <Route
                key={route.id}
                path={route.id}
                element={<PanelRouteElement route={route} />}
              />
            ))}
            <Route path="*" element={null} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function AppRouter() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
