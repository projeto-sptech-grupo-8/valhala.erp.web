import { useRef } from 'react'
import { api } from '@/shared/api/api.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { loadProduct, recipeSummary } from './catalogModel.js'
import { loadTurnover, marginMetric, turnoverPeriod } from './catalogMetrics.js'

export function useCatalogMetrics(rows, { giro, margem, enabled, revision }) {
  const cache = useRef(new Map())
  const period = turnoverPeriod()
  const products = rows.map(p => ({ id: p.id, tipo: p.tipo, unit: p.unit, fracionado: p.fracionado, quantidadeEstoqueBase: p.quantidadeEstoqueBase, price: p.price, cost: p.cost, atualizadoEm: p.atualizadoEm }))
  const query = useQueryResource(async signal => {
    if (!enabled || (!giro && !margem)) return {}
    const result = {}
    let cursor = 0
    async function worker() {
      while (cursor < products.length) {
        const p = products[cursor++]
        const key = JSON.stringify([p, giro, margem, period, revision])
        const cached = cache.current.get(key)
        if (cached && Date.now() - cached.at < 60000) { result[p.id] = cached.value; continue }
        const value = {}
        if (margem) {
          try {
            if (p.tipo === 'drink') {
              const loaded = await loadProduct(p.id, signal)
              const summary = recipeSummary(loaded.product.receita, loaded.ingredients)
              value.margin = summary.invalid ? { tone: 'neutral', label: 'Receita incompleta', value: null }
                : loaded.ingredients.some(ingredient => !(ingredient.cost > 0)) ? { tone: 'neutral', label: 'Ingrediente sem custo', value: null }
                  : { ...marginMetric(p.price, summary.cost), estimated: true }
            } else value.margin = marginMetric(p.price, p.cost)
          } catch (ex) { if (signal.aborted) throw ex; value.marginError = ex.message }
        }
        if (giro) {
          try { value.turnover = await loadTurnover(p, period, api.movimentacoes.pagina, signal) }
          catch (ex) { if (signal.aborted) throw ex; value.turnover = { unavailable: ex.message } }
        }
        signal.throwIfAborted()
        result[p.id] = value
        if (!value.marginError && !value.turnover?.unavailable) {
          cache.current.set(key, { at: Date.now(), value })
          if (cache.current.size > 100) cache.current.delete(cache.current.keys().next().value)
        }
      }
    }
    await Promise.all([worker(), worker()])
    return result
  }, [products, giro, margem, enabled, period, revision])
  return { ...query, period }
}
