import { useEffect, useRef, useState } from 'react'
import { allProducts, drinkProducts, movimentacoes } from './mock.js'
import { getStatus, isCritical } from './estoque.js'
import { StoreCtx } from './useStore.js'
import { caixaResumo } from './caixa.js'
import { makeCan } from './pages.js'
import { readTheme, saveTheme, applyTheme, clearTheme } from '../../lib/theme.js'
import {
  addLot, consumeFEFO, consumeLot, normalizeLots, weightedCost, addDaysISO, describeUsed, SEM_LOTE,
} from './lotes.js'

/*
 * Store do painel (estado local + localStorage).
 * Concentra tudo que muda com o uso: estoque (com lotes/FEFO), movimentações, mesas, caixa, vendas,
 * entradas por NF-e, inventários e auditoria do caixa.
 * Quando o backend existir, cada ação abaixo vira uma chamada em src/lib/api.js.
 */
const KEY = 'valhalla:store:v2'
const KEY_V1 = 'valhalla:store:v1'

const round = (n) => Math.round(n * 1000) / 1000
const round2 = (n) => Math.round(n * 100) / 100

/* lotes de demonstração (validade relativa a hoje) */
const SEED_LOTS = {
  'BEB-001': [['L2609A', 12, 18], ['L2610B', 75, 30]],
  'BEB-002': [['ST0926', 40, 8]],
  'BEB-003': [['BD0812', -3, 6], ['BD0905', 25, 12], ['BD0920', 110, 18]],
  'BEB-004': [['CR0801', 5, 8], ['CR0915', 90, 16]],
  'BEB-012': [['RB0830', 20, 24], ['RB0920', 160, 48]],
  'BEB-013': [['AG0901', 200, 96]],
  'BEB-014': [['CB0911', 28, 20]],
}
function seedLots(p) {
  const def = SEED_LOTS[p.id]
  if (!def) return [{ id: `LT-${p.id}-0`, lote: `${p.id.slice(-3)}-${new Date().getFullYear()}`, validade: null, qty: p.qty, custo: p.cost, nf: '', entradaEm: '2026-08-01T10:00:00' }]
  return def.map(([lote, dias, qty], i) => ({ id: `LT-${p.id}-${i}`, lote, validade: addDaysISO(dias), qty, custo: p.cost, nf: '', entradaEm: `2026-0${7 + (i % 2)}-1${i}T10:00:00` }))
}

function seedMovements() {
  return movimentacoes.map((m, i) => {
    const [, time] = m.data.split(' · ')
    const prod = allProducts.find(p => p.name.startsWith(m.produto))
    return {
      id: `MOV-SEED-${i}`,
      em: `${m.dateISO}T${time}:00`,
      produtoId: prod?.id || '',
      produto: m.produto,
      tipo: m.tipo,
      qty: m.tipo === 'Ajuste' ? m.qty : Math.abs(m.qty),
      operador: m.operador,
      nf: m.nf,
      fornecedor: m.fornecedor,
      obs: '',
    }
  })
}

const DEFAULT_CONFIG = {
  limiteDescontoPct: 10,
  pinGerente: '1234',          // mock — no backend vira endpoint de aprovação
  imprimirCupom: true,
  empresa: { nome: 'Adega Meraki', cnpj: '00.000.000/0001-00', endereco: 'R. das Bebidas, 420 · São Paulo' },
}

function seed() {
  return {
    version: 2,
    products: allProducts.map(p => ({ ...p, lotes: seedLots(p) })),
    drinks: drinkProducts.map(d => ({ ...d, receita: d.receita.map(r => ({ ...r })) })),
    movements: seedMovements(),
    orders: [{ id: 1, label: 'Mesa 1', canal: 'Mesa', items: [] }],
    activeOrderId: 1,
    nextOrderId: 2,
    caixa: null,
    sessoes: [],
    sales: [],
    seq: 1,
    vinculos: {},        // de-para fornecedor → produto: { 'CNPJ|cProd': { produtoId, fator } }
    nfsImportadas: [],   // [{ chave, numero, serie, fornecedor, cnpj, valor, itens, em, operador }]
    inventarios: [],
    auditoria: [],
    config: DEFAULT_CONFIG,
  }
}

/* v1 → v2: produtos ganham lotes (saldo atual vira SEM-LOTE) e EAN do cadastro; nada registrado se perde */
function migrate(old) {
  const base = seed()
  const products = (old.products || base.products).map(p => {
    const ref = allProducts.find(a => a.id === p.id)
    const withEan = { ...p, ean: p.ean || ref?.ean || '' }
    return { ...withEan, lotes: normalizeLots(withEan) }
  })
  return {
    ...base,
    ...old,
    version: 2,
    products,
    orders: (old.orders || base.orders).map(o => ({ canal: 'Mesa', ...o })),
    config: { ...DEFAULT_CONFIG, ...(old.config || {}) },
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const st = JSON.parse(raw)
      return { ...seed(), ...st, config: { ...DEFAULT_CONFIG, ...(st.config || {}) } }
    }
    const v1 = localStorage.getItem(KEY_V1)
    if (v1) return migrate(JSON.parse(v1))
  } catch { /* storage indisponível ou corrompido */ }
  return seed()
}

const canalLabel = (canal, id) => `${canal} ${id}`

export function StoreProvider({ user, onUserChange, onLogout, children }) {
  const [state, setState] = useState(load)
  const ref = useRef(state) // sempre atualizado por commit()
  const [printJob, setPrintJob] = useState(null)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  }, [state])

  const operador = user?.name || 'Operador'

  function commit(next) {
    ref.current = next
    setState(next)
  }

  // IDs únicos mesmo com várias movimentações no mesmo milissegundo
  let localSeq = 0
  function makeMovement(st, fields) {
    localSeq++
    return { id: `MOV-${Date.now()}-${st.seq}-${localSeq}`, em: new Date().toISOString(), operador, nf: '', fornecedor: '', obs: '', ...fields }
  }

  function auditEntry(fields) {
    return { id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, em: new Date().toISOString(), operador, ...fields }
  }

  /* troca o produto na lista mantendo qty = soma dos lotes */
  function withProduct(products, id, fn) {
    return products.map(p => {
      if (p.id !== id) return p
      const np = fn(p)
      return { ...np, qty: round(np.lotes.reduce((a, l) => a + l.qty, 0)) }
    })
  }

  function obsWith(base, used) {
    return [base, used?.length ? `Lotes: ${describeUsed(used)}` : ''].filter(Boolean).join(' · ')
  }

  const actions = {
    /* ─── Produtos ─── */
    saveProduct(product, originalId) {
      const st = ref.current
      const listKey = product.tipo === 'drink' ? 'drinks' : 'products'
      const list = st[listKey]
      const exists = list.some(p => p.id === (originalId || product.id))
      const prepared = listKey === 'products' && !exists ? { ...product, lotes: normalizeLots({ ...product, lotes: [] }) } : product
      const nextList = exists
        ? list.map(p => p.id === (originalId || product.id) ? { ...p, ...prepared } : p)
        : [...list, prepared]
      commit({ ...st, [listKey]: nextList })
    },

    /* ─── Movimentações manuais (RF07) — com lote e FEFO ─── */
    addMovement({ produtoId, tipo, qty, lote, validade, custo, ...rest }) {
      const st = ref.current
      const prod = st.products.find(p => p.id === produtoId)
      if (!prod) throw new Error('Produto não encontrado.')
      let products, used = [], qtyMov = Math.abs(qty), cost = prod.cost

      if (tipo === 'Entrada') {
        cost = weightedCost(prod.qty, prod.cost, Math.abs(qty), Number(custo))
        products = withProduct(st.products, produtoId, p => ({ ...p, cost, lotes: addLot(p.lotes, { lote, validade, qty: Math.abs(qty), custo: Number(custo) || p.cost, nf: rest.nf }) }))
      } else if (tipo === 'Ajuste' && qty > 0) {
        products = withProduct(st.products, produtoId, p => ({ ...p, lotes: addLot(p.lotes, { lote: lote || SEM_LOTE, validade, qty, custo: p.cost }) }))
        qtyMov = qty
      } else {
        // saída manual ou ajuste negativo: FEFO incluindo vencidos (perda/vencimento saem primeiro)
        const need = Math.abs(qty)
        const r = consumeFEFO(prod.lotes, need, { allowExpired: true })
        if (r.missing > 0) throw new Error(`Saldo insuficiente: ${prod.name} tem ${prod.qty} ${prod.unit}.`)
        used = r.used
        products = withProduct(st.products, produtoId, p => ({ ...p, lotes: r.lotes }))
        qtyMov = tipo === 'Ajuste' ? qty : need
      }

      const mov = makeMovement(st, {
        produtoId, produto: prod.name, tipo, qty: qtyMov, operador: rest.operador || operador,
        nf: rest.nf || '', fornecedor: rest.fornecedor || '',
        lote: tipo === 'Entrada' ? (lote || SEM_LOTE) : '', validade: tipo === 'Entrada' ? (validade || null) : null,
        obs: obsWith(rest.obs, used),
      })
      commit({ ...st, products, movements: [mov, ...st.movements], seq: st.seq + 1 })
      return { alert: !isCritical(prod) && isCritical(products.find(p => p.id === produtoId)) ? prod.name : null }
    },

    /* perda de um lote específico (ex.: vencido) */
    registrarPerdaLote({ produtoId, loteId, motivo = 'Vencimento' }) {
      const st = ref.current
      const prod = st.products.find(p => p.id === produtoId)
      if (!prod) throw new Error('Produto não encontrado.')
      const r = consumeLot(prod.lotes, loteId)
      const products = withProduct(st.products, produtoId, p => ({ ...p, lotes: r.lotes }))
      const mov = makeMovement(st, { produtoId, produto: prod.name, tipo: 'Saída', qty: r.used[0].qty, obs: obsWith(motivo, r.used) })
      commit({ ...st, products, movements: [mov, ...st.movements], seq: st.seq + 1 })
      return r.used[0]
    },

    /* ─── Entrada por XML da NF-e ─── */
    importarNF({ nf, itens }) {
      const st = ref.current
      if (st.nfsImportadas.some(x => x.chave === nf.chave)) throw new Error(`A NF-e ${nf.numero} já foi importada.`)
      const validos = itens.filter(i => !i.ignorar)
      if (!validos.length) throw new Error('Nenhum item para dar entrada.')
      let products = st.products
      const movs = []
      const vinculos = { ...st.vinculos }
      for (const it of validos) {
        const prod = products.find(p => p.id === it.produtoId)
        if (!prod) throw new Error(`Produto não encontrado para o item ${it.cProd}.`)
        const cost = weightedCost(prod.qty, prod.cost, it.qty, it.custo)
        products = withProduct(products, prod.id, p => ({
          ...p, cost, lotes: addLot(p.lotes, { lote: it.lote, validade: it.validade, qty: it.qty, custo: it.custo, nf: nf.numero }),
        }))
        vinculos[`${nf.cnpj}|${it.cProd}`] = { produtoId: prod.id, fator: it.fator }
        movs.push(makeMovement(st, {
          produtoId: prod.id, produto: prod.name, tipo: 'Entrada', qty: it.qty,
          nf: nf.numero, fornecedor: nf.fornecedor, lote: it.lote || SEM_LOTE, validade: it.validade || null,
          obs: `NF-e ${nf.numero} · item ${it.cProd}${it.fator !== 1 ? ` (${it.qCom} ${it.uCom} × ${it.fator})` : ''} · custo ${it.custo.toFixed(2).replace('.', ',')}`,
        }))
      }
      const registro = {
        chave: nf.chave, numero: nf.numero, serie: nf.serie, fornecedor: nf.fornecedor, cnpj: nf.cnpj,
        valor: nf.valor, itens: validos.length, ignorados: itens.length - validos.length, em: new Date().toISOString(), operador,
      }
      commit({ ...st, products, vinculos, movements: [...movs.reverse(), ...st.movements], nfsImportadas: [registro, ...st.nfsImportadas], seq: st.seq + movs.length + 1 })
      return registro
    },

    /* ─── Inventário cego por setor ─── */
    criarInventario({ setor }) {
      const st = ref.current
      if (st.inventarios.some(i => i.setor === setor && (i.status === 'contando' || i.status === 'revisao'))) {
        throw new Error(`Já existe um inventário em andamento para ${setor}.`)
      }
      const itens = st.products.filter(p => p.local === setor)
      if (!itens.length) throw new Error('Nenhum produto neste setor.')
      const inv = {
        id: `INV-${String(st.inventarios.length + 1).padStart(3, '0')}`,
        setor, status: 'contando', criadoEm: new Date().toISOString(), operador,
        snapshot: itens.map(p => ({ produtoId: p.id, produto: p.name, unit: p.unit, sistema: p.qty, custo: p.cost })),
        contagem: {},
      }
      commit({ ...st, inventarios: [inv, ...st.inventarios] })
      return inv
    },
    salvarContagem(id, produtoId, valor) {
      const st = ref.current
      commit({ ...st, inventarios: st.inventarios.map(i => i.id === id ? { ...i, contagem: { ...i.contagem, [produtoId]: valor } } : i) })
    },
    mudarStatusInventario(id, status) {
      const st = ref.current
      commit({ ...st, inventarios: st.inventarios.map(i => i.id === id ? { ...i, status } : i) })
    },
    aprovarInventario(id, { autorizadoPor }) {
      const st = ref.current
      const inv = st.inventarios.find(i => i.id === id)
      if (!inv || inv.status !== 'revisao') throw new Error('Inventário não está em revisão.')
      let products = st.products
      const movs = []
      let divergentes = 0, valorLiquido = 0
      for (const s of inv.snapshot) {
        const contado = Number(inv.contagem[s.produtoId])
        const delta = round(contado - s.sistema)
        if (!delta) continue
        divergentes++
        valorLiquido += delta * s.custo
        const prod = products.find(p => p.id === s.produtoId)
        if (!prod) continue
        let used = []
        if (delta > 0) {
          products = withProduct(products, prod.id, p => ({ ...p, lotes: addLot(p.lotes, { lote: SEM_LOTE, qty: delta, custo: p.cost }) }))
        } else {
          const r = consumeFEFO(prod.lotes, Math.min(-delta, prod.qty), { allowExpired: true })
          used = r.used
          products = withProduct(products, prod.id, p => ({ ...p, lotes: r.lotes }))
        }
        movs.push(makeMovement(st, { produtoId: prod.id, produto: prod.name, tipo: 'Ajuste', qty: delta, obs: obsWith(`Diferença de inventário · ${inv.id} · ${inv.setor}`, used) }))
      }
      const total = inv.snapshot.length
      const resultado = { itens: total, divergentes, acuracia: Math.round(((total - divergentes) / total) * 100), valorLiquido: round2(valorLiquido), autorizadoPor }
      commit({
        ...st, products, movements: [...movs.reverse(), ...st.movements], seq: st.seq + movs.length + 1,
        inventarios: st.inventarios.map(i => i.id === id ? { ...i, status: 'concluido', concluidoEm: new Date().toISOString(), resultado } : i),
        auditoria: [auditEntry({ tipo: 'Inventário aprovado', autorizadoPor, valor: round2(valorLiquido), detalhe: `${inv.id} · ${inv.setor} · ${divergentes} divergência(s)` }), ...st.auditoria],
      })
      return resultado
    },

    /* ─── Mesas / pedidos (RF04–RF06) ─── */
    addOrder(canal = 'Mesa') {
      const st = ref.current
      const id = st.nextOrderId
      commit({ ...st, orders: [...st.orders, { id, label: canalLabel(canal, id), canal, items: [] }], activeOrderId: id, nextOrderId: id + 1 })
    },
    setActiveOrder(id) {
      commit({ ...ref.current, activeOrderId: id })
    },
    setOrderCanal(id, canal) {
      const st = ref.current
      commit({ ...st, orders: st.orders.map(o => o.id === id ? { ...o, canal, label: canalLabel(canal, o.id) } : o) })
    },
    updateOrderItems(id, fn) {
      const st = ref.current
      commit({ ...st, orders: st.orders.map(o => o.id === id ? { ...o, items: fn(o.items) } : o) })
    },
    /* comanda do bar: marca os drinks pendentes como enviados e devolve o que imprimir */
    enviarDrinksAoBar(orderId) {
      const st = ref.current
      const order = st.orders.find(o => o.id === orderId)
      const pendentes = (order?.items || []).filter(i => i.tipo === 'drink' && (i.qty - (i.enviado || 0)) > 0)
        .map(i => ({ id: i.id, name: i.name, qty: i.qty - (i.enviado || 0) }))
      if (!pendentes.length) return null
      commit({ ...st, orders: st.orders.map(o => o.id === orderId ? { ...o, items: o.items.map(i => i.tipo === 'drink' ? { ...i, enviado: i.qty } : i) } : o) })
      return { pedido: order.label, itens: pendentes }
    },
    removeOrder(id) {
      const st = ref.current
      let orders = st.orders.filter(o => o.id !== id)
      let nextOrderId = st.nextOrderId
      if (!orders.length) { orders = [{ id: nextOrderId, label: canalLabel('Mesa', nextOrderId), canal: 'Mesa', items: [] }]; nextOrderId++ }
      const activeOrderId = st.activeOrderId === id ? orders[orders.length - 1].id : st.activeOrderId
      commit({ ...st, orders, activeOrderId, nextOrderId })
    },
    /* cancelamento com itens: exige autorização (validada na tela) e fica na auditoria */
    cancelarPedido(id, { motivo, autorizadoPor }) {
      const st = ref.current
      const order = st.orders.find(o => o.id === id)
      const valor = round2((order?.items || []).reduce((a, i) => a + i.price * i.qty, 0))
      const ev = auditEntry({ tipo: 'Cancelamento de pedido', autorizadoPor, valor, motivo, pedido: order?.label, detalhe: (order?.items || []).map(i => `${i.qty}× ${i.name}`).join(', ') })
      commit({ ...st, auditoria: [ev, ...st.auditoria] })
      actions.removeOrder(id)
    },
    registrarAuditoria(fields) {
      const st = ref.current
      commit({ ...st, auditoria: [auditEntry(fields), ...st.auditoria] })
    },

    /* ─── Caixa (RF08) ─── */
    openCaixa({ valorInicial, operador: op }) {
      const st = ref.current
      commit({ ...st, caixa: { id: `CX-${Date.now()}`, abertoEm: new Date().toISOString(), operador: op || operador, valorInicial: Number(valorInicial) || 0, movs: [] } })
    },
    caixaMov({ tipo, valor, motivo }) {
      const st = ref.current
      if (!st.caixa) return
      commit({ ...st, caixa: { ...st.caixa, movs: [...st.caixa.movs, { tipo, valor: Number(valor), motivo, em: new Date().toISOString() }] } })
    },
    closeCaixa({ contadoDinheiro, obs }) {
      const st = ref.current
      if (!st.caixa) return
      const resumo = caixaResumo(st.caixa, st.sales)
      const sessao = {
        ...st.caixa,
        fechadoEm: new Date().toISOString(),
        resumo,
        contadoDinheiro: Number(contadoDinheiro) || 0,
        diferenca: round((Number(contadoDinheiro) || 0) - resumo.dinheiroEsperado),
        obs,
      }
      commit({ ...st, caixa: null, sessoes: [sessao, ...st.sessoes] })
      return sessao
    },

    /* ─── Venda com baixa automática (RF02 / RF03) — FEFO sem lotes vencidos ─── */
    finalizeSale({ orderId, desconto, pagamentos, troco, autorizacao }) {
      const st = ref.current
      const order = st.orders.find(o => o.id === orderId)
      if (!st.caixa) throw new Error('Abra o caixa antes de vender.')
      if (!order?.items.length) throw new Error('Pedido vazio.')

      let products = st.products
      const movs = []
      const num = st.sales.length + 1

      for (const it of order.items) {
        if (it.tipo === 'drink') {
          const drink = st.drinks.find(d => d.id === it.id)
          for (const r of drink?.receita || []) {
            if (r.livre || !r.produtoId) continue
            const ins = products.find(p => p.id === r.produtoId)
            if (!ins?.volumeEmbalagem) continue
            const garrafas = round((r.quantidade * it.qty) / ins.volumeEmbalagem)
            const c = consumeFEFO(ins.lotes, garrafas)
            if (c.missing > 0) throw new Error(`${ins.name}: sem saldo dentro da validade para ${it.qty}× ${it.name}.`)
            products = withProduct(products, ins.id, p => ({ ...p, lotes: c.lotes }))
            movs.push(makeMovement(st, { produtoId: ins.id, produto: ins.name, tipo: 'Saída (dose)', qty: garrafas, obs: obsWith(`Venda #${num} · ${it.qty}× ${it.name} (${r.quantidade * it.qty}ml)`, c.used) }))
          }
        } else {
          const prod = products.find(p => p.id === it.id)
          if (!prod) continue
          const c = consumeFEFO(prod.lotes, it.qty)
          if (c.missing > 0) {
            const vencido = round(prod.qty - (it.qty - c.missing)) > 0 && prod.qty >= it.qty
            throw new Error(vencido
              ? `${prod.name}: o saldo restante está vencido e não pode ser vendido — registre a perda em Validades.`
              : `Estoque insuficiente: ${prod.name} (${prod.qty} disponível).`)
          }
          products = withProduct(products, prod.id, p => ({ ...p, lotes: c.lotes }))
          movs.push(makeMovement(st, { produtoId: prod.id, produto: prod.name, tipo: 'Saída (venda)', qty: it.qty, obs: obsWith(`Venda #${num} · ${order.label}`, c.used) }))
        }
      }

      const subtotal = order.items.reduce((a, it) => a + it.price * it.qty, 0)
      const desc = Number(desconto) || 0
      const costOf = (it) => {
        if (it.tipo !== 'drink') return st.products.find(p => p.id === it.id)?.cost ?? 0
        const d = st.drinks.find(x => x.id === it.id)
        return (d?.receita || []).reduce((a, r) => {
          const ins = st.products.find(p => p.id === r.produtoId)
          return ins?.volumeEmbalagem ? a + (ins.cost / ins.volumeEmbalagem) * r.quantidade : a
        }, 0)
      }
      const catOf = (it) => (it.tipo === 'drink' ? st.drinks : st.products).find(p => p.id === it.id)?.cat || ''
      const sale = {
        id: `VND-${Date.now()}`,
        num,
        caixaId: st.caixa.id,
        mesa: order.label,
        canal: order.canal || 'Mesa',
        itens: order.items.map(it => ({ id: it.id, name: it.name, qty: it.qty, price: it.price, cost: round2(costOf(it)), cat: catOf(it), tipo: it.tipo })),
        subtotal: round2(subtotal),
        desconto: desc,
        total: round2(subtotal - desc),
        pagamentos,
        troco: Number(troco) || 0,
        em: new Date().toISOString(),
        operador,
      }

      const alerts = products
        .filter(p => isCritical(p) && !isCritical(st.products.find(o => o.id === p.id)))
        .map(p => `${p.name} (${getStatus(p).toLowerCase()})`)

      let orders = st.orders.filter(o => o.id !== orderId)
      let nextOrderId = st.nextOrderId
      if (!orders.length) { orders = [{ id: nextOrderId, label: canalLabel('Mesa', nextOrderId), canal: 'Mesa', items: [] }]; nextOrderId++ }

      const auditoria = desc > 0
        ? [auditEntry({
            tipo: autorizacao ? 'Desconto acima do limite' : 'Desconto', valor: desc, pedido: order.label, motivo: autorizacao?.motivo || '',
            autorizadoPor: autorizacao?.autorizadoPor || null,
            detalhe: `Venda #${num} · ${Math.round((desc / subtotal) * 100)}% de ${subtotal.toFixed(2).replace('.', ',')}`,
          }), ...st.auditoria]
        : st.auditoria

      commit({
        ...st,
        products,
        movements: [...movs.reverse(), ...st.movements],
        sales: [sale, ...st.sales],
        orders,
        activeOrderId: orders[orders.length - 1].id,
        nextOrderId,
        auditoria,
        seq: st.seq + movs.length + 1,
      })
      return { sale, alerts }
    },

    /* ─── Configurações do caixa ─── */
    setConfig(patch) {
      const st = ref.current
      commit({ ...st, config: { ...st.config, ...patch } })
    },

    /* ─── Impressão (cupom, comanda, etiquetas) ─── */
    print(job) { setPrintJob({ ...job, id: Date.now() }) },
    clearPrint() { setPrintJob(null) },

    resetDemo() {
      commit(seed())
    },
  }

  const role = user?.profileName || 'Somente leitura'
  // tema do painel (escuro padrão); sai do <html> ao deixar o painel (logout → landing escura)
  const [theme, setThemeState] = useState(readTheme)
  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => clearTheme, [])
  const setTheme = (t) => { setThemeState(t); saveTheme(t) }
  const can = makeCan(user)
  // sessão: atualizar dados do usuário logado e encerrar a sessão (ex.: permissões revogadas)
  const session = { updateSelf: (u) => onUserChange?.({ ...user, ...u }), logout: () => onLogout?.() }
  return (
    <StoreCtx.Provider value={{ ...state, ...actions, operador, user, role, can, session, theme, setTheme, printJob }}>
      {children}
    </StoreCtx.Provider>
  )
}
