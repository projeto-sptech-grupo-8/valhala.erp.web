import { useState } from 'react'
import {
  Wine, TrendingUp, BarChart2, Download, Plus, Eye, ArrowDownToLine, Pencil,
} from 'lucide-react'
import { Sel } from '../../components/ui.jsx'
import { useToast } from '../../components/useToast.js'
import { fmtBRL, fmtNum } from '../../lib/format.js'
import { downloadCSV, stamp } from '../../lib/csv.js'
import { useStore } from './useStore.js'
import { canEdit } from './pages.js'
import { getStatusAny, getRendimentoDrink, getEstoqueML, rendColor } from './estoque.js'
import { StatusChip } from './components/StatusChip.jsx'
import { DataTable } from './components/DataTable.jsx'
import { DrinkDrawer } from './components/DrinkDrawer.jsx'
import { InsumoDrawer } from './components/InsumoDrawer.jsx'
import { EtiquetasModal } from './components/EtiquetasModal.jsx'
import { Printer } from 'lucide-react'
import s from './dash.module.css'

const STATUS_ORDER = { Zerado: 0, Crítico: 1, Baixo: 2, Estável: 3 }

/* ─── Produtos ─── */
export function Products({ navigate, pageParams }) {
  const { products, drinks, role } = useStore()
  const toast = useToast()
  const [search, setSearch]             = useState('')
  const [catFilter, setCatFilter]       = useState(pageParams?.cat || 'Todas')
  const [statusFilter, setStatusFilter] = useState(pageParams?.status || 'Todos')
  const [tipoFilter, setTipoFilter]     = useState('Todos')
  const [showMargin, setShowMargin]     = useState(false)
  const [showGiro, setShowGiro]         = useState(false)
  const [selectedId, setSelectedId]     = useState(null)
  const [etiquetas, setEtiquetas]       = useState(null) // produtos para imprimir etiqueta
  const editable = canEdit(role)

  const allCombined = [...products, ...drinks]
  const allCats = ['Todas', ...new Set(allCombined.map(p => p.cat))]
  const selectedProduct = allCombined.find(p => p.id === selectedId)

  // filtros refletidos na URL → link compartilhável e F5 preserva a visão
  function setFilter(setter, key, value, empty) {
    setter(value)
    const next = { ...pageParams, [key]: value === empty ? '' : value }
    navigate('produtos', next, { replace: true })
  }

  const filtered = allCombined.filter(p => {
    const st = getStatusAny(p, products)
    const q = search.toLowerCase()
    const byTipo =
      tipoFilter === 'Padrão' ? p.tipo === 'padrao' :
      tipoFilter === 'Drinks' ? p.tipo === 'drink' : true
    return byTipo &&
      (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) &&
      (catFilter === 'Todas' || p.cat === catFilter) &&
      (statusFilter === 'Todos' || st === statusFilter)
  })

  const stockPct = (p) => Math.min(100, Math.round((p.qty / (p.min * 2)) * 100))
  const marginOf = (p) => p.tipo !== 'drink' && p.cost > 0 ? Math.round((p.price - p.cost) / p.price * 100) : null
  const giroOf = (p) => p.qty > 0 && p.saidas30d > 0 ? p.saidas30d / p.qty : null
  const coberturaOf = (p) => p.saidas30d > 0 ? Math.round(p.qty / (p.saidas30d / 30)) : null
  const qtyOf = (p) => p.tipo === 'drink' ? getRendimentoDrink(p, products) : p.qty

  function exportRows(rows, name) {
    downloadCSV(`${name}-${stamp()}`,
      ['Código', 'Produto', 'Tipo', 'Categoria', 'Quantidade', 'Mínimo', 'Unidade', 'Custo', 'Preço', 'Margem %', 'Status'],
      rows.map(p => [p.id, p.name, p.tipo === 'drink' ? 'Drink' : 'Padrão', p.cat, qtyOf(p) ?? '', p.min ?? '', p.unit, p.cost ?? '', p.price, marginOf(p) ?? '', getStatusAny(p, products)]))
    toast(`${rows.length} produto${rows.length === 1 ? '' : 's'} exportado${rows.length === 1 ? '' : 's'}.`, { title: 'Exportação concluída' })
  }

  const columns = [
    { key: 'id', header: 'Código', width: 90, render: p => <span className={s.stockCode}>{p.id}</span> },
    {
      key: 'name', header: 'Produto',
      render: p => (
        <button className={s.stockName} onClick={() => setSelectedId(p.id)} title="Ver detalhes">
          {p.tipo === 'drink' && <Wine size={11} className={s.drinkIcon} aria-hidden="true" />}
          {p.name}
          {p.tipo === 'drink' && <em className={s.drinkBadge}>drink</em>}
        </button>
      ),
    },
    { key: 'cat', header: 'Categoria', width: 110 },
    {
      key: 'nivel', header: 'Nível de estoque', width: 130, sort: p => p.tipo === 'drink' ? (getRendimentoDrink(p, products) ?? 0) * 2 : stockPct(p),
      render: p => {
        const pct = p.tipo === 'drink' ? Math.min(100, (getRendimentoDrink(p, products) ?? 0) * 2) : stockPct(p)
        return (
          <div className={s.levelBar} role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Nível ${pct}%`}>
            <div style={{ width: pct + '%' }} />
          </div>
        )
      },
    },
    {
      key: 'qty', header: 'Qtd. / Mín.', width: 110, align: 'right', sort: qtyOf,
      render: p => {
        if (p.tipo === 'drink') {
          const r = getRendimentoDrink(p, products)
          return <span className={s.stockQty}><b style={{ color: rendColor(r) }}>{r !== null ? `~${r}` : '—'}</b><small>{p.unit}s possíveis</small></span>
        }
        const ml = getEstoqueML(p)
        return (
          <span className={s.stockQty}>
            <span><b>{fmtNum(p.qty)}</b> <small>/ {p.min} {p.unit}</small></span>
            {ml ? <small>{fmtNum(ml)}ml</small> : null}
          </span>
        )
      },
    },
    { key: 'price', header: 'Preço', width: 100, align: 'right', render: p => <span className={s.stockPrice}>{fmtBRL(p.price)}</span> },
    ...(showMargin ? [
      { key: 'cost', header: 'Custo', width: 95, align: 'right', render: p => p.tipo !== 'drink' && p.cost > 0 ? fmtBRL(p.cost) : '—' },
      {
        key: 'margem', header: 'Margem', width: 85, align: 'right', sort: marginOf,
        render: p => { const m = marginOf(p); return <b style={{ color: m >= 30 ? 'var(--green)' : 'var(--red)' }}>{m !== null ? m + '%' : '—'}</b> },
      },
    ] : []),
    ...(showGiro ? [
      {
        key: 'giro', header: 'Giro/mês', width: 85, align: 'right', sort: giroOf,
        render: p => {
          const g = giroOf(p)
          const color = !g ? 'var(--faint)' : g >= 1 ? 'var(--green)' : g >= 0.5 ? 'var(--gold2)' : 'var(--red)'
          return <b style={{ color }}>{g ? g.toFixed(1).replace('.', ',') + '×' : '—'}</b>
        },
      },
      { key: 'cob', header: 'Cobertura', width: 90, align: 'right', sort: coberturaOf, render: p => { const c = coberturaOf(p); return c ? `${c} dias` : '—' } },
    ] : []),
    { key: 'status', header: 'Status', width: 95, sort: p => STATUS_ORDER[getStatusAny(p, products)], render: p => <StatusChip status={getStatusAny(p, products)} /> },
    {
      key: 'acoes', header: <span className={s.srOnly}>Ações</span>, width: 110, sort: false,
      render: p => (
        <span className={s.stockActionCell}>
          <button className={s.iconBtn} title="Ver detalhes" aria-label={`Ver detalhes de ${p.name}`} onClick={() => setSelectedId(p.id)}>
            <Eye size={14} />
          </button>
          {editable && p.tipo !== 'drink' && (
            <button className={s.iconBtn} title="Registrar entrada" aria-label={`Registrar entrada de ${p.name}`} onClick={() => navigate('movimentacoes', { produto: p.id, novo: 1 })}>
              <ArrowDownToLine size={14} />
            </button>
          )}
          {editable && (
            <button className={s.iconBtn} title={p.tipo === 'drink' ? 'Editar receita' : 'Editar produto'} aria-label={`Editar ${p.name}`} onClick={() => navigate('editar', { id: p.id })}>
              <Pencil size={14} />
            </button>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <div className={s.prodToolbar}>
        <Sel value={tipoFilter} onChange={e => setTipoFilter(e.target.value)} aria-label="Filtrar por tipo">
          <option value="Todos">Tipo: Todos</option>
          <option value="Padrão">Padrão</option>
          <option value="Drinks">Drinks</option>
        </Sel>
        <input type="search" placeholder="Buscar por nome ou código..." value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar produto" />
        <Sel value={catFilter} onChange={e => setFilter(setCatFilter, 'cat', e.target.value, 'Todas')} aria-label="Filtrar por categoria">
          {allCats.map(c => <option key={c} value={c}>{c === 'Todas' ? 'Categoria: Todas' : c}</option>)}
        </Sel>
        <Sel value={statusFilter} onChange={e => setFilter(setStatusFilter, 'status', e.target.value, 'Todos')} aria-label="Filtrar por status">
          <option value="Todos">Status: Todos</option>
          <option>Estável</option><option>Baixo</option><option>Crítico</option><option>Zerado</option>
        </Sel>
        <div className={s.colToggles} role="group" aria-label="Colunas extras">
          <button className={showMargin ? s.segActive : s.segBtn} onClick={() => setShowMargin(m => !m)} aria-pressed={showMargin} title="Mostrar custo e margem">
            <TrendingUp size={14} aria-hidden="true" /> Margem
          </button>
          <button className={showGiro ? s.segActive : s.segBtn} onClick={() => setShowGiro(g => !g)} aria-pressed={showGiro} title="Mostrar giro e cobertura">
            <BarChart2 size={14} aria-hidden="true" /> Giro
          </button>
        </div>
        <div className={s.prodActions}>
          <button onClick={() => setEtiquetas(filtered.filter(p => p.tipo !== 'drink'))} title="Etiquetas de gôndola dos produtos filtrados"><Printer size={13} aria-hidden="true" /> Etiquetas</button>
          <button onClick={() => exportRows(filtered, 'produtos')}>Exportar <Download size={13} aria-hidden="true" /></button>
          {editable && <button className="gold" onClick={() => navigate('novo')}>Novo produto <Plus size={13} aria-hidden="true" /></button>}
        </div>
      </div>

      <DataTable
        caption="Lista de produtos"
        columns={columns}
        rows={filtered}
        pageSize={12}
        initialSort={pageParams?.status ? { key: 'status', dir: 'asc' } : undefined}
        selectable
        bulkActions={(rows) => (
          <>
            {rows.some(p => p.tipo !== 'drink') && <button onClick={() => setEtiquetas(rows.filter(p => p.tipo !== 'drink'))}><Printer size={13} aria-hidden="true" /> Etiquetas</button>}
            <button onClick={() => exportRows(rows, 'produtos-selecionados')}>Exportar selecionados <Download size={13} aria-hidden="true" /></button>
          </>
        )}
        emptyText="Nenhum produto encontrado com os filtros aplicados."
      />

      {etiquetas && <EtiquetasModal products={etiquetas} onClose={() => setEtiquetas(null)} />}
      {selectedProduct?.tipo === 'drink' && (
        <DrinkDrawer drink={selectedProduct} onClose={() => setSelectedId(null)} navigate={navigate} />
      )}
      {selectedProduct && selectedProduct.tipo !== 'drink' && (
        <InsumoDrawer product={selectedProduct} onClose={() => setSelectedId(null)} navigate={navigate} />
      )}
    </>
  )
}
