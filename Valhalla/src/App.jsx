import { useState } from 'react'
import './App.module.css'
import Site from './pages/site.jsx'
import Login from './pages/login.jsx'
import Cadastro from './pages/cadastro.jsx'
import Dash from './pages/dash.jsx'

export default function App() {
  const [mode, setMode] = useState('landing')

  if (mode === 'landing') return <Site go={setMode} />
  if (mode === 'login') return <Login go={setMode} />
  if (mode === 'signup') return <Cadastro go={setMode} />
  return <Dash exit={() => setMode('landing')} />
}
