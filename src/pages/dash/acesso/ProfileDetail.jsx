import { useEffect, useState } from 'react'
import { KeyRound, Pencil, Copy, Trash2, ListChecks, Plus, Minus } from 'lucide-react'
import { api } from '../../../lib/api.js'
import { useResource } from '../../../lib/useResource.js'
import { diffCodigos } from '../../../lib/funcionalidades.js'
import { useToast } from '../../../components/useToast.js'
import { useStore } from '../useStore.js'
import { Avatar, UserStatus, ActionMenu, LoadingBlock, ErrorBlock, ConfirmModal, Section } from './ui.jsx'
import { FuncionalidadesPicker } from './Permissoes.jsx'
import { EditProfileModal, DeleteProfileModal } from './ProfileModals.jsx'
import a from './acesso.module.css'

/* ─── Detalhe do perfil (Object Page) ─── */
export function ProfileDetail({ navigate, profileId, setTitle }) {
  const { can } = useStore()
  const toast = useToast()
  const perfil = useResource(() => api.perfis.obter(profileId), [profileId])
  const perfis = useResource(() => api.perfis.listar(), [])
  const funcs = useResource(() => api.funcionalidades.listar(), [])
  const users = useResource(() => (can('USUARIOS_VISUALIZAR') ? api.usuarios.listar() : []), [])

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState([])
  const [modal, setModal] = useState(null) // 'edit' | 'delete' | 'confirm'
  const [saving, setSaving] = useState(false)

  const p = perfil.data
  useEffect(() => { if (p) setTitle?.(p.nome) }, [p?.nome]) // eslint-disable-line react-hooks/exhaustive-deps

  if (perfil.error) return <ErrorBlock error={perfil.error} onRetry={perfil.reload} onBack={() => navigate('perfis')} backLabel="Voltar para perfis" />
  if (!p) return <LoadingBlock lines={8} label="Carregando perfil" />

  const vinculados = (users.data || []).filter(u => u.profileId === p.id)
  const ativos = vinculados.filter(u => u.active).length
  const { ganha, perde } = diffCodigos(p.codigos, draft)
  const nChanges = ganha.length + perde.length

  async function saveFuncs() {
    setSaving(true)
    try {
      await api.perfis.substituirFuncionalidades(p.id, draft)
      perfil.setData({ ...p, codigos: [...draft] })
      setEditing(false)
      setModal(null)
      toast(`${p.nome}: +${ganha.length} / −${perde.length} funcionalidade(s).${vinculados.length ? ` ${vinculados.length} usuário(s) afetado(s).` : ''}`, { title: 'Funcionalidades atualizadas' })
    } catch (e) {
      toast(e.message, { type: 'error', title: 'Não foi possível salvar' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <article className={`card ${a.hero}`}>
        <i className={a.heroIcon} aria-hidden="true"><KeyRound size={24} /></i>
        <div className={a.heroMain}>
          <h2>{p.nome}</h2>
          <p className={a.heroMeta}>{p.descricao || <span className={a.muted}>Sem descrição</span>}</p>
          <p className={a.heroTags}>
            <em className={a.modChip}>{p.codigos.length} funcionalidade{p.codigos.length === 1 ? '' : 's'}</em>
            <em className={a.modChip}>{vinculados.length} usuário{vinculados.length === 1 ? '' : 's'}{vinculados.length ? ` · ${ativos} ativo${ativos === 1 ? '' : 's'}` : ''}</em>
          </p>
        </div>
        <div className={a.heroActions}>
          <button className="gold" onClick={() => setModal('edit')}><Pencil size={13} aria-hidden="true" /> Editar</button>
          <ActionMenu label="Mais ações" items={[
            { label: 'Duplicar perfil', icon: Copy, onClick: () => navigate('novoperfil', { copiar: p.id }) },
            { divider: true },
            { label: 'Excluir perfil', icon: Trash2, danger: true, onClick: () => setModal('delete'),
              disabled: vinculados.length > 0, hint: `${vinculados.length} usuário(s) vinculado(s)` },
          ]} />
        </div>
      </article>

      <div className={a.detailGrid}>
        <div>
          <Section
            id="funcionalidades"
            title="Funcionalidades"
            desc={editing ? 'Marque o que este perfil permite. As alterações aparecem destacadas.' : 'O que os usuários com este perfil podem fazer.'}
            actions={editing ? (
              <>
                <button onClick={() => setEditing(false)} disabled={saving}>Descartar</button>
                <button className="gold" disabled={!nChanges || saving}
                  onClick={() => (vinculados.length ? setModal('confirm') : saveFuncs())}>
                  {saving ? 'Salvando…' : 'Salvar'} {nChanges > 0 && !saving && <span className={a.countBadge}>+{ganha.length} −{perde.length}</span>}
                </button>
              </>
            ) : funcs.data && (
              <button onClick={() => { setDraft([...p.codigos]); setEditing(true) }}><ListChecks size={13} aria-hidden="true" /> Editar funcionalidades</button>
            )}
          >
            {funcs.error ? <ErrorBlock error={funcs.error} onRetry={funcs.reload} />
              : !funcs.data ? <LoadingBlock lines={4} />
              : editing ? <FuncionalidadesPicker funcionalidades={funcs.data} value={draft} onChange={setDraft} baseline={p.codigos} idPrefix="edit" />
              : <FuncionalidadesPicker readOnly funcionalidades={funcs.data} value={p.codigos} />}
          </Section>
        </div>

        <div>
          <Section title="Usuários com este perfil" desc={vinculados.length ? undefined : 'Nenhum usuário vinculado — este perfil pode ser excluído.'}>
            {users.loading && !users.data ? <LoadingBlock lines={3} /> : (
              <ul className={a.userList}>
                {vinculados.map(u => (
                  <li key={u.id}>
                    <a href={`#/usuario?id=${u.id}`} onClick={e => { e.preventDefault(); navigate('usuario', { id: u.id }) }}>
                      <Avatar name={u.name} size={30} inactive={!u.active} />
                      <span><b>{u.name}</b><small>{u.email}</small></span>
                      <UserStatus active={u.active} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {modal === 'edit' && (
        <EditProfileModal perfil={p} perfis={perfis.data || []} onClose={() => setModal(null)}
          onSaved={(np) => { perfil.setData(np); perfis.reload(); setModal(null) }} />
      )}
      {modal === 'delete' && (
        <DeleteProfileModal perfil={p} usuarios={vinculados} onClose={() => setModal(null)} onDeleted={() => navigate('perfis')} />
      )}
      {modal === 'confirm' && (
        <ConfirmModal
          title={`Alterar funcionalidades de ${p.nome}?`}
          subtitle={`Afeta ${vinculados.length} usuário(s) imediatamente.`}
          confirmLabel="Aplicar alterações" busy={saving} onClose={() => setModal(null)} onConfirm={saveFuncs}
        >
          <div className={a.diff}>
            <div>
              <b className={a.diffAdd}><Plus size={13} aria-hidden="true" /> Adicionadas ({ganha.length})</b>
              {ganha.length ? <ul>{ganha.map(c => <li key={c}>{funcs.data.find(f => f.codigo === c)?.nome || c}</li>)}</ul> : <p className={a.muted}>Nenhuma.</p>}
            </div>
            <div>
              <b className={a.diffDel}><Minus size={13} aria-hidden="true" /> Removidas ({perde.length})</b>
              {perde.length ? <ul>{perde.map(c => <li key={c}>{funcs.data.find(f => f.codigo === c)?.nome || c}</li>)}</ul> : <p className={a.muted}>Nenhuma.</p>}
            </div>
          </div>
          <p className={a.note}>Ajustes individuais de cada usuário continuam valendo.</p>
        </ConfirmModal>
      )}
    </>
  )
}
