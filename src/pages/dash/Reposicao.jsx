import { CheckCircle, Copy, AlertTriangle, Wine, Download, ArrowDownToLine } from 'lucide-react'
import { Stat } from '../../components/ui.jsx'
import { useToast } from '../../components/useToast.js'
import { fmtNum } from '../../lib/format.js'
import { downloadCSV, stamp } from '../../lib/csv.js'
import { useStore } from './useStore.js'
import { canEdit } from './pages.js'
import { getStatus, getStatusDrink, getGargalo, getRendimentoDrink } from './estoque.js'
import { StatusChip } from './components/StatusChip.jsx'
import { DataTable } from './components/DataTable.jsx'
import s from './dash.module.css'

const statusOrder = { Zerado: 0, Crítico: 1, Baixo: 2 }

/* Sugestão de compra: repõe até 2× o mínimo (mesma referência do "nível ideal") */
const sugestao = (p) => Math.max(0, Math.ceil(p.min * 2 - p.qty))

/* ─── Reposição ─── */
export function Reposicao({ navigate }) {
  const { products, drinks, role } = useStore()
  const toast = useToast()

  const urgentes = products
    .filter(p => p.tipo === 'padrao' && ['Crítico', 'Zerado', 'Baixo'].includes(getStatus(p)))
    .sort((a, b) => statusOrder[getStatus(a)] - statusOrder[getStatus(b)])

  const drinksAfetados = drinks.filter(d => ['Crítico', 'Zerado'].includes(getStatusDrink(d, products)))
  const nUrg   = urgentes.filter(p => ['Crítico', 'Zerado'].includes(getStatus(p))).length
  const nBreve = urgentes.filter(p => getStatus(p) === 'Baixo').length

  async function copyLista() {
    const lines = urgentes.map(p => `${p.name}: ${fmtNum(p.qty)}/${p.min} ${p.unit} — pedir ${sugestao(p)} ${p.unit}`)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      toast('Cole no WhatsApp ou e-mail do fornecedor.', { title: 'Lista copiada' })
    } catch {
      toast('O navegador bloqueou a área de transferência. Use "Exportar".', { type: 'error', title: 'Não foi possível copiar' })
    }
  }

  function exportar() {
    downloadCSV(`reposicao-${stamp()}`,
      ['Código', 'Produto', 'Categoria', 'Fornecedor', 'Em estoque', 'Mínimo', 'Sugestão de compra', 'Unidade', 'Situação'],
      urgentes.map(p => [p.id, p.name, p.cat, p.fornecedor || '', p.qty, p.min, sugestao(p), p.unit, getStatus(p)]))
    toast(`${urgentes.length} itens exportados.`, { title: 'Exportação concluída' })
  }

  const columns = [
    { key: 'name', header: 'Produto', render: p => <span className={s.repName}>{p.name}</span> },
    { key: 'cat', header: 'Categoria', width: 120 },
    {
      key: 'qty', header: 'Em estoque', width: 110, align: 'right',
      render: p => <b style={{ color: ['Zerado', 'Crítico'].includes(getStatus(p)) ? 'var(--red)' : 'var(--gold2)' }}>{fmtNum(p.qty)} {p.unit}</b>,
    },
    { key: 'min', header: 'Mínimo', width: 90, align: 'right', render: p => `${p.min} ${p.unit}` },
    { key: 'sug', header: 'Sugestão de compra', width: 150, align: 'right', sort: sugestao, render: p => <b style={{ color: 'var(--green)' }}>+{sugestao(p)} {p.unit}</b> },
    { key: 'status', header: 'Situação', width: 100, sort: p => statusOrder[getStatus(p)], render: p => <StatusChip status={getStatus(p)} /> },
    ...(canEdit(role) ? [{
      key: 'acao', header: <span className={s.srOnly}>Ações</span>, width: 60, sort: false,
      render: p => (
        <button className={s.iconBtn} title="Registrar entrada" aria-label={`Registrar entrada de ${p.name}`} onClick={() => navigate('movimentacoes', { produto: p.id, novo: 1 })}>
          <ArrowDownToLine size={14} />
        </button>
      ),
    }] : []),
  ]

  return (
    <div className={s.repPage}>
      <div className="stats">
        <Stat a="Reposição urgente"  b={nUrg} c="Itens críticos ou zerados — pedir hoje" tone={nUrg ? 'bad' : 'ok'} badge={nUrg ? 'Pedir hoje' : 'Em dia'} />
        <Stat a="Reposição em breve" b={nBreve} c="Estoque baixo — incluir no próximo pedido" tone={nBreve ? 'warn' : 'ok'} badge={nBreve ? 'Programar' : 'Em dia'} />
        <Stat a="Drinks afetados"    b={drinksAfetados.length} c="Cardápio com insumos críticos" tone={drinksAfetados.length ? 'warn' : 'ok'} badge={drinksAfetados.length ? 'Cardápio em risco' : 'Cardápio ok'} />
      </div>

      {urgentes.length === 0 ? (
        <article className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <CheckCircle size={32} style={{ color: 'var(--green)', marginBottom: 12 }} aria-hidden="true" />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Estoque em ordem</p>
          <p className={s.muted}>Nenhum produto precisa de reposição agora.</p>
        </article>
      ) : (
        <>
          <div className={s.repCardHeader}>
            <span>Lista de reposição</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copyLista}>Copiar lista <Copy size={13} aria-hidden="true" /></button>
              <button onClick={exportar}>Exportar <Download size={13} aria-hidden="true" /></button>
            </div>
          </div>
          <DataTable caption="Lista de reposição" columns={columns} rows={urgentes} pageSize={20} />
        </>
      )}

      {drinksAfetados.length > 0 && (
        <article className="card">
          <h3 className={s.warnTitle}><AlertTriangle size={14} aria-hidden="true" />Drinks afetados</h3>
          {drinksAfetados.map(d => {
            const gargalo = getGargalo(d, products)
            const rend = getRendimentoDrink(d, products)
            return (
              <div key={d.id} className={s.repDrinkRow}>
                <Wine size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} aria-hidden="true" />
                <span style={{ flex: 1 }}>
                  <b className={s.cellStrong}>{d.name}</b>
                  <small className={s.repDrinkSub}>
                    {rend === 0 ? 'Impossível produzir' : `~${rend} copos possíveis`}
                    {gargalo ? ` · gargalo: ${gargalo.insumo.name}` : ''}
                  </small>
                </span>
                <StatusChip status={getStatusDrink(d, products)} />
              </div>
            )
          })}
        </article>
      )}
    </div>
  )
}
