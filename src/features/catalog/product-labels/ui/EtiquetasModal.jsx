import { Fragment, useRef, useState } from 'react'
import { Printer, Settings2, CheckCheck, Search, Eye, Palette, CalendarClock, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/shared/api/api.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { fmtBRL } from '@/shared/lib/format.js'
import { useStore } from '@/entities/store'
import { Modal } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { DEFAULT_SETTINGS, FORMATS, preferenceKey, readSettings, appearanceFor, validCopies } from '../model/labelSettings.js'
import { labelSelection } from '../model/labelSelection.js'
import { ProductLots } from './ProductLots.jsx'
import { ProductLabel } from './ProductLabel.jsx'
import { LabelHelp } from './LabelHelp.jsx'
import s from './EtiquetasModal.module.css'

const METRIC = 'A cor usa a data do lote escolhido: vencido = vermelho; de hoje até 7 dias = laranja; entre 8 e 30 dias = amarelo; acima de 30 dias = verde. Sem data = cinza. O dia do vencimento ainda conta como hoje. A referência de data vem do servidor quando disponível.'
export function EtiquetasModal({ products, onClose }) {
  const { print, user } = useStore()
  const key = preferenceKey(user?.id)
  const [settings, setSettings] = useState(() => readSettings(key))
  const [draft, setDraft] = useState(settings)
  const [configOpen, setConfigOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [copies, setCopies] = useState({})
  const [search, setSearch] = useState('')
  const [quantityFilter, setQuantityFilter] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [rawPage, setPage] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewId, setPreviewId] = useState(products[0]?.id || '')
  const [chosenLots, setChosenLots] = useState({})
  const [lotSelections, setLotSelections] = useState({})
  const [expanded, setExpanded] = useState(() => new Set())
  const sending = useRef(false)
  const showPreview = previewOpen
  const currentSettings = configOpen ? draft : settings
  const previewProduct = products.find(p => p.id === previewId) || products[0]
  const chosenLot = id => chosenLots[id]
  const appearance = id => appearanceFor(settings, chosenLot(id), reference.data?.referencia)
  const configProduct = products[0]
  const { entries, incomplete, total } = labelSelection(products, selected, copies, lotSelections, currentSettings.mode)
  const invalid = incomplete.length > 0
  const filtered = products.filter(p => {
    const hasQuantity = selected.has(p.id) && (currentSettings.mode === 'validade' ? Object.values(lotSelections[p.id] || {}).some(item => validCopies(item.copies)) : validCopies(copies[p.id]))
    return (!search.trim() || (p.name + ' ' + (p.sku || '')).toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))) &&
      (!quantityFilter || (quantityFilter === 'com' ? hasQuantity : !hasQuantity))
  })
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(rawPage, pages - 1)
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize)
  const expiryMode = currentSettings.mode === 'validade'
  const reference = useQueryResource(signal => expiryMode || settings.mode === 'validade' ? api.lotes.resumo(signal) : null, [expiryMode, settings.mode])
  function previewLot(product, lot) {
    setPreviewOpen(open => previewId !== product.id || chosenLots[product.id]?.id !== lot.id || !open)
    setPreviewId(product.id)
    setChosenLots(previous => ({ ...previous, [product.id]: lot }))
  }
  function selectProducts(items, checked) {
    setExpanded(previous => {
      const next = new Set(previous)
      items.forEach(p => checked ? next.add(p.id) : next.delete(p.id))
      return next
    })
    if (!checked) setLotSelections(previous => {
      const next = { ...previous }; items.forEach(p => delete next[p.id]); return next
    })
    setSelected(previous => {
      const next = new Set(previous)
      items.forEach(p => checked ? next.add(p.id) : next.delete(p.id))
      return next
    })
    setCopies(previous => {
      const next = { ...previous }
      items.forEach(p => { next[p.id] = checked ? validCopies(previous[p.id]) ? previous[p.id] : 1 : 0 })
      return next
    })
  }
  function changeMode(mode) {
    setDraft(value => ({ ...value, mode }))

  }
  function applySettings() {
    setSettings(draft); setConfigOpen(false)
    try { localStorage.setItem(key, JSON.stringify(draft)); setFeedback('Configuração salva neste navegador.') }
    catch { setFeedback('Configuração aplicada nesta impressão. Não foi possível salvá-la no navegador.') }
  }
  function printSelected() {
    if (!total || invalid || configOpen || sending.current) return
    sending.current = true
    print({ tipo: 'etiquetas', formato: settings.formato, itens: entries.map(({ product, lot, copies: count }) => ({
      product, copias: count, appearance: appearanceFor(settings, lot, reference.data?.referencia),
    })) })
    onClose()
  }
  const allVisible = visible.length > 0 && visible.every(p => selected.has(p.id))
  return <Modal className={s.modal} title={<span className={s.modalTitle}>Etiquetas de produtos<LabelHelp title="Informações sobre as etiquetas" notice><span className={s.helpParagraph}>O catálogo atual não fornece código de barras. As etiquetas identificam o produto pelo nome e SKU, com preço e lote quando selecionado.</span><span className={s.helpParagraph}>“Etiquetas a imprimir” vale somente para esta operação. Não é um histórico de impressões. O preço por litro aparece quando existe volume cadastrado.</span></LabelHelp></span>} subtitle="Selecione os produtos, defina as quantidades e confira a prévia antes de imprimir." width="min(1120px, calc(100vw - 40px))" onClose={onClose}
    footer={<>
      <span className={s.total} aria-live="polite">{selected.size} produto(s) selecionado(s) · {total} etiqueta(s) · {Math.ceil(total / FORMATS[settings.formato].perPage)} folha(s) A4</span>
      <button type="button" onClick={onClose}>Cancelar</button>
      <button type="button" className="gold" disabled={!total || invalid || configOpen} onClick={printSelected}><Printer size={15} aria-hidden="true" />Imprimir selecionados</button>
    </>}>
    <div className={s.top}>
      <div className={s.title}><Printer size={18} aria-hidden="true" /><strong>Prepare sua impressão</strong><LabelHelp title="Impressão de etiquetas">Esta lista contém somente os produtos enviados pela página do catálogo. Marque cada produto e informe de 1 a 99 etiquetas por produto ou, no modo por validade, por lote. Selecione os lotes explicitamente; a validade é individual. “—” significa que ele está fora desta impressão. As quantidades não representam um histórico de etiquetas já impressas.</LabelHelp></div>
      <div className={s.configActions}>
      <button type="button" aria-expanded={configOpen} aria-controls="label-configuration" onClick={() => { setDraft(settings); if (!configOpen) setPreviewOpen(false); setConfigOpen(open => !open); setFeedback('') }}><Settings2 size={16} aria-hidden="true" />{configOpen ? 'Fechar configuração' : 'Configurar etiqueta'}</button>
      </div>
    </div>
    {currentSettings.mode === 'validade' && reference.error && <p className={s.note} role="alert">Não foi possível consultar a data de referência do servidor. As cores usam o calendário deste navegador.</p>}
    {feedback && <p className={s.note} role="status">{feedback}</p>}
    <div className={s.workspace + (showPreview ? '' : ' ' + s.withoutPreview)}>
      <div className={s.list}>
    {configOpen && <section id="label-configuration" className={s.configuration} aria-label="Configuração da etiqueta">
      <div className={s.title}><Palette size={17} aria-hidden="true" /><h3>Configurar etiqueta</h3><LabelHelp title="Configuração">Escolha formato e identificação por cor. A faixa preserva o fundo branco e o texto escuro para facilitar a leitura. Aplique para usar nesta impressão e guardar a preferência neste navegador.</LabelHelp></div>
      <div className={s.configGrid}>
        <label>Formato da folha<select value={draft.formato} onChange={e => setDraft(d => ({ ...d, formato: e.target.value }))}>{Object.entries(FORMATS).map(([id, format]) => <option key={id} value={id}>{format.name} · {format.perPage} por folha A4</option>)}</select></label>
        <label>Identificação por cor<select value={draft.mode} onChange={e => changeMode(e.target.value)}><option value="padrao">Padrão · menor consumo de tinta</option><option value="manual">Cor manual · destaque personalizado</option><option value="validade">Por validade · escolher o lote</option></select></label>
        {draft.mode === 'manual' && <label>Cor da faixa<input type="color" value={draft.color} onChange={e => setDraft(d => ({ ...d, color: e.target.value }))} /></label>}
      </div>
      {draft.mode === 'validade' && <div className={s.metric}><div className={s.title}><CalendarClock size={16} aria-hidden="true" /><strong>Como as cores são definidas</strong><LabelHelp title="Métrica de validade">{METRIC}</LabelHelp></div>
        <ul className={s.legend}><li><i style={{ background: '#dc2626' }} />Vencido</li><li><i style={{ background: '#f97316' }} />Hoje a 7 dias</li><li><i style={{ background: '#eab308' }} />8 a 30 dias</li><li><i style={{ background: '#16a34a' }} />Mais de 30 dias</li><li><i style={{ background: '#64748b' }} />Sem data</li></ul>
        <p>Selecione os lotes de cada produto e informe as quantidades individualmente. Lotes e validades são consultados no servidor, somente para os produtos exibidos. Para imprimir por validade, selecione pelo menos um lote por produto; lotes sem data recebem faixa cinza. Confira o lote físico; a cor não autoriza a venda de produtos vencidos.</p>
      </div>}
      <section className={s.configurationPreview} aria-label="Prévia da configuração">
        <div className={s.title}><Eye size={17} aria-hidden="true" /><h3>Prévia da configuração</h3><LabelHelp title="Prévia da configuração">Confira os ajustes antes de aplicar. Esta prévia é exclusiva da configuração e desaparece ao aplicar ou cancelar. Os olhos da lista mostram as etiquetas com a configuração já aplicada.</LabelHelp></div>
        <p className={s.note}>As alterações aparecem aqui antes de serem aplicadas à impressão.</p>
        <div className={s.previewScroll}>{configProduct ? <div className={s.paper} style={{ width: draft.formato === 'grande' ? '99mm' : '63.5mm', height: draft.formato === 'grande' ? '57mm' : '33.9mm' }}><ProductLabel product={configProduct} appearance={appearanceFor(draft, chosenLot(configProduct.id), reference.data?.referencia)} large={draft.formato === 'grande'} /></div> : <p>Nenhum produto para visualizar.</p>}</div>
        <p className={s.note}>{FORMATS[draft.formato].name}{draft.mode === 'validade' && configProduct && !chosenLot(configProduct.id) ? ' · Selecione o lote deste produto na lista para conferir a cor por validade.' : ''}</p>
      </section>
      <div className={s.configActions}><button type="button" onClick={() => { setDraft(settings); setConfigOpen(false) }}>Cancelar configuração</button><button type="button" onClick={() => setDraft({ ...DEFAULT_SETTINGS })}>Restaurar padrão</button><button type="button" className="gold" onClick={applySettings}><Check size={15} aria-hidden="true" />Aplicar configurações</button></div>
    </section>}

        <div className={s.filters} aria-label="Filtros da lista de etiquetas">
          <label><span><Search size={13} aria-hidden="true" />Buscar produto</span><input type="search" placeholder="Nome ou código" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} /></label>
          <label>Quantidade<select value={quantityFilter} onChange={e => { setQuantityFilter(e.target.value); setPage(0) }}><option value="">Todos</option><option value="com">Com quantidade definida</option><option value="sem">Sem quantidade definida</option></select></label>
          <label>Itens por página<select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}>{[10, 20, 30].map(value => <option key={value}>{value}</option>)}</select></label>
        </div>
        <div className={s.selection}><button type="button" disabled={!visible.length} onClick={() => selectProducts(visible, true)}><CheckCheck size={15} aria-hidden="true" />Selecionar produtos exibidos</button><button type="button" disabled={!selected.size} onClick={() => selectProducts(products, false)}>Limpar seleção</button><span>{visible.length} de {filtered.length} resultado(s) · {products.length} produto(s) nesta lista</span></div>
        <div className={s.tableScroll}><table className={s.table}>
          <caption>Produtos disponíveis para impressão de etiquetas</caption>
          <thead><tr><th><input ref={node => { if (node) node.indeterminate = !allVisible && visible.some(p => selected.has(p.id)) }} type="checkbox" aria-label="Selecionar todos os produtos exibidos" checked={allVisible} disabled={!visible.length} onChange={e => selectProducts(visible, e.target.checked)} /></th><th>Produto</th><th>Etiquetas a imprimir</th>{currentSettings.mode === 'validade' && <th>Lotes e validades</th>}<th>Prévia</th></tr></thead>
          <tbody>{visible.map(p => <Fragment key={p.id}><tr data-selected={selected.has(p.id)}>
            <td><input type="checkbox" aria-label={'Selecionar ' + p.name} checked={selected.has(p.id)} onChange={e => selectProducts([p], e.target.checked)} /></td>
            <td><strong>{p.name}</strong><small>{p.sku} · {fmtBRL(p.price)}</small></td>
            <td>{selected.has(p.id) ? expiryMode ? <><strong>{entries.filter(item => item.product.id === p.id).reduce((sum, item) => sum + item.copies, 0)} etiqueta(s)</strong><small>{Object.keys(lotSelections[p.id] || {}).length} lote(s) selecionado(s)</small>{incomplete.includes(p.id) && <small className={s.error}>Selecione ao menos um lote e confira as quantidades.</small>}</> : <><input className={s.quantity} aria-label={'Etiquetas a imprimir de ' + p.name} type="number" min="1" max="99" step="1" value={copies[p.id] ?? ''} aria-invalid={!validCopies(copies[p.id])} onChange={e => setCopies(c => ({ ...c, [p.id]: e.target.value }))} />{!validCopies(copies[p.id]) && <small className={s.error}>Use um inteiro de 1 a 99.</small>}</> : <span aria-label="Sem quantidade definida">—</span>}</td>
            {expiryMode && <td>{selected.has(p.id) ? <button type="button" aria-expanded={expanded.has(p.id)} onClick={() => setExpanded(previous => { const next = new Set(previous); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next })}>{expanded.has(p.id) ? 'Recolher lotes' : 'Selecionar lotes'} de {p.name}</button> : 'Selecione o produto'}</td>}
            <td><button type="button" className={s.previewButton} aria-label={'Prévia de ' + p.name} aria-pressed={showPreview && previewId === p.id} aria-controls="label-preview-content" onClick={() => { setPreviewOpen(open => previewId !== p.id || !open); setPreviewId(p.id) }}><Eye size={16} aria-hidden="true" /></button></td>
          </tr>{expiryMode && selected.has(p.id) && expanded.has(p.id) && <tr><td colSpan={5}><ProductLots product={p} selections={lotSelections[p.id] || {}} reference={reference.data?.referencia} previewLot={showPreview && previewId === p.id ? chosenLots[p.id]?.id : null} onPreview={lot => previewLot(p, lot)} onChange={value => setLotSelections(previous => ({ ...previous, [p.id]: value }))} /></td></tr>}</Fragment>)}{!visible.length && <tr><td colSpan={currentSettings.mode === 'validade' ? 5 : 4}>Nenhum produto corresponde aos filtros desta lista.</td></tr>}</tbody>
        </table></div>
        <nav className={s.pager} aria-label="Paginação dos produtos para etiquetas"><span>{filtered.length ? page * pageSize + 1 : 0}–{Math.min((page + 1) * pageSize, filtered.length)} de {filtered.length}</span><div><button type="button" aria-label="Página anterior de etiquetas" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={16} aria-hidden="true" /></button><span>Página {page + 1} de {pages}</span><button type="button" aria-label="Próxima página de etiquetas" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}><ChevronRight size={16} aria-hidden="true" /></button></div></nav>
        {incomplete.length > 0 && <p className={s.note}>Complete as quantidades dos produtos selecionados antes de imprimir.</p>}
        {entries.some(item => !visible.some(v => v.id === item.product.id)) && <p className={s.note}>Há produtos selecionados fora da página ou dos filtros atuais. Eles também serão impressos.</p>}
      </div>
      <aside className={s.preview} aria-label="Prévia da etiqueta" hidden={!showPreview}>
        <div className={s.title}><Eye size={17} aria-hidden="true" /><h3>Prévia da etiqueta</h3><LabelHelp title="Prévia da etiqueta">Use o ícone de olho na lista para abrir a prévia de um produto. Clique novamente no mesmo olho para fechar ou no de outro produto para trocar a prévia. Esta prévia usa a configuração aplicada. Os ajustes em edição aparecem na prévia exclusiva da configuração.</LabelHelp></div>
        <div id="label-preview-content" hidden={!showPreview}>
        <div className={s.previewScroll}>{previewProduct ? <div className={s.paper} style={{ width: settings.formato === 'grande' ? '99mm' : '63.5mm', height: settings.formato === 'grande' ? '57mm' : '33.9mm' }}><ProductLabel product={previewProduct} appearance={appearance(previewProduct.id)} large={settings.formato === 'grande'} /></div> : <p>Nenhum produto para visualizar.</p>}</div>
        <p>{FORMATS[settings.formato].name}</p>
        <p>Imprima em escala 100%, sem cabeçalhos e rodapés. A cor da faixa depende da opção de gráficos de fundo da impressora.</p>
        </div>
      </aside>
    </div>
    {configOpen && <p className={s.note}>Aplique ou cancele a configuração para liberar a impressão.</p>}
  </Modal>
}
