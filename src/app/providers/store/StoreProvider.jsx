import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { StoreCtx } from '@/entities/store'
import { makeCan } from '@/entities/access'
import { readTheme, saveTheme, applyTheme, clearTheme } from '@/entities/preferences'
import { api, toReceita, fromMovimento, toMovimento } from '@/shared/api/api.js'
import {
  addLot, normalizeLots, weightedCost, SEM_LOTE,
} from '@/entities/inventory'

const KEY = 'valhalla:store:v2'
const LOCAL_FIELDS = ['doseMl', 'unidadesFardo', 'saidas30d', 'lotes']
const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(String(id))

const round = (n) => Math.round(n * 1000) / 1000

function seed() {
  return {
    version: 2,
    // catálogo: começa vazio e é preenchido pela API
    products: [],
    drinks: [],
    movements: [],
    sales: [],
    seq: 1,
    vinculos: {},        // de-para emitente da NF-e → produto: { 'CNPJ|cProd': { produtoId, fator } }
    nfsImportadas: [],   // [{ chave, numero, serie, emitente, cnpj, valor, itens, em, operador }]
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const st = JSON.parse(raw)
      // cache antigo (ids que não são UUID, ex.: BEB-/DRK-) não se mistura com o catálogo da API
      if ([...(st.products || []), ...(st.drinks || [])].some(p => !isUuid(p.id))) {
        Object.assign(st, { products: [], drinks: [], movements: [] })
      }
      return { ...seed(), ...st }
    }
  } catch { /* storage indisponível ou corrompido */ }
  return seed()
}


export function StoreProvider({ user, onUserChange, onLogout, children }) {
  const { pathname } = useLocation()
  // Migrated pages own their queries. Legacy consumers still hydrate on entry.
  const remotePage = ['dashboard', 'produtos', 'categorias', 'novo', 'editar', 'movimentacoes', 'novamovimentacao', 'reposicao', 'validades', 'entradanf'].includes(pathname.split('/').filter(Boolean).at(-1))
  const staleCatalog = useRef(true)
  const legacyHydrated = useRef(!remotePage)
  const [state, setState] = useState(() => remotePage ? seed() : load())
  const ref = useRef(state) // sempre atualizado por commit()
  const [printJob, setPrintJob] = useState(null)

  useEffect(() => {
    if (!legacyHydrated.current) return // preserve the existing local store until a legacy flow needs it
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  }, [state])

  const operador = user?.name || 'Operador'

  function commit(next) {
    ref.current = next
    setState(next)
  }

  /* ─── Catálogo remoto: API + campos locais ─── */
  const [catalog, setCatalog] = useState({ status: 'loading', error: null })

  async function syncCatalog() {
    if (!legacyHydrated.current) {
      legacyHydrated.current = true
      commit(load())
    }
    try {
      const lista = await api.produtos.listar()
      const drinksApi = lista.filter(p => p.tipo === 'drink')
      const receitas = await Promise.all(drinksApi.map(d => api.receitas.obter(d.id)))
      const st = ref.current
      const anterior = new Map([...st.products, ...st.drinks].map(p => [p.id, p]))
      const local = (p) => Object.fromEntries(LOCAL_FIELDS.filter(k => anterior.get(p.id)?.[k] !== undefined).map(k => [k, anterior.get(p.id)[k]]))
      const products = lista.filter(p => p.tipo === 'padrao').map(p => {
        const merged = { saidas30d: 0, ...local(p), ...p }
        return { ...merged, lotes: normalizeLots({ ...merged, lotes: merged.lotes || [] }) }
      })
      const drinks = drinksApi.map((d, i) => {
        const livres = (anterior.get(d.id)?.receita || []).filter(r => r.livre)
        return { ...local(d), ...d, receita: [...toReceita(receitas[i], products), ...livres] }
      })
      // histórico: as movimentações mais recentes do back (substituem as locais)
      const movs = await api.movimentacoes.listar()
      commit({ ...ref.current, products, drinks, movements: movs.map(m => toMovimento(m, products)) })
      setCatalog({ status: 'ready', error: null })
      staleCatalog.current = false
    } catch (error) {
      setCatalog({ status: 'error', error })
    }
  }

  useEffect(() => { if (!remotePage && staleCatalog.current) syncCatalog() }, [remotePage]) // eslint-disable-line react-hooks/exhaustive-deps
  const invalidateCatalog = () => { staleCatalog.current = true }
  const reloadCatalog = () => { setCatalog(c => ({ ...c, status: 'loading' })); return syncCatalog() }

  // IDs únicos mesmo com várias movimentações no mesmo milissegundo
  let localSeq = 0
  function makeMovement(st, fields) {
    localSeq++
    return { id: `MOV-${Date.now()}-${st.seq}-${localSeq}`, em: new Date().toISOString(), operador, nf: '', obs: '', ...fields }
  }

  /* troca o produto na lista mantendo qty = soma dos lotes */
  function withProduct(products, id, fn) {
    return products.map(p => {
      if (p.id !== id) return p
      const np = fn(p)
      return { ...np, qty: round(np.lotes.reduce((a, l) => a + l.qty, 0)) }
    })
  }

  function prepararEntradaNF({ nf, itens }) {
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
        nf: nf.numero, lote: it.lote || SEM_LOTE, validade: it.validade || null,
        obs: `NF-e ${nf.numero} · item ${it.cProd}${it.fator !== 1 ? ` (${it.qCom} ${it.uCom} × ${it.fator})` : ''} · custo ${it.custo.toFixed(2).replace('.', ',')}`,
      }))
    }
    const registro = {
      chave: nf.chave, numero: nf.numero, serie: nf.serie, emitente: nf.emitente, cnpj: nf.cnpj,
      valor: nf.valor, itens: validos.length, ignorados: itens.length - validos.length, em: new Date().toISOString(), operador,
    }
    commit({ ...st, products, vinculos, movements: [...movs.reverse(), ...st.movements], nfsImportadas: [registro, ...st.nfsImportadas], seq: st.seq + movs.length + 1 })
    return registro
  }

  const POSITIVOS = ['ENTRADA_INICIAL', 'ENTRADA', 'AJUSTE_POSITIVO']
  async function postarMovimentos(movs, produtos) {
    const feitos = []
    try {
      for (const m of movs) {
        const body = fromMovimento(m, produtos, { semLote: SEM_LOTE })
        if (body) feitos.push(await api.movimentacoes.registrar(body))
      }
    } catch (e) {
      const pendentes = []
      for (const f of feitos.reverse()) {
        await api.movimentacoes.registrar({
          produtoId: f.produtoId,
          tipo: POSITIVOS.includes(f.tipo) ? 'AJUSTE_NEGATIVO' : 'AJUSTE_POSITIVO',
          quantidade: f.quantidade,
          motivo: `Estorno automático da movimentação #${f.id} (operação não concluída)`,
        }).catch(() => pendentes.push(f.id))
      }
      if (pendentes.length) e.message += ` Atenção: não foi possível estornar as movimentações ${pendentes.map(id => '#' + id).join(', ')} — revise o histórico.`
      throw e
    }
  }

  async function importarNF(dados) {
    const antes = ref.current
    const resultado = prepararEntradaNF(dados) // validações locais: lança antes de tocar na API
    const novas = ref.current.movements.slice(0, ref.current.movements.length - antes.movements.length)
    try {
      // movimentações locais ficam no início da lista; envia da mais antiga para a mais nova
      await postarMovimentos([...novas].reverse(), antes.products)
    } catch (e) {
      commit(antes)
      await syncCatalog()
      throw e
    }
    await syncCatalog()
    return resultado
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
    <StoreCtx.Provider value={{ ...state, importarNF, print: job => setPrintJob({ ...job, id: Date.now() }), clearPrint: () => setPrintJob(null), invalidateCatalog, operador, user, role, can, session, theme, setTheme, printJob, catalog: { ...catalog, remote: true, reload: reloadCatalog } }}>
      {children}
    </StoreCtx.Provider>
  )
}
