import { useState } from 'react'
import { History, Receipt, Package, ChevronDown, RefreshCw, Banknote, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { readCash } from '@/entities/sales/api/cashApi.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { Drawer } from '@/shared/ui/drawer/Drawer.jsx'
import { LoadingBlock, ErrorBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { fmtBRL, fmtDateTime, fmtNum } from '@/shared/lib/format.js'
import s from './CashHistory.module.css'
const amount = value => value == null ? '—' : fmtBRL(value)
const date = value => value ? fmtDateTime(value) : '—'
const names = { DINHEIRO:'Dinheiro',PIX:'Pix',CREDITO:'Crédito',DEBITO:'Débito',CONCLUIDO:'Concluída',PAGAMENTO_PARCIAL:'Pagamento parcial',ESTORNADO:'Estornada',CANCELADO:'Cancelada' }
function Feedback({query,label}) {return query.loading?<LoadingBlock lines={2} label={label}/>:query.error?<ErrorBlock error={query.error} onRetry={query.reload}/>:null}
export function CashHistory({sessionId,onClose}) {
 const [page,setPage]=useState(0),[status,setStatus]=useState('CONCLUIDO'),[selected,setSelected]=useState(undefined)
 const session=useQueryResource(signal=>readCash('sessoes/'+encodeURIComponent(sessionId),{},signal),[sessionId])
 const orders=useQueryResource(signal=>readCash('pedidos',{sessaoCaixaId:sessionId,status,pagina:page,tamanho:10,ordenarPor:'numero',direcao:'DESC'},signal),[sessionId,status,page])
 const rows=orders.loading||orders.error?[]:orders.data?.itens||[]
 const current=session.loading||session.error?null:session.data
 const summary=current?.resumoFechamento||current?.resumoAtual
 const expanded=selected===undefined?rows[0]?.id:selected
 function refresh(){session.reload();orders.reload()}
 return <Drawer title="Histórico caixa" onClose={onClose}><div className={s.history}>
  <header className={s.heading}><span><History size={23} aria-hidden="true"/></span><div><h2>Histórico caixa</h2><p>Recebimentos, vendas e itens deste turno.</p></div></header>
  <Feedback query={session} label="Carregando resumo do caixa…"/>
  {current&&<><div className={s.identity}><strong>{current.caixaNome}</strong><span>{current.operadorNome} · Abertura {date(current.abertaEm)}</span></div>
  <div className={s.stats}>{[['Recebido aprovado',summary?.totalVendas],['Dinheiro esperado na gaveta',summary?.dinheiroEsperado],['Fundo de troco',current.fundoTroco]].map(([label,value])=><div key={label}><span>{label}</span><strong>{amount(value)}</strong></div>)}</div>
  <section className={s.section}><h3><Banknote size={17} aria-hidden="true"/>Recebido por forma de pagamento</h3><p className={s.hint}>Somente valores aprovados. Pedidos com pagamento parcial também podem compor o resumo.</p>{summary?.porForma? <dl className={s.methods}>{Object.entries(summary.porForma).map(([key,value])=><div key={key}><dt>{names[key]||key}</dt><dd>{amount(value)}</dd></div>)}</dl>:<p className={s.hint}>Nenhum detalhamento disponível.</p>}
  <div className={s.movements}><span><ArrowDownCircle size={15} aria-hidden="true"/>Sangrias <b>{amount(summary?.sangrias)}</b></span><span><ArrowUpCircle size={15} aria-hidden="true"/>Reforços <b>{amount(summary?.reforcos)}</b></span></div></section></>}
  <section className={s.section}><div className={s.listHeading}><h3><Receipt size={17} aria-hidden="true"/>Vendas e produtos</h3><button type="button" onClick={refresh} disabled={session.loading||orders.loading}><RefreshCw size={14} aria-hidden="true"/>Atualizar histórico</button></div><p className={s.hint}>Pedidos deste turno em ordem de número, do mais recente para o mais antigo. Abra uma venda para conferir os produtos e preços registrados.</p>
   <label className={s.filter}>Situação dos pedidos<select value={status} onChange={e=>{setStatus(e.target.value);setPage(0);setSelected(undefined)}}><option value="CONCLUIDO">Vendas concluídas</option><option value="PAGAMENTO_PARCIAL">Pagamento parcial</option><option value="ESTORNADO">Estornados</option><option value="CANCELADO">Cancelados</option></select></label>
   <Feedback query={orders} label="Consultando vendas do turno…"/>
   {!orders.loading&&!orders.error&&!rows.length&&<div className={s.empty}><Receipt size={30} aria-hidden="true"/><b>Nenhum pedido nesta situação</b><p>As vendas deste turno aparecerão aqui conforme forem registradas.</p></div>}
   {rows.map(order=><article className={s.sale} key={order.id}><button type="button" className={s.saleButton} aria-expanded={expanded===order.id} aria-controls={'history-items-'+order.id} onClick={()=>setSelected(expanded===order.id?null:order.id)}><span><strong>Pedido #{order.numero}</strong><small>{order.identificadorAtendimento||'Balcão'} · {date(order.concluidoEm||order.atualizadoEm||order.criadoEm)}</small></span><span><strong>{amount(order.total)}</strong><small>{names[order.status]||order.status}</small></span><ChevronDown size={17} aria-hidden="true" className={expanded===order.id?s.expanded:undefined}/></button>{expanded===order.id&&<div id={'history-items-'+order.id}><SaleItems key={order.id} id={order.id}/></div>}</article>)}
   <footer className={s.pager}><span>{orders.loading?'Consultando…':orders.error?'Consulta indisponível':`${orders.data?.totalItens??0} pedido(s) nesta situação`}</span><div><button type="button" disabled={!page||orders.loading} onClick={()=>{setPage(p=>p-1);setSelected(undefined)}}>Anterior</button><span>Página {page+1}</span><button type="button" disabled={orders.loading||!!orders.error||orders.data?.ultima!==false} onClick={()=>{setPage(p=>p+1);setSelected(undefined)}}>Próxima</button></div></footer>
  </section>
 </div></Drawer>
}
function SaleItems({id}) {
 const query=useQueryResource(signal=>readCash('pedidos/'+encodeURIComponent(id),{},signal),[id])
 const order=query.loading||query.error?null:query.data
 return <div className={s.saleDetails}><Feedback query={query} label="Carregando produtos vendidos…"/>{order&&<><h4><Package size={15} aria-hidden="true"/>Itens registrados</h4><div className={s.tableWrap}><table><caption className={s.srOnly}>Produtos do pedido #{order.numero}</caption><thead><tr><th>Produto</th><th>Qtd.</th><th>Unitário</th><th>Subtotal</th></tr></thead><tbody>{order.itens?.map(item=><tr key={item.id}><td><strong>{item.descricaoProduto}</strong>{item.categoriaNome&&<small>{item.categoriaNome}</small>}</td><td>{fmtNum(item.quantidade)}</td><td>{amount(item.precoUnitario)}</td><td>{amount(item.subtotal)}</td></tr>)}</tbody></table></div><dl className={s.totals}>{[['Subtotal',order.subtotal],['Desconto',order.desconto],['Total do pedido',order.total],['Recebido aprovado',order.totalPago],['Saldo restante',order.saldoRestante]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{amount(value)}</dd></div>)}</dl><p className={s.hint}>Valores dos itens registrados na venda. O desconto do pedido é apresentado separadamente.</p></>}</div>
}
