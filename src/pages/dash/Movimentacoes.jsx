import { useState } from 'react'
import { Plus, X, Download, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react'
import { Sel, KpiStrip } from '../../components/ui.jsx'
import { METAS, toneLower } from '../../lib/kpi.js'
import { useToast } from '../../components/useToast.js'
import { fmtNum, fmtDateTime } from '../../lib/format.js'
import { downloadCSV, stamp } from '../../lib/csv.js'
import { fornecedoresData } from './mock.js'
import { useStore } from './useStore.js'
import { canEdit } from './pages.js'
import { movDelta, movKind, fmtMovQty } from './estoque.js'
import { DataTable } from './components/DataTable.jsx'
import s from './dash.module.css'

const MOTIVOS_SAIDA = ['Perda / quebra', 'Vencimento', 'Consumo interno', 'Devolução ao fornecedor', 'Outro']

const kindChip = {
  Entrada: [s.chipOk, ArrowUp],
  Saída:   [s.chipBad, ArrowDown],
  Ajuste:  [s.chipWarn, RefreshCw],
}

function emptyForm(produto = '') {
  return { produto, qty: '', obs: '', nf: '', fornecedor: '', lote: '', validade: '', custo: '', motivo: MOTIVOS_SAIDA[0] }
}

/* ─── Movimentações (RF07 / RF12) ─── */
export function Movimentacoes({ pageParams }) {
  const { products, movements, addMovement, role } = useStore()
  const toast = useToast()
  const editable = canEdit(role)

  const [showForm, setShowForm]     = useState(editable && !!pageParams?.novo)
  const [tipo, setTipo]             = useState('Entrada')
  const [form, setForm]             = useState(() => emptyForm(pageParams?.produto))
  const [errors, setErrors]         = useState({})
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [searchMov, setSearchMov]   = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const prodSel = products.find(p => p.id === form.produto)

  function submit(e) {
    e.preventDefault()
    const q = Number(form.qty)
    const errs = {}
    if (!form.produto) errs.produto = 'Selecione o produto.'
    if (!form.qty || Number.isNaN(q) || q === 0) errs.qty = tipo === 'Ajuste' ? 'Informe a diferença (ex.: -2 ou 3).' : 'Informe uma quantidade maior que zero.'
    else if (tipo !== 'Ajuste' && q < 0) errs.qty = 'Use um valor positivo.'
    else if (prodSel && tipo === 'Saída' && q > prodSel.qty) errs.qty = `Saldo atual é ${fmtNum(prodSel.qty)} ${prodSel.unit}.`
    else if (prodSel && tipo === 'Ajuste' && prodSel.qty + q < 0) errs.qty = `O saldo ficaria negativo (atual: ${fmtNum(prodSel.qty)}).`
    if (tipo === 'Ajuste' && !form.obs.trim()) errs.obs = 'Ajustes exigem justificativa.'
    setErrors(errs)
    if (Object.keys(errs).length) return

    try {
      const { alert } = addMovement({
        produtoId: form.produto,
        tipo,
        qty: q,
        nf: tipo === 'Entrada' ? form.nf : '',
        fornecedor: tipo === 'Entrada' ? form.fornecedor : '',
        lote: tipo === 'Entrada' ? form.lote : '',
        validade: tipo === 'Entrada' ? form.validade : '',
        custo: tipo === 'Entrada' ? Number(String(form.custo).replace(',', '.')) || 0 : 0,
        obs: [tipo === 'Saída' ? form.motivo : '', form.obs].filter(Boolean).join(' · '),
      })
      toast(`${tipo} de ${fmtNum(Math.abs(q))} ${prodSel.unit} em ${prodSel.name}.`, { title: 'Movimentação registrada' })
      if (alert) toast(`${alert} ficou abaixo do estoque mínimo.`, { type: 'warning', title: 'Estoque crítico' })
      setForm(emptyForm())
      setShowForm(false)
    } catch (err) {
      toast(err.message, { type: 'error', title: 'Não foi possível registrar' })
    }
  }

  const filteredMovs = movements.filter(m => {
    const kind = movKind(m)
    const day = m.em.slice(0, 10)
    const byTipo = filtroTipo === 'Todos' || filtroTipo === kind
    return byTipo &&
      (!searchMov || m.produto.toLowerCase().includes(searchMov.toLowerCase())) &&
      (!dataInicio || day >= dataInicio) &&
      (!dataFim || day <= dataFim)
  })

  const count = (k) => movements.filter(m => movKind(m) === k).length
  const saidas = movements.filter(m => movKind(m) === 'Saída')
  const perdas = saidas.filter(m => /perda|quebra|vencimento/i.test(m.obs || '')).length
  const taxaPerda = saidas.length ? (perdas / saidas.length) * 100 : 0
  const taxaAjuste = movements.length ? (count('Ajuste') / movements.length) * 100 : 0

  function exportar() {
    downloadCSV(`movimentacoes-${stamp()}`,
      ['Data/Hora', 'Produto', 'Código', 'Tipo', 'Quantidade', 'Operador', 'NF', 'Fornecedor', 'Observação'],
      filteredMovs.map(m => [fmtDateTime(m.em), m.produto, m.produtoId, m.tipo, movDelta(m), m.operador, m.nf, m.fornecedor, m.obs]))
    toast(`${filteredMovs.length} movimentações exportadas.`, { title: 'Exportação concluída' })
  }

  const columns = [
    { key: 'em', header: 'Data / Hora', width: 120, render: m => <span className={s.muted}>{fmtDateTime(m.em)}</span> },
    { key: 'produto', header: 'Produto', render: m => <b className={s.cellStrong}>{m.produto}</b> },
    {
      key: 'tipo', header: 'Tipo', width: 150, sort: m => m.tipo,
      render: m => {
        const [cls, Icon] = kindChip[movKind(m)]
        return (
          <span>
            <em className={`${s.chip} ${cls}`}><Icon size={10} aria-hidden="true" /> {m.tipo}</em>
          </span>
        )
      },
    },
    {
      key: 'qty', header: 'Qtd.', width: 90, align: 'right', sort: movDelta,
      render: m => {
        const d = movDelta(m)
        return <b style={{ color: d >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtMovQty(m, products, fmtNum)}</b>
      },
    },
    { key: 'operador', header: 'Operador', width: 120 },
    {
      key: 'ref', header: 'Referência', sort: false,
      render: m => (
        <span className={s.refCell}>
          {m.nf && <span>NF {m.nf}{m.fornecedor ? ` · ${m.fornecedor}` : ''}</span>}
          {m.obs && <small>{m.obs}</small>}
          {!m.nf && !m.obs && '—'}
        </span>
      ),
    },
  ]

  return (
    <>
      <KpiStrip label="Indicadores de movimentação" items={[
        { label: 'Total de registros', value: movements.length, sub: 'No histórico completo', tone: 'neutral' },
        { label: 'Entradas', value: count('Entrada'), sub: 'Reposições e compras', tone: 'neutral' },
        {
          label: 'Perdas', value: perdas, tone: toneLower(taxaPerda, METAS.taxaPerdas),
          sub: `${fmtNum(taxaPerda)}% das saídas · meta ≤ ${METAS.taxaPerdas.ok}%`, badge: perdas ? undefined : 'Sem perdas',
        },
        {
          label: 'Ajustes', value: count('Ajuste'), tone: toneLower(taxaAjuste, METAS.taxaAjustes),
          sub: `${fmtNum(taxaAjuste)}% das movimentações · meta ≤ ${METAS.taxaAjustes.ok}%`,
          title: 'Muitos ajustes indicam divergência entre o estoque do sistema e o físico.',
        },
      ]} />

      {showForm && (
        <article className={'card form ' + s.movForm}>
          <h3>Nova movimentação de estoque</h3>
          <div className={s.tipoTabs} role="radiogroup" aria-label="Tipo de movimentação">
            {['Entrada', 'Saída', 'Ajuste'].map(tp => (
              <button key={tp} type="button" role="radio" aria-checked={tipo === tp} className={tipo === tp ? s.tipoActive : s.tipoBtn} onClick={() => { setTipo(tp); setErrors({}) }}>{tp}</button>
            ))}
          </div>
          <form onSubmit={submit} noValidate>
            <div className="two">
              <label className={errors.produto ? s.fieldError : undefined}>
                <span>Produto <i className={s.req} aria-hidden="true">*</i></span>
                <select value={form.produto} onChange={e => upd('produto', e.target.value)} aria-invalid={!!errors.produto}>
                  <option value="">Selecione o produto</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({fmtNum(p.qty)} {p.unit} em estoque)</option>)}
                </select>
                {errors.produto && <small className={s.errMsg}>{errors.produto}</small>}
              </label>
              <label className={errors.qty ? s.fieldError : undefined}>
                <span>{tipo === 'Ajuste' ? 'Diferença (+ ou −)' : 'Quantidade'} <i className={s.req} aria-hidden="true">*</i></span>
                <input type="number" inputMode="numeric" min={tipo === 'Ajuste' ? undefined : 1} placeholder={tipo === 'Ajuste' ? 'Ex.: -2' : '0'} value={form.qty} onChange={e => upd('qty', e.target.value)} aria-invalid={!!errors.qty} />
                {prodSel && form.qty && !errors.qty && (
                  <small className={s.hint}>
                    Saldo após: {fmtNum(prodSel.qty + (tipo === 'Entrada' ? Math.abs(form.qty) : tipo === 'Saída' ? -Math.abs(form.qty) : Number(form.qty)))} {prodSel.unit}
                  </small>
                )}
                {errors.qty && <small className={s.errMsg}>{errors.qty}</small>}
              </label>
              {tipo === 'Saída' && (
                <label>
                  <span>Motivo</span>
                  <select value={form.motivo} onChange={e => upd('motivo', e.target.value)}>
                    {MOTIVOS_SAIDA.map(m => <option key={m}>{m}</option>)}
                  </select>
                </label>
              )}
              <label className={errors.obs ? s.fieldError : undefined}>
                <span>Observação {tipo === 'Ajuste' && <i className={s.req} aria-hidden="true">*</i>}</span>
                <input placeholder={tipo === 'Ajuste' ? 'Ex.: contagem física de inventário' : 'Nota interna (opcional)'} value={form.obs} onChange={e => upd('obs', e.target.value)} aria-invalid={!!errors.obs} />
                {errors.obs && <small className={s.errMsg}>{errors.obs}</small>}
              </label>
              {tipo === 'Entrada' && (
                <>
                  <label><span>Nº NF-e do fornecedor</span>
                    <input placeholder="000.000" value={form.nf} onChange={e => upd('nf', e.target.value)} />
                  </label>
                  <label><span>Fornecedor</span>
                    <select value={form.fornecedor} onChange={e => upd('fornecedor', e.target.value)}>
                      <option value="">Selecione</option>
                      {fornecedoresData.map(f => <option key={f.nome}>{f.nome}</option>)}
                    </select>
                  </label>
                  <label><span>Lote</span>
                    <input placeholder="Ex.: L2610A (vazio = SEM-LOTE)" value={form.lote} onChange={e => upd('lote', e.target.value)} />
                  </label>
                  <label><span>Validade</span>
                    <input type="date" value={form.validade} onChange={e => upd('validade', e.target.value)} />
                    <small className={s.hint}>Entra no controle FEFO: vende primeiro o que vence antes.</small>
                  </label>
                  <label><span>Custo unitário (R$)</span>
                    <input inputMode="decimal" placeholder={prodSel ? String(prodSel.cost).replace('.', ',') : '0,00'} value={form.custo} onChange={e => upd('custo', e.target.value)} />
                    <small className={s.hint}>Atualiza o custo médio ponderado. Vazio = mantém o custo atual.</small>
                  </label>
                </>
              )}
            </div>
            <footer>
              <button type="button" onClick={() => { setShowForm(false); setErrors({}) }}>Cancelar</button>
              <button type="submit" className="gold">Confirmar {tipo.toLowerCase()}</button>
            </footer>
          </form>
        </article>
      )}

      <div className={s.movFilters}>
        <Sel value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} aria-label="Filtrar por tipo">
          <option value="Todos">Tipo: Todos</option>
          <option value="Entrada">Entradas</option>
          <option value="Saída">Saídas</option>
          <option value="Ajuste">Ajustes</option>
        </Sel>
        <div className={s.dateRange}>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} aria-label="Data inicial" />
          <span>até</span>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} aria-label="Data final" />
        </div>
        <input type="search" placeholder="Buscar produto..." className={s.movSearch} value={searchMov} onChange={e => setSearchMov(e.target.value)} aria-label="Buscar produto" />
        <div className={s.movActions}>
          {editable && (
            <button onClick={() => setShowForm(!showForm)} className={showForm ? '' : 'gold'} aria-expanded={showForm}>
              {showForm ? <>Fechar formulário <X size={13} aria-hidden="true" /></> : <>Registrar movimentação <Plus size={13} aria-hidden="true" /></>}
            </button>
          )}
          <button onClick={exportar}>Exportar <Download size={13} aria-hidden="true" /></button>
        </div>
      </div>

      <DataTable
        caption="Histórico de movimentações"
        columns={columns}
        rows={filteredMovs}
        initialSort={{ key: 'em', dir: 'desc' }}
        pageSize={15}
        emptyText="Nenhuma movimentação encontrada com os filtros selecionados."
      />
    </>
  )
}
