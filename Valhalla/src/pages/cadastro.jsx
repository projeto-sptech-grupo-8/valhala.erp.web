import { useState } from 'react'
import Brand from '../components/Brand.jsx'
import styles from './cadastro.module.css'

const isGmail = (v) => /^[a-z0-9._%+-]+@gmail\.com$/i.test(v.trim())

const passwordChecks = (v) => [
  { ok: v.length >= 8, label: 'Pelo menos 8 caracteres' },
  { ok: /[A-Z]/.test(v), label: 'Uma letra maiúscula' },
  { ok: /[0-9]/.test(v), label: 'Um número' },
  { ok: /[^A-Za-z0-9]/.test(v), label: 'Um caractere especial' },
]

export default function Cadastro({ go }) {
  const [nome, setNome] = useState('')
  const [salao, setSalao] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirm, setConfirm] = useState('')
  const [terms, setTerms] = useState(false)
  const [errors, setErrors] = useState({})

  const checks = passwordChecks(senha)

  function submit(e) {
    e.preventDefault()
    const err = {}
    if (!nome.trim()) err.nome = 'Informe seu nome completo.'
    else if (nome.trim().length < 3) err.nome = 'O nome deve ter ao menos 3 caracteres.'
    if (!salao.trim()) err.salao = 'Informe o nome do salão.'
    if (!email.trim()) err.email = 'Informe seu e-mail.'
    else if (!isGmail(email)) err.email = 'Use um e-mail @gmail.com válido.'
    if (!senha) err.senha = 'Crie uma senha.'
    else if (checks.some((c) => !c.ok)) err.senha = 'A senha não atende aos requisitos.'
    if (!confirm) err.confirm = 'Confirme sua senha.'
    else if (confirm !== senha) err.confirm = 'As senhas não coincidem.'
    if (!terms) err.terms = 'Você precisa aceitar os Termos de Uso.'
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
          <h1>{'Ergue teu copo.\nEntra para Valhalla.'}</h1>
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
        <p>COMECE AGORA</p>
        <h2>Criar sua conta</h2>
        <span>Leva menos de 2 minutos para começar.</span>

        <label>Nome completo
          <input
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={errors.nome ? styles.invalid : ''}
          />
          {errors.nome && <em className={styles.err}>{errors.nome}</em>}
        </label>

        <label>Salão / estabelecimento
          <input
            placeholder="Ex.: Valhalla Cervejaria"
            value={salao}
            onChange={(e) => setSalao(e.target.value)}
            className={errors.salao ? styles.invalid : ''}
          />
          {errors.salao && <em className={styles.err}>{errors.salao}</em>}
        </label>

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
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={errors.senha ? styles.invalid : ''}
          />
        </label>
        {senha && (
          <ul className={styles.rules}>
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? styles.ok : ''}>{c.ok ? '✓' : '·'} {c.label}</li>
            ))}
          </ul>
        )}
        {errors.senha && <em className={styles.err}>{errors.senha}</em>}

        <label>Confirmar senha
          <input
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={errors.confirm ? styles.invalid : ''}
          />
          {errors.confirm && <em className={styles.err}>{errors.confirm}</em>}
        </label>

        <label className={styles.check}>
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
          />
          Aceito os Termos de Uso
        </label>
        {errors.terms && <em className={styles.err}>{errors.terms}</em>}

        <button className="gold">Criar conta →</button>

        <div>
          Já tem conta?{' '}
          <button type="button" onClick={() => go('login')}>Entrar</button>
        </div>
      </form>
    </div>
  )
}
