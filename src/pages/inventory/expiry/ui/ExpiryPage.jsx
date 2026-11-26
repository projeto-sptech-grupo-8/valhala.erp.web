import { FilterActions, FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useEffect, useRef, useState } from 'react'
import { Trash2, Download, SlidersHorizontal, ChevronDown, PackageX, CalendarClock, CalendarDays, CircleDollarSign } from 'lucide-react'
import { api } from '@/shared/api/api.js'
import { useStore } from '@/entities/store'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { useListParams, useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { ToneBadge } from '@/shared/ui/primitives/ui.jsx'
import { ConfirmModal } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { QueryFeedback } from '@/features/catalog/remote/RemoteControls.jsx'
import { RecordAutocomplete } from '@/features/catalog/product-editor/ui/CategoryAutocomplete.jsx'
import { LOT_STATES, lotDate, lotDeadline, expiryFilter, lossBody } from '@/entities/inventory/model/remoteLots.js'
import { fmtBRL, fmtNum } from '@/shared/lib/format.js'
import { downloadCSV, stamp } from '@/shared/lib/csv.js'
import ui from '@/pages/catalog/products/ui/ProductsPage.module.css'
import restock from '@/pages/inventory/restock/ui/RestockPage.module.css'
import css from './ExpiryPage.module.css'

const OPTIONS = [['atencao', 'Precisam de atenção (até 30 dias)'], ['VENCIDO', 'Vencidos'], ['VENCE_EM_7_DIAS', 'De hoje até 7 dias'], ['VENCE_EM_30_DIAS', 'Entre 8 e 30 dias'], ['VALIDO', 'Acima de 30 dias'], ['SEM_VALIDADE', 'Sem validade'], ['todos', 'Todos os lotes']]
export function Validades({ setHeaderHelp }) {
  const { can, invalidateCatalog } = useStore()
  const toast = useToast()
  const { params, update, clear } = useListParams('validade')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [losses, setLosses] = useState(null)
  const [busy, setBusy] = useState(false)
  const [lossError, setLossError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const sending = useRef(false)
  const state = OPTIONS.some(([value]) => value === params.situacao) ? params.situacao : 'atencao'
  const sort = ['validade', 'codigo', 'quantidadeAtual', 'criadoEm'].includes(params.ordenarPor) ? params.ordenarPor : 'validade'
  const summary = useQueryResource(signal => api.lotes.resumo(signal), [])
  const request = { ...expiryFilter(state), produtoId: params.produtoId, incluirZerados: params.incluirZerados === 'true', pagina: params.pagina, tamanho: params.tamanho, ordenarPor: sort, direcao: params.direcao }
  const list = useQueryResource(signal => api.lotes.pagina(request, signal), [request])
  const rows = list.loading || list.error ? [] : list.data?.itens || []
  const expired = rows.filter(l => l.situacao === 'VENCIDO' && Number(l.quantidadeAtual) > 0)
  const available = !summary.loading && !summary.error && summary.data
  const data = available ? summary.data : null
  const headerHelp = 'Indicadores globais de produtos ativos e lotes com saldo' + (data ? ' · referência ' + lotDate(data.referencia) + ' · ' + data.semValidade + ' lote(s) sem validade' : '') + '. A tabela pode incluir produtos inativos e lotes zerados conforme a consulta. As saídas usam FEFO no servidor; lotes vencidos não podem sair como venda/consumo.'
  useEffect(() => {
    setHeaderHelp?.(headerHelp)
    return () => setHeaderHelp?.(null)
  }, [setHeaderHelp, headerHelp])
  const kpis = [
    { title: 'Lotes vencidos', value: data?.vencidos, text: 'Com saldo; retirar da venda', Icon: PackageX, tone: data?.vencidos > 0 ? 'danger' : 'blue' },
    { title: 'Vencem em até 7 dias', value: data?.vencemEm7Dias, text: 'De hoje até 7 dias, inclusive', Icon: CalendarClock, tone: data?.vencemEm7Dias > 0 ? 'orange' : 'blue' },
    { title: 'Vencem entre 8 e 30 dias', value: data?.vencemEm30Dias, text: 'Faixa exclusiva: não inclui os próximos 7 dias', Icon: CalendarDays, tone: data?.vencemEm30Dias > 0 ? 'yellow' : 'blue' },
    { title: 'Valor em risco', value: data ? fmtBRL(data.valorEmRisco) : null, text: 'Custo dos lotes vencidos ou a vencer em 30 dias', Icon: CircleDollarSign, tone: Number(data?.valorEmRisco) > 0 ? 'danger' : 'blue' },
  ]
  function refresh() { list.reload(); summary.reload() }
  function exportPage() {
    downloadCSV('lotes-pagina-' + stamp(), ['Produto', 'Código do produto', 'Lote', 'Validade', 'Situação', 'Saldo', 'Unidade-base', 'Valor a custo'], rows.map(lot => [lot.produtoNome, lot.produtoSku, lot.codigo, lot.validade || '', LOT_STATES[lot.situacao]?.label || lot.situacao, lot.quantidadeAtual, lot.unidadeEstoque, lot.valorCusto]))
  }
  function openLoss(lots) { setLosses(lots); setLossError(''); setUncertain(false) }
  async function confirmLoss() {
    if (sending.current || uncertain || !losses?.length) return
    sending.current = true; setBusy(true); setLossError('')
    const pending = [...losses]
    let completed = 0
    try {
      for (const lot of losses) {
        await api.movimentacoes.registrar(lossBody(lot))
        pending.shift(); completed++
        // Keep only unconfirmed lots after a partially successful batch.
        setLosses([...pending])
        invalidateCatalog?.()
      }
      setLosses(null)
      toast(completed + ' lote(s) baixado(s) pelo servidor.', { title: 'Perda registrada' })
    } catch (ex) {
      setLossError((completed ? completed + ' lote(s) já foram baixados. ' : '') + ex.message)
      if (ex.status === 0) setUncertain(true)
    } finally { sending.current = false; setBusy(false); refresh() }
  }
  const columns = [
    { key: 'produtoNome', header: 'Produto', sort: false, render: l => <div className={css.product}><b>{l.produtoNome}</b><small>{l.produtoSku}</small></div> },
    { key: 'codigo', header: 'Lote' },
    { key: 'validade', header: 'Validade', render: l => <div className={css.product}><b>{lotDate(l.validade)}</b><small>{lotDeadline(l.diasParaVencer)}</small></div> },
    { key: 'situacao', header: 'Situação', sort: false, render: l => <ToneBadge {...(LOT_STATES[l.situacao] || { label: 'Não informada', tone: 'off' })} /> },
    { key: 'quantidadeAtual', header: 'Saldo do lote', align: 'right', render: l => fmtNum(l.quantidadeAtual) + ' ' + l.unidadeEstoque },
    { key: 'valorCusto', header: 'Valor a custo', align: 'right', sort: false, render: l => l.valorCusto == null ? '—' : fmtBRL(l.valorCusto) },
    { key: 'acoes', header: 'Ações', sort: false, render: l => can('MOVIMENTAR_ESTOQUE') && l.situacao === 'VENCIDO' && Number(l.quantidadeAtual) > 0 ? <button type="button" className={css.dangerAction} disabled={busy} onClick={() => openLoss([l])}><Trash2 size={14} aria-hidden="true" />Registrar perda</button> : '—' },
  ]
  return <>
    <section className={restock.kpis} aria-label="Indicadores de validade" aria-busy={summary.loading}>{kpis.map(({ title, value, text, Icon, tone }) => <article className={restock.kpi} key={title} data-tone={available ? tone : 'neutral'}><div className={restock.kpiTop}><span>{title}</span><Icon size={19} aria-hidden="true" /></div><strong>{value ?? '—'}</strong><p>{text}</p></article>)}</section>
    <QueryFeedback query={summary} />
    <section className={ui.panel} aria-labelledby="expiry-filter-title">
      <FilterHeader className={ui.heading}><div><h2 id="expiry-filter-title"><button type="button" className={ui.collapse} aria-expanded={filtersOpen} aria-controls="expiry-filter-fields" onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={17} aria-hidden="true" />Filtros de validade<ChevronDown size={17} className={filtersOpen ? ui.expanded : undefined} aria-hidden="true" /></button></h2></div><FilterActions compact onClear={clear} onRefresh={refresh} refreshing={list.loading || summary.loading || busy}>{can('MOVIMENTAR_ESTOQUE') && <button type="button" className={css.dangerAction} title="Registrar perdas de todos os lotes vencidos exibidos nesta página" disabled={!expired.length || busy} onClick={() => openLoss(expired)}><Trash2 size={15} aria-hidden="true" />Registrar todas as perdas</button>}</FilterActions></FilterHeader>
      <div id="expiry-filter-fields" hidden={!filtersOpen}><div className={ui.filters + ' ' + css.filterRow}>
        <div className={ui.field + ' ' + css.statusField}><span>Situação de validade</span><div className={css.statuses} role="radiogroup" aria-label="Situação de validade">{OPTIONS.map(([value, label]) => <button type="button" key={value} role="radio" aria-checked={state === value} title={label} onClick={() => update({ situacao: value })}>{{ atencao: 'Em atenção', VENCE_EM_7_DIAS: 'Até 7 dias', VENCE_EM_30_DIAS: 'De 8 a 30 dias', VALIDO: 'Mais de 30 dias', todos: 'Todos os lotes' }[value] || label}</button>)}</div></div>
        <label className={ui.field}>Saldo dos lotes<select aria-label="Saldo dos lotes" value={params.incluirZerados === 'true' ? 'true' : 'false'} onChange={e => update({ incluirZerados: e.target.value })}><option value="false">Somente com saldo</option><option value="true">Incluir zerados</option></select></label>
        <label className={ui.field}>Itens por página<select aria-label="Itens por página" value={params.tamanho} onChange={e => update({ tamanho: Number(e.target.value) })}>{[10,20,50].map(n => <option key={n}>{n}</option>)}</select></label>
      </div></div>
      <div className={ui.bottom + ' ' + css.bottom}><RecordAutocomplete kind="produtos" active={false} productType="PADRAO" label="Buscar produto" placeholder="Digite o nome ou código do produto" value={params.produtoId} onChange={produtoId => update({ produtoId })} /><div className={ui.field}><span>Ação</span><div className={ui.actions}><button type="button" title="Exportar os lotes desta página" disabled={!rows.length || busy} onClick={exportPage}><Download size={15} aria-hidden="true" />Exportar</button></div></div></div>
    </section>
    <QueryFeedback query={list} />
    <DataTable caption="Lotes por validade" columns={columns} rows={rows} pageSize={params.tamanho} emptyText={list.loading ? 'Consultando lotes…' : list.error ? 'Consulta de lotes indisponível.' : 'Nenhum lote encontrado com estes filtros.'} remote={{ page: params.pagina, total: list.data?.totalItens || 0, loading: list.loading, sort: { key: sort, dir: params.direcao.toLowerCase() }, onPage: pagina => update({ pagina }, false), onSort: value => update({ ordenarPor: value.key, direcao: value.dir.toUpperCase() }) }} />
    {losses && <ConfirmModal title={losses.length === 1 ? 'Registrar perda do lote vencido?' : 'Registrar perda dos lotes vencidos desta página?'} confirmLabel="Registrar perda" danger busy={busy} disabled={uncertain || !losses.length} onClose={() => setLosses(null)} onConfirm={confirmLoss}>
      <p>A baixa será feita nos lotes específicos abaixo, nas unidades-base informadas. Esta operação altera o saldo e registra movimentações no servidor.</p><ul className={css.lossList}>{losses.map(l => <li key={l.id}><b>{l.produtoNome} · {l.codigo}</b><span>{fmtNum(l.quantidadeAtual)} {l.unidadeEstoque} · validade {lotDate(l.validade)}</span></li>)}</ul>
      {lossError && <Notice title="Não foi possível concluir a baixa" focus>{lossError}</Notice>}{uncertain && <p role="alert">A resposta não foi confirmada. Feche, atualize os lotes e confira o histórico antes de iniciar outra baixa. Não repita esta operação automaticamente.</p>}
    </ConfirmModal>}
  </>
}
