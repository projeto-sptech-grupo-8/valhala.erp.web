import { useId, useRef, useState } from 'react'
import { Wallet, Banknote, History, ArrowRight, Eye, RefreshCw, AlertCircle, Plus } from 'lucide-react'
import { readCash, writeCash } from '@/entities/sales/api/cashApi.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { useStore } from '@/entities/store'
import { MoneyInput } from '@/features/catalog/product-editor/ui/MoneyInput.jsx'
import { Notice, ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { fmtBRL, fmtDateTime } from '@/shared/lib/format.js'
import { CashSessionBadge as State } from './CashSessionBadge.jsx'
import { CashSessionDetail } from './CashSessionDetail.jsx'
import s from './CashOpening.module.css'

const date = value => value ? fmtDateTime(value) : '—'
const amount = value => value == null ? '—' : fmtBRL(value)
function QueryState({query,label}) {return query.loading ? <LoadingBlock label={label} lines={2}/> : query.error ? <ErrorBlock error={query.error} onRetry={query.reload}/> : null}
export function CashOpening({onOpened,navigate}) {
 const {can}=useStore()
 const id=useId(), sending=useRef(false), form=useRef(null)
 const [boxId,setBoxId]=useState(''), [page,setPage]=useState(0), [fund,setFund]=useState(''), [note,setNote]=useState('')
 const [busy,setBusy]=useState(false), [error,setError]=useState(null), [uncertain,setUncertain]=useState(false), [invalid,setInvalid]=useState({})
 const boxes=useQueryResource(signal=>readCash('caixas',{ativo:true,pagina:page,tamanho:20,ordenarPor:'nome',direcao:'ASC'},signal),[page])
 const rows=boxes.loading||boxes.error?[]:boxes.data?.itens||[]
 const available=rows.filter(box=>!box.emUso)
 const automatic=boxes.data?.totalItens===1&&rows.length===1&&!rows[0].emUso?String(rows[0].id):''
 const selectedId=boxId||automatic
 const blocked=busy||uncertain||!can('CAIXA_OPERAR')
 function changePage(next) {setBoxId('');setPage(next)}
 async function submit(event) {
  event.preventDefault();if(sending.current||blocked||boxes.loading||boxes.error)return
  const fields={}
  if(!selectedId||!available.some(box=>String(box.id)===selectedId))fields.caixaId='Selecione um caixa disponível nesta página.'
  if(fund===''||!Number.isFinite(Number(fund))||Number(fund)<0)fields.fundoTroco='Informe um fundo de troco válido. Pode ser R$ 0,00.'
  if(note.length>2000)fields.observacao='Use no máximo 2.000 caracteres.'
  setInvalid(fields);setError(null)
  if(Object.keys(fields).length){requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus());return}
  sending.current=true;setBusy(true)
  try {await writeCash('sessoes',{caixaId:selectedId,fundoTroco:Number(fund),observacao:note.trim()||null});onOpened()}
  catch(ex){setError(ex);setInvalid(ex.fieldErrors||{});if(ex.status===0)setUncertain(true)}
  finally{sending.current=false;setBusy(false)}
 }
 return <><section className={s.opening} aria-labelledby={id+'-heading'}>
  <header className={s.heading}><span className={s.icon}><Wallet size={25} aria-hidden="true"/></span><div><span className={s.eyebrow}>INÍCIO DO TURNO</span><h2 id={id+'-heading'}>Abrir caixa</h2><p>Confira o posto de atendimento e informe o dinheiro disponível para troco.</p></div><span className={s.closed}>Sem turno aberto</span></header>
  <form ref={form} onSubmit={submit} noValidate aria-busy={busy}>
   {error&&<Notice title="Não foi possível abrir o caixa" focus>{error.message}</Notice>}
   {uncertain&&<Notice tone="warning" title="Confira antes de tentar novamente">A resposta não foi confirmada. Atualize a sessão para verificar se o turno foi aberto.<button type="button" onClick={onOpened}>Verificar sessão</button></Notice>}
   {!can('CAIXA_OPERAR')&&<Notice tone="info">Seu acesso permite consultar sessões. Para abrir um turno, solicite a permissão de operar o caixa.</Notice>}
   <div className={s.body}>
    <fieldset disabled={busy||uncertain} className={s.fields}>
     <div className={s.boxField}><div className={s.boxLabel}><label htmlFor={id+'-box'}><span><Wallet size={15} aria-hidden="true"/>Caixa físico <b className={s.required}>*</b></span></label>{can('CAIXA_CONFIGURAR')&&<button type="button" className={s.addBoxIcon} aria-label="Cadastrar novo caixa" title="Cadastrar novo caixa" disabled={busy||uncertain} onClick={()=>navigate('ajustescaixa',{aba:'caixas',cadastrar:'sim'})}><Plus size={17} aria-hidden="true"/>Caixa</button>}{!boxes.loading&&!boxes.error&&!rows.length&&<span className={s.help}><span tabIndex={0} role="img" aria-label="Aviso: nenhum caixa ativo encontrado" aria-describedby={id+'-empty-box'} className={s.helpIcon}><AlertCircle size={16} aria-hidden="true"/></span><span id={id+'-empty-box'} role="tooltip" className={s.helpText}>Nenhum caixa ativo encontrado. Solicite o cadastro de um posto em Ajustes do caixa.</span></span>}</div><select id={id+'-box'} aria-label="Caixa disponível" value={selectedId} disabled={busy||uncertain||boxes.loading||!!boxes.error||!can('CAIXA_OPERAR')&&!can('CAIXA_CONFIGURAR')} required aria-invalid={!!invalid.caixaId} aria-describedby={id+'-box-help'} onChange={e=>{setBoxId(e.target.value);setInvalid(v=>({...v,caixaId:null}))}}><option value="">{boxes.loading?'Carregando caixas…':'Selecione o posto de atendimento'}</option>{rows.map(box=><option key={box.id} value={box.id} disabled={box.emUso}>{box.nome}{box.emUso?' · Em uso':''}</option>)}</select><small id={id+'-box-help'}>{invalid.caixaId||'Caixas em uso não podem iniciar outro turno.'}</small>{boxes.error&&<ErrorBlock error={boxes.error} onRetry={boxes.reload}/>}{!boxes.loading&&!boxes.error&&boxes.data?.totalItens===0&&<div className={s.createEmpty}>{can('CAIXA_CONFIGURAR')?<><small>Use o botão + Caixa ao lado de Caixa físico para cadastrar um posto de atendimento.</small></>:<small>Solicite a um responsável o cadastro ou a ativação de um caixa.</small>}<button type="button" onClick={boxes.reload}><RefreshCw size={14} aria-hidden="true"/>Atualizar caixas</button></div>}{!boxes.loading&&rows.length>0&&!available.length&&<Notice tone="warning">Os caixas desta página estão em uso. Consulte outra página ou aguarde o encerramento de um turno.</Notice>}{(page>0||boxes.data?.ultima===false)&&<div className={s.pager}><button type="button" disabled={blocked||boxes.loading||!page} onClick={()=>changePage(page-1)}>Anteriores</button><span>Página {page+1}</span><button type="button" disabled={blocked||boxes.loading||boxes.data?.ultima!==false} onClick={()=>changePage(page+1)}>Próximos</button></div>}</div>
     <label><span><Banknote size={15} aria-hidden="true"/>Fundo de troco (R$) <b className={s.required}>*</b></span><MoneyInput disabled={!can('CAIXA_OPERAR')} required value={fund} onValueChange={value=>{setFund(value);setInvalid(v=>({...v,fundoTroco:null}))}} aria-label="Fundo de troco" placeholder="Ex.: 150,00" aria-invalid={!!invalid.fundoTroco} aria-describedby={id+'-fund-help'}/><small id={id+'-fund-help'}>{invalid.fundoTroco||'Dinheiro inicial da gaveta. Informe 0,00 se não houver troco.'}</small></label>
     <label><span>Observação <small>(opcional)</small></span><textarea disabled={!can('CAIXA_OPERAR')} rows={3} maxLength={2000} placeholder="Ex.: Abertura do turno da noite com troco conferido." value={note} onChange={e=>setNote(e.target.value)} aria-invalid={!!invalid.observacao}/><small>{invalid.observacao||`${note.length}/2.000 caracteres`}</small></label>
    </fieldset>
    <aside className={s.summary} aria-label="Resumo da abertura"><span className={s.summaryIcon}><Banknote size={22} aria-hidden="true"/></span><h3>Comece com o troco conferido</h3><p>O fundo de troco é o dinheiro que já está na gaveta antes das vendas.</p><div><span>Valor inicial informado</span><strong>{fund===''?'—':fmtBRL(Number(fund))}</strong></div><small>Esse valor compõe a conferência no fechamento. Não é uma venda nem um recebimento de cliente.</small></aside>
   </div>
   <footer className={s.footer}><span><b className={s.required}>*</b> Campos obrigatórios</span><button type="submit" className="gold" disabled={blocked||boxes.loading||!!boxes.error||!available.length}><Wallet size={16} aria-hidden="true"/>{busy?'Abrindo caixa…':'Abrir turno'}</button></footer>
  </form>
 </section><CashSessionHistory navigate={navigate}/></>
}
export function CashSessionHistory({navigate,excludeId}) {
 const [page,setPage]=useState(0), [status,setStatus]=useState('FECHADA'), [selected,setSelected]=useState(null)
 const query=useQueryResource(signal=>readCash('sessoes',{status,pagina:page,tamanho:5,ordenarPor:'abertaEm',direcao:'DESC'},signal),[status,page,excludeId])
 const rows=query.loading||query.error?[]:(query.data?.itens||[]).filter(row=>row.id!==excludeId)
 const columns=[{key:'caixaNome',header:'Caixa',sort:false,render:r=><strong>{r.caixaNome}</strong>},{key:'operadorNome',header:'Operador',sort:false},{key:'abertaEm',header:'Abertura',sort:false,render:r=>date(r.abertaEm)},{key:'fechadaEm',header:'Encerramento',sort:false,render:r=>date(r.fechadaEm)},{key:'dinheiroContado',header:'Contado',sort:false,render:r=>amount(r.dinheiroContado)},{key:'diferenca',header:'Diferença',sort:false,render:r=><span className={r.diferenca!=null&&Number(r.diferenca)!==0?s.difference:undefined}>{amount(r.diferenca)}</span>},{key:'status',header:'Situação',sort:false,render:r=><State value={r.status}/>},{key:'actions',header:'Ações',sort:false,render:r=><button type="button" onClick={()=>setSelected(r)}><Eye size={14} aria-hidden="true"/>Ver detalhes</button>}]
 return <section className={s.history} aria-label="Sessões anteriores"><header className={s.historyHeading}><div><h2><History size={21} aria-hidden="true"/>Sessões anteriores</h2><p>Confira os últimos turnos e as diferenças registradas no fechamento.</p></div><button type="button" onClick={()=>navigate('sessoescaixa')} className={s.allSessions}>Ver todas as sessões<ArrowRight size={15} aria-hidden="true"/></button></header><div className={s.historyControls}><label>Situação<select value={status} onChange={e=>{setStatus(e.target.value);setPage(0)}}><option value="FECHADA">Fechadas</option><option value="EM_FECHAMENTO">Divergências pendentes</option><option value="CANCELADA">Canceladas</option></select></label><button type="button" onClick={query.reload} disabled={query.loading}><RefreshCw size={15} aria-hidden="true"/>Atualizar sessões</button><span>Cinco sessões por página · ordem de abertura</span></div><QueryState query={query} label="Consultando sessões anteriores…"/><DataTable compactColumns={['caixaNome', 'abertaEm', 'status', 'actions']} columns={columns} rows={rows} caption="Histórico de sessões" pageSize={5} remote={{page,total:query.error?0:query.data?.totalItens||0,loading:query.loading,sort:{key:'abertaEm',dir:'desc'},onPage:setPage}} emptyText={query.loading?'Carregando sessões…':query.error?'Consulta indisponível.':'Nenhuma sessão encontrada nesta situação.'}/>{selected&&<PastSession id={selected.id} close={()=>setSelected(null)}/>}</section>
}
function PastSession({id,close}) {
 const query=useQueryResource(signal=>readCash('sessoes/'+encodeURIComponent(id),{},signal),[id])
 return <CashSessionDetail query={query} onClose={close}/>
}
