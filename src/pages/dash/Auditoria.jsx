import { useState } from 'react'
import { Download, Settings2 } from 'lucide-react'
import { Stat, ToneBadge, Sel } from '../../components/ui.jsx'
import { useToast } from '../../components/useToast.js'
import { fmtBRL, fmtDateTime } from '../../lib/format.js'
import { downloadCSV, stamp } from '../../lib/csv.js'
import { useStore } from './useStore.js'
import { DataTable } from './components/DataTable.jsx'
import s from './dash.module.css'

const TIPO_TONE = {
  'Desconto': 'warn',
  'Desconto acima do limite': 'bad',
  'Cancelamento de pedido': 'bad',
  'Item removido': 'neutral',
  'Inventário aprovado': 'neutral',
}
const PERIODOS = [['hoje', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'], ['todos', 'Tudo']]

/* ─── Auditoria do caixa (antifraude) ─── */
export function Auditoria() {
  const { auditoria, sales, config } = useStore()
  const toast = useToast()
  const [tipo, setTipo] = useState('Todos')
  const [operador, setOperador] = useState('Todos')
  const [periodo, setPeriodo] = useState('30')
  const [agora] = useState(() => Date.now()) // referência estável do período

  const desde = periodo === 'todos' ? 0
    : periodo === 'hoje' ? new Date(new Date(agora).toDateString()).getTime()
    : agora - Number(periodo) * 86400000
  const noPeriodo = (iso) => new Date(iso).getTime() >= desde

  const eventos = auditoria.filter(e => noPeriodo(e.em))
  const tipos = ['Todos', ...new Set(auditoria.map(e => e.tipo))]
  const operadores = ['Todos', ...new Set(auditoria.map(e => e.operador))]
  const rows = eventos.filter(e => (tipo === 'Todos' || e.tipo === tipo) && (operador === 'Todos' || e.operador === operador))

  const vendas = sales.filter(v => noPeriodo(v.em))
  const descontos = eventos.filter(e => e.tipo.startsWith('Desconto'))
  const totalDesc = descontos.reduce((a, e) => a + (e.valor || 0), 0)
  const pctComDesc = vendas.length ? Math.round((vendas.filter(v => v.desconto > 0).length / vendas.length) * 100) : 0
  const cancel = eventos.filter(e => e.tipo === 'Cancelamento de pedido')
  const removidos = eventos.filter(e => e.tipo === 'Item removido')
  const semAutorizacao = eventos.filter(e => e.tipo === 'Desconto acima do limite' && !e.autorizadoPor).length

  function exportar() {
    downloadCSV(`auditoria-caixa-${stamp()}`, ['Data/hora', 'Tipo', 'Operador', 'Autorizado por', 'Pedido', 'Valor', 'Motivo', 'Detalhe'],
      rows.map(e => [fmtDateTime(e.em), e.tipo, e.operador, e.autorizadoPor || '', e.pedido || '', e.valor ?? '', e.motivo || '', e.detalhe || '']))
    toast(`${rows.length} evento(s) exportado(s).`, { title: 'Exportação concluída' })
  }

  const columns = [
    { key: 'em', header: 'Data / hora', width: 130, render: e => <span className={s.muted}>{fmtDateTime(e.em)}</span> },
    { key: 'tipo', header: 'Evento', width: 210, render: e => <ToneBadge tone={TIPO_TONE[e.tipo] || 'neutral'} label={e.tipo} /> },
    { key: 'operador', header: 'Operador', width: 130 },
    { key: 'autorizadoPor', header: 'Autorizado por', width: 160, render: e => e.autorizadoPor || <span className={s.muted}>—</span> },
    { key: 'valor', header: 'Valor', width: 110, align: 'right', render: e => (e.valor != null ? fmtBRL(e.valor) : '—') },
    { key: 'motivo', header: 'Motivo / detalhe', sort: false, render: e => <span className={s.lotProd}><b>{e.motivo || e.pedido || '—'}</b>{e.detalhe && <small>{e.detalhe}</small>}</span> },
  ]

  return (
    <>
      <div className={s.segRow} role="radiogroup" aria-label="Período">
        {PERIODOS.map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={periodo === id} className={periodo === id ? s.segRowOn : undefined} onClick={() => setPeriodo(id)}>{label}</button>
        ))}
        <div className={s.segRowActions}>
          <span className={s.muted}><Settings2 size={13} aria-hidden="true" /> Limite de desconto sem autorização: <b>{config.limiteDescontoPct}%</b></span>
        </div>
      </div>

      <div className="stats">
        <Stat a="Descontos concedidos" b={fmtBRL(totalDesc)} c={`${descontos.length} desconto(s) no período`} />
        <Stat a="Vendas com desconto" b={`${pctComDesc}%`} tone={pctComDesc > 20 ? 'warn' : 'neutral'} badge={pctComDesc > 20 ? 'Acima do usual' : undefined} c={`de ${vendas.length} venda(s) no período`} />
        <Stat a="Pedidos cancelados" b={cancel.length} tone={cancel.length ? 'warn' : 'neutral'} c={cancel.length ? `${fmtBRL(cancel.reduce((x, e) => x + (e.valor || 0), 0))} cancelados` : 'Nenhum cancelamento'} />
        <Stat a="Itens removidos" b={removidos.length} c="Retirados de pedidos antes do pagamento" />
      </div>
      {semAutorizacao > 0 && <p className={s.errMsg}>{semAutorizacao} desconto(s) acima do limite sem autorização registrada.</p>}

      <div className={s.filterRow}>
        <Sel value={tipo} onChange={e => setTipo(e.target.value)} aria-label="Filtrar por evento">
          {tipos.map(t => <option key={t} value={t}>{t === 'Todos' ? 'Evento: todos' : t}</option>)}
        </Sel>
        <Sel value={operador} onChange={e => setOperador(e.target.value)} aria-label="Filtrar por operador">
          {operadores.map(o => <option key={o} value={o}>{o === 'Todos' ? 'Operador: todos' : o}</option>)}
        </Sel>
        <button onClick={exportar} disabled={!rows.length}>Exportar <Download size={13} aria-hidden="true" /></button>
      </div>

      <DataTable caption="Eventos de auditoria do caixa" columns={columns} rows={rows} initialSort={{ key: 'em', dir: 'desc' }} pageSize={20}
        emptyText="Nenhum evento no período. Descontos, cancelamentos e remoções de itens aparecem aqui." />
    </>
  )
}
