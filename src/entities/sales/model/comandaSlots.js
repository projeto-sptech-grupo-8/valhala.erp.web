// Visual positions only. Real order identifiers and numbers are never changed.
export function reconcileComandaSlots(previous, orders) {
 const open = [...new Map(orders.map(order => [order.id, order])).values()]
 const ids = new Set(open.map(order => order.id))
 const assigned = new Set()
 const slots = Array.from({ length: 5 }, (_, index) => {
  const id = previous?.[index]
  if (!ids.has(id) || assigned.has(id)) return null
  assigned.add(id)
  return id
 })
 open.sort((a,b) => String(a.criadoEm || '').localeCompare(String(b.criadoEm || '')) || Number(a.numero || 0) - Number(b.numero || 0) || String(a.id).localeCompare(String(b.id)))
 for (const order of open) {
  if (assigned.has(order.id)) continue
  const index = slots.indexOf(null)
  if (index === -1) break
  slots[index] = order.id
  assigned.add(order.id)
 }
 return slots
}
