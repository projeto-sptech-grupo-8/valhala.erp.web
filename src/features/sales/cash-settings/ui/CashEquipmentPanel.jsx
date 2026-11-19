import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Pencil, Plus, Settings2, Trash2, Wallet } from 'lucide-react'
import { ActionMenu } from '@/entities/access/ui'
import { ConfirmModal, Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { readCash, writeCash } from '@/entities/sales/api/cashApi.js'
import s from './CashEquipmentPanel.module.css'

function State({active,inUse}) {
 const Icon=inUse?Wallet:active?CheckCircle2:AlertCircle
 return <span className={s.state} data-tone={inUse?'info':active?'success':'neutral'}><Icon size={13} aria-hidden="true"/>{inUse?'Turno aberto':active?'Ativo':'Inativo'}</span>
}
function DeleteBox({box:initialBox,onClose,onDeleted,onEdit}) {
 const [box,setBox]=useState(initialBox)
 const [busy,setBusy]=useState(false),[error,setError]=useState(null),[uncertain,setUncertain]=useState(false),[message,setMessage]=useState('')
 const lock=useRef(false)
 async function remove(){
  if(lock.current||box.emUso||uncertain)return
  lock.current=true;setBusy(true);setError(null);setMessage('')
  try{await writeCash('caixas/'+box.id,undefined,'DELETE');onDeleted(box)}
  catch(ex){setError(ex);if(ex.status===0)setUncertain(true)}
  finally{lock.current=false;setBusy(false)}
 }
 async function verify(){
  if(lock.current)return
  lock.current=true;setBusy(true);setError(null)
  try{const current=await readCash('caixas/'+box.id);if(!current?.id)throw new Error('Não foi possível confirmar o cadastro do caixa.');setBox(current);setUncertain(false);setMessage('O caixa ainda está cadastrado. Confira a situação antes de tentar excluir novamente.')}
  catch(ex){if(ex.status===404){onDeleted(box);return}setError(ex)}
  finally{lock.current=false;setBusy(false)}
 }
 return <ConfirmModal title="Excluir caixa?" subtitle={box.nome} confirmLabel="Excluir caixa" danger busy={busy} disabled={box.emUso||uncertain} onClose={onClose} onConfirm={remove} error={error?.message} width="min(560px, calc(100vw - 32px))">
  <div className={s.deleteBody}>
   {box.emUso&&<Notice tone="warning" title="Este caixa está com um turno aberto">Encerre o turno antes de alterar a disponibilidade do caixa. A exclusão continuará bloqueada por existir uma sessão vinculada.</Notice>}
   <p>O cadastro de <strong>{box.nome}</strong> será removido permanentemente. Os vínculos das maquininhas deste caixa também serão removidos; isso não exclui os dispositivos da conta do Mercado Pago.</p>
   <div className={s.rules}><h3>Quando a exclusão é permitida?</h3><ul><li>O caixa não pode ter sessões vinculadas, mesmo encerradas.</li><li>O caixa não pode ter pagamentos vinculados.</li><li>Com a Point habilitada, deve continuar existindo pelo menos uma maquininha ativa disponível em um caixa ativo.</li></ul><p>O servidor verifica essas condições ao confirmar.</p></div>
   <p>Se o caixa já foi utilizado, prefira <strong>inativá-lo</strong> para preservar o histórico. Um caixa com turno aberto não pode ser inativado.</p>
   {error?.status===409&&!box.emUso&&/sessões|pagamentos/i.test(error.message||'')&&<button type="button" disabled={busy} onClick={()=>onEdit(box)}><Pencil size={15} aria-hidden="true"/>Editar para inativar</button>}
   {uncertain&&<Notice tone="warning" title="Confira antes de repetir">A resposta não foi confirmada. Consulte o cadastro antes de tentar novamente.<button type="button" disabled={busy} onClick={verify}>Conferir exclusão</button></Notice>}
   {message&&<Notice tone="info">{message}</Notice>}
  </div>
 </ConfirmModal>
}
export function CashEquipmentPanel({data,page,creating,canConfigure,onGoToCash,onPage,onNewBox,onEditBox,onAddTerminal,onEditTerminal,onChangeMode,onDeleted}) {
 const [deleting,setDeleting]=useState(null)
 const rows=Array.isArray(data.itens)?data.itens:[]
 const total=Number.isInteger(data.totalItens)?data.totalItens:null
 const last=data.ultima??(total==null||((page+1)*4>=total))
 return <section className={s.panel} aria-label="Caixas e maquininhas cadastrados">
  <header className={s.heading}><div><h2><Wallet size={21} aria-hidden="true"/>Caixas cadastrados</h2><p>Organize os postos de atendimento e as maquininhas de cada caixa.</p></div><div className={s.headingActions}><button type="button" onClick={onGoToCash}><Wallet size={16} aria-hidden="true"/>Ir para o caixa</button>{canConfigure&&<button type="button" className="gold" disabled={creating} onClick={onNewBox}><Plus size={16} aria-hidden="true"/>Novo caixa</button>}</div></header>
  {!rows.length?<div className={s.empty}><Wallet size={30} aria-hidden="true"/><h3>Nenhum caixa cadastrado nesta página</h3><p>{canConfigure?'Cadastre um posto de atendimento para disponibilizá-lo na abertura de turnos.':'Solicite a um responsável o cadastro de um posto de atendimento.'}</p></div>:<div className={s.list}>{rows.map(box=>{
   const terminals=Array.isArray(box.terminais)?box.terminais:[]
   return <article className={s.box} key={box.id} aria-label={'Caixa '+box.nome}>
    <header className={s.boxHeading}><span className={s.boxIcon}><Wallet size={21} aria-hidden="true"/></span><div className={s.identity}><div><h3>{box.nome}</h3><State active={box.ativo}/>{box.emUso&&<State inUse/>}</div><p>{box.emUso?'Existe um turno aberto neste posto.':box.ativo?'Disponível para abertura de um novo turno.':'Não aparece entre os caixas disponíveis para novos turnos.'}</p></div>{canConfigure&&<ActionMenu label={'Ações do caixa '+box.nome} items={[{label:'Editar caixa',icon:Pencil,onClick:()=>onEditBox(box)},{label:'Excluir caixa',icon:Trash2,danger:true,onClick:()=>setDeleting(box)}]}/>}</header>
    <section className={s.terminals} aria-label={'Maquininhas do caixa '+box.nome}>
     <div className={s.terminalHeading}><h4><CreditCard size={16} aria-hidden="true"/>Maquininhas <span>{terminals.length}</span></h4>{canConfigure&&<button type="button" onClick={()=>onAddTerminal(box)}><Plus size={14} aria-hidden="true"/>Adicionar maquininha</button>}</div>
     {terminals.length?<ul className={s.terminalList}>{terminals.map(terminal=><li key={terminal.id}><CreditCard size={18} aria-hidden="true"/><div className={s.terminalIdentity}><strong>{terminal.nome}</strong><span>Dispositivo Mercado Pago: {terminal.terminalId||'Não informado'}</span>{!box.ativo&&terminal.ativo&&<small>O vínculo está ativo, mas o caixa está inativo.</small>}</div><State active={terminal.ativo}/>{canConfigure&&<ActionMenu label={'Ações da maquininha '+terminal.nome} items={[{label:'Editar maquininha',icon:Pencil,onClick:()=>onEditTerminal(box,terminal)},{label:'Modo de operação',icon:Settings2,onClick:()=>onChangeMode(terminal)}]}/>}</li>)}</ul>:<p className={s.noTerminals}>Nenhuma maquininha vinculada. Adicione um dispositivo para usar a integração Point neste caixa.</p>}
    </section>
   </article>
  })}</div>}
  <p className={s.hint}>Para deixar de usar uma maquininha, edite-a e desative o vínculo. O histórico é preservado; com a Point habilitada, mantenha ao menos uma maquininha ativa disponível.</p>
  <footer className={s.footer}><span>{total==null?'Total não informado':total+' caixa(s) cadastrado(s)'} · 4 por página</span><div><button type="button" disabled={!page} onClick={()=>onPage(page-1)}><ChevronLeft size={15} aria-hidden="true"/>Anterior</button><span>Página {page+1}</span><button type="button" disabled={last} onClick={()=>onPage(page+1)}>Próxima<ChevronRight size={15} aria-hidden="true"/></button></div></footer>
  {deleting&&<DeleteBox box={deleting} onClose={()=>setDeleting(null)} onDeleted={box=>{setDeleting(null);onDeleted(box)}} onEdit={box=>{setDeleting(null);onEditBox(box)}}/>}
 </section>
}
