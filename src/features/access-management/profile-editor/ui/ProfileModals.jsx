import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useState } from 'react'
import { api } from '@/shared/api/api.js'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { Modal } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { ConfirmModal } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { FuncionalidadesPicker } from '@/features/access-management/permissions/ui/PermissionsEditor.jsx'
import { isManagerProfile, validarNomePerfil } from '@/entities/access'
import s from '@/shared/styles/panel.module.css'
import a from '@/entities/access/ui/access.module.css'

/* ─── Editar nome/descrição (PATCH só com o que mudou) ─── */
export function EditProfileModal({ perfil, perfis, onClose, onSaved }) {
  const toast = useToast()
  const [nome, setNome] = useState(perfil.nome)
  const [descricao, setDescricao] = useState(perfil.descricao || '')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const patch = {}
  if (nome.trim() !== perfil.nome) patch.nome = nome.trim()
  if (descricao.trim() !== (perfil.descricao || '')) patch.descricao = descricao.trim()
  const changed = Object.keys(patch).length > 0

  async function submit(e) {
    e?.preventDefault()
    const err = 'nome' in patch ? validarNomePerfil(nome, perfis, perfil.id) : null
    if (err) { setErrors({ nome: err }); return }
    if (!changed) return
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const p = await api.perfis.atualizar(perfil.id, patch)
      toast(`Perfil ${p.nome} atualizado.`, { title: 'Alterações salvas' })
      onSaved(p)
    } catch (ex) {
      setErrors(ex.fieldErrors || {})
      setError(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Editar perfil" subtitle="Atualize o nome e a descrição que identificam este perfil de acesso." width={480}
      busy={busy} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="submit" form="edit-perfil" className="gold" disabled={!changed || busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
      </>}
    >
      <form aria-busy={busy} id="edit-perfil" onSubmit={submit} noValidate className={a.modalForm}>
        {error && <Notice title="Não foi possível salvar o perfil" focus>{error}</Notice>}
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 16 }}>
        <label className={errors.nome ? s.fieldError : undefined}>
          <span>Nome do perfil <i className={s.req} aria-hidden="true">*</i></span>
          <input value={nome} disabled={isManagerProfile(perfil.nome)} onChange={e => { setNome(e.target.value); setErrors({}) }} maxLength={100} data-autofocus aria-invalid={!!errors.nome} />
          <small className={s.hint}>{nome.trim().length}/100</small>
          {errors.nome && <small className={s.errMsg}>{errors.nome}</small>}
        </label>
        <label>
          <span>Descrição</span>
          <textarea rows={3} style={{ resize: 'none' }} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Para que serve este perfil?" />
        </label>
        </fieldset>
      </form>
    </Modal>
  )
}

export function EditProfilePermissionsModal({ perfil, funcionalidades, onClose, onSaved }) {
  const [codigos, setCodigos] = useState(perfil.codigos)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const changed = codigos.length !== perfil.codigos.length || codigos.some(codigo => !perfil.codigos.includes(codigo))

  async function save() {
    if (busy || !changed) return
    setError('')
    setBusy(true)
    try {
      await api.perfis.substituirFuncionalidades(perfil.id, codigos)
      toast(`Funcionalidades de ${perfil.nome} atualizadas.`, { title: 'Permissões atualizadas' })
      onSaved({ ...perfil, codigos })
    } catch (ex) {
      setError(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return <Modal title="Editar funcionalidades" subtitle={perfil.nome}
    width={720} busy={busy} onClose={onClose} footer={<>
      <button type="button" onClick={onClose} disabled={busy}>Cancelar</button>
      <button type="button" className="gold" disabled={!changed || busy} onClick={save}>Salvar permissões</button>
    </>}>
    {error && <Notice title="Não foi possível atualizar as permissões" focus>{error}</Notice>}
    <p>Ao salvar, as sessões dos usuários vinculados a este perfil serão encerradas.</p>
    <fieldset disabled={busy} className={a.modalForm}>
      <FuncionalidadesPicker funcionalidades={funcionalidades} value={codigos} baseline={perfil.codigos}
        onChange={setCodigos} idPrefix="edit-profile" />
    </fieldset>
  </Modal>
}

/* ─── Excluir perfil (bloqueado com usuários vinculados — regra da API) ─── */
export function DeleteProfileModal({ perfil, usuarios, onClose, onDeleted }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const n = usuarios.length

  if (n > 0) {
    return (
      <Modal
        title="Não é possível excluir este perfil" width={480} onClose={onClose}
        subtitle={`${n} usuário${n === 1 ? '' : 's'} ainda ${n === 1 ? 'está vinculado' : 'estão vinculados'} ao perfil ${perfil.nome}.`}
        footer={<button type="button" className="gold" onClick={onClose} data-autofocus>Entendi</button>}
      >
        <p>Mude o perfil desses usuários antes de excluir:</p>
        <ul className={a.consequences}>{usuarios.slice(0, 8).map(u => <li key={u.id}>{u.name} <span className={a.muted}>· {u.email}</span></li>)}</ul>
        {n > 8 && <p className={a.muted}>e mais {n - 8}…</p>}
      </Modal>
    )
  }

  return (
    <ConfirmModal
      title={`Excluir o perfil ${perfil.nome}?`} subtitle="Esta ação é permanente."
      confirmLabel="Excluir perfil" danger busy={busy} error={error} requireText={perfil.nome} onClose={onClose}
      onConfirm={async () => {
        if (busy) return
        setError('')
        setBusy(true)
        try {
          await api.perfis.excluir(perfil.id)
          toast(`Perfil ${perfil.nome} excluído.`, { title: 'Perfil excluído' })
          onDeleted()
        } catch (e) {
          setError(e.message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <p>O perfil será removido se estiver sem usuários vinculados.</p>
    </ConfirmModal>
  )
}
