import { useState, useRef } from 'react'
import Brand from '../components/Brand.jsx'
import styles from './forgot.module.css'

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

export default function Forgot({ go, onSuccess }) {
  const [step, setStep]       = useState('email')
  const [email, setEmail]     = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [code, setCode]       = useState(['', '', '', '', ''])
  const [codeErr, setCodeErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [resent, setResent]   = useState(false)

  const refs = [useRef(), useRef(), useRef(), useRef(), useRef()]

  async function submitEmail(e) {
    e.preventDefault()
    if (!email.trim() || !isEmail(email)) {
      setEmailErr('Informe um e-mail válido.')
      return
    }
    setEmailErr('')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 700))
    setLoading(false)
    setStep('code')
    setTimeout(() => refs[0].current?.focus(), 50)
  }

  function handleDigit(i, val) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[i] = digit
    setCode(next)
    setCodeErr('')
    if (digit && i < 4) refs[i + 1].current?.focus()
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      refs[i - 1].current?.focus()
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5)
    if (!text) return
    e.preventDefault()
    const next = [...code]
    for (let i = 0; i < 5; i++) next[i] = text[i] ?? ''
    setCode(next)
    const focusIdx = Math.min(text.length, 4)
    refs[focusIdx].current?.focus()
  }

  async function submitCode(e) {
    e.preventDefault()
    if (code.join('').length < 5) {
      setCodeErr('Digite os 5 dígitos do código.')
      return
    }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 700))
    setLoading(false)
    onSuccess({ name: email })
  }

  async function resend() {
    setLoading(true)
    setResent(false)
    setCode(['', '', '', '', ''])
    setCodeErr('')
    await new Promise((r) => setTimeout(r, 600))
    setLoading(false)
    setResent(true)
    refs[0].current?.focus()
  }

  return (
    <div className={styles.auth}>
      <section className={styles.panel}>
        <Brand />
        <div className={styles.headline}>
          <h1>{'Recupere\nseu acesso.'}</h1>
          <p>Enviaremos um código de verificação para o e-mail cadastrado na sua conta.</p>
        </div>
      </section>

      <div className={styles.formSide}>
        <button className={styles.back} onClick={() => go('login')}>← Voltar</button>

        {step === 'email' ? (
          <form onSubmit={submitEmail} noValidate className={styles.form}>
            <h2 className={styles.title}>Esqueceu a senha?</h2>
            <p className={styles.sub}>Informe seu e-mail e enviaremos um código de verificação.</p>

            <label className={styles.field}>
              E-mail
              <input
                type="email"
                placeholder="seu@empresa.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailErr('') }}
                className={emailErr ? styles.invalid : ''}
                disabled={loading}
                autoFocus
              />
              {emailErr && <em className={styles.err}>{emailErr}</em>}
            </label>

            <button type="submit" className={'gold ' + styles.submit} disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar código'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} noValidate className={styles.form}>
            <h2 className={styles.title}>Verifique seu e-mail</h2>
            <p className={styles.sub}>
              Enviamos um código de 5 dígitos para <strong className={styles.emailHighlight}>{email}</strong>.
            </p>

            <div className={styles.otpRow} onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={refs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={styles.otpBox + (codeErr ? ' ' + styles.invalid : '')}
                  disabled={loading}
                />
              ))}
            </div>
            {codeErr && <em className={styles.err} style={{ marginTop: 6, display: 'block' }}>{codeErr}</em>}

            {resent && (
              <p className={styles.resentMsg}>Código reenviado com sucesso.</p>
            )}

            <button type="submit" className={'gold ' + styles.submit} disabled={loading} style={{ marginTop: 24 }}>
              {loading ? 'Verificando…' : 'Verificar código'}
            </button>

            <p className={styles.switchLine}>
              Não recebeu o código?{' '}
              <button type="button" className={styles.link} onClick={resend} disabled={loading}>
                Enviar novamente
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
