import { useState } from 'react'
import { Plus, Eye, Pencil, Copy, Trash2, KeyRound } from 'lucide-react'
import { api } from '../../../lib/api.js'
import { useResource } from '../../../lib/useResource.js'
import { agruparPorModulo } from '../../../lib/funcionalidades.js'
import { useStore } from '../useStore.js'
import { DataTable } from '../components/DataTable.jsx'
import { AccessTabs, ActionMenu, LoadingBlock, ErrorBlock } from './ui.jsx'
import { EditProfileModal, DeleteProfileModal } from './ProfileModals.jsx'
import a from './acesso.module.css'

/* ─── Lista de perfis de acesso ─── */
export function ProfilesList({ navigate }) {
  const { can } = useStore()
  const perfis = useResource(() => api.perfis.listar(), [])
  const users = useResource(() => (can('USUARIOS_VISUALIZAR') ? api.usuarios.listar() : []), [])
  const funcs = useResource(() => api.funcionalidades.listar().catch(() => []), [])
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null) // { type: 'edit' | 'delete', perfil }

  if (perfis.error && !perfis.data) {
    return (
      <>
        <AccessTabs active="perfis" navigate={navigate} can={can} />
        <ErrorBlock error={perfis.error} onRetry={perfis.reload} />
      </>
    )
  }

  const all = perfis.data || []
  const usuariosDo = (id) => (users.data || []).filter(u => u.profileId === id)
  const query = q.trim().toLowerCase()
  const rows = all.filter(p => !query || p.nome.toLowerCase().includes(query) || p.descricao.toLowerCase().includes(query))
  const total = funcs.data?.length || 0

  const columns = [
    {
      key: 'nome', header: 'Perfil',
      render: p => (
        <span className={a.profileCell}>
          <i aria-hidden="true"><KeyRound size={14} /></i>
          <span>
            <a href={`#/perfil?id=${p.id}`} className={a.userLink} onClick={e => { e.preventDefault(); e.stopPropagation(); navigate('perfil', { id: p.id }) }}>{p.nome}</a>
            <small>{p.descricao || <span className={a.muted}>Sem descrição</span>}</small>
          </span>
        </span>
      ),
    },
    {
      key: 'func', header: 'Funcionalidades', width: 320, sort: p => p.codigos.length,
      render: p => {
        const mods = funcs.data ? agruparPorModulo(funcs.data.filter(f => p.codigos.includes(f.codigo))) : []
        return (
          <span className={a.funcCell}>
            <b>{p.codigos.length}{total ? <small> de {total}</small> : null}</b>
            <span>{mods.map(m => <em key={m.id} className={a.modChip}>{m.nome}</em>)}</span>
          </span>
        )
      },
    },
    {
      key: 'users', header: 'Usuários', width: 110, align: 'right', sort: p => usuariosDo(p.id).length,
      render: p => {
        const n = usuariosDo(p.id).length
        return n
          ? <a href="#/usuarios" className={a.userLink} onClick={e => { e.preventDefault(); e.stopPropagation(); navigate('usuarios', { perfil: p.id, status: 'todos' }) }}>{n} usuário{n === 1 ? '' : 's'}</a>
          : <span className={a.muted}>Nenhum</span>
      },
    },
    {
      key: 'acoes', header: <span className={a.srOnly}>Ações</span>, width: 56, sort: false, align: 'right',
      render: p => {
        const n = usuariosDo(p.id).length
        return (
          <ActionMenu label={`Ações do perfil ${p.nome}`} items={[
            { label: 'Ver detalhes', icon: Eye, onClick: () => navigate('perfil', { id: p.id }) },
            { label: 'Editar nome e descrição', icon: Pencil, onClick: () => setModal({ type: 'edit', perfil: p }) },
            { label: 'Duplicar perfil', icon: Copy, onClick: () => navigate('novoperfil', { copiar: p.id }) },
            { divider: true },
            { label: 'Excluir perfil', icon: Trash2, danger: true, onClick: () => setModal({ type: 'delete', perfil: p }),
              disabled: n > 0, hint: `${n} usuário(s) vinculado(s)` },
          ]} />
        )
      },
    },
  ]

  return (
    <>
      <AccessTabs active="perfis" navigate={navigate} can={can} />
      <div className={a.toolbar}>
        <input type="search" className={a.search} placeholder="Buscar perfil…" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar perfil" />
        <div className={a.toolbarActions}>
          <button className="gold" onClick={() => navigate('novoperfil')}>Novo perfil <Plus size={14} aria-hidden="true" /></button>
        </div>
      </div>

      {perfis.loading && !perfis.data ? <LoadingBlock lines={5} label="Carregando perfis" /> : (
        <DataTable
          caption="Perfis de acesso"
          columns={columns}
          rows={rows}
          initialSort={{ key: 'nome', dir: 'asc' }}
          onRowClick={p => navigate('perfil', { id: p.id })}
          emptyText={query ? 'Nenhum perfil encontrado.' : 'Nenhum perfil cadastrado. Crie o primeiro para poder cadastrar usuários.'}
        />
      )}

      {modal?.type === 'edit' && (
        <EditProfileModal perfil={modal.perfil} perfis={all} onClose={() => setModal(null)}
          onSaved={(p) => { perfis.setData(list => list.map(x => (x.id === p.id ? p : x))); setModal(null) }} />
      )}
      {modal?.type === 'delete' && (
        <DeleteProfileModal perfil={modal.perfil} usuarios={usuariosDo(modal.perfil.id)} onClose={() => setModal(null)}
          onDeleted={() => { perfis.setData(list => list.filter(x => x.id !== modal.perfil.id)); setModal(null) }} />
      )}
    </>
  )
}
