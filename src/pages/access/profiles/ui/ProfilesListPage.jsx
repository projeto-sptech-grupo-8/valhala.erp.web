import { FilterActions, FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import { useId, useState } from 'react'
import { Plus, Eye, Pencil, Copy, Trash2, KeyRound, SlidersHorizontal, ChevronDown, Users, ListChecks, CircleHelp } from 'lucide-react'
import { api } from '@/shared/api/api.js'
import { useResource } from '@/shared/lib/hooks/useResource.js'
import { agruparPorModulo } from '@/shared/config/funcionalidades.js'
import { useStore } from '@/entities/store'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { AccessTabs, ActionMenu } from '@/entities/access/ui'
import { ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { EditProfileModal, DeleteProfileModal } from '@/features/access-management'
import a from '@/entities/access/ui/access.module.css'
import ui from '@/pages/catalog/products/ui/ProductsPage.module.css'
import filters from './ProfilesListPage.module.css'
import { ProfileDetailsDrawer } from './ProfileDetailsDrawer.jsx'

/* ─── Lista de perfis de acesso ─── */
export function ProfilesList({ navigate, pageParams }) {
  const { can } = useStore()
  const perfis = useResource(() => api.perfis.listar(), [])
  const users = useResource(() => (can('USUARIOS_VISUALIZAR') ? api.usuarios.listar() : []), [])
  const funcs = useResource(() => api.funcionalidades.listar(), [])
  const [q, setQ] = useState('')
  const [detailId, setDetailId] = useState(pageParams?.detalhe || null)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [range, setRange] = useState({ funcMin: '', funcMax: '', userMin: '', userMax: '' })
  const [modal, setModal] = useState(null) // { type: 'edit' | 'delete', perfil }

  if (perfis.error && !perfis.data) {
    return (
      <>
        <AccessTabs active="perfis" navigate={navigate} can={can} />
        <ErrorBlock error={perfis.error} onRetry={perfis.reload} />
      </>
    )
  }

  const all = perfis.loading || perfis.error ? [] : perfis.data || []
  const usersKnown = can('USUARIOS_VISUALIZAR') && !!users.data && !users.error && !users.loading
  const usersByProfile = new Map()
  for (const u of users.data || []) { const group = usersByProfile.get(u.profileId) || []; group.push(u); usersByProfile.set(u.profileId, group) }
  const usuariosDo = id => usersByProfile.get(id) || []
  const query = q.trim().toLowerCase()
  const invalidRange = ['func', 'user'].some(key => range[key + 'Min'] !== '' && range[key + 'Max'] !== '' && Number(range[key + 'Min']) > Number(range[key + 'Max']))
  const within = (value, min, max) => (min === '' || value >= Number(min)) && (max === '' || value <= Number(max))
  const hasFilters = !!query || Object.values(range).some(value => value !== '')
  const rows = invalidRange ? [] : all.filter(p => (!query || p.nome.toLowerCase().includes(query) || p.descricao.toLowerCase().includes(query)) && within(p.codigos.length, range.funcMin, range.funcMax) && (!usersKnown || within(usuariosDo(p.id).length, range.userMin, range.userMax)))
  const total = funcs.data?.length || 0

  const columns = [
    {
      key: 'nome', header: 'Perfil', width: 312,
      render: p => (
        <span className={a.profileCell}>
          <i aria-hidden="true"><KeyRound size={14} /></i>
          <span>
            <a href={`#/perfil?id=${p.id}`} className={a.userLink} onClick={e => { e.preventDefault(); e.stopPropagation(); setDetailId(p.id) }}>{p.nome}</a>
            <small>{p.descricao || <span className={a.muted}>Sem descrição</span>}</small>
          </span>
        </span>
      ),
    },
    {
      key: 'func', header: 'Funcionalidades', sort: p => p.codigos.length,
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
      key: 'users', header: 'Usuários', sort: usersKnown ? p => usuariosDo(p.id).length : false,
      render: p => {
        const n = usuariosDo(p.id).length
        if (!usersKnown) return <span className={a.muted}>{users.loading ? 'Carregando…' : 'Indisponível'}</span>
        return n
          ? <a href="#/usuarios" className={a.userLink} onClick={e => { e.preventDefault(); e.stopPropagation(); navigate('usuarios', { perfil: p.id, status: 'todos' }) }}>{n} usuário{n === 1 ? '' : 's'}</a>
          : <span className={a.muted}>Nenhum</span>
      },
    },
    {
      key: 'acoes', header: 'Ações', sort: false, align: 'center',
      render: p => {
        const n = usuariosDo(p.id).length
        return (
          <ActionMenu label={`Ações do perfil ${p.nome}`} items={[
            { label: 'Ver detalhes', icon: Eye, onClick: () => setDetailId(p.id) },
            { label: 'Editar nome e descrição', icon: Pencil, onClick: () => setModal({ type: 'edit', perfil: p }) },
            { label: 'Duplicar perfil', icon: Copy, onClick: () => navigate('novoperfil', { copiar: p.id }) },
            { divider: true },
            { label: 'Excluir perfil', icon: Trash2, danger: true, onClick: () => setModal({ type: 'delete', perfil: p }),
              disabled: !usersKnown || n > 0, hint: !usersKnown ? 'Consulte os usuários vinculados antes de excluir' : `${n} usuário(s) vinculado(s)` },
          ]} />
        )
      },
    },
  ]

  return (
    <>
      <AccessTabs active="perfis" navigate={navigate} can={can} />
      <section className={ui.panel} aria-labelledby="profile-filter-title">
        <FilterHeader className={ui.heading}><div><h2 id="profile-filter-title"><button type="button" className={ui.collapse} aria-expanded={filtersOpen} aria-controls="profile-filter-fields" onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={17} aria-hidden="true" />Filtros de perfis<ChevronDown size={17} aria-hidden="true" className={filtersOpen ? ui.expanded : undefined} /></button></h2></div><FilterActions compact onClear={() => { setQ(''); setRange({ funcMin: '', funcMax: '', userMin: '', userMax: '' }) }} onRefresh={() => { perfis.reload(); users.reload(); funcs.reload() }} refreshing={perfis.loading || users.loading}><button className="gold" onClick={() => navigate('novoperfil')}><Plus size={14} aria-hidden="true" />Novo perfil</button></FilterActions></FilterHeader>
        <div id="profile-filter-fields" hidden={!filtersOpen}><div className={filters.ranges}>
          {[['func', 'Quantidade de funcionalidades', ListChecks], ['user', 'Quantidade de usuários', Users]].map(([key, title, Icon]) => <fieldset key={key} aria-label={title} disabled={key === 'user' && !usersKnown}><legend><Icon size={16} aria-hidden="true" />{title}<QuantityHelp kind={key} /></legend><div className={filters.bounds}>
            {['Min', 'Max'].map(bound => <label key={bound}>{bound === 'Min' ? 'No mínimo' : 'No máximo'}<input type="number" min="0" step="1" value={range[key + bound]} placeholder={bound === 'Min' ? 'Ex.: 0' : 'Sem limite'} onChange={e => { const value = e.target.value; if (value === '' || /^\d+$/.test(value)) setRange(current => ({ ...current, [key + bound]: value })) }} /></label>)}
          </div><p>{key === 'func' ? 'Número de funcionalidades incluídas no perfil.' : 'Inclui usuários ativos e inativos. Use 0 nos dois campos para encontrar perfis sem usuários.'}</p></fieldset>)}
        </div></div>
        <div className={ui.bottom + ' ' + filters.bottom}><label className={ui.field}>Buscar nome<input type="search" placeholder="Ex.: Gerente ou Caixa" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar perfil" /></label></div>
        {invalidRange && <p role="alert" className={filters.error}>O mínimo deve ser menor ou igual ao máximo em cada intervalo.</p>}
        {!usersKnown && <p role="status" className={a.muted}>{users.loading ? 'Carregando a quantidade de usuários…' : 'Filtro por usuários indisponível: é necessário acesso à lista de usuários e uma consulta concluída.'}</p>}
      </section>

      {perfis.error && perfis.data && <ErrorBlock error={perfis.error} onRetry={perfis.reload} />}
      {perfis.loading ? <LoadingBlock lines={5} label="Carregando perfis" /> : (
        <div className={filters.profileTable}>
          <DataTable compactColumns={['nome', 'users', 'acoes']}
            key={JSON.stringify([q, range])}
            caption="Perfis de acesso"
            columns={columns}
            rows={rows}
            initialSort={{ key: 'nome', dir: 'asc' }}
            onRowClick={p => setDetailId(p.id)}
            emptyText={hasFilters || invalidRange ? 'Nenhum perfil encontrado com os filtros informados.' : 'Nenhum perfil cadastrado. Crie o primeiro para poder cadastrar usuários.'}
          />
        </div>
      )}

      {detailId && <ProfileDetailsDrawer key={detailId} profileId={detailId} users={users} funcs={funcs} onClose={() => setDetailId(null)} />}
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

function QuantityHelp({ kind }) {
  const id = useId()
  const functionality = kind === 'func'
  return <span className={filters.help}>
    <button type="button" className={filters.helpButton} aria-label={functionality ? 'Como filtrar por quantidade de funcionalidades' : 'Como filtrar por quantidade de usuários'} aria-describedby={id}><CircleHelp size={17} aria-hidden="true" /></button>
    <span id={id} role="tooltip" className={filters.helpText}>{functionality ? 'Filtra o número de funcionalidades incluídas no perfil. Ex.: mínimo 5 e máximo 10 mostra perfis com 5 a 10 funcionalidades, incluindo os limites.' : 'Filtra a quantidade de usuários vinculados ao perfil, somando ativos e inativos. Ex.: mínimo 1 e máximo 5 mostra perfis com 1 a 5 usuários. Para perfis sem usuários, informe 0 nos dois campos.'} Para buscar uma quantidade exata, informe o mesmo número nos dois campos. Deixe um campo vazio para não limitar esse lado do intervalo.</span>
  </span>
}
