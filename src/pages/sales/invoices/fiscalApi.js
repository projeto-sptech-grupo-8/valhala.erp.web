import { authenticatedRequest } from '@/shared/api/api.js'
import { readCash, writeCash } from '@/entities/sales/api/cashApi.js'

export const invoices = 'notas-fiscais'
export async function issueInvoice(orderId, customer = {}) {
  const current = await readCash('pedidos/' + orderId)
  if (current.status !== 'CONCLUIDO') throw new Error('O pedido precisa estar concluído.')
  const existing = current.notaFiscal
  if (existing?.status === 'AUTORIZADA') return readCash(invoices + '/' + existing.id)
  try {
    const result = await writeCash(invoices + '/emitir', { pedidoId: orderId, nomeCliente: customer.nomeCliente?.trim() || undefined, documentoCliente: customer.documentoCliente?.trim() || undefined })
    if (!result?.id || result.status !== 'AUTORIZADA') throw new Error('O servidor não confirmou a autorização.')
    return result
  } catch (error) {
    const checked = await readCash('pedidos/' + orderId).catch(() => null)
    if (checked?.notaFiscal?.status === 'AUTORIZADA') return readCash(invoices + '/' + checked.notaFiscal.id)
    throw error
  }
}

export async function downloadInvoice(note) {
  const { blob } = await authenticatedRequest('/caixa/notas-fiscais/' + note.id + '/xml', { responseType: 'blob' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'NFC-e-' + (note.chaveAcesso || note.id) + '.xml'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
