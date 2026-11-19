import { useId, useRef, useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { writeCash } from '@/entities/sales/api/cashApi.js'
import { Modal, Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import s from './CashOpening.module.css'

export function CashBoxRegistration({onCancel,onCreated,onRefresh}) {
 const [name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(null),[uncertain,setUncertain]=useState(false)
 const lock=useRef(false),formId=useId()
 async function submit(event) {
  event.preventDefault()
  if(lock.current||uncertain)return
  if(!name.trim()||name.trim().length>100){setError(new Error('Informe um nome com até 100 caracteres.'));return}
  lock.current=true;setBusy(true);setError(null)
  try {const box=await writeCash('caixas',{nome:name.trim()});onCreated(box)}
  catch(ex){setError(ex);if(ex.status===0)setUncertain(true)}
  finally {lock.current=false;setBusy(false)}
 }
 return <Modal width="min(600px, calc(100vw - 32px))" title={<span className={s.registrationTitle}><Wallet size={21} aria-hidden="true"/>Cadastrar caixa físico</span>} subtitle="Identifique o posto de atendimento e sua gaveta de dinheiro. Cadastrar o caixa não abre um turno." busy={busy} onClose={onCancel} footer={<><button type="button" onClick={onCancel} disabled={busy}>Cancelar</button><button type="submit" form={formId} className="gold" disabled={busy||uncertain}><Plus size={15} aria-hidden="true"/>{busy?'Cadastrando…':'Cadastrar caixa'}</button></>}>
  <form id={formId} onSubmit={submit} className={s.createForm} aria-busy={busy}>
   <div className={s.registrationModalBody}>
    {error&&<Notice title="Não foi possível cadastrar o caixa" focus>{error.message}</Notice>}
    {uncertain&&<Notice tone="warning" title="Confira antes de repetir">A resposta não foi confirmada. Consulte a lista para verificar se o caixa foi cadastrado antes de tentar novamente.<button type="button" onClick={onRefresh}>Consultar caixas</button></Notice>}
    <p><b className={s.required}>*</b> Campo obrigatório</p>
   <fieldset disabled={busy||uncertain}>
     <label><span>Nome do caixa <b className={s.required}>*</b></span><input aria-label="Nome do caixa" required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Caixa Principal" aria-invalid={!!error?.fieldErrors?.nome}/>{error?.fieldErrors?.nome&&<small role="alert">{error.fieldErrors.nome}</small>}</label>
     <p>Escolha um nome que identifique o posto de atendimento:</p>
     <div className={s.nameSuggestions}>{['Caixa Principal','Caixa Delivery','Caixa Eventos'].map(value=><button type="button" key={value} aria-pressed={name===value} onClick={()=>setName(value)}>{value}</button>)}</div>
     <small>As sugestões preenchem o nome. Confirme o cadastro para disponibilizar o caixa na abertura de turnos.</small>
    </fieldset>
   </div>
  </form>
 </Modal>
}
