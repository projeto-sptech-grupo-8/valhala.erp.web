import { Download, Printer, Copy, Ban, ReceiptText, ShoppingBasket, CreditCard, FileText } from 'lucide-react'
import { useRef, useState } from 'react'
import { Drawer } from '@/shared/ui/drawer/Drawer.jsx'
import { ErrorBlock, LoadingBlock, Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { readCash, writeCash } from '@/entities/sales/api/cashApi.js'
import { fmtBRL, fmtDateTime, fmtNum } from '@/shared/lib/format.js'
import { invoices, downloadInvoice } from '../fiscalApi.js'
import s from './Invoices.module.css'

function printDanfe(content) {
  const frame=document.createElement('iframe')
  frame.title='Impressão do DANFE'
  Object.assign(frame.style,{position:'fixed',width:'0',height:'0',border:'0'})
  document.body.append(frame)
  const doc=frame.contentDocument
  doc.title='DANFE NFC-e'
  const css=doc.createElement('style')
  css.textContent='@page{size:auto;margin:3mm}body{max-width:74mm;font:12px monospace;margin:0;overflow-wrap:anywhere;color:#000}h2,h3{font-size:15px}li{margin-bottom:5px}ul{padding-left:15px}'
  doc.head.append(css)
  const paper = doc.importNode(content, true)
  paper.querySelectorAll('button,svg,[data-screen-only]').forEach(node => node.remove())
  paper.querySelectorAll('details').forEach(section => { section.open = true })
  doc.body.append(paper)
  frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true})
  frame.contentWindow.focus()
  frame.contentWindow.print()
}

export function InvoiceDetail({id,canCancel,canOperate,close,refresh}) {
  const query=useQueryResource(signal=>readCash(invoices+'/'+id,{},signal),[id])
  const n=query.data, receipt=useRef(null),lock=useRef(false)
  const [cancel,setCancel]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false)
  async function submit(event){
    event.preventDefault()
    if(lock.current)return
    const body=Object.fromEntries(new FormData(event.currentTarget))
    body.motivo=body.motivo.trim()
    if(body.motivo.length<15){setError('Descreva o motivo em pelo menos 15 caracteres.');return}
    lock.current=true;setBusy(true);setError('')
    try{await writeCash(invoices+'/'+id+'/cancelamento',body);setCancel(false);refresh();query.reload()}
    catch(e){setError(e.message);query.reload()}
    finally{lock.current=false;setBusy(false)}
  }
  return <Drawer title="Detalhes da NFC-e" onClose={()=>{if(!lock.current)close()}}>
    {query.loading?<LoadingBlock/>:query.error?<ErrorBlock error={query.error} onRetry={query.reload}/>:n&&<>
      <article ref={receipt} className={s.invoice}>
        <header className={s.identity}>
          <h2><ReceiptText size={20} aria-hidden="true"/>NFC-e nº {n.numero}</h2>
          <p>Série {n.serie} · Pedido #{n.pedidoNumero}</p>
          <div className={s.badges}><strong data-status={n.status}>{{AUTORIZADA:'Autorizada',CANCELADA:'Cancelada',REJEITADA:'Rejeitada'}[n.status] || n.status}</strong>
            {n.ambiente && <span>{n.ambiente==='HOMOLOGACAO'?'Homologação · sem valor fiscal':n.ambiente}</span>}</div>
          {n.status === 'CANCELADA' && <dl className={s.cancellation} aria-label="Dados do cancelamento">
            <div><dt>Cancelada em</dt><dd>{n.canceladaEm ? fmtDateTime(n.canceladaEm) : '—'}</dd></div>
            <div><dt>Responsável</dt><dd>{n.canceladaPorNome || '—'}</dd></div>
            <div><dt>Motivo</dt><dd>{n.motivoCancelamento || '—'}</dd></div>
          </dl>}
        </header>
        <section className={s.summary} aria-label="Resumo da nota">
          <span>Total da nota</span><strong>{fmtBRL(n.valorTotal)}</strong>
          <dl><div><dt>Emitida em</dt><dd>{n.emitidaEm ? fmtDateTime(n.emitidaEm) : '—'}</dd></div>
            <div><dt>Consumidor</dt><dd>{n.contraparteNome || n.contraparteDocumento || 'Não identificado'}{n.contraparteNome && n.contraparteDocumento && <small>{n.contraparteDocumento}</small>}</dd></div></dl>
        </section>
        <div className={s.fileActions} data-screen-only>
          <button className="gold" onClick={()=>downloadInvoice(n).catch(e=>setError(e.message))}><Download size={16} aria-hidden="true"/>Baixar XML</button>
          <button aria-label="Imprimir DANFE 80 mm" onClick={()=>printDanfe(receipt.current)}><Printer size={16} aria-hidden="true"/>Imprimir DANFE</button>
        </div>
        <section className={s.section}><h3><ShoppingBasket size={16} aria-hidden="true"/>Itens da venda</h3>
          {n.itens?.length ? <ul>{n.itens.map(item=><li key={item.id}><div><b>{item.descricaoProduto}</b><small>{fmtNum(item.quantidade)} {item.unidadeMedida} × {fmtBRL(item.precoUnitario)}</small></div><strong>{fmtBRL(item.valorTotal)}</strong></li>)}</ul> : <p>Itens não informados.</p>}
          <dl><div><dt>Subtotal dos produtos</dt><dd>{fmtBRL(n.valorProdutos)}</dd></div><div><dt>Desconto</dt><dd>{fmtBRL(n.valorDesconto)}</dd></div></dl>
        </section>
        <section className={s.section}><h3><CreditCard size={16} aria-hidden="true"/>Pagamentos</h3>
          {n.pagamentos?.length ? <ul>{n.pagamentos.map(p=><li key={p.id}><span>{{DINHEIRO:'Dinheiro',PIX:'Pix',DEBITO:'Cartão de débito',CREDITO:'Cartão de crédito'}[p.forma] || p.forma}{p.parcelas>1 && ' · '+p.parcelas+'×'}</span><strong>{fmtBRL(p.valor)}</strong></li>)}</ul> : <p>Pagamentos não informados.</p>}
          {n.valorTrocoTotal>0&&<dl><div><dt>Troco</dt><dd>{fmtBRL(n.valorTrocoTotal)}</dd></div></dl>}
        </section>
        <details className={s.fiscalData}><summary><FileText size={15} aria-hidden="true"/> Dados fiscais</summary><dl>
          <div><dt>Emitente</dt><dd>{n.emitente?.razaoSocial || '—'}{n.emitente?.cnpj && <small>{n.emitente.cnpj}</small>}</dd></div>
          <div><dt>Chave de acesso</dt><dd>{n.chaveAcesso || '—'}</dd></div>
          <div><dt>Protocolo de autorização</dt><dd>{n.protocoloAutorizacao || '—'}</dd></div>
          {n.urlConsulta && <div><dt>Endereço de consulta</dt><dd>{n.urlConsulta}</dd></div>}
        </dl>{n.chaveAcesso&&<button onClick={async()=>{try{await navigator.clipboard.writeText(n.chaveAcesso);setCopied(true)}catch{setError('Selecione a chave acima e copie manualmente.')}}}><Copy size={14} aria-hidden="true"/>{copied?'Chave copiada':'Copiar chave'}</button>}</details>
      </article>
      {error&&<Notice title="Confira a operação">{error}</Notice>}
      {(canCancel||canOperate)&&n.status==='AUTORIZADA'&&!cancel&&<div className={s.cancelArea}><button className={s.danger} onClick={()=>setCancel(true)}><Ban size={15} aria-hidden="true"/> Cancelar NFC-e</button></div>}
      {cancel&&n.status==='AUTORIZADA'&&<form onSubmit={submit} className={s.detail}><h3>Cancelar esta nota?</h3><p>O pedido continua concluído e poderá receber uma nota substituta.</p>
        <label>Justificativa<textarea name="motivo" minLength={15} maxLength={255} required/></label>
        {!canCancel&&<><label>E-mail do autorizador<input required type="email" name="autorizadorEmail"/></label><label>Senha do autorizador<input required type="password" name="autorizadorSenha" autoComplete="off"/></label></>}
        <div className={s.actions}><button type="button" disabled={busy} onClick={()=>setCancel(false)}>Voltar</button><button disabled={busy} className={s.danger}>Confirmar cancelamento</button></div>
      </form>}
    </>}
  </Drawer>
}
