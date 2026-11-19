import { api, fromProduto } from '@/shared/api/api.js'

export async function loadProduct(id, signal) {
  const product = await api.produtos.obter(id, signal)
  if (product.tipo !== 'drink') return { product, ingredients: [] }
  const receita = await api.receitas.obter(id, signal)
  const ingredients = []
  // Bound concurrency to avoid an unbounded burst on large recipes.
  const ids = [...new Set(receita.map(r => r.produtoId))]
  for (let index = 0; index < ids.length; index += 4) {
    ingredients.push(...await Promise.all(ids.slice(index, index + 4).map(id => api.produtos.obter(id, signal))))
  }
  return { product: { ...product, receita }, ingredients }
}

export function recipeSummary(receita, products) {
  const tracked = receita.filter(r => !r.livre)
  if (!tracked.length) return { cost: null, yield: null, invalid: true }
  let cost = 0, yieldCount = Infinity
  for (const r of tracked) {
    const p = products.find(p => p.id === r.produtoId)
    const unit = p?.fracionado ? 'ML' : 'UN'
    const base = p?.fracionado ? p.volumeEmbalagem : 1
    if (!p || p.ativo === false || p.tipo !== 'padrao' || !base || !(r.quantidade > 0) || !Number.isFinite(Number(r.quantidade)) || r.unidadeConsumo !== unit) return { cost: null, yield: null, invalid: true }
    cost += p.cost / base * r.quantidade
    yieldCount = Math.min(yieldCount, Math.max(0, Math.floor((p.quantidadeEstoqueBase ?? p.qty * base) / r.quantidade)))
  }
  return { cost, yield: yieldCount, invalid: false }
}

// Keep the created ID when recipe saving fails; retry must not create a second product.
export async function saveCatalogProduct(product, previous, onProductSaved) {
  let saved
  if (!previous) saved = await api.produtos.criar(product)
  else {
    const before = fromProduto(previous), after = fromProduto(product)
    delete after.fracionado
    delete after.volumeEmbalagemMl
    after.ativo = product.ativo
    const patch = Object.fromEntries(Object.entries(after).filter(([k, v]) => v !== undefined && JSON.stringify(before[k] ?? previous[k]) !== JSON.stringify(v)))
    saved = Object.keys(patch).length ? await api.produtos.atualizar(previous.id, patch) : previous
  }
  onProductSaved(saved)
  if (product.tipo === 'drink') {
    try {
      await api.receitas.substituir(saved.id, product.receita.map(({ produtoId, quantidade, unidadeConsumo }) => ({ produtoId, quantidade, unidadeConsumo })))
    } catch (error) {
      error.message = `Os dados do produto foram salvos. A receita não foi confirmada: ${error.message} Corrija e tente salvar novamente; o produto não será duplicado.`
      throw error
    }
  }
  return saved
}
