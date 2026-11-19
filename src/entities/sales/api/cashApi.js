import { authenticatedRequest } from '@/shared/api/api.js'
export const readCash = (path,params={},signal) => authenticatedRequest('/caixa/'+path+'?'+new URLSearchParams(Object.entries(params).filter(([,v])=>v!==''&&v!=null)),{signal})
export const writeCash = (path,body,method='POST') => authenticatedRequest('/caixa/'+path,{method,body:body===undefined?undefined:JSON.stringify(body)})
export const MAX_OPEN_CASH_ORDERS = 5
export const OPEN_CASH_ORDER_STATES = ['EM_ATENDIMENTO','AGUARDANDO_MAQUINA','AGUARDANDO_PAGAMENTO','PAGAMENTO_PARCIAL']
export async function countOpenCashOrders(sessionId, signal) {
 if(!sessionId) return null
 const pages = await Promise.all(OPEN_CASH_ORDER_STATES.map(status => readCash('pedidos',{sessaoCaixaId:sessionId,status,pagina:0,tamanho:1},signal)))
 if(pages.some(page=>!Number.isInteger(page?.totalItens)||page.totalItens<0)) throw new Error('Não foi possível confirmar a quantidade de pedidos abertos. Atualize o caixa antes de criar outro.')
 return pages.reduce((sum,page)=>sum+page.totalItens,0)
}
export async function createCashOrder(body) {
 if(!body.sessaoCaixaId) throw new Error('Selecione uma sessão aberta antes de criar o pedido.')
 let count
 try { count = await countOpenCashOrders(body.sessaoCaixaId) }
 catch(error) { error.mutationNotStarted = true; throw error }
 if(count>=MAX_OPEN_CASH_ORDERS) throw new Error('Este caixa já tem 5 pedidos abertos. Conclua ou cancele um deles antes de iniciar outro.')
 return writeCash('pedidos',body)
}
