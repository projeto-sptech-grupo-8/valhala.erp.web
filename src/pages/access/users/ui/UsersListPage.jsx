import { FilterActions, FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import { useState } from 'react'
import { UserPlus, UserX, UserCheck, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { api } from '@/shared/api/api.js'
import { useResource } from '@/shared/lib/hooks/useResource.js'
import { fmtDateTime } from '@/shared/lib/format.js'
import ui from '@/pages/catalog/products/ui/ProductsPage.module.css'
import filters from './UsersListPage.module.css'
import { useStore } from '@/entities/store'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { PageSizeControl } from '@/shared/ui/data-table/PageSizeControl.jsx'
import { AccessTabs, Avatar, UserStatus, ProfileChip, ActionMenu } from '@/entities/access/ui'
import { ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useUserActions } from '@/features/access-management'
import { fmtPhone } from '@/entities/access'
import a from '@/entities/access/ui/access.module.css'
import { UserDetailsDrawer } from './UserDetailsDrawer.jsx'
import { EditUserModal } from '@/features/access-management/user-editor/ui/EditUserModal.jsx'

const STATUS = [['ativos', 'Ativos'], ['inativos', 'Inativos'], ['todos', 'Todos']]

/* ─── Lista de usuários (List Report) ─── */
export function UsersList({ navigate, pageParams }) {
  const { can } = useStore()
  const users = useResource(() => api.usuarios.listar(), [])
  const canEditUsers = can('USUARIOS_EDITAR')
  const perfis = useResource(() => (canEditUsers ? api.perfis.atribuiveis() : []), [canEditUsers])
  const funcs = useResource(() => (can('PERMISSOES_GERENCIAR') || can('PERFIS_GERENCIAR') ? api.funcionalidades.listar() : []), [])

  const [q, setQ] = useState('')
  const [status, setStatus] = useState(pageParams?.status || 'ativos')
  const [perfilId, setPerfilId] = useState(pageParams?.perfil || '')
  const [pageSize, setPageSize] = useState(10)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [detailId, setDetailId] = useState(pageParams?.detalhe || null)
  const [editId, setEditId] = useState(pageParams?.editar || null)

  const actions = useUserActions({
    navigate,
    onView: u => setDetailId(u.id),
    onEdit: u => setEditId(u.id),
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

  const all = users.loading || users.error ? [] : users.data || []
  const perfisUsados = [...new Map(all.filter(u => u.profileId).map(u => [u.profileId, u.profileName])).entries()]
    .sort((x, y) => String(x[1]).localeCompare(String(y[1]), 'pt-BR'))
  const counts = { ativos: all.filter(u => u.active).length, inativos: all.filter(u => !u.active).length, todos: all.length }
  const query = q.trim().toLowerCase()
  const rows = all.filter(u =>
    (status === 'todos' || (status === 'ativos' ? u.active : !u.active)) &&
    (!perfilId || u.profileId === perfilId) &&
    (!query || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
  )

  const columns = [
    {
      key: 'name', header: 'Usuário', width: 240,
      render: u => (
        <span className={a.userCell}>
          <Avatar name={u.name} inactive={!u.active} />
          <span>
            <span className={a.nameLine}>
              <span>
                {u.name}
              </span>
              {actions.isSelf(u) && <em className={a.youTag}>você</em>}
            </span>
            <small>{u.email}</small>
          </span>
        </span>
      ),
    },
    {
      key: 'profileName', header: 'Perfil',
      render: u => <ProfileChip nome={u.profileName} onClick={can('PERFIS_GERENCIAR') && u.profileId ? () => navigate('perfil', { id: u.profileId }) : undefined} />,
    },
    { key: 'phone', header: 'Telefone', render: u => (u.phone ? fmtPhone(u.phone) : <span className={a.muted}>—</span>) },
    { key: 'active', header: 'Status', sort: u => (u.active ? 0 : 1), render: u => <UserStatus active={u.active} /> },
    { key: 'updatedAt', header: 'Atualizado em', render: u => (u.updatedAt ? <span className={a.muted}>{fmtDateTime(u.updatedAt)}</span> : '—') },
    {
      key: 'acoes', header: 'Ações', sort: false, align: 'center',
      render: u => <ActionMenu label={`Ações de ${u.name}`} items={actions.menuItems(u)} />,
    },
  ]

  return (
    <>
      <AccessTabs active="usuarios" navigate={navigate} can={can} />

      <section className={ui.panel} aria-labelledby="user-filter-title">
        <FilterHeader className={ui.heading}><div><h2 id="user-filter-title"><button type="button" className={ui.collapse} aria-expanded={filtersOpen} aria-controls="user-filter-fields" onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={17} aria-hidden="true" />Filtros de usuários<ChevronDown size={17} aria-hidden="true" className={filtersOpen ? ui.expanded : undefined} /></button></h2></div><FilterActions onClear={() => { setQ(''); setStatus('ativos'); setPerfilId(''); setPageSize(10); navigate('usuarios', {}, { replace: true }) }} onRefresh={() => { users.reload(); perfis.reload(); funcs.reload() }} refreshing={users.loading} compact={can('USUARIOS_CRIAR')}>{can('USUARIOS_CRIAR') && <button className="gold" onClick={() => navigate('novousuario')}><UserPlus size={15} aria-hidden="true" />Novo usuário</button>}</FilterActions></FilterHeader>
        <div id="user-filter-fields" hidden={!filtersOpen}><div className={ui.filters + ' ' + filters.filters}>
          <div className={ui.field + ' ' + filters.statusField}><span>Status</span><div className={a.segFilter + ' ' + filters.status} role="radiogroup" aria-label="Status">{STATUS.map(([id, label]) => <button key={id} type="button" role="radio" aria-checked={status === id} className={status === id ? a.segFilterOn : undefined} onClick={() => setFilter('status', id, setStatus)}>{label}<small>{users.data ? counts[id] : '…'}</small></button>)}</div></div>
          <label className={ui.field}>Perfil<select value={perfilId} onChange={e => setFilter('perfil', e.target.value, setPerfilId)}><option value="">Todos os perfis</option>{perfilId && !perfisUsados.some(([id]) => id === perfilId) && <option value={perfilId}>Perfil selecionado</option>}{perfisUsados.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label>
        </div></div>
        <div className={ui.bottom + ' ' + filters.bottom}>
          <label className={ui.field}>Buscar nome ou e-mail<input type="search" placeholder="Ex.: Mariana ou mariana@adega.com.br" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar usuário" /></label>

        </div>
      </section>
      {users.error && users.data && <ErrorBlock error={users.error} onRetry={users.reload} />}

      {users.loading ? <LoadingBlock lines={6} label="Carregando usuários" /> : (
        <div className={filters.userTable}>
          <DataTable compactColumns={['name', 'profileName', 'active', 'acoes']}
            key={pageSize}
            pageSize={pageSize}
            paginationControls={<PageSizeControl label="Usuários por página" value={pageSize} options={[5, 10, 15]} onChange={setPageSize} />}
            caption="Usuários do estabelecimento"
            columns={columns}
            rows={rows}
            initialSort={{ key: 'name', dir: 'asc' }}
            selectable={can('USUARIOS_EDITAR')}
            bulkActions={(sel, clear) => (
              <>
                {sel.some(u => u.active && actions.canChangeStatus(u)) && <button onClick={() => { actions.open.bulkActive(sel, false); clear() }}><UserX size={13} aria-hidden="true" /> Inativar</button>}
                {sel.some(u => !u.active && actions.canChangeStatus(u)) && <button onClick={() => { actions.open.bulkActive(sel, true); clear() }}><UserCheck size={13} aria-hidden="true" /> Reativar</button>}
              </>
            )}
            emptyText={query || perfilId
              ? 'Nenhum usuário encontrado com esses filtros.'
              : status === 'inativos' ? 'Nenhum usuário inativo.' : 'Nenhum usuário cadastrado ainda.'}
          />
        </div>
      )}

      {detailId && <UserDetailsDrawer key={detailId} userId={detailId} funcionalidades={funcs.data} onClose={() => setDetailId(null)} />}
      {editId && canEditUsers && <EditUserModal key={editId} userId={editId} onClose={() => setEditId(null)} onSaved={u => { users.setData(list => list.map(item => item.id === u.id ? u : item)); setEditId(null) }} />}
      {actions.modals}
    </>
  )
}
