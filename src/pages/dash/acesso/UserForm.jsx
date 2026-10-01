import { cloneElement, useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle, AlertTriangle, Eye, EyeOff, KeyRound } from 'lucide-react'
import { api } from '../../../lib/api.js'
import { useResource } from '../../../lib/useResource.js'
import { useToast } from '../../../components/useToast.js'
import { useStore } from '../useStore.js'
import { Modal } from '../components/Modal.jsx'
import { LoadingBlock, ErrorBlock, ProfileChip } from './ui.jsx'
import { FuncionalidadesPicker } from './Permissoes.jsx'
import { useUserActions } from './useUserActions.jsx'
import { fmtPhone, onlyDigits, isEmail, passwordScore } from './format.js'
import s from '../dash.module.css'
import a from './acesso.module.css'

function Field({ name, label, error, hint, required, children }) {
  const ids = [error && `${name}-err`, hint && `${name}-hint`].filter(Boolean).join(' ') || undefined
  return (
    <label className={error ? s.fieldError : undefined} htmlFor={name}>
      <span>{label}{required && <i className={s.req} aria-hidden="true"> *</i>}</span>
      {cloneElement(children, { id: name, name, 'aria-invalid': error ? true : undefined, 'aria-describedby': ids, 'aria-required': required || undefined })}
      {hint && <small id={`${name}-hint`} className={s.hint}>{hint}</small>}
      {error && <small id={`${name}-err`} className={s.errMsg}>{error}</small>}
    </label>
  )
}

const STRENGTH = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte']
const STRENGTH_TONE = ['var(--red)', 'var(--red)', 'var(--gold2)', 'var(--green)', 'var(--green)']

function validate(f, isEdit) {
  const e = {}
  if (f.name.trim().length < 3) e.name = 'Informe o nome completo (mínimo 3 caracteres).'
  else if (f.name.trim().length > 120) e.name = 'Use no máximo 120 caracteres.'
  if (!f.email.trim()) e.email = 'Informe o e-mail de acesso.'
  else if (!isEmail(f.email)) e.email = 'E-mail inválido. Ex.: nome@adega.com.br'
  if (f.phone && f.phone.length < 10) e.phone = 'Informe DDD + número (10 ou 11 dígitos).'
  if (!isEdit) {
    if (!f.profileId) e.profileId = 'Selecione o perfil de acesso.'
    if (f.password.length < 8) e.password = 'A senha precisa ter ao menos 8 caracteres.'
    else if (!(/[a-zA-Z]/.test(f.password) && /\d/.test(f.password))) e.password = 'Use letras e números.'
    if (!e.password && f.confirm !== f.password) e.confirm = 'As senhas não coincidem.'
  }
  return e
}

/* ─── Novo / Editar usuário ─── */
export function UserForm({ navigate, userId, setTitle }) {
  const { can, user: me, session } = useStore()
  const toast = useToast()
  const isEdit = !!userId
  const isSelf = isEdit && userId === me?.id

  const user = useResource(() => (isEdit ? api.usuarios.obter(userId) : null), [userId])
  const perfis = useResource(() => (can('PERFIS_GERENCIAR') ? api.perfis.listar() : []), [])
  const funcs = useResource(() => (can('PERFIS_GERENCIAR') || can('PERMISSOES_GERENCIAR') ? api.funcionalidades.listar() : []), [])

  const [form, setForm] = useState(null)
  const [initial, setInitial] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [leave, setLeave] = useState(false)
  const formRef = useRef(null)

  // inicializa o formulário quando os dados chegam (uma única vez por registro)
  const ready = !isEdit || user.data
  if (ready && !form) {
    const u = user.data
    const f = { name: u?.name || '', email: u?.email || '', phone: onlyDigits(u?.phone || ''), profileId: u?.profileId || '', password: '', confirm: '' }
    setForm(f)
    setInitial(f)
  }

  useEffect(() => { if (isEdit && user.data) setTitle?.(`Editar ${user.data.name}`) }, [isEdit, user.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const actions = useUserActions({
    navigate, perfis: perfis.data || [], funcionalidades: funcs.data || [],
    onChanged: (u) => user.setData(u),
  })

  if (isEdit && user.error) return <ErrorBlock error={user.error} onRetry={user.reload} onBack={() => navigate('usuarios')} backLabel="Voltar para usuários" />
  if (!form) return <LoadingBlock lines={7} label="Carregando formulário" />

  const dirty = JSON.stringify(form) !== JSON.stringify(initial)

  function upd(k, v) {
    const next = { ...form, [k]: v }
    setForm(next)
    if (submitted) setErrors(validate(next, isEdit))
  }

  function focusFirstError() {
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector('[aria-invalid="true"]')
      el?.focus()
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setSubmitted(true)
    const errs = validate(form, isEdit)
    setErrors(errs)
    if (Object.keys(errs).length) { focusFirstError(); return }

    setBusy(true)
    try {
      if (isEdit) {
        const patch = {}
        if (form.name.trim() !== initial.name.trim()) patch.name = form.name.trim()
        if (form.email.trim().toLowerCase() !== initial.email.trim().toLowerCase()) patch.email = form.email.trim()
        if (form.phone !== initial.phone) patch.phone = form.phone
        if (!Object.keys(patch).length) {
          toast('Nenhum campo foi alterado.', { type: 'info' })
          return
        }
        const u = await api.usuarios.atualizar(userId, patch)
        if (isSelf) session.updateSelf({ name: u.name, email: u.email, phone: u.phone })
        setInitial(form)
        toast(`Dados de ${u.name} atualizados.`, { title: 'Alterações salvas' })
        navigate('usuario', { id: userId })
      } else {
        const u = await api.usuarios.criar({
          name: form.name.trim(), email: form.email.trim(), phone: form.phone || undefined,
          password: form.password, profileId: form.profileId,
        })
        toast(`${u.name} já pode entrar com o e-mail ${u.email}.`, { title: 'Usuário criado' })
        navigate('usuario', { id: u.id })
      }
    } catch (err) {
      const fe = err.fieldErrors || {}
      if (Object.keys(fe).length) {
        setErrors(prev => ({ ...prev, ...fe }))
        focusFirstError()
      }
      toast(err.message, { type: 'error', title: 'Não foi possível salvar' })
    } finally {
      setBusy(false)
    }
  }

  const cancel = () => (dirty ? setLeave(true) : navigate(isEdit ? 'usuario' : 'usuarios', isEdit ? { id: userId } : {}))
  const perfilSel = (perfis.data || []).find(p => p.id === form.profileId)
  const score = passwordScore(form.password)
  const errCount = Object.keys(errors).length

  return (
    <form ref={formRef} onSubmit={submit} noValidate aria-busy={busy || undefined}>
      <div className={s.objBar}>
        <button type="button" onClick={cancel} className={a.backBtn}><ArrowLeft size={14} aria-hidden="true" /> {isEdit ? 'Voltar ao usuário' : 'Voltar para usuários'}</button>
        <div className={s.tabsActions}>
          <button type="button" onClick={cancel} disabled={busy}>Cancelar</button>
          <button type="submit" className="gold" disabled={busy || (isEdit && !dirty)}>
            {busy ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar usuário'} {!busy && <CheckCircle size={13} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {errCount > 0 && (
        <div className={s.errSummary} role="alert">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>Corrija {errCount === 1 ? '1 campo destacado' : `${errCount} campos destacados`} para continuar.</span>
        </div>
      )}

      <div className={a.formGrid}>
        <div>
          <section className={`card form ${s.objSection}`} aria-labelledby="sec-dados">
            <h3 id="sec-dados">Dados da conta</h3>
            <div className="two">
              <Field name="name" label="Nome completo" required error={errors.name}>
                <input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Ex.: Mariana Costa" autoComplete="off" autoFocus={!isEdit} maxLength={120} />
              </Field>
              <Field name="email" label="E-mail de acesso" required error={errors.email} hint={isEdit ? undefined : 'Será usado para entrar no sistema.'}>
                <input type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="nome@adega.com.br" autoComplete="off" inputMode="email" />
              </Field>
              <Field name="phone" label="Telefone (opcional)" error={errors.phone}>
                <input value={fmtPhone(form.phone)} onChange={e => upd('phone', onlyDigits(e.target.value))} placeholder="(11) 90000-0000" inputMode="tel" autoComplete="off" />
              </Field>
            </div>
            {isSelf && <p className={a.note}>Você está editando a sua própria conta.</p>}
          </section>

          {!isEdit && (
            <section className={`card form ${s.objSection}`} aria-labelledby="sec-senha">
              <h3 id="sec-senha">Senha inicial</h3>
              <p className={s.sectionDesc}>Repasse a senha ao usuário por um canal seguro. Ele poderá alterá-la em Segurança.</p>
              <div className="two">
                <Field name="password" label="Senha" required error={errors.password}>
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => upd('password', e.target.value)} autoComplete="new-password" placeholder="Mínimo 8 caracteres, letras e números" />
                </Field>
                <Field name="confirm" label="Confirmar senha" required error={errors.confirm}>
                  <input type={showPass ? 'text' : 'password'} value={form.confirm} onChange={e => upd('confirm', e.target.value)} autoComplete="new-password" />
                </Field>
              </div>
              <div className={a.passRow}>
                {form.password && (
                  <div className={a.strength} aria-live="polite">
                    <div className={a.strengthBar}><i style={{ width: `${(score / 4) * 100}%`, background: STRENGTH_TONE[score] }} /></div>
                    <small style={{ color: STRENGTH_TONE[score] }}>Força: {STRENGTH[score]}</small>
                  </div>
                )}
                <button type="button" className={a.linkBtn} onClick={() => setShowPass(v => !v)} aria-pressed={showPass}>
                  {showPass ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />} {showPass ? 'Ocultar senhas' : 'Mostrar senhas'}
                </button>
              </div>
            </section>
          )}
        </div>

        <aside>
          <section className={`card form ${s.objSection}`} aria-labelledby="sec-acesso">
            <h3 id="sec-acesso">Perfil de acesso</h3>
            {isEdit ? (
              <>
                <p className={s.sectionDesc}>A troca de perfil altera as permissões, por isso tem confirmação própria.</p>
                <div className={a.currentProfile}>
                  <ProfileChip nome={user.data.profileName} />
                  {can('USUARIOS_EDITAR') && perfis.data && (
                    <button type="button" onClick={() => actions.open.changeProfile(user.data)}><KeyRound size={13} aria-hidden="true" /> Mudar perfil</button>
                  )}
                </div>
              </>
            ) : perfis.error ? (
              <ErrorBlock error={perfis.error} onRetry={perfis.reload} />
            ) : !can('PERFIS_GERENCIAR') ? (
              <p className={a.warnBox}>Seu acesso não permite listar perfis. Peça ao gerente para criar este usuário.</p>
            ) : (
              <>
                <Field name="profileId" label="Perfil" required error={errors.profileId} hint="Define o que o usuário pode fazer no sistema.">
                  <select value={form.profileId} onChange={e => upd('profileId', e.target.value)} disabled={perfis.loading}>
                    <option value="">{perfis.loading ? 'Carregando perfis…' : 'Selecione um perfil'}</option>
                    {(perfis.data || []).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </Field>
                {perfilSel && (
                  <div className={a.preview} aria-live="polite">
                    <p className={a.previewHead}><b>{perfilSel.nome}</b> · {perfilSel.codigos.length} funcionalidade{perfilSel.codigos.length === 1 ? '' : 's'}</p>
                    {perfilSel.descricao && <p className={a.muted}>{perfilSel.descricao}</p>}
                    {funcs.data && <FuncionalidadesPicker readOnly funcionalidades={funcs.data} value={perfilSel.codigos} />}
                  </div>
                )}
                <button type="button" className={a.linkBtn} onClick={() => navigate('novoperfil')}>Precisa de outro perfil? Criar perfil</button>
              </>
            )}
          </section>
        </aside>
      </div>

      {leave && (
        <Modal
          title="Descartar alterações?" subtitle="As informações preenchidas serão perdidas." width={420}
          onClose={() => setLeave(false)}
          footer={<>
            <button type="button" onClick={() => setLeave(false)} data-autofocus>Continuar editando</button>
            <button type="button" className={s.dangerBtn} onClick={() => navigate(isEdit ? 'usuario' : 'usuarios', isEdit ? { id: userId } : {})}>Descartar</button>
          </>}
        />
      )}
      {actions.modals}
    </form>
  )
}
