import { useState } from 'react'
import Brand from '../components/Brand.jsx'
import styles from './cadastro.module.css'

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

const passwordChecks = (v) => [
  { ok: v.length >= 8, label: 'Pelo menos 8 caracteres' },
  { ok: /[A-Z]/.test(v), label: 'Uma letra maiúscula' },
  { ok: /[0-9]/.test(v), label: 'Um número' },
]

const strengthLabel = (n) => ['', 'Fraca', 'Média', 'Forte'][n] || ''

export default function Cadastro({ go }) {
  const [nome, setNome]       = useState('')
  const [salao, setSalao]     = useState('')
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [senhaTouched, setSenhaTouched] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [terms, setTerms]     = useState(false)
  const [errors, setErrors]   = useState({})

  const checks   = passwordChecks(senha)
  const strength = checks.filter(c => c.ok).length

  function submit(e) {
    e.preventDefault()
    const err = {}
    if (!nome.trim())               err.nome    = 'Informe seu nome completo.'
    else if (nome.trim().length < 3) err.nome   = 'O nome deve ter ao menos 3 caracteres.'
    if (!salao.trim())              err.salao   = 'Informe o nome do estabelecimento.'
    if (!email.trim())              err.email   = 'Informe seu e-mail.'
    else if (!isEmail(email))       err.email   = 'E-mail inválido.'
    if (!senha)                     err.senha   = 'Crie uma senha.'
    else if (checks.some(c => !c.ok)) err.senha = 'A senha não atende aos requisitos.'
    if (!confirm)                   err.confirm = 'Confirme sua senha.'
    else if (confirm !== senha)     err.confirm = 'As senhas não coincidem.'
    if (!terms)                     err.terms   = 'Você precisa aceitar os Termos de Uso.'
    setErrors(err)
    if (Object.keys(err).length === 0) go('app')
  }

  return (
    <div className={styles.auth}>
      <section className={styles.panel}>
        <Brand />
        <div className={styles.headline}>
          <h1>{'Ergue teu copo.\nEntra para Valhalla.'}</h1>
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
            Criar sua conta
          </h2>
          <p className={styles.sub}>Leva menos de 2 minutos para começar.</p>

          <div className={styles.formRow}>
            <label className={styles.field}>
              Nome completo
              <input
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={errors.nome ? styles.invalid : ''}
              />
              {errors.nome && <em className={styles.err}>{errors.nome}</em>}
            </label>
            <label className={styles.field}>
              Estabelecimento
              <input
                placeholder="Ex.: Adega Meraki"
                value={salao}
                onChange={(e) => setSalao(e.target.value)}
                className={errors.salao ? styles.invalid : ''}
              />
              {errors.salao && <em className={styles.err}>{errors.salao}</em>}
            </label>
          </div>

          <label className={styles.field}>
            E-mail
            <input
              type="email"
              placeholder="seu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? styles.invalid : ''}
            />
            {errors.email && <em className={styles.err}>{errors.email}</em>}
          </label>

          <div className={styles.formRow}>
            <label className={styles.field}>
              Senha
              <input
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => { setSenha(e.target.value); setSenhaTouched(true) }}
                className={errors.senha ? styles.invalid : ''}
              />
            </label>
            <label className={styles.field}>
              Confirmar senha
              <input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={errors.confirm ? styles.invalid : ''}
              />
              {errors.confirm && <em className={styles.err}>{errors.confirm}</em>}
            </label>
          </div>

          {senhaTouched && (
            <>
              <div className={styles.strengthBar}>
                {[1,2,3].map(i => <div key={i} className={i <= strength ? styles.lit : ''} />)}
              </div>
              <p className={styles.strengthLabel}>{strengthLabel(strength)}</p>
              <ul className={styles.rules}>
                {checks.map(c => (
                  <li key={c.label} className={c.ok ? styles.ok : ''}>{c.ok ? '✓' : '·'} {c.label}</li>
                ))}
              </ul>
            </>
          )}
          {errors.senha && <em className={styles.err}>{errors.senha}</em>}

          <label className={styles.check} style={{ marginTop: 16 }}>
            <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />
            Aceito os Termos de Uso
          </label>
          {errors.terms && <em className={styles.err}>{errors.terms}</em>}

          <button type="submit" className={'gold ' + styles.submit}>Criar conta</button>

          <p className={styles.switchLine}>
            Já tem conta?{' '}
            <button type="button" className={styles.link} onClick={() => go('login')}>Entrar</button>
          </p>
        </form>
      </div>
    </div>
  )
}
