// Presentation only: amounts describe individual events and must not be summed as revenue.
export const AUDIT_EVENTS = [
 ['ABERTURA_CAIXA','Abertura do caixa','Caixa','teal'],
 ['FECHAMENTO_CAIXA','Fechamento do caixa','Caixa','purple'],
 ['DIVERGENCIA_CAIXA','Divergência no caixa','Caixa','danger'],
 ['DIVERGENCIA_CAIXA_RESOLVIDA','Divergência resolvida','Caixa','success'],
 ['SANGRIA','Sangria','Caixa','orange'],['REFORCO','Reforço','Caixa','teal'],
 ['CONFIGURACAO_CAIXA_ALTERADA','Configuração alterada','Configuração','purple'],
 ['CAIXA_CRIADO','Caixa cadastrado','Configuração','teal'],['CAIXA_ALTERADO','Caixa atualizado','Configuração','purple'],['CAIXA_EXCLUIDO','Caixa excluído','Configuração','danger'],
 ['TERMINAL_CAIXA_CRIADO','Maquininha cadastrada','Configuração','teal'],['TERMINAL_CAIXA_ALTERADO','Maquininha atualizada','Configuração','purple'],
 ['TAXA_PAGAMENTO_CRIADA','Taxa cadastrada','Configuração','purple'],['TAXA_PAGAMENTO_ALTERADA','Taxa atualizada','Configuração','purple'],
 ['PEDIDO_CRIADO','Pedido criado','Pedidos','teal'],['PEDIDO_CANCELADO','Pedido cancelado','Pedidos','danger'],['ITEM_REMOVIDO','Item removido','Pedidos','danger'],
 ['DESCONTO_CONCEDIDO','Desconto concedido','Descontos','success'],['DESCONTO_SOLICITADO','Desconto solicitado','Descontos','pending'],
 ['DESCONTO_ACIMA_DO_LIMITE','Desconto acima do limite','Descontos','orange'],['DESCONTO_NEGADO','Desconto negado','Descontos','danger'],['DESCONTO_REMOVIDO','Desconto removido','Descontos','orange'],
 ['PAGAMENTO_REGISTRADO','Pagamento registrado','Pagamentos','info'],['PAGAMENTO_POINT_ENVIADO','Cobrança enviada à maquininha','Pagamentos','pending'],
 ['PAGAMENTO_POINT_APROVADO','Pagamento aprovado na maquininha','Pagamentos','success'],['PAGAMENTO_POINT_RECUSADO','Pagamento recusado','Pagamentos','danger'],
 ['PAGAMENTO_POINT_EXPIRADO','Cobrança expirada','Pagamentos','orange'],['PAGAMENTO_POINT_FALHOU','Falha na cobrança','Pagamentos','danger'],
 ['PAGAMENTO_POINT_CANCELAMENTO_SOLICITADO','Cancelamento de cobrança solicitado','Pagamentos','pending'],
 ['CONCILIACAO_MANUAL','Conciliação manual','Pagamentos','purple'],['PAGAMENTO_CANCELADO','Pagamento cancelado','Pagamentos','danger'],['PAGAMENTO_ESTORNADO','Pagamento estornado','Pagamentos','purple'],
]

export function readableAuditLabel(value) {
 if(value==null||value==='')return 'Não informado'
 const text=String(value).replace(/([a-zá-ú])([A-Z])/g,'$1 $2').replace(/_/g,' ').toLocaleLowerCase('pt-BR')
 return text.charAt(0).toLocaleUpperCase('pt-BR')+text.slice(1)
}
export function auditEvent(code) {
 const event=AUDIT_EVENTS.find(row=>row[0]===code)
 return event?{label:event[1],group:event[2],tone:event[3]}:{label:readableAuditLabel(code),group:'Outros',tone:'neutral'}
}

const names={fundoTroco:'Fundo de troco',dinheiroEsperado:'Dinheiro esperado',dinheiroContado:'Dinheiro contado',diferenca:'Diferença',totalPago:'Valor pago',saldoRestante:'Saldo restante',valor:'Valor',valorCobrado:'Valor cobrado',valorRecebido:'Valor recebido',valorDescontoInformado:'Desconto informado',status:'Situação',tipo:'Tipo',forma:'Forma de pagamento',nome:'Nome',ativo:'Ativo',quantidade:'Quantidade',precoUnitario:'Preço unitário',subtotal:'Subtotal',total:'Total',desconto:'Desconto',observacao:'Observação',observacaoAbertura:'Observação da abertura',observacaoFechamento:'Observação do fechamento',justificativaDivergencia:'Justificativa da diferença',descricaoProduto:'Produto',criadoEm:'Criação',atualizadoEm:'Atualização',concluidoEm:'Conclusão',abertaEm:'Abertura',fechadaEm:'Fechamento',motivo:'Motivo',itens:'Itens',pagamentos:'Pagamentos',parcelas:'Parcelas'}
const hiddenKey=key=>/(^id$|Id$|Ids$|_id$|senha|password|token|secret|chaveIdempotencia|cpf|cnpj)/i.test(key)
function snapshot(value) {
 if(typeof value!=='string')return value
 try{return JSON.parse(value)}catch{return null}
}
// Flatten a bounded view for comparison; never expose identifiers or dump raw JSON.
export function auditComparison(before,after) {
 const flatten=value=>{
  const result=new Map()
  function visit(node,path=[],depth=0){
   if(result.size>=80)return
   if(node&&typeof node==='object'){
    if(depth>=5)return
    for(const [key,child] of Object.entries(node)){
     if(hiddenKey(key))continue
     visit(child,[...path,Array.isArray(node)?'Item '+(Number(key)+1):(names[key]||readableAuditLabel(key))],depth+1)
    }
   }else if(path.length)result.set(path.join(' · '),{value:node})
  }
  visit(snapshot(value));return result
 }
 const previous=flatten(before),next=flatten(after)
 return [...new Set([...previous.keys(),...next.keys()])].slice(0,80).map(label=>({label,before:previous.get(label)?.value,after:next.get(label)?.value,changed:previous.get(label)?.value!==next.get(label)?.value}))
}

export function auditReference(event) {
 return event.pedidoIdentificador?.trim()||(event.pedidoId?'Pedido vinculado':({SESSAO_CAIXA:'Sessão de caixa',CONFIGURACAO_CAIXA:'Configuração do caixa',CAIXA:'Caixa físico',TERMINAL_CAIXA:'Maquininha',TAXA_PAGAMENTO:'Taxa de pagamento',PAGAMENTO_PEDIDO:'Pagamento'}[event.entidade]||'—'))
}

export function auditDateLabel(value) {
 if(!value)return '—'
 const date=new Date(value)
 return Number.isNaN(date.getTime())?'Não informado':new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(date)
}
