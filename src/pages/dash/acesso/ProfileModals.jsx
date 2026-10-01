import { useState } from 'react'
import { api } from '../../../lib/api.js'
import { useToast } from '../../../components/useToast.js'
import { Modal } from '../components/Modal.jsx'
import { ConfirmModal } from './ui.jsx'
import { validarNomePerfil } from './format.js'
import s from '../dash.module.css'
import a from './acesso.module.css'

/* ─── Editar nome/descrição (PATCH só com o que mudou) ─── */
export function EditProfileModal({ perfil, perfis, onClose, onSaved }) {
  const toast = useToast()
  const [nome, setNome] = useState(perfil.nome)
  const [descricao, setDescricao] = useState(perfil.descricao || '')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const patch = {}
  if (nome.trim() !== perfil.nome) patch.nome = nome.trim()
  if (descricao.trim() !== (perfil.descricao || '')) patch.descricao = descricao.trim()
  const changed = Object.keys(patch).length > 0

  async function submit(e) {
    e?.preventDefault()
    const err = 'nome' in patch ? validarNomePerfil(nome, perfis, perfil.id) : null
    if (err) { setErrors({ nome: err }); return }
    if (!changed) return
    setBusy(true)
    try {
      const p = await api.perfis.atualizar(perfil.id, patch)
      toast(`Perfil ${p.nome} atualizado.`, { title: 'Alterações salvas' })
      onSaved(p)
    } catch (ex) {
      setErrors(ex.fieldErrors || {})
      toast(ex.message, { type: 'error', title: 'Não foi possível salvar' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Editar perfil" subtitle="Nome e descrição. As funcionalidades são editadas na própria página." width={480}
      onClose={busy ? () => {} : onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="submit" form="edit-perfil" className="gold" disabled={!changed || busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
      </>}
    >
      <form id="edit-perfil" onSubmit={submit} noValidate className={a.modalForm}>
        <label className={errors.nome ? s.fieldError : undefined}>
          <span>Nome do perfil <i className={s.req} aria-hidden="true">*</i></span>
          <input value={nome} onChange={e => { setNome(e.target.value); setErrors({}) }} maxLength={100} data-autofocus aria-invalid={!!errors.nome} />
          <small className={s.hint}>{nome.trim().length}/100</small>
          {errors.nome && <small className={s.errMsg}>{errors.nome}</small>}
        </label>
        <label>
          <span>Descrição</span>
          <textarea rows={3} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Para que serve este perfil?" />
        </label>
      </form>
    </Modal>
  )
}

/* ─── Excluir perfil (bloqueado com usuários vinculados — regra da API) ─── */
export function DeleteProfileModal({ perfil, usuarios, onClose, onDeleted }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
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
      confirmLabel="Excluir perfil" danger busy={busy} requireText={perfil.nome} onClose={onClose}
      onConfirm={async () => {
        setBusy(true)
        try {
          await api.perfis.excluir(perfil.id)
          toast(`Perfil ${perfil.nome} excluído.`, { title: 'Perfil excluído' })
          onDeleted()
        } catch (e) {
          toast(e.message, { type: 'error', title: 'Não foi possível excluir' })
        } finally {
          setBusy(false)
        }
      }}
    >
      <p>Nenhum usuário usa este perfil. Suas {perfil.codigos.length} funcionalidade(s) deixarão de estar disponíveis como conjunto.</p>
    </ConfirmModal>
  )
}
