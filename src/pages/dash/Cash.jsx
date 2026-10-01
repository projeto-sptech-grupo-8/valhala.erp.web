import { useEffect, useRef, useState } from 'react'
import {
  Package, Wine, Lock, Unlock, ArrowDownCircle, ArrowUpCircle, History, Plus, Minus, X, Trash2, CreditCard,
} from 'lucide-react'
import { Printer, Send, ShieldCheck } from 'lucide-react'
import { useToast } from '../../components/useToast.js'
import { fmtBRL, fmtTime, fmtDateTime } from '../../lib/format.js'
import { useStore } from './useStore.js'
import { caixaResumo, FORMAS } from './caixa.js'
import { getRendimentoDrink } from './estoque.js'
import { sellableQty } from './lotes.js'
import { Modal } from './components/Modal.jsx'
import { AuthorizeModal } from './components/AuthorizeModal.jsx'
import s from './dash.module.css'
import c from './Cash.module.css'

const posCats = ['Todos', 'Cerveja', 'Vinho', 'Destilados', 'Gin', 'Drinks', 'Combos', 'Sem Álcool']
const round2 = (n) => Math.round(n * 100) / 100
/* aceita "1.234,56", "12,5" e "12.5" */
const parseMoney = (v) => {
  const str = String(v).trim()
  const norm = str.includes(',') ? str.replace(/\./g, '').replace(',', '.') : str
  return Number(norm) || 0
}

/* ─── Caixa fechado: abertura (RF08) ─── */
function AbrirCaixa({ onOpen, operador, ultima }) {
  const [valor, setValor] = useState('')
  const [op, setOp] = useState(operador)
  return (
    <div className={c.closedWrap}>
      <article className={'card form ' + c.closedCard}>
        <Lock size={28} className={c.closedIcon} aria-hidden="true" />
        <h3>Caixa fechado</h3>
        <p className={s.muted}>Informe o fundo de troco para abrir a sessão. As vendas ficam bloqueadas até a abertura.</p>
        <form onSubmit={e => { e.preventDefault(); onOpen({ valorInicial: parseMoney(valor), operador: op }) }}>
          <label><span>Operador</span><input value={op} onChange={e => setOp(e.target.value)} required /></label>
          <label>
            <span>Fundo de troco (R$)</span>
            <input inputMode="decimal" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} autoFocus />
          </label>
          <button type="submit" className="gold">Abrir caixa <Unlock size={13} aria-hidden="true" /></button>
        </form>
      </article>
      {ultima && (
        <article className="card">
          <h3>Última sessão</h3>
          <dl className={c.dl}>
            <dt>Período</dt><dd>{fmtDateTime(ultima.abertoEm)} → {fmtTime(ultima.fechadoEm)}</dd>
            <dt>Operador</dt><dd>{ultima.operador}</dd>
            <dt>Vendas</dt><dd>{ultima.resumo.qtdVendas} · {fmtBRL(ultima.resumo.totalVendas)}</dd>
            <dt>Diferença no dinheiro</dt>
            <dd className={ultima.diferenca === 0 ? c.ok : c.bad}>
              {ultima.diferenca === 0 ? 'Sem diferença' : `${ultima.diferenca > 0 ? 'Sobra' : 'Falta'} de ${fmtBRL(Math.abs(ultima.diferenca))}`}
            </dd>
          </dl>
        </article>
      )}
    </div>
  )
}

/* ─── Sangria / reforço ─── */
function MovCaixaModal({ tipo, max, onClose, onConfirm }) {
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [err, setErr] = useState('')
  function submit(e) {
    e.preventDefault()
    const v = parseMoney(valor)
    if (!(v > 0)) return setErr('Informe um valor maior que zero.')
    if (tipo === 'Sangria' && v > max) return setErr(`Valor maior que o dinheiro em caixa (${fmtBRL(max)}).`)
    if (!motivo.trim()) return setErr('Informe o motivo.')
    onConfirm({ tipo, valor: v, motivo })
  }
  return (
    <Modal
      title={tipo === 'Sangria' ? 'Sangria de caixa' : 'Reforço de caixa'}
      subtitle={tipo === 'Sangria' ? `Retirada de dinheiro da gaveta. Disponível: ${fmtBRL(max)}` : 'Entrada de dinheiro para troco.'}
      onClose={onClose}
      width={420}
      footer={<><button type="button" onClick={onClose}>Cancelar</button><button type="submit" form="movcx" className="gold">Confirmar {tipo.toLowerCase()}</button></>}
    >
      <form id="movcx" onSubmit={submit} className={c.modalForm}>
        <label><span>Valor (R$)</span><input inputMode="decimal" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} data-autofocus /></label>
        <label><span>Motivo</span><input placeholder={tipo === 'Sangria' ? 'Ex.: depósito bancário' : 'Ex.: troco adicional'} value={motivo} onChange={e => setMotivo(e.target.value)} /></label>
        {err && <p className={s.errMsg} role="alert">{err}</p>}
      </form>
    </Modal>
  )
}

/* ─── Pagamento (pagamento dividido + troco) ─── */
function PagamentoModal({ total, onClose, onConfirm }) {
  const [pagamentos, setPagamentos] = useState([])
  const [forma, setForma] = useState('Pix')
  const pago = round2(pagamentos.reduce((a, p) => a + p.valor, 0))
  const restante = round2(Math.max(0, total - pago))
  const [valor, setValor] = useState(total.toFixed(2).replace('.', ','))
  const [err, setErr] = useState('')
  const valorRef = useRef(null)

  const dinheiro = pagamentos.filter(p => p.forma === 'Dinheiro').reduce((a, p) => a + p.valor, 0)
  const troco = round2(Math.max(0, pago - total))

  function add(e) {
    e?.preventDefault()
    const v = round2(parseMoney(valor))
    if (!(v > 0)) return setErr('Informe o valor recebido.')
    if (forma !== 'Dinheiro' && v > restante) return setErr(`Em ${forma} o valor não pode passar do restante (${fmtBRL(restante)}). Troco só em dinheiro.`)
    setErr('')
    const next = [...pagamentos, { forma, valor: v }]
    setPagamentos(next)
    const rest = round2(Math.max(0, total - next.reduce((a, p) => a + p.valor, 0)))
    setValor(rest ? rest.toFixed(2).replace('.', ',') : '')
  }

  function pickForma(f) {
    setForma(f)
    setErr('')
    valorRef.current?.focus()
    valorRef.current?.select()
  }

  useEffect(() => {
    function onKey(e) {
      const i = ['1', '2', '3', '4'].indexOf(e.key)
      if (i >= 0 && e.altKey) { e.preventDefault(); pickForma(FORMAS[i]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const quitado = pago >= total && troco <= dinheiro

  return (
    <Modal
      title="Pagamento"
      subtitle={`Total a receber: ${fmtBRL(total)}`}
      onClose={onClose}
      width={520}
      footer={<>
        <button type="button" onClick={onClose}>Voltar ao pedido</button>
        <button type="button" className="gold" disabled={!quitado} onClick={() => onConfirm({ pagamentos, troco })}>
          Finalizar venda {troco > 0 && `· troco ${fmtBRL(troco)}`}
        </button>
      </>}
    >
      <div className={c.payMethods} role="radiogroup" aria-label="Forma de pagamento">
        {FORMAS.map((f, i) => (
          <button key={f} type="button" role="radio" aria-checked={forma === f} className={forma === f ? c.payMethodActive : c.payMethod} onClick={() => pickForma(f)}>
            {f}<kbd className={c.kbd}>Alt+{i + 1}</kbd>
          </button>
        ))}
      </div>

      {restante > 0 && (
        <form onSubmit={add} className={c.payAdd}>
          <label>
            <span>Valor em {forma}</span>
            <input ref={valorRef} inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} data-autofocus />
          </label>
          <button type="submit">Adicionar <Plus size={13} aria-hidden="true" /></button>
        </form>
      )}
      {err && <p className={s.errMsg} role="alert">{err}</p>}

      {pagamentos.length > 0 && (
        <ul className={c.payList} aria-label="Pagamentos lançados">
          {pagamentos.map((p, i) => (
            <li key={i}>
              <span>{p.forma}</span>
              <b>{fmtBRL(p.valor)}</b>
              <button type="button" aria-label={`Remover pagamento ${p.forma}`} onClick={() => setPagamentos(ps => ps.filter((_, j) => j !== i))}><X size={13} /></button>
            </li>
          ))}
        </ul>
      )}

      <dl className={c.payTotals} aria-live="polite">
        <dt>Total</dt><dd>{fmtBRL(total)}</dd>
        <dt>Recebido</dt><dd>{fmtBRL(pago)}</dd>
        {restante > 0 && <><dt>Falta</dt><dd className={c.bad}>{fmtBRL(restante)}</dd></>}
        {troco > 0 && <><dt>Troco</dt><dd className={c.ok}>{fmtBRL(troco)}</dd></>}
      </dl>
    </Modal>
  )
}

/* ─── Fechamento com conferência ─── */
function FecharCaixaModal({ caixa, sales, ordersAbertas, onClose, onConfirm }) {
  const r = caixaResumo(caixa, sales)
  const [contado, setContado] = useState('')
  const [obs, setObs] = useState('')
  const [err, setErr] = useState('')
  const contadoN = parseMoney(contado)
  const diff = contado === '' ? null : round2(contadoN - r.dinheiroEsperado)

  function submit(e) {
    e.preventDefault()
    if (contado === '') return setErr('Conte o dinheiro da gaveta e informe o valor.')
    if (diff !== 0 && !obs.trim()) return setErr('Justifique a diferença antes de fechar.')
    onConfirm({ contadoDinheiro: contadoN, obs })
  }

  return (
    <Modal
      title="Fechar caixa"
      subtitle={`Aberto às ${fmtTime(caixa.abertoEm)} por ${caixa.operador} · ${r.qtdVendas} venda${r.qtdVendas === 1 ? '' : 's'}`}
      onClose={onClose}
      width={540}
      footer={<><button type="button" onClick={onClose}>Cancelar</button><button type="submit" form="fechar" className="gold">Confirmar fechamento <Lock size={13} aria-hidden="true" /></button></>}
    >
      {ordersAbertas > 0 && (
        <p className={c.warnBox} role="note">Há {ordersAbertas} mesa(s) com itens em aberto. Elas continuarão salvas para a próxima sessão.</p>
      )}
      <table className={c.sumTable}>
        <caption className={s.srOnly}>Resumo por forma de pagamento</caption>
        <tbody>
          {FORMAS.map(f => <tr key={f}><th scope="row">{f}</th><td>{fmtBRL(r.porForma[f])}</td></tr>)}
          <tr className={c.sumTotal}><th scope="row">Total vendido</th><td>{fmtBRL(r.totalVendas)}</td></tr>
        </tbody>
      </table>
      <table className={c.sumTable}>
        <caption className={s.srOnly}>Conferência do dinheiro</caption>
        <tbody>
          <tr><th scope="row">Fundo de troco</th><td>{fmtBRL(caixa.valorInicial)}</td></tr>
          <tr><th scope="row">+ Vendas em dinheiro (líquido de troco)</th><td>{fmtBRL(r.porForma.Dinheiro)}</td></tr>
          <tr><th scope="row">+ Reforços</th><td>{fmtBRL(r.reforcos)}</td></tr>
          <tr><th scope="row">− Sangrias</th><td>{fmtBRL(r.sangrias)}</td></tr>
          <tr className={c.sumTotal}><th scope="row">Dinheiro esperado na gaveta</th><td>{fmtBRL(r.dinheiroEsperado)}</td></tr>
        </tbody>
      </table>
      <form id="fechar" onSubmit={submit} className={c.modalForm}>
        <label>
          <span>Dinheiro contado (R$)</span>
          <input inputMode="decimal" placeholder="0,00" value={contado} onChange={e => setContado(e.target.value)} data-autofocus />
          {diff !== null && (
            <small className={diff === 0 ? c.ok : c.bad}>
              {diff === 0 ? 'Conferido — sem diferença.' : `${diff > 0 ? 'Sobra' : 'Falta'} de ${fmtBRL(Math.abs(diff))}`}
            </small>
          )}
        </label>
        <label>
          <span>Observação {diff ? '(obrigatória)' : ''}</span>
          <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex.: troco devolvido a mais" />
        </label>
        {err && <p className={s.errMsg} role="alert">{err}</p>}
      </form>
    </Modal>
  )
}

/* ─── Vendas da sessão ─── */
function HistoricoModal({ vendas, onClose, onReprint }) {
  return (
    <Modal title="Vendas da sessão" subtitle={`${vendas.length} venda(s) neste caixa`} onClose={onClose} width={600}>
      {vendas.length === 0 && <p className={s.muted}>Nenhuma venda registrada ainda.</p>}
      {vendas.length > 0 && (
        <table className={c.histTable}>
          <thead><tr><th scope="col">Nº</th><th scope="col">Hora</th><th scope="col">Mesa</th><th scope="col">Itens</th><th scope="col">Pagamento</th><th scope="col">Total</th><th scope="col"><span className={s.srOnly}>Cupom</span></th></tr></thead>
          <tbody>
            {vendas.map(v => (
              <tr key={v.id}>
                <td>#{v.num}</td>
                <td>{fmtTime(v.em)}</td>
                <td>{v.mesa}</td>
                <td title={v.itens.map(i => `${i.qty}× ${i.name}`).join(', ')}>{v.itens.reduce((a, i) => a + i.qty, 0)}</td>
                <td>{[...new Set(v.pagamentos.map(p => p.forma))].join(' + ')}</td>
                <td><b>{fmtBRL(v.total)}</b></td>
                <td><button className={s.smallBtn} onClick={() => onReprint(v)} aria-label={`Reimprimir cupom da venda ${v.num}`}><Printer size={13} aria-hidden="true" /> Cupom</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  )
}

/* ─── Caixa (PDV) ─── */
export function Cash() {
  const store = useStore()
  const { products, drinks, orders, activeOrderId, caixa, sales, sessoes, operador, config } = store
  const toast = useToast()
  const [cat, setCat]         = useState('Todos')
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(null) // 'pagar' | 'fechar' | 'Sangria' | 'Reforço' | 'hist' | 'cancelar'
  const [descontos, setDescontos] = useState({}) // por mesa: { [orderId]: { tipo, valor } }
  const [descAuth, setDescAuth] = useState({})     // por mesa: { [orderId]: { valor, autorizadoPor, motivo } }
  const searchRef = useRef(null)

  const order = orders.find(o => o.id === activeOrderId) || orders[0]
  const { tipo: descTipo = 'R$', valor: descValor = '' } = descontos[order.id] || {}
  const setDesc = (patch) => setDescontos(d => ({ ...d, [order.id]: { tipo: descTipo, valor: descValor, ...patch } }))

  // quantidade já reservada em mesas abertas (evita vender o mesmo item duas vezes)
  const reservado = {}
  orders.forEach(o => o.items.forEach(it => { reservado[it.id] = (reservado[it.id] || 0) + it.qty }))

  // só o saldo dentro da validade é vendável (lote vencido fica bloqueado — FEFO)
  const vendaveis = products.map(p => ({ ...p, qty: sellableQty(p) }))
  const catalogo = [
    ...vendaveis.map(p => ({ id: p.id, name: p.name, cat: p.cat, price: p.price, tipo: 'padrao', disp: Math.floor(p.qty) - (reservado[p.id] || 0), vencido: p.qty < products.find(x => x.id === p.id).qty })),
    ...drinks.map(d => ({ id: d.id, name: d.name, cat: d.cat, price: d.price, tipo: 'drink', disp: (getRendimentoDrink(d, vendaveis) ?? 0) - (reservado[d.id] || 0) })),
  ]

  const q = search.trim().toLowerCase()
  const filtered = catalogo.filter(p =>
    (cat === 'Todos' || p.cat === cat) && (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase() === q)
  )

  const subtotal = order.items.reduce((acc, it) => acc + it.price * it.qty, 0)
  const descN = parseMoney(descValor)
  const desconto = round2(Math.min(subtotal, descTipo === '%' ? subtotal * Math.min(descN, 100) / 100 : descN))
  const total = round2(subtotal - desconto)
  // antifraude: desconto acima do limite exige autorização do gerente (atrelada ao valor autorizado)
  const descPct = subtotal > 0 ? (desconto / subtotal) * 100 : 0
  const acimaLimite = desconto > 0 && descPct > config.limiteDescontoPct + 1e-9
  const auth = descAuth[order.id]
  const descAutorizado = acimaLimite && auth?.valor === desconto
  const pedirPagamento = () => setModal(acimaLimite && !descAutorizado ? 'descAuth' : 'pagar')
  const drinksPendentes = order.items.filter(i => i.tipo === 'drink').reduce((a, i) => a + (i.qty - (i.enviado || 0)), 0)

  function addItem(prod) {
    if (prod.disp <= 0) {
      toast(`${prod.name} sem estoque disponível.`, { type: 'warning', title: 'Indisponível' })
      return
    }
    store.updateOrderItems(order.id, items => {
      const ex = items.find(it => it.id === prod.id)
      if (ex) return items.map(it => it.id === prod.id ? { ...it, qty: it.qty + 1 } : it)
      return [...items, { id: prod.id, name: prod.name, price: prod.price, tipo: prod.tipo, qty: 1 }]
    })
  }

  function changeQty(it, delta) {
    if (delta > 0) {
      const prod = catalogo.find(p => p.id === it.id)
      if (prod && prod.disp <= 0) { toast(`Limite de estoque de ${it.name} atingido.`, { type: 'warning', title: 'Indisponível' }); return }
    }
    store.updateOrderItems(order.id, items => items.map(x => x.id === it.id ? { ...x, qty: x.qty + delta } : x).filter(x => x.qty > 0))
    if (delta < 0) store.registrarAuditoria({ tipo: 'Item removido', pedido: order.label, valor: round2(it.price * -delta), detalhe: `${-delta}× ${it.name}` })
  }

  // leitor de código de barras digita o código + Enter
  function onSearchKey(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const exact = catalogo.find(p => p.id.toLowerCase() === q)
    const hit = exact || (filtered.length === 1 ? filtered[0] : null)
    if (hit) { addItem(hit); setSearch('') }
    else if (q) toast(filtered.length ? 'Mais de um produto encontrado — refine a busca.' : 'Nenhum produto com esse nome ou código.', { type: 'info' })
  }

  function confirmarVenda({ pagamentos, troco }) {
    try {
      const { sale, alerts } = store.finalizeSale({ orderId: order.id, desconto, pagamentos, troco, autorizacao: acimaLimite ? auth : null })
      if (config.imprimirCupom) store.print({ tipo: 'cupom', venda: sale })
      toast(`${sale.mesa} · ${fmtBRL(sale.total)}${troco ? ` · troco ${fmtBRL(troco)}` : ''}`, { title: `Venda #${sale.num} finalizada` })
      alerts.forEach(a => toast(`${a} — veja a lista de reposição.`, { type: 'warning', title: 'Estoque crítico', duration: 7000 }))
      setModal(null)
      setDescontos(d => ({ ...d, [order.id]: undefined }))
      setDescAuth(d => ({ ...d, [order.id]: undefined }))
    } catch (err) {
      toast(err.message, { type: 'error', title: 'Venda não finalizada' })
    }
  }

  // atalhos de teclado do PDV
  useEffect(() => {
    if (!caixa) return
    function onKey(e) {
      if (modal) return
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select() }
      if (e.key === 'F4') { e.preventDefault(); store.addOrder() }
      if (e.key === 'F9') { e.preventDefault(); if (order.items.length) pedirPagamento() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!caixa) {
    return (
      <AbrirCaixa
        operador={operador}
        ultima={sessoes[0]}
        onOpen={(data) => { store.openCaixa(data); toast(`Fundo de troco: ${fmtBRL(data.valorInicial)}`, { title: 'Caixa aberto' }) }}
      />
    )
  }

  const resumo = caixaResumo(caixa, sales)
  const vendasSessao = sales.filter(v => v.caixaId === caixa.id)

  return (
    <>
      <div className={c.bar}>
        <div className={c.barInfo}>
          <span className={c.dotOn} aria-hidden="true" />
          <b>Caixa aberto</b>
          <span>desde {fmtTime(caixa.abertoEm)} · {caixa.operador}</span>
          <span>{resumo.qtdVendas} venda{resumo.qtdVendas === 1 ? '' : 's'} · {fmtBRL(resumo.totalVendas)}</span>
        </div>
        <div className={c.barActions}>
          <button onClick={() => setModal('Sangria')}><ArrowUpCircle size={14} aria-hidden="true" /> Sangria</button>
          <button onClick={() => setModal('Reforço')}><ArrowDownCircle size={14} aria-hidden="true" /> Reforço</button>
          <button onClick={() => setModal('hist')}><History size={14} aria-hidden="true" /> Vendas</button>
          <button onClick={() => setModal('fechar')}><Lock size={14} aria-hidden="true" /> Fechar caixa</button>
        </div>
      </div>

      <div className={s.pos}>
        <article className="card">
          <div className={s.posTop}>
            <div className={s.catTabs} role="tablist" aria-label="Categorias">
              {posCats.map(x => (
                <button key={x} role="tab" aria-selected={cat === x} className={cat === x ? s.catActive : s.catBtn} onClick={() => setCat(x)}>{x}</button>
              ))}
            </div>
            <input
              ref={searchRef}
              type="search"
              className={s.posSearch}
              placeholder="Buscar ou ler código de barras (F2)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={onSearchKey}
              aria-label="Buscar produto ou ler código"
              autoFocus
            />
          </div>
          <div className={s.products}>
            {filtered.map(p => (
              <button key={p.id} onClick={() => addItem(p)} disabled={p.disp <= 0} className={p.disp <= 0 ? s.outOfStock : ''} aria-label={`Adicionar ${p.name}, ${fmtBRL(p.price)}, ${p.disp} disponíveis`}>
                {p.tipo === 'drink'
                  ? <Wine size={20} style={{ color: 'var(--gold)', marginBottom: 4 }} aria-hidden="true" />
                  : <Package size={20} style={{ color: 'var(--gold)', marginBottom: 4 }} aria-hidden="true" />}
                <b>{p.name}</b>
                <span>{fmtBRL(p.price)}</span>
                <small className={p.disp <= 5 ? s.lowStock : s.stockOk}>
                  {p.disp <= 0 ? 'Sem estoque' : `${p.disp} ${p.tipo === 'drink' ? 'possíveis' : 'disponíveis'}`}
                </small>
              </button>
            ))}
            {filtered.length === 0 && <p className={s.muted}>Nenhum produto encontrado.</p>}
          </div>
        </article>

        <article className={'card ' + s.cart} aria-label="Pedido">
          <div className={s.orderTabs} role="tablist" aria-label="Mesas abertas">
            {orders.map(o => (
              <button key={o.id} role="tab" aria-selected={o.id === order.id} className={o.id === order.id ? s.orderTabActive : s.orderTab} onClick={() => store.setActiveOrder(o.id)}>
                {o.label}{o.items.length > 0 && <em aria-label={`${o.items.length} itens`}>{o.items.length}</em>}
              </button>
            ))}
            <button className={s.orderTabAdd} onClick={store.addOrder} title="Nova mesa (F4)" aria-label="Nova mesa">
              <Plus size={14} />
            </button>
          </div>
          <h3>{order.label} <small>{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</small></h3>
          <div className={s.canalSeg} role="radiogroup" aria-label="Canal do pedido">
            {['Balcão', 'Mesa', 'Delivery'].map(cn => (
              <button key={cn} type="button" role="radio" aria-checked={order.canal === cn} className={order.canal === cn ? s.canalOn : undefined} onClick={() => store.setOrderCanal(order.id, cn)}>{cn}</button>
            ))}
          </div>
          {order.items.length === 0 && <p className={s.cartEmpty}>Nenhum item adicionado.<br />Selecione os produtos ao lado ou leia o código de barras.</p>}
          <div className={s.cartItems}>
            {order.items.map(it => (
              <div key={it.id} className={s.cartRow}>
                <span className={s.cartName}>{it.name}</span>
                <div className={s.qtyCtrl}>
                  <button onClick={() => changeQty(it, -1)} aria-label={`Diminuir ${it.name}`}><Minus size={12} /></button>
                  <b aria-label="Quantidade">{it.qty}</b>
                  <button onClick={() => changeQty(it, +1)} aria-label={`Aumentar ${it.name}`}><Plus size={12} /></button>
                </div>
                <span className={s.cartPrice}>{fmtBRL(it.price * it.qty)}</span>
                <button className={s.cartRemove} onClick={() => changeQty(it, -it.qty)} aria-label={`Remover ${it.name}`} title="Remover"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <footer className={s.cartFooter}>
            {order.items.length > 0 && (
              <div className={c.discount}>
                <label htmlFor="desc">Desconto</label>
                <div>
                  <select value={descTipo} onChange={e => setDesc({ tipo: e.target.value })} aria-label="Tipo de desconto">
                    <option>R$</option><option>%</option>
                  </select>
                  <input id="desc" inputMode="decimal" placeholder="0" value={descValor} onChange={e => setDesc({ valor: e.target.value })} />
                </div>
              </div>
            )}
            {desconto > 0 && (
              <>
                <div className={c.line}><span>Subtotal</span><span>{fmtBRL(subtotal)}</span></div>
                <div className={c.line}><span>Desconto</span><span>− {fmtBRL(desconto)}</span></div>
              </>
            )}
            {acimaLimite && (
              <p className={descAutorizado ? s.descOk : s.descWarn} role="status">
                <ShieldCheck size={13} aria-hidden="true" />
                {descAutorizado ? `Desconto de ${Math.round(descPct)}% autorizado por ${auth.autorizadoPor}` : `${Math.round(descPct)}% está acima do limite de ${config.limiteDescontoPct}% — exige autorização do gerente`}
              </p>
            )}
            {drinksPendentes > 0 && (
              <button className={s.barBtn} onClick={() => { const r = store.enviarDrinksAoBar(order.id); if (r) { store.print({ tipo: 'comanda', ...r, em: new Date().toISOString() }); toast(`${r.itens.reduce((a, i) => a + i.qty, 0)} drink(s) enviados ao bar.`, { title: 'Comanda impressa' }) } }}>
                <Send size={13} aria-hidden="true" /> Enviar ao bar ({drinksPendentes})
              </button>
            )}
            <div className={s.cartTotal}><span>Total</span><b>{fmtBRL(total)}</b></div>
            <div className={s.cartActions}>
              <button onClick={() => order.items.length ? setModal('cancelar') : store.removeOrder(order.id)}>
                {order.items.length ? 'Cancelar pedido' : 'Fechar mesa'}
              </button>
              <button className="gold" disabled={order.items.length === 0 || total <= 0} onClick={pedirPagamento}>
                Pagar <kbd className={`${c.kbd} ${c.kbdDark}`}>F9</kbd> <CreditCard size={13} aria-hidden="true" />
              </button>
            </div>
          </footer>
        </article>
      </div>

      <p className={c.hints} aria-label="Atalhos de teclado">
        <kbd className={c.kbd}>F2</kbd> buscar · <kbd className={c.kbd}>Enter</kbd> adicionar · <kbd className={c.kbd}>F4</kbd> nova mesa · <kbd className={c.kbd}>F9</kbd> pagar · <kbd className={c.kbd}>Esc</kbd> fechar janela
      </p>

      {modal === 'pagar' && <PagamentoModal total={total} onClose={() => setModal(null)} onConfirm={confirmarVenda} />}
      {(modal === 'Sangria' || modal === 'Reforço') && (
        <MovCaixaModal
          tipo={modal}
          max={resumo.dinheiroEsperado}
          onClose={() => setModal(null)}
          onConfirm={(m) => { store.caixaMov(m); toast(`${m.tipo} de ${fmtBRL(m.valor)} registrada.`, { title: m.tipo }); setModal(null) }}
        />
      )}
      {modal === 'fechar' && (
        <FecharCaixaModal
          caixa={caixa}
          sales={sales}
          ordersAbertas={orders.filter(o => o.items.length).length}
          onClose={() => setModal(null)}
          onConfirm={(d) => {
            const sess = store.closeCaixa(d)
            toast(sess.diferenca === 0 ? 'Conferência sem diferenças.' : `Diferença de ${fmtBRL(sess.diferenca)} registrada.`, { title: 'Caixa fechado', type: sess.diferenca === 0 ? 'success' : 'warning' })
            setModal(null)
          }}
        />
      )}
      {modal === 'hist' && <HistoricoModal vendas={vendasSessao} onClose={() => setModal(null)} onReprint={(v) => store.print({ tipo: 'cupom', venda: v, reimpressao: true })} />}
      {modal === 'descAuth' && (
        <AuthorizeModal
          title="Autorizar desconto"
          subtitle={`${order.label} · limite sem autorização: ${config.limiteDescontoPct}%`}
          resumo={<>Desconto de <b>{fmtBRL(desconto)}</b> ({Math.round(descPct)}%) sobre {fmtBRL(subtotal)} → total <b>{fmtBRL(total)}</b></>}
          motivos={['Cliente frequente', 'Produto com avaria', 'Compra em volume', 'Erro de preço na gôndola', 'Outro']}
          confirmLabel="Autorizar e ir ao pagamento"
          onClose={() => setModal(null)}
          onAuthorized={({ autorizadoPor, motivo }) => { setDescAuth(d => ({ ...d, [order.id]: { valor: desconto, autorizadoPor, motivo } })); setModal('pagar') }}
        />
      )}
      {modal === 'cancelar' && (
        <AuthorizeModal
          title={`Cancelar pedido da ${order.label}?`}
          subtitle="Cancelamento com itens exige autorização e fica na auditoria do caixa."
          resumo={<>{order.items.length} item(ns) · <b>{fmtBRL(subtotal)}</b> serão descartados: {order.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</>}
          motivos={['Cliente desistiu', 'Pedido lançado errado', 'Mesa duplicada', 'Outro']}
          confirmLabel="Cancelar pedido"
          onClose={() => setModal(null)}
          onAuthorized={({ autorizadoPor, motivo }) => { const lbl = order.label; store.cancelarPedido(order.id, { motivo, autorizadoPor }); setModal(null); toast(`Pedido da ${lbl} cancelado · ${motivo}.`, { type: 'info', title: 'Cancelamento registrado' }) }}
        />
      )}
    </>
  )
}
