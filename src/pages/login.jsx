import { useState } from 'react'
import Brand from '../components/Brand.jsx'
import { api } from '../lib/api.js'
import styles from './login.module.css'

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

export default function Login({ go, onSuccess }) {
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const err = {}
    if (!email.trim())        err.email = 'Informe seu e-mail.'
    else if (!isEmail(email)) err.email = 'E-mail inválido.'
    if (!pass)                err.pass  = 'Informe sua senha.'
    setErrors(err)
    if (Object.keys(err).length > 0) return

    setLoading(true)
    try {
      await api.login(email, pass)
      const user = await api.me()
      onSuccess(user)
    } catch (err) {
      if (err.status === 401) {
        setErrors({ general: 'E-mail ou senha incorretos.' })
      } else if (err.status === 0) {
        setErrors({ general: 'Não foi possível conectar ao servidor.' })
      } else {
        const fe = err.fieldErrors ?? {}
        setErrors({
          email:   fe.email    ?? undefined,
          pass:    fe.password ?? undefined,
          general: !fe.email && !fe.password ? err.message : undefined,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.auth}>
      <section className={styles.panel}>
        <Brand />
        <div className={styles.headline}>
          <h1>{'Brinde com honra.\nSirva com fartura.'}</h1>
          <p>Controle estoque, vendas e financeiro em um único lugar.</p>
        </div>
        <ul className={styles.feats}>
          <li>Estoque em tempo real</li>
          <li>Caixa e pedidos integrados</li>
          <li>Financeiro consolidado</li>
        </ul>
      </section>

      <div className={styles.formSide}>
        <button className={styles.back} onClick={() => go('landing')}>← Voltar</button>

        <form onSubmit={submit} noValidate className={styles.form}>
          <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 700, letterSpacing: '-0.3px', margin: '0 0 4px' }}>
            Bem-vindo de volta
          </h2>
          <p className={styles.sub}>Entre com sua conta para acessar o painel.</p>

          {errors.general && <p className={styles.err} style={{ marginBottom: 12 }}>{errors.general}</p>}

          <label className={styles.field}>
            E-mail
            <input
              type="email"
              placeholder="seu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? styles.invalid : ''}
              disabled={loading}
            />
            {errors.email && <em className={styles.err}>{errors.email}</em>}
          </label>

          <label className={styles.field}>
            Senha
            <input
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className={errors.pass ? styles.invalid : ''}
              disabled={loading}
            />
            {errors.pass && <em className={styles.err}>{errors.pass}</em>}
          </label>

          <div className={styles.rememberRow}>
            <label className={styles.check}>
              <input type="checkbox" /> Lembrar de mim
            </label>
            <button type="button" className={styles.forgot} onClick={() => go('forgot')}>Esqueceu a senha?</button>
          </div>

          <button type="submit" className={'gold ' + styles.submit} disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
