import { useEffect, useState } from 'react'
import { ShieldCheck, Lock } from 'lucide-react'
import { useStore } from '../useStore.js'
import { Modal } from './Modal.jsx'
import s from '../dash.module.css'

const PODE_AUTORIZAR = ['Gerente', 'Administrador']
const MAX_TENTATIVAS = 3
const BLOQUEIO_S = 30

/*
 * Autorização do gerente para ações sensíveis (desconto acima do limite, cancelamento, ajuste de inventário).
 * - operador já é Gerente/Admin → confirma com motivo (fica registrado que ele mesmo autorizou)
 * - senão → gerente presente digita o PIN (mock: Configurações gerais; backend: endpoint de aprovação)
 * 3 PINs errados bloqueiam por 30s.
 */
export function AuthorizeModal({ title, subtitle, resumo, confirmLabel = 'Autorizar', motivos = [], onClose, onAuthorized }) {
  const { role, user, config } = useStore()
  const selfOk = PODE_AUTORIZAR.includes(role)
  const [pin, setPin] = useState('')
  const [motivo, setMotivo] = useState(motivos[0] || '')
  const [outro, setOutro] = useState('')
  const [erro, setErro] = useState('')
  const [tentativas, setTentativas] = useState(0)
  const [bloqueadoAte, setBloqueadoAte] = useState(0)
  const [agora, setAgora] = useState(() => Date.now())

  const restante = Math.max(0, Math.ceil((bloqueadoAte - agora) / 1000))
  useEffect(() => {
    if (!bloqueadoAte) return
    const t = setInterval(() => setAgora(Date.now()), 500)
    return () => clearInterval(t)
  }, [bloqueadoAte])

  const motivoFinal = (motivo === 'Outro' || !motivos.length ? outro : motivo).trim()

  function submit(e) {
    e.preventDefault()
    if (restante > 0) return
    if (!motivoFinal) { setErro('Informe o motivo — ele fica registrado na auditoria.'); return }
    if (!selfOk) {
      if (pin !== config.pinGerente) {
        const n = tentativas + 1
        setTentativas(n)
        setPin('')
        if (n >= MAX_TENTATIVAS) {
          setBloqueadoAte(Date.now() + BLOQUEIO_S * 1000)
          setAgora(Date.now())
          setTentativas(0)
          setErro(`PIN incorreto ${MAX_TENTATIVAS} vezes. Aguarde ${BLOQUEIO_S}s para tentar de novo.`)
        } else {
          setErro(`PIN incorreto. ${MAX_TENTATIVAS - n} tentativa(s) restante(s).`)
        }
        return
      }
    }
    onAuthorized({ autorizadoPor: selfOk ? `${user?.name || 'Gerente'} (próprio)` : 'Gerente (PIN)', motivo: motivoFinal })
  }

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      width={460}
      footer={<>
        <button type="button" onClick={onClose}>Cancelar</button>
        <button type="submit" form="autorizar" className="gold" disabled={restante > 0}>
          <ShieldCheck size={14} aria-hidden="true" /> {restante > 0 ? `Bloqueado (${restante}s)` : confirmLabel}
        </button>
      </>}
    >
      {resumo && <div className={s.authResumo}>{resumo}</div>}
      <form id="autorizar" onSubmit={submit} className={s.authForm}>
        {motivos.length > 0 && (
          <label>
            <span>Motivo</span>
            <select value={motivo} onChange={e => { setMotivo(e.target.value); setErro('') }} data-autofocus={selfOk || undefined}>
              {motivos.map(m => <option key={m}>{m}</option>)}
            </select>
          </label>
        )}
        {(motivo === 'Outro' || !motivos.length) && (
          <label>
            <span>Descreva o motivo</span>
            <input value={outro} onChange={e => { setOutro(e.target.value); setErro('') }} placeholder="Ex.: cliente desistiu antes do preparo" data-autofocus={(selfOk && !motivos.length) || undefined} />
          </label>
        )}
        {selfOk ? (
          <p className={s.authSelf}><ShieldCheck size={14} aria-hidden="true" /> Seu perfil ({role}) pode autorizar. Fica registrado que você mesmo autorizou.</p>
        ) : (
          <label>
            <span><Lock size={12} aria-hidden="true" /> PIN do gerente</span>
            <input type="password" inputMode="numeric" autoComplete="off" value={pin} maxLength={8}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setErro('') }} disabled={restante > 0} data-autofocus aria-invalid={!!erro || undefined} />
            <small className={s.hint}>Um gerente presente digita o PIN no seu lugar.</small>
          </label>
        )}
        {erro && <p className={s.errMsg} role="alert">{erro}</p>}
      </form>
    </Modal>
  )
}
