import { useState } from 'react'
import { UserPlus, UserX, UserCheck, Download } from 'lucide-react'
import { api } from '../../../lib/api.js'
import { useResource } from '../../../lib/useResource.js'
import { fmtDateTime } from '../../../lib/format.js'
import { downloadCSV, stamp } from '../../../lib/csv.js'
import { useToast } from '../../../components/useToast.js'
import { Sel } from '../../../components/ui.jsx'
import { useStore } from '../useStore.js'
import { DataTable } from '../components/DataTable.jsx'
import { AccessTabs, Avatar, UserStatus, ProfileChip, ActionMenu, LoadingBlock, ErrorBlock } from './ui.jsx'
import { useUserActions } from './useUserActions.jsx'
import { fmtPhone } from './format.js'
import a from './acesso.module.css'

const STATUS = [['ativos', 'Ativos'], ['inativos', 'Inativos'], ['todos', 'Todos']]

/* ─── Lista de usuários (List Report) ─── */
export function UsersList({ navigate, pageParams }) {
  const { can } = useStore()
  const toast = useToast()
  const users = useResource(() => api.usuarios.listar(), [])
  const perfis = useResource(() => (can('PERFIS_GERENCIAR') ? api.perfis.listar() : []), [])
  const funcs = useResource(() => (can('PERMISSOES_GERENCIAR') || can('PERFIS_GERENCIAR') ? api.funcionalidades.listar() : []), [])

  const [q, setQ] = useState('')
  const [status, setStatus] = useState(pageParams?.status || 'ativos')
  const [perfilId, setPerfilId] = useState(pageParams?.perfil || '')

  const actions = useUserActions({
    navigate,
    perfis: perfis.data || [],
    funcionalidades: funcs.data || [],
    onChanged: (u) => users.setData(list => list.map(x => (x.id === u.id ? u : x))),
    onDeleted: (u) => users.setData(list => list.filter(x => x.id !== u.id)),
  })

  function setFilter(key, value, setter) {
    setter(value)
    navigate('usuarios', { status, perfil: perfilId, [key]: value }, { replace: true })
  }

  if (users.error && !users.data) {
    return (
      <>
        <AccessTabs active="usuarios" navigate={navigate} can={can} />
        <ErrorBlock error={users.error} onRetry={users.reload} />
      </>
    )
  }

  const all = users.data || []
  const perfisUsados = [...new Map(all.filter(u => u.profileId).map(u => [u.profileId, u.profileName])).entries()]
    .sort((x, y) => String(x[1]).localeCompare(String(y[1]), 'pt-BR'))
  const counts = { ativos: all.filter(u => u.active).length, inativos: all.filter(u => !u.active).length, todos: all.length }
  const query = q.trim().toLowerCase()
  const rows = all.filter(u =>
    (status === 'todos' || (status === 'ativos' ? u.active : !u.active)) &&
    (!perfilId || u.profileId === perfilId) &&
    (!query || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
  )

  function exportar() {
    downloadCSV(`usuarios-${stamp()}`, ['Nome', 'E-mail', 'Telefone', 'Perfil', 'Status', 'Atualizado em'],
      rows.map(u => [u.name, u.email, fmtPhone(u.phone), u.profileName || '', u.active ? 'Ativo' : 'Inativo', u.updatedAt ? fmtDateTime(u.updatedAt) : '']))
    toast(`${rows.length} usuário(s) exportado(s).`, { title: 'Exportação concluída' })
  }

  const columns = [
    {
      key: 'name', header: 'Usuário',
      render: u => (
        <span className={a.userCell}>
          <Avatar name={u.name} inactive={!u.active} />
          <span>
            <span className={a.nameLine}>
              <a href={`#/usuario?id=${u.id}`} onClick={e => { e.preventDefault(); e.stopPropagation(); navigate('usuario', { id: u.id }) }} className={a.userLink}>
                {u.name}
              </a>
              {actions.isSelf(u) && <em className={a.youTag}>você</em>}
            </span>
            <small>{u.email}</small>
          </span>
        </span>
      ),
    },
    {
      key: 'profileName', header: 'Perfil', width: 170,
      render: u => <ProfileChip nome={u.profileName} onClick={can('PERFIS_GERENCIAR') && u.profileId ? () => navigate('perfil', { id: u.profileId }) : undefined} />,
    },
    { key: 'phone', header: 'Telefone', width: 150, render: u => (u.phone ? fmtPhone(u.phone) : <span className={a.muted}>—</span>) },
    { key: 'active', header: 'Status', width: 100, sort: u => (u.active ? 0 : 1), render: u => <UserStatus active={u.active} /> },
    { key: 'updatedAt', header: 'Atualizado em', width: 130, render: u => (u.updatedAt ? <span className={a.muted}>{fmtDateTime(u.updatedAt)}</span> : '—') },
    {
      key: 'acoes', header: <span className={a.srOnly}>Ações</span>, width: 56, sort: false, align: 'right',
      render: u => <ActionMenu label={`Ações de ${u.name}`} items={actions.menuItems(u)} />,
    },
  ]

  return (
    <>
      <AccessTabs active="usuarios" navigate={navigate} can={can} />

      <div className={a.toolbar}>
        <div className={a.segFilter} role="radiogroup" aria-label="Status">
          {STATUS.map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={status === id} className={status === id ? a.segFilterOn : undefined}
              onClick={() => setFilter('status', id, setStatus)}>
              {label} <small>{users.data ? counts[id] : '…'}</small>
            </button>
          ))}
        </div>
        <input type="search" className={a.search} placeholder="Buscar por nome ou e-mail…" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar usuário" />
        <Sel value={perfilId} onChange={e => setFilter('perfil', e.target.value, setPerfilId)} aria-label="Filtrar por perfil" className={a.selPerfil}>
          <option value="">Perfil: todos</option>
          {perfisUsados.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
        </Sel>
        <div className={a.toolbarActions}>
          <button onClick={exportar} disabled={!rows.length}>Exportar <Download size={13} aria-hidden="true" /></button>
          {can('USUARIOS_CRIAR') && (
            <button className="gold" onClick={() => navigate('novousuario')}>Novo usuário <UserPlus size={14} aria-hidden="true" /></button>
          )}
        </div>
      </div>

      {users.loading && !users.data ? <LoadingBlock lines={6} label="Carregando usuários" /> : (
        <DataTable
          caption="Usuários do estabelecimento"
          columns={columns}
          rows={rows}
          initialSort={{ key: 'name', dir: 'asc' }}
          selectable={can('USUARIOS_INATIVAR')}
          onRowClick={u => navigate('usuario', { id: u.id })}
          bulkActions={(sel, clear) => (
            <>
              {sel.some(u => u.active) && <button onClick={() => { actions.open.bulkActive(sel, false); clear() }}><UserX size={13} aria-hidden="true" /> Inativar</button>}
              {sel.some(u => !u.active) && <button onClick={() => { actions.open.bulkActive(sel, true); clear() }}><UserCheck size={13} aria-hidden="true" /> Reativar</button>}
            </>
          )}
          emptyText={query || perfilId
            ? 'Nenhum usuário encontrado com esses filtros.'
            : status === 'inativos' ? 'Nenhum usuário inativo.' : 'Nenhum usuário cadastrado ainda.'}
        />
      )}

      {actions.modals}
    </>
  )
}
