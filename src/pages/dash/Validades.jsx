import { useState } from 'react'
import { Trash2, Copy, Download, Info } from 'lucide-react'
import { Stat, ToneBadge } from '../../components/ui.jsx'
import { useToast } from '../../components/useToast.js'
import { fmtBRL, fmtNum } from '../../lib/format.js'
import { downloadCSV, stamp } from '../../lib/csv.js'
import { useStore } from './useStore.js'
import { canEdit } from './pages.js'
import { lotStatus, promoSuggestion, isExpired } from './lotes.js'
import { DataTable } from './components/DataTable.jsx'
import { ConfirmModal } from './acesso/ui.jsx'
import s from './dash.module.css'

const FILTROS = [
  ['atencao', 'Precisam de atenção'],
  ['vencido', 'Vencidos'],
  ['7d', 'Até 7 dias'],
  ['30d', 'Até 30 dias'],
  ['todos', 'Todos com validade'],
]
const fmtDate = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—')
const prazoTxt = (d) => (d == null ? 'sem validade' : d < 0 ? `vencido há ${-d} dia${d === -1 ? '' : 's'}` : d === 0 ? 'vence hoje' : `em ${d} dia${d === 1 ? '' : 's'}`)

/* ─── Validades e lotes (FEFO) ─── */
export function Validades() {
  const { products, role, registrarPerdaLote } = useStore()
  const toast = useToast()
  const [filtro, setFiltro] = useState('atencao')
  const [perda, setPerda] = useState(null) // [{ produto, lot }]
  const [busy, setBusy] = useState(false)
  const editable = canEdit(role)

  const rows = products.flatMap(p => (p.lotes || []).filter(l => l.validade).map(l => {
    const st = lotStatus(l)
    return { id: `${p.id}:${l.id}`, p, l, st, valor: l.qty * p.cost, promo: promoSuggestion(p, l) }
  }))
  const by = (k) => rows.filter(r => r.st.key === k)
  const vencidos = by('vencido'), em7 = by('7d'), em30 = by('30d')
  const risco = [...vencidos, ...em7, ...em30].reduce((a, r) => a + r.valor, 0)

  const visible = rows.filter(r =>
    filtro === 'todos' ? true
      : filtro === 'atencao' ? ['vencido', '7d', '30d'].includes(r.st.key)
      : r.st.key === filtro)

  async function confirmarPerda() {
    setBusy(true)
    try {
      let total = 0
      for (const { p, l } of perda) {
        const used = registrarPerdaLote({ produtoId: p.id, loteId: l.id, motivo: 'Vencimento' })
        total += used.qty * p.cost
      }
      toast(`${perda.length} lote(s) baixado(s) como perda por vencimento · ${fmtBRL(total)} a custo.`, { title: 'Perda registrada' })
      setPerda(null)
    } catch (e) {
      toast(e.message, { type: 'error', title: 'Não foi possível registrar' })
    } finally {
      setBusy(false)
    }
  }

  function copiarPromo(r) {
    const txt = `PROMOÇÃO · ${r.p.name} de ${fmtBRL(r.p.price)} por ${fmtBRL(r.promo.preco)} (válido até ${fmtDate(r.l.validade)} ou enquanto durar o estoque)`
    navigator.clipboard?.writeText(txt).then(
      () => toast('Texto da promoção copiado — cole na placa, no WhatsApp ou no cardápio.', { title: 'Sugestão copiada', type: 'info' }),
      () => toast(txt, { title: 'Copie o texto da promoção', type: 'info', duration: 9000 }),
    )
  }

  function exportar() {
    downloadCSV(`validades-${stamp()}`, ['Produto', 'Lote', 'Validade', 'Situação', 'Quantidade', 'Valor a custo', 'Preço sugerido', 'Margem sugerida %'],
      visible.map(r => [r.p.name, r.l.lote, fmtDate(r.l.validade), r.st.label, r.l.qty, Math.round(r.valor * 100) / 100, r.promo?.preco ?? '', r.promo?.margem ?? '']))
    toast(`${visible.length} lote(s) exportado(s).`, { title: 'Exportação concluída' })
  }

  const columns = [
    {
      key: 'produto', header: 'Produto', sort: r => r.p.name,
      render: r => <span className={s.lotProd}><b className={s.cellStrong}>{r.p.name}</b><small>{r.p.cat} · {r.p.local}</small></span>,
    },
    { key: 'lote', header: 'Lote', width: 110, sort: r => r.l.lote, render: r => <code className={s.mono}>{r.l.lote}</code> },
    {
      key: 'validade', header: 'Validade', width: 150, sort: r => r.l.validade,
      render: r => <span className={s.lotProd}><b>{fmtDate(r.l.validade)}</b><small>{prazoTxt(r.st.dias)}</small></span>,
    },
    { key: 'situacao', header: 'Situação', width: 180, sort: r => r.st.dias, render: r => <ToneBadge tone={r.st.tone} label={r.st.label} /> },
    { key: 'qty', header: 'Qtd.', width: 80, align: 'right', sort: r => r.l.qty, render: r => `${fmtNum(r.l.qty)} ${r.p.unit}` },
    { key: 'valor', header: 'Valor a custo', width: 120, align: 'right', sort: r => r.valor, render: r => fmtBRL(r.valor) },
    {
      key: 'promo', header: 'Sugestão para escoar', width: 220, sort: r => r.promo?.pct ?? -1,
      render: r => r.st.key === 'vencido'
        ? <span className={s.muted}>Retirar da venda</span>
        : r.promo
          ? <span className={s.lotProd}><b>{fmtBRL(r.promo.preco)} <small className={s.inlineMuted}>(−{r.promo.pct}%)</small></b><small>margem {r.promo.margem}%{r.promo.limitadoPeloCusto ? ' · limitado pelo custo' : ''}</small></span>
          : <span className={s.muted}>—</span>,
    },
    {
      key: 'acoes', header: <span className={s.srOnly}>Ações</span>, width: 150, sort: false, align: 'right',
      render: r => (
        <span className={s.rowActions}>
          {r.st.key === 'vencido' && editable && (
            <button className={s.smallBtn} onClick={() => setPerda([r])}><Trash2 size={13} aria-hidden="true" /> Registrar perda</button>
          )}
          {r.promo && r.st.key !== 'vencido' && (
            <button className={s.smallBtn} onClick={() => copiarPromo(r)}><Copy size={13} aria-hidden="true" /> Copiar promoção</button>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <div className="stats">
        <Stat a="Lotes vencidos" b={vencidos.length} tone={vencidos.length ? 'bad' : 'ok'} badge={vencidos.length ? 'Retirar da venda' : 'Nenhum'}
          c={vencidos.length ? `${fmtNum(vencidos.reduce((a, r) => a + r.l.qty, 0))} unidades bloqueadas para venda` : 'Nada vencido no estoque'} />
        <Stat a="Vencem em até 7 dias" b={em7.length} tone={em7.length ? 'bad' : 'ok'} c="Promoção forte ou uso em drinks" />
        <Stat a="Vencem em até 30 dias" b={em30.length} tone={em30.length ? 'warn' : 'ok'} c="Planejar saída e não recomprar" />
        <Stat a="Valor em risco" b={fmtBRL(risco)} tone={risco > 0 ? 'warn' : 'ok'} c="Custo dos lotes vencidos e a vencer em 30 dias" />
      </div>

      <p className={s.ruleNote}><Info size={14} aria-hidden="true" /> O caixa vende sempre o lote que vence primeiro (FEFO) e <b>bloqueia lotes vencidos</b>: produto vencido é impróprio para consumo.</p>

      <div className={s.segRow} role="radiogroup" aria-label="Filtro de validade">
        {FILTROS.map(([id, label]) => {
          const n = id === 'todos' ? rows.length : id === 'atencao' ? vencidos.length + em7.length + em30.length : by(id).length
          return (
            <button key={id} type="button" role="radio" aria-checked={filtro === id} className={filtro === id ? s.segRowOn : undefined} onClick={() => setFiltro(id)}>
              {label} <small>{n}</small>
            </button>
          )
        })}
        <div className={s.segRowActions}>
          {editable && vencidos.length > 0 && (
            <button onClick={() => setPerda(vencidos)}><Trash2 size={13} aria-hidden="true" /> Baixar todos os vencidos</button>
          )}
          <button onClick={exportar} disabled={!visible.length}>Exportar <Download size={13} aria-hidden="true" /></button>
        </div>
      </div>

      <DataTable
        caption="Lotes por validade"
        columns={columns}
        rows={visible}
        initialSort={{ key: 'validade', dir: 'asc' }}
        pageSize={15}
        emptyText={filtro === 'atencao' ? 'Nenhum lote vencido ou a vencer em 30 dias. Estoque em dia.' : 'Nenhum lote neste filtro.'}
      />

      {perda && (
        <ConfirmModal
          title={perda.length === 1 ? `Registrar perda de ${perda[0].p.name}?` : `Registrar perda de ${perda.length} lotes vencidos?`}
          subtitle="Sai do estoque como perda por vencimento (aparece nos relatórios de perdas)."
          confirmLabel="Registrar perda" danger busy={busy} onClose={() => setPerda(null)} onConfirm={confirmarPerda}
        >
          <ul className={s.confirmList}>
            {perda.map(({ p, l }) => (
              <li key={l.id}>{p.name} · lote <b>{l.lote}</b> · {fmtNum(l.qty)} {p.unit} · {fmtBRL(l.qty * p.cost)} <span className={s.muted}>(venceu {fmtDate(l.validade)})</span></li>
            ))}
          </ul>
          {perda.some(({ l }) => !isExpired(l)) && <p className={s.errMsg}>Atenção: há lote ainda dentro da validade nesta seleção.</p>}
        </ConfirmModal>
      )}
    </>
  )
}
