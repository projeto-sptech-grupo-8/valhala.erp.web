import { useEffect, useState } from 'react'
import './App.module.css'
import Site   from './pages/site.jsx'
import Login  from './pages/login.jsx'
import Forgot from './pages/forgot.jsx'
import Dash   from './pages/dash.jsx'
import { api } from './lib/api.js'
import { ToastProvider } from './components/toast.jsx'

const inAppRoute = () => /^#\/./.test(window.location.hash)

export default function App() {
  // com uma rota interna na URL (F5, favorito, link), tenta restaurar a sessão antes de decidir a tela
  const [mode, setMode] = useState(() => (inAppRoute() ? 'restoring' : 'landing'))
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (mode !== 'restoring') return
    api.me()
      .then(u => { setUser(u); setMode('app') })
      .catch(() => setMode('login'))
  }, [mode])

  async function handleLogout() {
    await api.logout().catch(() => {})
    setUser(null)
    window.history.replaceState(null, '', window.location.pathname)
    setMode('landing')
  }

  // o perfil (profileName) define as permissões; garante que ele venha de /usuario/me
  async function handleLoginSuccess(userData) {
    const full = userData?.profileName ? userData : await api.me().catch(() => userData)
    setUser(full)
    setMode('app')
  }

  let screen
  if (mode === 'restoring')    screen = <div className="booting" role="status">Carregando…</div>
  else if (mode === 'landing') screen = <Site   go={setMode} />
  else if (mode === 'login')   screen = <Login  go={setMode} onSuccess={handleLoginSuccess} />
  else if (mode === 'forgot')  screen = <Forgot go={setMode} onSuccess={handleLoginSuccess} />
  else                         screen = <Dash user={user} exit={handleLogout} onUserChange={setUser} />

  return <ToastProvider>{screen}</ToastProvider>
}
