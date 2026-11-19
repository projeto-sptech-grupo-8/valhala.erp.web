import { validCopies } from './labelSettings.js'

// A lot ID is scoped by product; equal printed codes never merge selections.
export function labelSelection(products, selected, copies, lots, mode) {
  const entries = []
  const incomplete = []
  for (const product of products) {
    if (!selected.has(product.id)) continue
    const selections = mode === 'validade' ? Object.values(lots[product.id] || {}) : [{ copies: copies[product.id], lot: null }]
    if (!selections.length || selections.some(item => !validCopies(item.copies))) incomplete.push(product.id)
    for (const item of selections) {
      if (validCopies(item.copies)) entries.push({ product, lot: item.lot, copies: Number(item.copies) })
    }
  }
  return { entries, incomplete, total: entries.reduce((sum, item) => sum + item.copies, 0) }
}
