import access from '@/entities/access/ui/access.module.css'
import { FilterActions, FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import { useState } from 'react'
import { fmtNum } from '@/shared/lib/format.js'
import { api } from '@/shared/api/api.js'
import { useStore } from '@/entities/store'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { QueryFeedback } from '@/features/catalog/remote/RemoteControls.jsx'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { AlertTriangle, PackageX, Settings2, ShieldCheck, ChevronDown, SlidersHorizontal, CircleHelp } from 'lucide-react'
import { minimumMetrics, filterRestockAlerts } from '../model/restockAlerts.js'
import { RestockRowActions } from './RestockRowActions.jsx'
import s from './RestockPage.module.css'

export function Reposicao({ navigate }) {
  const { can } = useStore()
  const query = useQueryResource(signal => api.dashboard.resumo(1, signal), [])
  const stock = query.data?.estoque
  const rows = query.loading || query.error ? [] : stock?.alertas || []
  const units = useQueryResource(async signal => {
    const result = {}
    for (let index = 0; index < rows.length; index += 2) {
      await Promise.all(rows.slice(index, index + 2).map(async row => {
        try { const p = await api.produtos.obter(row.produtoId, signal); result[row.produtoId] = p.fracionado ? 'ml' : p.unit }
        catch (ex) { if (signal.aborted) throw ex; result[row.produtoId] = null }
      }))
    }
    return result
  }, [rows.map(row => row.produtoId), query.loading])
  const amount = (row, key) => row[key] == null ? '—' : fmtNum(row[key]) + ' ' + (!units.loading && units.data?.[row.produtoId] || '(unidade-base)')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [range, setRange] = useState('')
  const [order, setOrder] = useState('priority')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const categories = [...new Set(rows.map(r => r.categoria).filter(Boolean))]
  const filtered = filterRestockAlerts(rows, { search, status, category, range, order })
  const available = stock && !query.error && !query.loading
  const indicators = [
    { label: 'Produtos zerados', value: stock?.zerados, text: 'Sem saldo em estoque', Icon: PackageX, tone: stock?.zerados > 0 ? 'danger' : 'blue' },
    { label: 'Estoque crítico', value: stock?.criticos, text: 'Saldo abaixo do mínimo definido', Icon: AlertTriangle, tone: stock?.criticos > 0 ? 'danger' : 'blue' },
    { label: 'Sem mínimo definido', value: stock?.produtosSemMinimoDefinido, text: 'Configure para acompanhar a reposição', Icon: Settings2, tone: 'orange' },
    { label: 'Saúde do estoque', value: stock?.saudePercentual, suffix: '%', text: 'Indicador calculado pelo servidor', Icon: ShieldCheck, tone: stock?.saudePercentual < 25 ? 'danger' : stock?.saudePercentual < 75 ? 'yellow' : 'green' },
  ]
  const columns = [
    { key: 'nome', header: 'Produto', sort: false },
    { key: 'categoria', header: 'Categoria', sort: false },
    { key: 'quantidadeAtual', header: 'Saldo atual', align: 'right', sort: false, render: row => amount(row, 'quantidadeAtual') },
    { key: 'estoqueMinimo', header: 'Mínimo', align: 'right', sort: false, render: row => amount(row, 'estoqueMinimo') },
    { key: 'missing', header: 'Falta para o mínimo', align: 'right', sort: false, render: row => amount({ ...row, missing: minimumMetrics(row).missing }, 'missing') },
    { key: 'status', header: 'Situação', width: 130, sort: false, render: r => <span className={s.chip} data-tone="danger">{r.status === 'ZERADO' ? 'Zerado' : r.status === 'CRITICO' ? 'Crítico' : 'Não informado'}</span> },
    { key: 'acao', header: 'Ações', width: 80, align: 'center', sort: false, render: r => <RestockRowActions product={r} can={can} navigate={navigate} /> },
  ]
  return <>
    <section className={s.kpis} aria-label="Indicadores de reposição" aria-busy={query.loading}>
      {indicators.map(({ label, value, text, Icon, tone, suffix = '' }) => <article key={label} className={s.kpi} data-tone={available && value != null ? tone : 'neutral'}><div className={s.kpiTop}><span>{label}</span><Icon size={19} aria-hidden="true" /></div><strong>{available && value != null ? value + suffix : '—'}</strong><p>{text}</p></article>)}
    </section>
    <QueryFeedback query={query} />
    <section className={s.filterPanel} aria-labelledby="restock-filters">
    <FilterHeader className={s.heading}><div><h2 id="restock-filters"><button className={s.toggle} aria-expanded={filtersOpen} aria-controls="restock-filter-fields" onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={16} aria-hidden="true" />Filtros dos alertas exibidos<ChevronDown size={18} aria-hidden="true" className={filtersOpen ? s.expanded : undefined} /></button></h2>{!filtersOpen && (search || status || category || range || order !== 'priority') && <p>Há filtros ou ordenação aplicados à lista.</p>}</div><FilterActions compact onClear={() => { setSearch(''); setStatus(''); setCategory(''); setRange(''); setOrder('priority') }} onRefresh={query.reload} refreshing={query.loading} refreshLabel="Atualizar alertas"><button onClick={() => navigate('produtos')}>Ver catálogo completo</button></FilterActions></FilterHeader>
    <div id="restock-filter-fields" hidden={!filtersOpen}>
    <div className={s.filters}>
      <label>Categoria<select aria-label="Categoria" value={category} onChange={e => setCategory(e.target.value)}><option value="">Todas as categorias</option>{category && !categories.includes(category) && <option value={category}>{category}</option>}{categories.map(c => <option key={c}>{c}</option>)}</select></label>
      <div className={s.rangeField}><div className={s.rangeLabel}><label htmlFor="restock-minimum-range">Mínimo disponível</label><span className={s.metricHelp}><button type="button" aria-label="Como é calculado o mínimo disponível" aria-describedby="restock-minimum-help"><CircleHelp size={15} aria-hidden="true" /></button><span id="restock-minimum-help" role="tooltip">Saldo atual ÷ estoque mínimo × 100. Até 25% inclui produtos zerados; de 25% a 50% exclui 25%. Sem saldo ou mínimo válido, o percentual não é calculado. “Falta para o mínimo” mostra apenas a diferença até o mínimo, não uma sugestão completa de compra.</span></span></div><select id="restock-minimum-range" value={range} onChange={e => setRange(e.target.value)}><option value="">Todas as faixas</option><option value="25">Até 25% do mínimo</option><option value="50">Acima de 25% até 50%</option><option value="above50">Acima de 50% do mínimo</option></select></div>
      <label>Ordenar por<select aria-label="Ordenar por" value={order} onChange={e => setOrder(e.target.value)}><option value="priority">Prioridade do servidor</option><option value="name">Nome do produto · A–Z</option><option value="percentage">Menor percentual do mínimo</option></select></label>
    </div>
    </div>
    <div className={s.searchRow}>
    <label className={s.search}>Buscar nome<input type="search" placeholder="Digite o nome do produto" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <div className={s.situationField}><span>Situação dos alertas recebidos</span><div className={access.segFilter + ' ' + s.situations} role="group" aria-label="Situação">{[['', 'Todos'], ['ZERADO', 'Zerados'], ['CRITICO', 'Abaixo do mínimo']].map(([value, label]) => <button key={value} type="button" className={status === value ? access.segFilterOn : undefined} aria-pressed={status === value} onClick={() => setStatus(value)}>{label}<small>{query.loading || query.error ? '—' : value ? rows.filter(row => row.status === value).length : rows.length}</small></button>)}</div></div>
    </div>
    </section>
    {!query.loading && !query.error && <p className={s.resultSummary} role="status">Exibindo {filtered.length} de {rows.length} alerta(s) recebido(s).</p>}
    <DataTable key={JSON.stringify([search, status, category, range, order])} caption="Alertas prioritários de reposição" rowKey={r => r.produtoId} columns={columns} rows={filtered} pageSize={20}
      emptyText={query.loading ? 'Consultando alertas…' : query.error ? 'Não foi possível consultar a reposição.' : rows.length ? 'Nenhum alerta exibido corresponde aos filtros.' : 'Nenhum alerta retornado nesta consulta.'} />
  </>
}
