import { useState } from 'react'
import { Eye, Pencil, KeyRound, UserX, UserCheck, Trash2 } from 'lucide-react'
import { api } from '@/shared/api/api.js'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { useStore } from '@/entities/store'
import { isManagerProfile } from '@/entities/access'
import { ConfirmModal } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { ChangeProfileModal } from '@/features/access-management/user-editor/ui/ChangeProfileModal.jsx'
import a from '@/entities/access/ui/access.module.css'

/*
 * Ações sobre usuários (lista e detalhe compartilham as mesmas regras e confirmações).
 * Retorna { menuItems(user, opts), open, modals }.
 */
export function useUserActions({ navigate, onView, onEdit, perfis = [], funcionalidades = [], onChanged, onDeleted }) {
  const { user: me, can, session } = useStore()
  const toast = useToast()
  const [modal, setModal] = useState(null) // { type, user | users }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const showModal = value => { setError(''); setModal(value) }

  const manager = isManagerProfile(me?.profileName)
  const isSelf = u => u?.id === me?.id
  const canManage = u => manager || !isManagerProfile(u.profileName)
  const canEdit = u => can('USUARIOS_EDITAR') && canManage(u)
  const canChangeStatus = u => canEdit(u) && !isSelf(u)
  const canChangeProfile = u => canEdit(u) && (manager || !isSelf(u)) && perfis.some(p => p.id !== u.profileId)
  const close = () => { if (!busy) { setError(''); setModal(null) } }

  async function run(fn, { title, message }) {
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const result = await fn()
      toast(message, { title })
      setModal(null)
      return result
    } catch (e) {
      setError(e.message)
      return undefined
    } finally {
      setBusy(false)
    }
  }

  const open = {
    changeProfile: (user) => { if (canChangeProfile(user)) showModal({ type: 'perfil', user }) },
    toggleActive: (user) => { if (canChangeStatus(user)) showModal({ type: user.active ? 'inativar' : 'reativar', user }) },
    remove: (user) => showModal({ type: 'excluir', user }),
    bulkActive: (users, active) => showModal({ type: 'lote', users: users.filter(u => canChangeStatus(u) && u.active !== active), active }),
  }

  function menuItems(u, { view = true, edit = true } = {}) {
    const self = isSelf(u)
    const editTarget = canEdit(u)
    const deleteTarget = can('USUARIOS_EXCLUIR') && canManage(u)
    return [
      view && { label: 'Ver detalhes', icon: Eye, onClick: () => onView ? onView(u) : navigate('usuario', { id: u.id }) },
      edit && editTarget && { label: 'Editar dados', icon: Pencil, onClick: () => onEdit ? onEdit(u) : navigate('editarusuario', { id: u.id }) },
      canChangeProfile(u) && { label: 'Mudar perfil', icon: KeyRound, onClick: () => open.changeProfile(u) },
      (editTarget || deleteTarget) && { divider: true },
      editTarget && (manager || !self) && {
        label: u.active ? 'Inativar acesso' : 'Reativar acesso', icon: u.active ? UserX : UserCheck,
        disabled: self, hint: 'Você não pode inativar a própria conta', onClick: () => open.toggleActive(u),
      },
      deleteTarget && {
        label: 'Excluir usuário', icon: Trash2, danger: true,
        disabled: self, hint: 'Você não pode excluir a própria conta', onClick: () => open.remove(u),
      },
    ]
  }

  const m = modal
  const modals = (
    <>
      {m?.type === 'perfil' && (
        <ChangeProfileModal
          user={m.user} perfis={perfis} funcionalidades={funcionalidades} isSelf={isSelf(m.user)} busy={busy} error={error} onClose={close}
          onConfirm={(novo) => run(async () => {
            const u = await api.usuarios.atualizar(m.user.id, { nomePerfil: novo.nome })
            if (isSelf(m.user)) {
              session.updateSelf(u)
              await session.logout()
            }
            onChanged?.(u)
          }, { title: 'Perfil alterado', message: `${m.user.name} agora tem o perfil ${novo.nome}.` })}
        />
      )}

      {m?.type === 'inativar' && (
        <ConfirmModal
          title={`Inativar ${m.user.name}?`}
          confirmLabel="Inativar acesso" danger busy={busy} error={error} onClose={close}
          onConfirm={() => run(async () => onChanged?.(await api.usuarios.atualizar(m.user.id, { active: false })),
            { title: 'Usuário inativado', message: `${m.user.name} não consegue mais entrar no sistema.` })}
        >
          <ul className={a.consequences}>
            <li>Não conseguirá entrar no sistema a partir de agora.</li>
            <li>Dados, perfil e histórico de vendas e movimentações são <b>preservados</b>.</li>
            <li>Pode ser reativado a qualquer momento.</li>
          </ul>
        </ConfirmModal>
      )}

      {m?.type === 'reativar' && (
        <ConfirmModal
          title={`Reativar ${m.user.name}?`} confirmLabel="Reativar acesso" busy={busy} error={error} onClose={close}
          onConfirm={() => run(async () => onChanged?.(await api.usuarios.atualizar(m.user.id, { active: true })),
            { title: 'Usuário reativado', message: `${m.user.name} pode entrar novamente.` })}
        >
          <p>O acesso volta com o perfil <b>{m.user.profileName || '—'}</b> e os ajustes individuais que já existiam.</p>
        </ConfirmModal>
      )}

      {m?.type === 'excluir' && (
        <ConfirmModal
          title={`Excluir ${m.user.name}?`}
          subtitle="Esta ação é permanente e não pode ser desfeita."
          confirmLabel="Excluir definitivamente" danger busy={busy} error={error} requireText={m.user.email} onClose={close}
          extraActions={canChangeStatus(m.user) && m.user.active && (
            <button type="button" className={a.linkBtn} disabled={busy} onClick={() => open.toggleActive(m.user)}>Inativar em vez disso</button>
          )}
          onConfirm={() => run(async () => { await api.usuarios.excluir(m.user.id); onDeleted?.(m.user) },
            { title: 'Usuário excluído', message: `A conta de ${m.user.name} foi removida.` })}
        >
          <ul className={a.consequences}>
            <li>A conta e os ajustes individuais de permissão serão apagados.</li>
            <li>Registros antigos (vendas, movimentações) podem ficar sem responsável identificado.</li>
            <li>Se a pessoa só saiu da equipe, prefira <b>inativar</b>.</li>
          </ul>
        </ConfirmModal>
      )}

      {m?.type === 'lote' && (
        <ConfirmModal
          title={`${m.active ? 'Reativar' : 'Inativar'} ${m.users.length} usuário${m.users.length === 1 ? '' : 's'}?`}
          confirmLabel={m.active ? 'Reativar todos' : 'Inativar todos'} danger={!m.active} busy={busy} error={error} disabled={m.users.length === 0} onClose={close}
          onConfirm={() => run(async () => {
            const res = []
            for (const u of m.users) {
              try { res.push({ status: 'fulfilled', value: await api.usuarios.atualizar(u.id, { active: m.active }) }) }
              catch (reason) { res.push({ status: 'rejected', reason, user: u }) }
            }
            const failed = res.filter(r => r.status === 'rejected').length
            res.forEach(r => r.status === 'fulfilled' && onChanged?.(r.value))
            if (failed) { setModal(current => ({ ...current, users: res.filter(r => r.status === 'rejected').map(r => r.user) })); throw new Error(`${failed} de ${m.users.length} não puderam ser atualizados. Os concluídos foram retirados desta operação.`) }
          }, { title: 'Status atualizado', message: `${m.users.length} usuário(s) ${m.active ? 'reativado(s)' : 'inativado(s)'}.` })}
        >
          {m.users.length === 0
            ? <p>Nenhum dos selecionados precisa de alteração (sua própria conta é ignorada).</p>
            : <ul className={a.consequences}>{m.users.map(u => <li key={u.id}>{u.name} <span className={a.muted}>· {u.email}</span></li>)}</ul>}
        </ConfirmModal>
      )}
    </>
  )

  return { menuItems, open, modals, isSelf, canChangeProfile, canChangeStatus }
}
