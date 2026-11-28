import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useId, useRef, useState } from 'react'
import { api } from '@/shared/api/api.js'
import { useResource } from '@/shared/lib/hooks/useResource.js'
import { useStore } from '@/entities/store'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { Modal } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { ConfirmModal, ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { RequiredMark } from '@/shared/ui/forms/RequiredMark.jsx'
import { fmtPhone, onlyDigits, isEmail, isManagerProfile } from '@/entities/access'
import s from './EditUserModal.module.css'

export function EditUserModal({ userId, onClose, onSaved }) {
  const user = useResource(() => api.usuarios.obter(userId), [userId])
  const { can, user: me } = useStore()
  if (!can('USUARIOS_EDITAR')) return null
  if (user.loading || user.error || !user.data) return <Modal title="Editar usuário" onClose={onClose}>{user.error ? <ErrorBlock error={user.error} onRetry={user.reload} /> : <LoadingBlock label="Carregando usuário" />}</Modal>
  if (isManagerProfile(user.data.profileName) && !isManagerProfile(me?.profileName)) {
    return <Modal title="Editar usuário" onClose={onClose}><Notice>Somente o Gerente pode editar esta conta.</Notice></Modal>
  }
  return <Editor initial={user.data} onClose={onClose} onSaved={onSaved} />
}

function Editor({ initial, onClose, onSaved }) {
  const { user: me, can, session } = useStore()
  const toast = useToast()
  const id = useId()
  const formRef = useRef(null)
  const sending = useRef(false)
  const [form, setForm] = useState({ name: initial.name || '', email: initial.email || '', phone: onlyDigits(initial.phone || '') })
  const [currentPassword, setCurrentPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [discard, setDiscard] = useState(false)
  const canChangeEmail = initial.id === me?.id || (initial.permissoes || []).every(can)
  const patch = {}
  if (form.name.trim() !== initial.name) patch.name = form.name.trim()
  if (canChangeEmail && form.email.trim().toLowerCase() !== initial.email.toLowerCase()) patch.email = form.email.trim()
  if (form.phone !== onlyDigits(initial.phone || '')) patch.phone = form.phone
  const dirty = Object.keys(patch).length > 0
  const needsPassword = initial.id === me?.id && !!patch.email
  const close = () => { if (busy) return; if (dirty) setDiscard(true); else onClose() }
  function update(key, value) { setForm(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: undefined })) }
  async function submit(event) {
    event.preventDefault()
    if (sending.current || !dirty) return
    const next = {}
    if (form.name.trim().length < 3 || form.name.trim().length > 100) next.name = 'Informe um nome entre 3 e 100 caracteres.'
    if (!isEmail(form.email.trim())) next.email = 'Informe um e-mail válido.'
    if (form.phone && form.phone.length < 10) next.phone = 'Informe o DDD e o número (10 ou 11 dígitos).'
    if (needsPassword && !currentPassword) next.senhaAtual = 'Informe sua senha atual para alterar o e-mail.'
    setErrors(next)
    if (Object.keys(next).length) { requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus()); return }
    sending.current = true; setBusy(true); setError('')
    try {
      const u = await api.usuarios.atualizar(initial.id, needsPassword ? { ...patch, senhaAtual: currentPassword } : patch)
      if (u.id === me?.id) session.updateSelf({ name: u.name, email: u.email, phone: u.phone })
      toast('Dados de ' + u.name + ' atualizados.', { title: 'Alterações salvas' })
      onSaved(u)
    } catch (ex) {
      setError(ex.message)
      const fe = { ...(ex.fieldErrors || {}) }
      if (ex.status === 400 && !fe.senhaAtual && /senha atual/i.test(ex.message || '')) fe.senhaAtual = ex.message
      setErrors(fe)
    } finally { sending.current = false; setBusy(false) }
  }
  return <>
    <Modal title="Editar usuário" subtitle="Atualize os dados da conta. Perfil e status são alterados no menu de ações." busy={busy} onClose={close} width={520} footer={<><button type="button" onClick={close} disabled={busy}>Cancelar</button><button type="submit" form={id} className="gold" disabled={busy || !dirty}>{busy ? 'Salvando…' : 'Salvar alterações'}</button></>}>
      <form id={id} ref={formRef} onSubmit={submit} className={s.form} noValidate aria-busy={busy}>
        {error && <Notice title="Não foi possível salvar as alterações" focus>{error}</Notice>}
        <fieldset disabled={busy}>
          {[['name', 'Nome completo', 'Ex.: Mariana Costa'], ['email', 'E-mail de acesso', 'Ex.: nome@adega.com.br'], ['phone', 'Telefone (opcional)', 'Ex.: (11) 90000-0000']].map(([key, label, example]) => <label key={key}><span>{label}{key !== 'phone' && <RequiredMark />}</span><input type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} required={key !== 'phone'} readOnly={key === 'email' && !canChangeEmail} value={key === 'phone' ? fmtPhone(form.phone) : form[key]} onChange={event => update(key, key === 'phone' ? onlyDigits(event.target.value).slice(0, 11) : event.target.value)} maxLength={key === 'name' ? 100 : key === 'phone' ? 16 : undefined} placeholder={example} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? id + '-' + key : undefined} autoFocus={key === 'name'} />{errors[key] && <small id={id + '-' + key} role="alert">{errors[key]}</small>}</label>)}
          {!canChangeEmail && <small>O e-mail pode ser alterado por alguém com todas as permissões desta conta.</small>}
          {needsPassword && <label>
            <span>Senha atual<RequiredMark /></span>
            <input type="password" autoComplete="current-password" required value={currentPassword}
              onChange={event => {
                setCurrentPassword(event.target.value)
                setErrors(current => ({ ...current, senhaAtual: undefined }))
                setError('')
              }}
              aria-invalid={!!errors.senhaAtual}
              aria-describedby={errors.senhaAtual ? id + '-senha-atual' : undefined} />
            {errors.senhaAtual && <small id={id + '-senha-atual'} role="alert">{errors.senhaAtual}</small>}
          </label>}
        </fieldset>
      </form>
    </Modal>
    {discard && <ConfirmModal title="Descartar alterações?" confirmLabel="Descartar" onClose={() => setDiscard(false)} onConfirm={onClose}><p>Os dados alterados ainda não foram salvos.</p></ConfirmModal>}
  </>
}
