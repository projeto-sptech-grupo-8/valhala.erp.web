import { DateRangeFilter } from '@/shared/ui/filters/DateRangeFilter.jsx'
import { FilterActions, FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import { MovementTypeBadge } from '@/entities/inventory/ui/MovementTypeBadge.jsx'
import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { Navigate } from 'react-router-dom'
import { useState } from 'react'
import { api } from '@/shared/api/api.js'
import { useStore } from '@/entities/store'
import { useListParams, useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { Drawer } from '@/shared/ui/drawer/Drawer.jsx'
import { fmtNum, fmtDateTime } from '@/shared/lib/format.js'
import { stamp } from '@/shared/lib/csv.js'
import { QueryFeedback, PageSize } from '@/features/catalog/remote/RemoteControls.jsx'
import { RecordAutocomplete } from '@/features/catalog/product-editor/ui/CategoryAutocomplete.jsx'
import { lotDate } from '@/entities/inventory/model/remoteLots.js'
import ui from './MovementsPage.module.css'
import filterUi from '@/pages/catalog/products/ui/ProductsPage.module.css'
import { Eye, Download, SlidersHorizontal, ChevronDown, Plus, ArrowDownToLine, ArrowUpFromLine, FileText } from 'lucide-react'

const TYPES = { ENTRADA_INICIAL: 'Entrada inicial', ENTRADA: 'Entrada', SAIDA: 'Saída', SAIDA_DRINK: 'Saída de drink', PERDA: 'Perda', AJUSTE_POSITIVO: 'Ajuste positivo', AJUSTE_NEGATIVO: 'Ajuste negativo' }
const POSITIVE = ['ENTRADA_INICIAL', 'ENTRADA', 'AJUSTE_POSITIVO']
export function Movimentacoes(props) {
  if (props.pageParams?.novo) return <Navigate replace to={'/novamovimentacao?' + new URLSearchParams({ produto: props.pageParams.produto || '' })} />
  return <MovementHistory {...props} />
}
function MovementHistory({ navigate }) {
  const { can } = useStore()
  const { params, update, clear } = useListParams('ocorridoEm', 'DESC')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const canListUsers = can('USUARIOS_VISUALIZAR')
  const operators = useQueryResource(signal => canListUsers ? api.usuarios.listar(signal) : Promise.resolve([]), [canListUsers])
  const [detail, setDetail] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const selectedPeriod = params.periodo || (!params.dataInicial && !params.dataFinal ? 'todos' : undefined)
  const invalidDates = params.dataInicial && params.dataFinal && params.dataInicial > params.dataFinal
  const request = { produtoId: params.produtoId, tipo: params.tipo, usuarioId: params.usuarioId, dataInicial: params.dataInicial, dataFinal: params.dataFinal,
    pagina: params.pagina, tamanho: params.tamanho, ordenarPor: ['ocorridoEm', 'tipo', 'quantidade', 'saldoPosterior'].includes(params.ordenarPor) ? params.ordenarPor : 'ocorridoEm', direcao: params.direcao }
  const query = useQueryResource(signal => invalidDates ? Promise.reject(new Error('A data inicial deve ser anterior ou igual à final.')) : api.movimentacoes.pagina(request, signal), [request, invalidDates])
  const rows = query.loading || query.error ? [] : query.data?.itens || []
  const columns = [
    { key: 'ocorridoEm', header: 'Data', render: m => fmtDateTime(m.ocorridoEm) },
    { key: 'produtoNome', header: 'Produto', sort: false },
    { key: 'tipo', header: 'Tipo', render: m => <MovementTypeBadge type={m.tipo} /> },
    { key: 'quantidade', header: 'Quantidade', render: m => (POSITIVE.includes(m.tipo) ? '+' : '−') + fmtNum(m.quantidade) + ' ' + m.unidadeEstoque },
    { key: 'saldoPosterior', header: 'Saldo após', render: m => fmtNum(m.saldoPosterior) + ' ' + m.unidadeEstoque },
    { key: 'usuarioNome', header: 'Operador', sort: false },
    { key: 'acao', header: 'Detalhes', sort: false, render: m => <button onClick={() => setDetail(m)}><Eye size={15} aria-hidden="true" />Ver detalhes</button> },
  ]
  async function exportPage() {
    setExporting(true)
    setExportError('')
    try {
      const { blob } = await api.movimentacoes.exportar(request)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'movimentacoes-' + stamp() + '.xlsx'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) { setExportError(error.message) }
    finally { setExporting(false) }
  }
  return <>
    <section className={ui.panel} aria-labelledby="movement-filter-title">
      <FilterHeader className={ui.heading}><div><h2 id="movement-filter-title"><button type="button" className={filterUi.collapse} aria-expanded={filtersOpen} aria-controls="movement-filter-fields" onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={16} aria-hidden="true" />Filtros de movimentações<ChevronDown size={17} aria-hidden="true" className={filtersOpen ? filterUi.expanded : undefined} /></button></h2></div><FilterActions onClear={clear} onRefresh={query.reload} refreshing={query.loading} compact={can('MOVIMENTAR_ESTOQUE')}>{can('MOVIMENTAR_ESTOQUE') && <button className="gold" onClick={() => navigate('novamovimentacao', { retorno: JSON.stringify(params) })}><Plus size={15} aria-hidden="true" />Nova movimentação</button>}</FilterActions></FilterHeader>
      <div id="movement-filter-fields" hidden={!filtersOpen}><div className={ui.filters} data-operator={canListUsers || undefined}>

      <label>Tipo<select aria-label="Filtrar por tipo" value={params.tipo || ''} onChange={e => update({ tipo: e.target.value })}><option value="">Todos</option>{Object.entries(TYPES).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
      <DateRangeFilter label="Período" className={ui.periodFilter} selected={selectedPeriod}
        onChange={({ id, dataInicio, dataFim }) => update({ periodo: id === 'todos' ? '' : id, dataInicial: dataInicio, dataFinal: dataFim })} />
      {canListUsers && <label>Operador<select aria-label="Filtrar por operador" disabled={operators.loading || !!operators.error} value={params.usuarioId || ''} onChange={e => update({ usuarioId: e.target.value })}><option value="">{operators.loading ? 'Carregando operadores…' : operators.error ? 'Operadores indisponíveis' : 'Todos os operadores'}</option>{params.usuarioId && !operators.data?.some(user => user.id === params.usuarioId) && <option value={params.usuarioId}>Operador selecionado</option>}{operators.data?.map(user => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}</select>{operators.error && <button type="button" onClick={operators.reload}>Tentar carregar operadores</button>}</label>}
      <PageSize value={params.tamanho} onChange={tamanho => update({ tamanho })} />
      </div>
      </div>
      <div className={ui.searchRow}><div className={ui.search}><RecordAutocomplete kind="produtos" active={false} productType={null} label="Buscar produto" placeholder="Digite o nome ou código do produto" value={params.produtoId} onChange={produtoId => update({ produtoId })} /></div><div className={ui.export}><span>Ações</span><div className={ui.actions}><button title="Exportar em Excel todas as movimentações que correspondem aos filtros" disabled={exporting || !rows.length || query.loading || !!query.error} onClick={exportPage}><Download size={15} aria-hidden="true" />{exporting ? 'Exportando…' : 'Exportar'}</button></div></div></div>
    </section>
    {exportError && <Notice title="Não foi possível exportar" focus>{exportError}</Notice>}
    <QueryFeedback query={query} />
    <DataTable caption="Histórico de movimentações" columns={columns} rows={rows} pageSize={params.tamanho} compactColumns={['produtoNome', 'tipo', 'quantidade', 'acao']}
      emptyText={query.loading ? 'Carregando histórico…' : query.error ? 'Consulta indisponível.' : 'Nenhuma movimentação encontrada neste período e filtros.'}
      remote={{ page: params.pagina, total: query.data?.totalItens || 0, loading: query.loading,
        sort: { key: request.ordenarPor, dir: params.direcao.toLowerCase() },
        onPage: pagina => update({ pagina }, false), onSort: sort => update({ ordenarPor: sort.key, direcao: sort.dir.toUpperCase() }) }} />
    {detail && <Drawer title="Detalhes da movimentação" onClose={() => setDetail(null)}>
      <header className={ui.detailHeader}>
        <span className={ui.badge}>{POSITIVE.includes(detail.tipo) ? <ArrowDownToLine size={14} aria-hidden="true" /> : <ArrowUpFromLine size={14} aria-hidden="true" />}{TYPES[detail.tipo] || detail.tipo}</span>
        <h2>{detail.produtoNome}</h2><p>Movimentação #{detail.id} · {fmtDateTime(detail.ocorridoEm)}</p>
      </header>
      <section className={ui.amount} aria-label="Quantidade movimentada"><span>Quantidade movimentada</span><strong>{POSITIVE.includes(detail.tipo) ? '+' : '−'}{fmtNum(detail.quantidade)} <small>{detail.unidadeEstoque}</small></strong></section>
      <section className={ui.section}><h3>Efeito no estoque</h3><dl className={ui.balances}><div><dt>Saldo anterior: </dt><dd>{fmtNum(detail.saldoAnterior)} <small>{detail.unidadeEstoque}</small></dd></div><div><dt>Saldo após: </dt><dd>{fmtNum(detail.saldoPosterior)} <small>{detail.unidadeEstoque}</small></dd></div></dl></section>
      <section className={ui.section}><h3>Registro e referências</h3><dl className={ui.metadata}>
        <div><dt>Operador</dt><dd>{detail.usuarioNome || 'Não informado'}</dd></div>
        <div><dt>Data e horário</dt><dd>{fmtDateTime(detail.ocorridoEm)}</dd></div>
        <div><dt>Lote</dt><dd>{detail.lote || 'Não informado'}</dd></div>
        <div><dt>Nota fiscal</dt><dd>{detail.numeroNotaFiscal || 'Não informada'}</dd></div>
      </dl></section>
      {!!detail.lotes?.length && <section className={ui.section}><h3>Lotes movimentados</h3><ul className={ui.recipe}>{detail.lotes.map((lot, index) => <li key={lot.loteId || index}><strong>{lot.codigo}</strong><span>{fmtNum(lot.quantidade)} {detail.unidadeEstoque} · validade {lotDate(lot.validade)}</span></li>)}</ul></section>}
      <section className={ui.section}><h3><FileText size={15} aria-hidden="true" />Motivo da movimentação</h3><p className={ui.reason}>{detail.motivo || 'Nenhum motivo informado para esta movimentação.'}</p></section>
      {detail.origemDrinkId && <section className={ui.section}><h3>Drink de origem</h3><p>{detail.receitaAplicada?.drinkNome || 'Drink vinculado'}</p><small className={ui.reference}>{detail.origemDrinkId}</small></section>}
      {detail.receitaAplicada?.ingredientes && <section className={ui.section}><h3>Receita aplicada nesta saída</h3><p className={ui.muted}>{fmtNum(detail.receitaAplicada.quantidadeDrinks)} drink(s) preparados · registro da receita utilizada</p><ul className={ui.recipe}>{detail.receitaAplicada.ingredientes.map((r, i) => <li key={i}><strong>{r.produtoNome}</strong><span>{fmtNum(r.quantidadePorDrink)} {r.unidadeConsumo} por drink · {fmtNum(r.quantidadeConsumida)} {r.unidadeConsumo} consumidos</span></li>)}</ul></section>}
    </Drawer>}
  </>
}
