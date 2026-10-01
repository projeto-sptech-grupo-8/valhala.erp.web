import { useState } from 'react'
import { Eye, Pencil, KeyRound, UserX, UserCheck, Trash2 } from 'lucide-react'
import { api } from '../../../lib/api.js'
import { useToast } from '../../../components/useToast.js'
import { useStore } from '../useStore.js'
import { ConfirmModal } from './ui.jsx'
import { ChangeProfileModal } from './ChangeProfileModal.jsx'
import a from './acesso.module.css'

/*
 * Ações sobre usuários (lista e detalhe compartilham as mesmas regras e confirmações).
 * Retorna { menuItems(user, opts), open, modals }.
 */
export function useUserActions({ navigate, perfis = [], funcionalidades = [], overrides, onChanged, onDeleted }) {
  const { user: me, can, session } = useStore()
  const toast = useToast()
  const [modal, setModal] = useState(null) // { type, user | users }
  const [busy, setBusy] = useState(false)

  const isSelf = (u) => u?.id === me?.id
  const close = () => setModal(null)

  async function run(fn, { title, message }) {
    setBusy(true)
    try {
      const result = await fn()
      toast(message, { title })
      setModal(null)
      return result
    } catch (e) {
      toast(e.message, { type: 'error', title: 'Não foi possível concluir' })
      return undefined
    } finally {
      setBusy(false)
    }
  }

  const open = {
    changeProfile: (user) => setModal({ type: 'perfil', user }),
    toggleActive: (user) => setModal({ type: user.active ? 'inativar' : 'reativar', user }),
    remove: (user) => setModal({ type: 'excluir', user }),
    bulkActive: (users, active) => setModal({ type: 'lote', users: users.filter(u => !isSelf(u) && u.active !== active), active }),
  }

  function menuItems(u, { view = true, edit = true } = {}) {
    const self = isSelf(u)
    return [
      view && { label: 'Ver detalhes', icon: Eye, onClick: () => navigate('usuario', { id: u.id }) },
      edit && can('USUARIOS_EDITAR') && { label: 'Editar dados', icon: Pencil, onClick: () => navigate('editarusuario', { id: u.id }) },
      can('USUARIOS_EDITAR') && { label: 'Mudar perfil', icon: KeyRound, onClick: () => open.changeProfile(u) },
      (can('USUARIOS_INATIVAR') || can('USUARIOS_EXCLUIR')) && { divider: true },
      can('USUARIOS_INATIVAR') && {
        label: u.active ? 'Inativar acesso' : 'Reativar acesso', icon: u.active ? UserX : UserCheck,
        disabled: self, hint: 'Você não pode inativar a própria conta', onClick: () => open.toggleActive(u),
      },
      can('USUARIOS_EXCLUIR') && {
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
          user={m.user} perfis={perfis} funcionalidades={funcionalidades} overrides={overrides} isSelf={isSelf(m.user)} busy={busy} onClose={close}
          onConfirm={(novo) => run(async () => {
            const u = await api.usuarios.atualizar(m.user.id, { profileId: novo.id })
            if (isSelf(m.user)) session.updateSelf({ profileId: novo.id, profileName: novo.nome })
            onChanged?.(u)
          }, { title: 'Perfil alterado', message: `${m.user.name} agora tem o perfil ${novo.nome}.` })}
        />
      )}

      {m?.type === 'inativar' && (
        <ConfirmModal
          title={`Inativar ${m.user.name}?`}
          confirmLabel="Inativar acesso" danger busy={busy} onClose={close}
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
          title={`Reativar ${m.user.name}?`} confirmLabel="Reativar acesso" busy={busy} onClose={close}
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
          confirmLabel="Excluir definitivamente" danger busy={busy} requireText={m.user.email} onClose={close}
          extraActions={can('USUARIOS_INATIVAR') && m.user.active && (
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
          confirmLabel={m.active ? 'Reativar todos' : 'Inativar todos'} danger={!m.active} busy={busy} disabled={m.users.length === 0} onClose={close}
          onConfirm={() => run(async () => {
            const res = await Promise.allSettled(m.users.map(u => api.usuarios.atualizar(u.id, { active: m.active })))
            const failed = res.filter(r => r.status === 'rejected').length
            res.forEach(r => r.status === 'fulfilled' && onChanged?.(r.value))
            if (failed) throw new Error(`${failed} de ${m.users.length} não puderam ser atualizados.`)
          }, { title: 'Status atualizado', message: `${m.users.length} usuário(s) ${m.active ? 'reativado(s)' : 'inativado(s)'}.` })}
        >
          {m.users.length === 0
            ? <p>Nenhum dos selecionados precisa de alteração (sua própria conta é ignorada).</p>
            : <ul className={a.consequences}>{m.users.map(u => <li key={u.id}>{u.name} <span className={a.muted}>· {u.email}</span></li>)}</ul>}
        </ConfirmModal>
      )}
    </>
  )

  return { menuItems, open, modals, isSelf }
}
