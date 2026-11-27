import access from '@/entities/access/ui/access.module.css'
import { FilterActions, FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import { useState } from 'react'
import { fmtNum } from '@/shared/lib/format.js'
import { api } from '@/shared/api/api.js'
import { useStore } from '@/entities/store'
import { useListParams, useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { QueryFeedback, SearchInput } from '@/features/catalog/remote/RemoteControls.jsx'
import { RecordAutocomplete } from '@/features/catalog/product-editor/ui/CategoryAutocomplete.jsx'
import { MetricCard, MetricGrid } from '@/shared/ui/primitives/MetricCard.jsx'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { AlertTriangle, PackageX, Settings2, ShieldCheck, ChevronDown, SlidersHorizontal, CircleHelp } from 'lucide-react'
import { minimumMetrics } from '../model/restockAlerts.js'
import { RestockRowActions } from './RestockRowActions.jsx'
import s from './RestockPage.module.css'

const SITUACOES = { '': 'Todos', ZERADO: 'Zerados', CRITICO: 'Abaixo do mínimo' }

export function Reposicao({ navigate }) {
  const { can } = useStore()
  const { params, update, clear } = useListParams()
  const [filtersOpen, setFiltersOpen] = useState(true)
  const ordem = ['name', 'percentage'].includes(params.ordem) ? params.ordem : 'priority'
  const query = useQueryResource(signal => api.dashboard.resumo(1, signal), [])
  const stock = query.data?.estoque
  const request = { busca: params.busca, categoriaId: params.categoriaId, situacao: params.status, faixa: params.faixa, ordem, pagina: params.pagina, tamanho: params.tamanho }
  const list = useQueryResource(signal => api.dashboard.reposicao(request, signal), [request])
  const rows = list.loading || list.error ? [] : list.data?.itens || []
  const amount = (row, key) => row[key] == null ? '—' : fmtNum(row[key]) + ' ' + (row.unidadeMedida || '(unidade-base)')
  const summary = query.loading || query.error ? null : stock
  const saude = summary?.produtosComMinimoDefinido === 0 ? null : summary?.saudePercentual
  const healthTone = saude < 25 ? 'bad' : saude < 75 ? 'warn' : 'ok'
  const indicators = [
    { label: 'Produtos zerados', value: summary?.zerados, description: 'Produtos sem saldo em estoque', Icon: PackageX,
      tone: summary?.zerados > 0 ? 'bad' : 'info' },
    { label: 'Estoque crítico', value: summary?.criticos, description: 'Produtos abaixo do mínimo definido', Icon: AlertTriangle,
      tone: summary?.criticos > 0 ? 'bad' : 'info' },
    { label: 'Sem mínimo definido', value: summary?.produtosSemMinimoDefinido, description: 'Configure o mínimo para acompanhar a reposição',
      Icon: Settings2, tone: 'warn' },
    { label: 'Saúde do estoque', value: saude, suffix: '%', description: 'Produtos com saldo suficiente entre os que têm mínimo definido',
      Icon: ShieldCheck, tone: healthTone, statusLabel: { bad: 'Ruim', warn: 'Médio', ok: 'Bom' }[healthTone] },
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
    <MetricGrid aria-label="Indicadores de reposição" aria-busy={query.loading}>
      {indicators.map(({ label, value, description, Icon, tone, statusLabel, suffix = '' }) => (
        <MetricCard key={label} label={label} value={value == null ? '—' : fmtNum(value) + suffix} description={description}
          Icon={Icon} tone={value == null ? 'neutral' : tone} statusLabel={value == null ? undefined : statusLabel} />
      ))}
    </MetricGrid>
    <QueryFeedback query={query} />
    <section className={s.filterPanel} aria-labelledby="restock-filters">
      <FilterHeader className={s.heading}>
        <h2 id="restock-filters"><button className={s.toggle} type="button" aria-expanded={filtersOpen} aria-controls="restock-filter-fields" onClick={() => setFiltersOpen(open => !open)}>
          <SlidersHorizontal size={16} aria-hidden="true" />Filtros de reposição<ChevronDown size={18} aria-hidden="true" className={filtersOpen ? s.expanded : undefined} />
        </button></h2>
        <FilterActions compact onClear={clear} onRefresh={() => { query.reload(); list.reload() }} refreshing={query.loading || list.loading} refreshLabel="Atualizar alertas">
          <button type="button" onClick={() => navigate('produtos')}>Ver catálogo completo</button>
        </FilterActions>
      </FilterHeader>
      <div id="restock-filter-fields" hidden={!filtersOpen}>
        <div className={s.filters}>
          <RecordAutocomplete kind="categorias" active={false} label="Buscar categoria" value={params.categoriaId} onChange={categoriaId => update({ categoriaId })} />
          <div className={s.rangeField}>
            <div className={s.rangeLabel}>
              <label htmlFor="restock-minimum-range">Mínimo disponível</label>
              <span className={s.metricHelp}><button type="button" aria-label="Como é calculado o mínimo disponível" aria-describedby="restock-minimum-help"><CircleHelp size={15} aria-hidden="true" /></button>
                <span id="restock-minimum-help" role="tooltip">Saldo atual ÷ estoque mínimo × 100. Até 25% inclui produtos zerados. A segunda faixa começa acima de 25%.</span>
              </span>
            </div>
            <select id="restock-minimum-range" value={params.faixa || ''} onChange={e => update({ faixa: e.target.value })}><option value="">Todas as faixas</option><option value="25">Até 25% do mínimo</option><option value="50">Acima de 25% até 50%</option><option value="above50">Acima de 50% do mínimo</option></select>
          </div>
          <label htmlFor="restock-sort">Ordenar por<select id="restock-sort" aria-label="Ordenar por" value={ordem} onChange={e => update({ ordem: e.target.value })}><option value="priority">Prioridade</option><option value="name">Nome do produto · A–Z</option><option value="percentage">Menor percentual do mínimo</option></select></label>
        </div>
      </div>
      <div className={s.searchRow}>
        <label className={s.search}>Buscar nome<SearchInput label="Buscar nome" placeholder="Digite o nome do produto" value={params.busca} maxLength={120} onChange={busca => update({ busca })} /></label>
        <div className={s.situationField}><span>Situação</span><div className={access.segFilter + ' ' + s.situations} role="group" aria-label="Situação">
          {Object.entries(SITUACOES).map(([value, label]) => <button key={value} type="button" className={(params.status || '') === value ? access.segFilterOn : undefined} aria-pressed={(params.status || '') === value} onClick={() => update({ status: value })}>{label}</button>)}
        </div></div>
      </div>
    </section>
    <QueryFeedback query={list} />
    <DataTable compactColumns={['nome', 'quantidadeAtual', 'status', 'acao']} caption="Alertas prioritários de reposição" rowKey={row => row.produtoId} columns={columns} rows={rows} pageSize={params.tamanho}
      rowClassName={row => row.status === 'ZERADO' ? s.zeroRow : undefined}
      remote={{ page: params.pagina, total: list.loading || list.error ? 0 : list.data?.totalItens || 0, loading: list.loading, onPage: pagina => update({ pagina }, false) }}
      emptyText={list.loading ? 'Consultando alertas…' : list.error ? 'Não foi possível consultar a reposição.' : 'Nenhum produto abaixo do mínimo corresponde aos filtros.'} />
  </>
}
