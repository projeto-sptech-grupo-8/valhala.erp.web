import { useState } from 'react'
import Brand from '../components/Brand.jsx'
import styles from './login.module.css'

const isGmail = (v) => /^[a-z0-9._%+-]+@gmail\.com$/i.test(v.trim())

const passwordChecks = (v) => [
  { ok: v.length >= 8, label: 'Pelo menos 8 caracteres' },
  { ok: /[A-Z]/.test(v), label: 'Uma letra maiúscula' },
  { ok: /[0-9]/.test(v), label: 'Um número' },
  { ok: /[^A-Za-z0-9]/.test(v), label: 'Um caractere especial' },
]

export default function Login({ go }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [errors, setErrors] = useState({})

  const checks = passwordChecks(pass)

  function submit(e) {
    e.preventDefault()
    const err = {}
    if (!email.trim()) err.email = 'Informe seu e-mail.'
    else if (!isGmail(email)) err.email = 'Use um e-mail @gmail.com válido.'
    if (!pass) err.pass = 'Informe sua senha.'
    else if (checks.some((c) => !c.ok)) err.pass = 'A senha não atende aos requisitos.'
    setErrors(err)
    if (Object.keys(err).length === 0) go('app')
  }

  return (
    <div className={styles.auth}>
      <button className={styles.back} onClick={() => go('landing')}>← Voltar ao início</button>

      <section>
        <Brand />
        <div>
          <p>GESTÃO FEITA PARA QUEM LIDERA</p>
          <h1>{'Brinde com honra.\nSirva com fartura.'}</h1>
          <span>Controle estoque, vendas e financeiro em um único lugar.</span>
        </div>
        <ul>
          <li>Estoque em tempo real</li>
          <li>Caixa e pedidos integrados</li>
          <li>Financeiro consolidado</li>
        </ul>
      </section>

      <form onSubmit={submit} noValidate>
        <Brand />
        <p>ÁREA RESTRITA</p>
        <h2>Bem-vindo de volta</h2>
        <span>Entre com sua conta para acessar o painel.</span>

        <label>E-mail
          <input
            type="email"
            placeholder="seu@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={errors.email ? styles.invalid : ''}
          />
          {errors.email && <em className={styles.err}>{errors.email}</em>}
        </label>

        <label>Senha
          <input
            type="password"
            placeholder="••••••••"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className={errors.pass ? styles.invalid : ''}
          />
        </label>
        {pass && (
          <ul className={styles.rules}>
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? styles.ok : ''}>{c.ok ? '✓' : '·'} {c.label}</li>
            ))}
          </ul>
        )}
        {errors.pass && <em className={styles.err}>{errors.pass}</em>}

        <label className={styles.check}><input type="checkbox" /> Lembrar de mim</label>

        <button className="gold">Entrar no sistema →</button>

        <div>
          Ainda não tem conta?{' '}
          <button type="button" onClick={() => go('signup')}>Criar conta</button>
        </div>
      </form>
    </div>
  )
}
