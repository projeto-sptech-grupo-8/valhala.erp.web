import { CategoriaModal } from '@/features/catalog/category-editor/ui/CategoriaModal.jsx'
import { FilterActions, FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useId, useState } from 'react'
import { api } from '@/shared/api/api.js'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { useStore } from '@/entities/store'
import { ConfirmModal } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useListParams, useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { SearchInput, QueryFeedback } from '@/features/catalog/remote/RemoteControls.jsx'
import ui from '@/pages/catalog/products/ui/ProductsPage.module.css'
import { CategoryRowActions } from './CategoryRowActions.jsx'
import { Plus, SlidersHorizontal, ChevronDown, CircleAlert, CheckCircle2, CirclePause, Tag } from 'lucide-react'
import a from '@/pages/catalog/categories/ui/CategoriesPage.module.css'

export function Cards({ navigate }) {
  const { can, invalidateCatalog } = useStore()
  const { params, update, clear } = useListParams()
  const [modal, setModal] = useState(null)
  const [deleteCategory, setDeleteCategory] = useState(null)
  const [statusCategory, setStatusCategory] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const helpId = useId()
  const request = { busca: params.busca, ativo: params.ativo, pagina: params.pagina, tamanho: params.tamanho,
    ordenarPor: ['nome', 'criadoEm', 'atualizadoEm'].includes(params.ordenarPor) ? params.ordenarPor : 'nome', direcao: params.direcao }
  const query = useQueryResource(signal => api.categorias.pagina(request, signal), [request])
  const columns = [
    { key: 'nome', header: 'Categoria', width: '33.333%', render: c => <div className={a.categoryCell}><strong>{c.nome}</strong>{c.descricao && <span title={c.descricao}>{c.descricao}</span>}</div> },
    { key: 'ativo', header: 'Status', width: '33.334%', align: 'center', sort: false, render: c => <span className={a.status} data-active={c.ativo}>{c.ativo ? <CheckCircle2 size={14} aria-hidden="true" /> : <CirclePause size={14} aria-hidden="true" />}{c.ativo ? 'Ativa' : 'Inativa'}</span> },
    { key: 'acoes', header: 'Ações', width: '33.333%', align: 'center', sort: false, render: c => <CategoryRowActions category={c} can={can} onEdit={() => setModal({ categoria: c })} onDelete={() => setDeleteCategory(c)} onStatus={() => setStatusCategory(c)} navigate={navigate} /> },
  ]
  return <>
    <section className={ui.panel} aria-labelledby="category-filter-title">
      <FilterHeader className={ui.heading}>
        <div><h2 id="category-filter-title" className={a.filterTitle}><button type="button" className={ui.collapse} aria-expanded={filtersOpen} aria-controls="category-filter-fields" onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={16} aria-hidden="true" />Filtros de categorias<ChevronDown size={17} aria-hidden="true" className={filtersOpen ? ui.expanded : undefined} /></button><span className={a.help}><button type="button" className={a.helpButton} aria-label="Orientações sobre filtros de categorias" aria-describedby={helpId}><CircleAlert size={18} aria-hidden="true" /></button><span id={helpId} role="tooltip" className={a.helpText}>Use a situação para consultar categorias ativas ou inativas. No menu de cada linha, veja os produtos vinculados ou edite a categoria.</span></span></h2></div>
        <FilterActions onClear={clear} onRefresh={query.reload} refreshing={query.loading} compact={can('GERENCIAR_ESTOQUE')}>
          {can('GERENCIAR_ESTOQUE') && <button className="gold" onClick={() => setModal({})}><Plus size={15} aria-hidden="true" />Nova categoria</button>}
        </FilterActions>
      </FilterHeader>
      <div id="category-filter-fields" className={a.filterRow} hidden={!filtersOpen}>
        <label className={ui.field}>Buscar nome<SearchInput label="Buscar categoria" placeholder="Ex.: Cervejas, destilados ou frutas" value={params.busca} onChange={busca => update({ busca })} /></label>
      <div className={a.filterFields}><div className={a.filters}>
        <label className={ui.field}>Status<select aria-label="Status" value={params.ativo || ''} onChange={e => update({ ativo: e.target.value })}><option value="">Todas as categorias</option><option value="true">Ativas</option><option value="false">Inativas</option></select></label>
        <label className={ui.field}>Itens por página<select aria-label="Itens por página" value={params.tamanho} onChange={e => update({ tamanho: Number(e.target.value) })}>{[10,20,50].map(n => <option key={n}>{n}</option>)}</select></label>
      </div>
      </div>
      </div>
    </section>
    <QueryFeedback query={query} />
    <div className={a.table}><DataTable caption="Categorias" columns={columns} rows={query.loading || query.error ? [] : query.data?.itens || []} pageSize={params.tamanho}
      emptyText={query.loading ? 'Carregando categorias…' : query.error ? 'Consulta indisponível.' : params.busca || params.ativo || params.pagina > 0 ? <div className={a.empty}><strong>Nenhuma categoria encontrada nesta busca.</strong><span>Altere o nome ou o status para tentar novamente.</span><button type="button" onClick={clear}>Limpar filtros</button></div> : <div className={a.empty}><Tag size={24} aria-hidden="true" /><strong>Nenhuma categoria cadastrada.</strong><span>Organize seus produtos e drinks criando a primeira categoria.</span>{can('GERENCIAR_ESTOQUE') && <button type="button" onClick={() => setModal({})}><Plus size={15} aria-hidden="true" />Criar primeira categoria</button>}</div>}
      remote={{ page: params.pagina, total: query.data?.totalItens || 0, loading: query.loading,
        sort: { key: request.ordenarPor, dir: params.direcao.toLowerCase() },
        onPage: pagina => update({ pagina }, false), onSort: sort => update({ ordenarPor: sort.key, direcao: sort.dir.toUpperCase() }) }} /></div>
    {deleteCategory && <ExcluirCategoriaModal navigate={navigate} onInactivate={() => { setStatusCategory(deleteCategory); setDeleteCategory(null) }} categoria={deleteCategory} onClose={() => setDeleteCategory(null)} onDeleted={() => { setDeleteCategory(null); query.reload(); invalidateCatalog?.() }} />}
    {statusCategory && <StatusCategoriaModal categoria={statusCategory} onClose={() => setStatusCategory(null)} onSaved={() => { setStatusCategory(null); query.reload(); invalidateCatalog?.() }} />}
    {modal && <CategoriaModal categoria={modal.categoria} categorias={query.data?.itens || []} onClose={() => setModal(null)} onSaved={() => { setModal(null); query.reload(); invalidateCatalog?.() }} />}
  </>
}


function ExcluirCategoriaModal({ categoria, onClose, onDeleted, onInactivate, navigate }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [blocked, setBlocked] = useState(false)
  async function excluir() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await api.categorias.excluir(categoria.id)
      toast('Categoria ' + categoria.nome + ' excluída.', { title: 'Categoria excluída' })
      onDeleted()
    } catch (ex) {
      setError(ex.message)
      if (ex.status === 409) setBlocked(true)
    } finally { setBusy(false) }
  }
  return <ConfirmModal title={'Excluir a categoria ' + categoria.nome + '?'} confirmLabel="Excluir categoria" danger busy={busy} disabled={blocked} onConfirm={excluir} onClose={onClose} extraActions={blocked && <><button type="button" onClick={() => { onClose(); navigate('produtos', { categoriaId: categoria.id }) }}>Ver produtos vinculados</button>{categoria.ativo && <button type="button" onClick={onInactivate}>Inativar categoria</button>}</>}>
    <p className={a.muted}>Categorias com produtos vinculados não podem ser excluídas — nesse caso, inative-a.</p>
    {error && <Notice title="Não foi possível excluir a categoria" focus>{error}</Notice>}
  </ConfirmModal>
}

function StatusCategoriaModal({ categoria, onClose, onSaved }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function confirm() {
    if (busy) return
    setBusy(true); setError('')
    try {
      await api.categorias.atualizar(categoria.id, { ativo: !categoria.ativo })
      toast(`Categoria ${categoria.nome} ${categoria.ativo ? 'inativada' : 'reativada'}.`, { title: 'Status atualizado' })
      onSaved()
    } catch (ex) { setError(ex.message) }
    finally { setBusy(false) }
  }
  return <ConfirmModal title={`${categoria.ativo ? 'Inativar' : 'Reativar'} a categoria ${categoria.nome}?`} confirmLabel={categoria.ativo ? 'Inativar categoria' : 'Reativar categoria'} busy={busy} error={error} onClose={onClose} onConfirm={confirm}>
    <p className={a.muted}>{categoria.ativo ? 'Os produtos continuam vinculados e mantêm seu próprio status. Esta categoria não poderá ser escolhida em novos vínculos. Você poderá reativá-la depois.' : 'Esta categoria voltará a ficar disponível para seleção no cadastro dos produtos e drinks. O status dos produtos existentes não será alterado.'}</p>
  </ConfirmModal>
}
