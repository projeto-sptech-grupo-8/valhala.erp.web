import { useState } from 'react'
import { ClipboardList, Plus, CheckCircle2, ArrowLeft, EyeOff, XCircle, RotateCcw, ShieldCheck } from 'lucide-react'
import { Stat, ToneBadge, Meter } from '../../components/ui.jsx'
import { useToast } from '../../components/useToast.js'
import { fmtBRL, fmtNum, fmtDateTime } from '../../lib/format.js'
import { useStore } from './useStore.js'
import { canEdit } from './pages.js'
import { DataTable } from './components/DataTable.jsx'
import { Modal } from './components/Modal.jsx'
import { AuthorizeModal } from './components/AuthorizeModal.jsx'
import { ConfirmModal } from './acesso/ui.jsx'
import s from './dash.module.css'

const STATUS = {
  contando: { label: 'Contando', tone: 'warn' },
  revisao: { label: 'Em revisão', tone: 'warn' },
  concluido: { label: 'Concluído', tone: 'ok' },
  cancelado: { label: 'Cancelado', tone: 'neutral' },
}

const counted = (v) => v !== undefined && v !== '' && !Number.isNaN(Number(v))

function analisar(inv) {
  const linhas = inv.snapshot.map(sn => {
    const v = inv.contagem[sn.produtoId]
    const contado = counted(v) ? Number(v) : null
    const diff = contado == null ? null : Math.round((contado - sn.sistema) * 1000) / 1000
    return { ...sn, contado, diff, valor: diff == null ? 0 : diff * sn.custo }
  })
  const contados = linhas.filter(l => l.contado != null).length
  const divergentes = linhas.filter(l => l.diff).length
  const sobra = linhas.filter(l => l.diff > 0).reduce((a, l) => a + l.valor, 0)
  const falta = linhas.filter(l => l.diff < 0).reduce((a, l) => a + l.valor, 0)
  const acuracia = linhas.length ? Math.round(((linhas.length - divergentes) / linhas.length) * 100) : 100
  return { linhas, contados, divergentes, sobra, falta, liquido: sobra + falta, acuracia }
}

/* ─── Lista de inventários ─── */
function Lista({ navigate }) {
  const { products, inventarios, criarInventario, role } = useStore()
  const toast = useToast()
  const [novo, setNovo] = useState(false)
  const setores = [...new Set(products.map(p => p.local).filter(Boolean))].sort()
  const [setor, setSetor] = useState(setores[0] || '')

  function criar() {
    try {
      const inv = criarInventario({ setor })
      toast(`${inv.snapshot.length} produto(s) para contar em ${setor}.`, { title: `${inv.id} aberto` })
      navigate('inventario', { id: inv.id })
    } catch (e) {
      toast(e.message, { type: 'error', title: 'Não foi possível abrir' })
    }
  }

  const columns = [
    { key: 'id', header: 'Inventário', width: 110, render: i => <b className={s.cellStrong}>{i.id}</b> },
    { key: 'setor', header: 'Setor' },
    { key: 'status', header: 'Situação', width: 140, render: i => <ToneBadge tone={STATUS[i.status].tone} label={STATUS[i.status].label} /> },
    { key: 'itens', header: 'Itens', width: 80, align: 'right', sort: i => i.snapshot.length, render: i => i.snapshot.length },
    { key: 'acuracia', header: 'Acurácia', width: 100, align: 'right', sort: i => i.resultado?.acuracia ?? -1, render: i => (i.resultado ? `${i.resultado.acuracia}%` : '—') },
    { key: 'valor', header: 'Divergência líquida', width: 150, align: 'right', sort: i => i.resultado?.valorLiquido ?? 0, render: i => (i.resultado ? fmtBRL(i.resultado.valorLiquido) : '—') },
    { key: 'criadoEm', header: 'Aberto em', width: 130, render: i => fmtDateTime(i.criadoEm) },
    { key: 'operador', header: 'Por', width: 130 },
  ]

  const concluidos = inventarios.filter(i => i.status === 'concluido')
  const ultimo = concluidos[0]

  return (
    <>
      <div className="stats">
        <Stat a="Em andamento" b={inventarios.filter(i => i.status === 'contando' || i.status === 'revisao').length} c="Contagens abertas" />
        <Stat a="Acurácia do último" b={ultimo ? `${ultimo.resultado.acuracia}%` : '—'} tone={ultimo ? (ultimo.resultado.acuracia >= 95 ? 'ok' : ultimo.resultado.acuracia >= 85 ? 'warn' : 'bad') : 'neutral'}
          c={ultimo ? `${ultimo.setor} · meta ≥ 95%` : 'Nenhum inventário concluído'} />
        <Stat a="Divergência no último" b={ultimo ? fmtBRL(ultimo.resultado.valorLiquido) : '—'} c="Sobras − faltas, a custo" />
      </div>

      <div className={s.segRow}>
        <p className={s.ruleNote} style={{ margin: 0 }}><EyeOff size={14} aria-hidden="true" /> Contagem <b>cega</b>: quem conta não vê o saldo do sistema, para não ser induzido.</p>
        <div className={s.segRowActions}>
          {canEdit(role) && <button className="gold" onClick={() => setNovo(true)}><Plus size={14} aria-hidden="true" /> Novo inventário</button>}
        </div>
      </div>

      <DataTable caption="Inventários" columns={columns} rows={inventarios} rowKey={i => i.id} onRowClick={i => navigate('inventario', { id: i.id })}
        emptyText="Nenhum inventário ainda. Comece por um setor pequeno, como a Câmara Fria." />

      {novo && (
        <Modal title="Novo inventário" subtitle="O saldo do sistema é congelado agora; conte o setor inteiro." width={440} onClose={() => setNovo(false)}
          footer={<>
            <button onClick={() => setNovo(false)}>Cancelar</button>
            <button className="gold" onClick={criar} disabled={!setor}><ClipboardList size={14} aria-hidden="true" /> Abrir contagem</button>
          </>}
        >
          <label>
            <span>Setor (localização)</span>
            <select value={setor} onChange={e => setSetor(e.target.value)} data-autofocus>
              {setores.map(st => <option key={st} value={st}>{st} ({products.filter(p => p.local === st).length} produtos)</option>)}
            </select>
          </label>
          <p className={s.muted}>Evite vender itens deste setor durante a contagem. As diferenças são calculadas sobre o saldo congelado na abertura.</p>
        </Modal>
      )}
    </>
  )
}

/* ─── Sessão de inventário ─── */
function Sessao({ inv, navigate }) {
  const { salvarContagem, mudarStatusInventario, aprovarInventario } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null) // 'aprovar' | 'cancelar'
  const a = analisar(inv)
  const st = STATUS[inv.status]
  const query = q.trim().toLowerCase()
  const lista = a.linhas.filter(l => !query || l.produto.toLowerCase().includes(query) || l.produtoId.toLowerCase().includes(query))

  function finalizar() {
    const faltando = a.linhas.length - a.contados
    if (faltando) { toast(`Faltam ${faltando} produto(s) para contar. Se não encontrou o item, informe 0.`, { type: 'warning', title: 'Contagem incompleta' }); return }
    mudarStatusInventario(inv.id, 'revisao')
  }

  function aprovar({ autorizadoPor }) {
    try {
      const r = aprovarInventario(inv.id, { autorizadoPor })
      setModal(null)
      toast(`${r.divergentes} ajuste(s) gerado(s) · acurácia ${r.acuracia}% · líquido ${fmtBRL(r.valorLiquido)}.`, { title: `${inv.id} concluído` })
    } catch (e) {
      toast(e.message, { type: 'error', title: 'Não foi possível aprovar' })
    }
  }

  const header = (
    <div className={s.objBar}>
      <button type="button" className={s.backLink} onClick={() => navigate('inventario')}><ArrowLeft size={14} aria-hidden="true" /> Inventários</button>
      <div className={s.tabsActions}>
        <ToneBadge tone={st.tone} label={`${inv.id} · ${st.label}`} />
        {inv.status === 'contando' && <>
          <button onClick={() => setModal('cancelar')}><XCircle size={14} aria-hidden="true" /> Cancelar</button>
          <button className="gold" onClick={finalizar}><CheckCircle2 size={14} aria-hidden="true" /> Finalizar contagem</button>
        </>}
        {inv.status === 'revisao' && <>
          <button onClick={() => mudarStatusInventario(inv.id, 'contando')}><RotateCcw size={14} aria-hidden="true" /> Voltar à contagem</button>
          <button className="gold" onClick={() => setModal('aprovar')}><ShieldCheck size={14} aria-hidden="true" /> Aprovar ajustes</button>
        </>}
      </div>
    </div>
  )

  if (inv.status === 'contando') {
    return (
      <>
        {header}
        <article className={`card ${s.invHead}`}>
          <div><small>Setor</small><b>{inv.setor}</b></div>
          <div><small>Aberto em</small><b>{fmtDateTime(inv.criadoEm)}</b></div>
          <div className={s.invProgress}>
            <small>Progresso</small>
            <b>{a.contados} de {a.linhas.length} contados</b>
            <Meter pct={(a.contados / a.linhas.length) * 100} label="Progresso da contagem" />
          </div>
        </article>
        <p className={s.ruleNote}><EyeOff size={14} aria-hidden="true" /> Contagem cega — o saldo do sistema só aparece na revisão. A contagem é salva automaticamente.</p>
        <input type="search" className={s.invSearch} placeholder="Buscar produto…" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar produto" />
        <ul className={s.countList}>
          {lista.map(l => {
            const v = inv.contagem[l.produtoId]
            return (
              <li key={l.produtoId} className={counted(v) ? s.countDone : undefined}>
                <span><b>{l.produto}</b><small>{l.produtoId}</small></span>
                <label>
                  <span className={s.srOnly}>Quantidade contada de {l.produto}</span>
                  <input type="number" inputMode="decimal" min="0" step="any" value={v ?? ''} placeholder="Contado"
                    onChange={e => salvarContagem(inv.id, l.produtoId, e.target.value)} />
                  <em>{l.unit}</em>
                </label>
                <button type="button" className={s.smallBtn} onClick={() => salvarContagem(inv.id, l.produtoId, '0')} title="Não encontrado no setor">Não achei (0)</button>
              </li>
            )
          })}
        </ul>
        {modal === 'cancelar' && (
          <ConfirmModal title={`Cancelar ${inv.id}?`} subtitle="A contagem feita será descartada; o estoque não muda." confirmLabel="Cancelar inventário" danger
            onClose={() => setModal(null)} onConfirm={() => { mudarStatusInventario(inv.id, 'cancelado'); setModal(null); toast(`${inv.id} cancelado.`, { type: 'info' }) }} />
        )}
      </>
    )
  }

  const resultado = inv.resultado
  const columns = [
    { key: 'produto', header: 'Produto', render: l => <b className={s.cellStrong}>{l.produto}</b> },
    { key: 'sistema', header: 'Sistema', width: 100, align: 'right', render: l => `${fmtNum(l.sistema)} ${l.unit}` },
    { key: 'contado', header: 'Contado', width: 100, align: 'right', render: l => `${fmtNum(l.contado)} ${l.unit}` },
    { key: 'diff', header: 'Diferença', width: 110, align: 'right', render: l => (l.diff ? <b>{l.diff > 0 ? '+' : '−'}{fmtNum(Math.abs(l.diff))}</b> : '0') },
    { key: 'valor', header: 'A custo', width: 120, align: 'right', render: l => (l.diff ? `${l.valor > 0 ? '+' : '−'}${fmtBRL(Math.abs(l.valor))}` : '—') },
    { key: 'sit', header: 'Situação', width: 120, sort: l => Math.abs(l.diff || 0), render: l => (l.diff ? <ToneBadge tone={l.diff > 0 ? 'warn' : 'bad'} label={l.diff > 0 ? 'Sobra' : 'Falta'} /> : <ToneBadge tone="ok" label="Confere" />) },
  ]

  return (
    <>
      {header}
      <div className="stats">
        <Stat a="Acurácia" b={`${a.acuracia}%`} tone={a.acuracia >= 95 ? 'ok' : a.acuracia >= 85 ? 'warn' : 'bad'} progress={a.acuracia} c={`${a.linhas.length - a.divergentes} de ${a.linhas.length} itens conferem · meta ≥ 95%`} />
        <Stat a="Faltas" b={fmtBRL(Math.abs(a.falta))} tone={a.falta < 0 ? 'bad' : 'ok'} c="Contado abaixo do sistema" />
        <Stat a="Sobras" b={fmtBRL(a.sobra)} tone={a.sobra > 0 ? 'warn' : 'ok'} c="Contado acima do sistema" />
        <Stat a="Divergência líquida" b={fmtBRL(a.liquido)} c={inv.status === 'concluido' ? `Aprovado por ${resultado?.autorizadoPor}` : 'Será lançada como ajuste'} />
      </div>
      <DataTable caption="Revisão do inventário" columns={columns} rows={a.linhas} rowKey={l => l.produtoId} initialSort={{ key: 'sit', dir: 'desc' }} pageSize={20} />
      {inv.status === 'concluido' && <p className={s.ruleNote}><CheckCircle2 size={14} aria-hidden="true" /> Concluído em {fmtDateTime(inv.concluidoEm)}. Os ajustes estão em Movimentações com o motivo "Diferença de inventário · {inv.id}".</p>}
      {modal === 'aprovar' && (
        <AuthorizeModal
          title={`Aprovar ajustes de ${inv.id}`}
          subtitle={`${a.divergentes} item(ns) com divergência em ${inv.setor}`}
          resumo={<>Lança <b>{a.divergentes}</b> ajuste(s) de estoque · líquido <b>{fmtBRL(a.liquido)}</b> a custo.</>}
          motivos={['Contagem física conferida', 'Recontagem confirmada', 'Outro']}
          confirmLabel="Aprovar e ajustar estoque"
          onClose={() => setModal(null)} onAuthorized={aprovar}
        />
      )}
    </>
  )
}

/* ─── Inventário ─── */
export function Inventario({ navigate, pageParams }) {
  const { inventarios } = useStore()
  if (pageParams?.id) {
    const inv = inventarios.find(i => i.id === pageParams.id)
    if (!inv) return <article className="card"><p>Inventário {pageParams.id} não encontrado.</p><button onClick={() => navigate('inventario')}>Voltar</button></article>
    return <Sessao inv={inv} navigate={navigate} />
  }
  return <Lista navigate={navigate} />
}
