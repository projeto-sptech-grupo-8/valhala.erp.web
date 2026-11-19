import { FilterActions, FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import { RecordAutocomplete } from '@/features/catalog/product-editor/ui/CategoryAutocomplete.jsx'
import { ImportProductsModal } from '@/pages/inventory/invoice-import/ui/InvoiceImportPage.jsx'
import { useState } from 'react'
import { api } from '@/shared/api/api.js'
import { useStore } from '@/entities/store'
import { getStatus, StatusChip } from '@/entities/inventory'
import { useListParams, useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { fmtBRL, fmtNum } from '@/shared/lib/format.js'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { stamp } from '@/shared/lib/csv.js'
import { EtiquetasModal } from '@/features/catalog/product-labels'
import { ProductDetail } from '@/features/catalog/remote/ProductDetail.jsx'
import { SearchInput, QueryFeedback } from '@/features/catalog/remote/RemoteControls.jsx'
import s from '@/features/catalog/remote/remote.module.css'

import { Download, Printer, Plus, SlidersHorizontal, ChevronDown, Wine, Package, Boxes, GlassWater } from 'lucide-react'
import { ProductRowActions } from './ProductRowActions.jsx'
import ui from './ProductsPage.module.css'
import { CatalogMetricControls, MarginCell, TurnoverCell } from '@/features/catalog/remote/CatalogMetricControls.jsx'
import { useCatalogMetrics } from '@/features/catalog/remote/useCatalogMetrics.js'


const sorts = { nome: 'name', sku: 'sku', precoVenda: 'price', precoCusto: 'cost' }
export function Products({ navigate }) {
  const { can } = useStore()
  const { params, update, clear } = useListParams()
  const [detail, setDetail] = useState(null)
  const [showMargin, setShowMargin] = useState(false)
  const [showTurnover, setShowTurnover] = useState(false)
  const [metricRevision, setMetricRevision] = useState(0)
  const [labels, setLabels] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [importOpen, setImportOpen] = useState(!!params.importar)
  const request = { busca: params.busca, categoriaId: params.categoriaId, tipo: params.tipo, ativo: params.ativo,
    pagina: params.pagina, tamanho: params.tamanho, ordenarPor: sorts[params.ordenarPor] ? params.ordenarPor : 'nome', direcao: params.direcao }
  const query = useQueryResource(signal => api.produtos.pagina(request, signal), [request])
  const rows = query.loading || query.error ? [] : query.data?.itens || []
  const metrics = useCatalogMetrics(rows, { giro: showTurnover, margem: showMargin, enabled: !query.loading && !query.error, revision: metricRevision })
  function refresh() { setMetricRevision(value => value + 1); query.reload() }
  const toast = useToast()
  const [exporting, setExporting] = useState(false)
  async function exportRows(items) {
    if (exporting || !items.length) return
    setExporting(true)
    try {
      const { blob } = await api.produtos.exportar(request, items.map(item => item.id))
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'produtos-' + stamp() + '.xlsx'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      toast(error.message, { type: 'error', title: 'Não foi possível exportar os produtos' })
    } finally {
      setExporting(false)
    }
  }
  const columns = [
    { key: 'sku', header: 'Código', width: 85 },
    { key: 'name', header: 'Produto', width: 190, render: p => <div><button className={ui.name} title={p.name} onClick={() => setDetail(p.id)}>{p.name}</button></div> },
    { key: 'cat', header: 'Categoria', width: 110, sort: false },
    { key: 'tipo', header: 'Tipo / Venda', width: 120, sort: false, render: p => <div className={ui.kindTags}>{p.tipo === 'drink' ? <span className={ui.productKind} data-kind="drink"><Wine size={14} aria-hidden="true" />Drink</span> : <><span className={ui.productKind} data-kind="standard"><Package size={14} aria-hidden="true" />Padrão</span>{(p.fracionado || p.vendaFardo) && <span className={ui.saleIcons}>{p.fracionado && <span className={ui.packSale} data-sale="dose" role="img" tabIndex={0} aria-label={p.volumeEmbalagem ? `Venda por dose · volume da embalagem: ${fmtNum(p.volumeEmbalagem)} ml` : 'Venda por dose · volume não informado'} title={p.volumeEmbalagem ? `Venda por dose · volume da embalagem: ${fmtNum(p.volumeEmbalagem)} ml` : 'Venda por dose · volume não informado'}><GlassWater size={15} aria-hidden="true" />{!p.vendaFardo && <span>Dose{p.volumeEmbalagem ? ` · ${fmtNum(p.volumeEmbalagem)} ml` : ''}</span>}</span>}{p.vendaFardo && <span className={ui.packSale} role="img" tabIndex={0} aria-label={p.unidadesFardo ? `Fardo: ${fmtNum(p.unidadesFardo)} unidades` : 'Fardo · quantidade não informada'} title={p.unidadesFardo ? `Fardo: ${fmtNum(p.unidadesFardo)} unidades` : 'Fardo · quantidade não informada'}><Boxes size={15} aria-hidden="true" />{!p.fracionado && <span>Fardo{p.unidadesFardo ? ` · ${fmtNum(p.unidadesFardo)} un` : ''}</span>}</span>}</span>}</>}</div> },
    { key: 'qty', header: 'Saldo / mínimo', width: 145, align: 'right', sort: false, render: p => p.tipo === 'drink' ? <button type="button" className={ui.recipeLink} onClick={() => setDetail(p.id)} aria-label={'Por receita · consultar ingredientes de ' + p.name}>Por receita</button> : p.fracionado ? <>{fmtNum(p.quantidadeEstoqueBase)} / {fmtNum(p.estoqueMinimoBase)} ml</> : <>{fmtNum(p.qty)} / {fmtNum(p.min)} {p.unit}</> },
    { key: 'price', header: 'Preço', width: 95, align: 'right', render: p => fmtBRL(p.price) },
    { key: 'cost', header: 'Custo', width: 95, align: 'right', render: p => p.tipo === 'drink' ? 'Na receita' : fmtBRL(p.cost) },
    ...(showMargin ? [{ key: 'margem', header: 'Margem bruta', width: 155, align: 'right', sort: false, render: p => <MarginCell loading={metrics.loading || query.loading} data={metrics.data?.[p.id]} /> }] : []),
    ...(showTurnover ? [
      { key: 'giro', header: 'Giro (30 dias)', width: 155, align: 'right', sort: false, render: p => <TurnoverCell product={p} loading={metrics.loading || query.loading} data={metrics.data?.[p.id]} /> },
      { key: 'cobertura', header: 'Cobertura estimada', width: 155, align: 'right', sort: false, render: p => <TurnoverCell coverage product={p} loading={metrics.loading || query.loading} data={metrics.data?.[p.id]} /> },
    ] : []),
    { key: 'stockStatus', header: 'Nível (estimado)', width: 130, sort: false, render: p => p.tipo === 'drink' ? 'Na receita' : p.quantidadeEstoqueBase > 0 && !p.estoqueMinimoBase ? 'Sem mínimo' : <StatusChip status={getStatus({ ...p, qty: p.quantidadeEstoqueBase ?? p.qty, min: p.estoqueMinimoBase ?? p.min })} /> },
    { key: 'ativo', header: 'Status', width: 85, sort: false, render: p => p.ativo ? 'Ativo' : 'Inativo' },
    { key: 'actions', header: 'Ações', width: 65, align: 'center', sort: false, render: p => <ProductRowActions product={p} can={can} onDetail={() => setDetail(p.id)} navigate={navigate} /> },
  ]
  return <>
    <section className={ui.panel} aria-labelledby="catalog-filter-title">
      <FilterHeader className={ui.heading}>
        <div><h2 id="catalog-filter-title"><button className={ui.collapse} aria-expanded={filtersOpen} aria-controls="product-filter-fields" onClick={() => setFiltersOpen(v => !v)}><SlidersHorizontal size={17} aria-hidden="true" />Filtros<ChevronDown size={17} aria-hidden="true" className={filtersOpen ? ui.expanded : undefined} /></button></h2><p>Encontre produtos e drinks e organize sua consulta.</p></div>
        <FilterActions onClear={clear} onRefresh={refresh} refreshing={query.loading} compact={can('GERENCIAR_ESTOQUE')}>{can('GERENCIAR_ESTOQUE') && <button className="gold" onClick={() => navigate('novo')}><Plus size={15} aria-hidden="true" />Novo produto</button>}</FilterActions>
      </FilterHeader>
      <div id="product-filter-fields" hidden={!filtersOpen}><div className={ui.filters}>
        <label className={ui.field}>Tipo<select aria-label="Filtrar por tipo" value={params.tipo || ''} onChange={e => update({ tipo: e.target.value })}><option value="">Todos os tipos</option><option value="PADRAO">Padrão</option><option value="DRINK">Drinks</option></select></label>
        <label className={ui.field}>Status<select aria-label="Status" value={params.ativo ?? ''} onChange={e => update({ ativo: e.target.value })}><option value="">Todos</option><option value="true">Ativos</option><option value="false">Inativos</option></select></label>
        <label className={ui.field}>Itens por página<select aria-label="Itens por página" value={params.tamanho} onChange={e => update({ tamanho: Number(e.target.value) })}>{[10,20,50].map(n => <option key={n}>{n}</option>)}</select></label>
      </div>
      </div>
      <div className={ui.bottom + ' ' + ui.bottomIndicators}>
        <label className={ui.field}>Buscar nome<SearchInput label="Buscar nome" placeholder="Digite o nome ou código do produto" value={params.busca} onChange={busca => update({ busca })} /></label>
        <RecordAutocomplete kind="categorias" active={false} label="Buscar categoria" placeholder="Digite o nome da categoria" value={params.categoriaId} onChange={categoriaId => update({ categoriaId })} />
      <CatalogMetricControls period={metrics.period} margem={showMargin} giro={showTurnover} onMargin={() => setShowMargin(value => !value)} onTurnover={() => setShowTurnover(value => !value)} />
        <div className={ui.field + ' ' + ui.actionField}><span>Ações</span><div className={ui.actions}>
          <button title="Exportar os produtos desta página" disabled={exporting || !rows.length || query.loading || !!query.error} onClick={() => exportRows(rows)}><Download size={15} aria-hidden="true" />Exportar</button>
          <button title="Gerar etiquetas dos produtos desta página" disabled={!rows.some(p => p.tipo === 'padrao') || query.loading || !!query.error} onClick={() => setLabels(rows.filter(p => p.tipo === 'padrao'))}><Printer size={15} aria-hidden="true" />Etiqueta</button>
        </div></div>
      </div>
    </section>
    {(params.status || params.cat) && <p className={s.notice}>O filtro antigo por nome/situação não foi aplicado. Busque uma categoria acima; a API ainda não oferece filtro global por nível de estoque.</p>}
    <QueryFeedback query={query} />
    <div className={ui.table} style={{ '--catalog-table-width': (1225 + (showMargin ? 155 : 0) + (showTurnover ? 310 : 0)) + 'px' }}>
    <DataTable key={JSON.stringify(request)} caption="Lista de produtos" columns={columns} rows={rows} pageSize={params.tamanho}
      rowClassName={p => p.tipo === 'drink' ? ui.drinkRow : undefined}
      remote={{ page: params.pagina, total: query.data?.totalItens || 0, loading: query.loading,
        sort: { key: sorts[request.ordenarPor], dir: params.direcao.toLowerCase() },
        onPage: pagina => update({ pagina }, false), onSort: sort => update({ ordenarPor: Object.keys(sorts).find(k => sorts[k] === sort.key), direcao: sort.dir.toUpperCase() }) }}
      selectable={!query.loading && !query.error} bulkActions={selected => <button disabled={exporting} onClick={() => exportRows(selected)}>Exportar selecionados desta página</button>}
      emptyText={query.loading ? 'Carregando produtos…' : query.error ? 'Não foi possível carregar esta consulta.' : 'Nenhum produto encontrado com estes filtros.'} />
    </div>
    {importOpen && can('MOVIMENTAR_ESTOQUE') && <ImportProductsModal navigate={navigate} onClose={() => { setImportOpen(false); update({ importar: '' }, false); query.reload() }} />}
    {detail && <ProductDetail key={detail} id={detail} onClose={() => setDetail(null)} navigate={navigate} />}
    {labels && <EtiquetasModal products={labels} onClose={() => setLabels(null)} />}
  </>
}
