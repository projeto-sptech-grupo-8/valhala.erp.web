import { useId, useRef, useState } from 'react'
import { CircleHelp, CreditCard, Percent, Save, Settings2 } from 'lucide-react'
import { Modal, Notice, ErrorBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { MoneyInput } from '@/features/catalog/product-editor/ui/MoneyInput.jsx'
import { readCash, writeCash } from '@/entities/sales/api/cashApi.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { fmtBRL } from '@/shared/lib/format.js'
import { FEE_FORMS, feeDraft, feePayload, validateFee, effectiveFeeTransfer, feeExample } from '../model/cashFeeRules.js'
import s from './CashFeeModal.module.css'

function Heading({title,icon:Icon,help}) {
 const id=useId()
 return <header className={s.heading}><h3><Icon size={17} aria-hidden="true"/>{title}</h3><span className={s.help}><button type="button" aria-label={'Sobre '+title.toLowerCase()} aria-describedby={id}><CircleHelp size={17} aria-hidden="true"/></button><span id={id} role="tooltip">{help}</span></span></header>
}
export function CashFeeModal({rate,onClose,onSaved}) {
 const formId=useId(),lock=useRef(false),form=useRef(null)
 const [values,setValues]=useState(()=>feeDraft(rate)),[errors,setErrors]=useState({}),[error,setError]=useState(null),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[message,setMessage]=useState('')
 const config=useQueryResource(signal=>readCash('configuracao',{},signal),[])
 const policy=config.error||config.loading?null:config.data
 const effective=effectiveFeeTransfer(values,policy)
 const example=feeExample(values,policy)
 function change(key,value){const next={...values,[key]:value};if(key==='forma'&&value!=='CREDITO')next.parcelas='1';setValues(next);setMessage('');setErrors(previous=>{const validation=validateFee(next,policy);return Object.fromEntries(Object.keys(previous).filter(k=>validation[k]).map(k=>[k,validation[k]]))})}
 function blur(key){const validation=validateFee(values,policy);setErrors(previous=>{const next={...previous};if(validation[key])next[key]=validation[key];else delete next[key];return next})}
 function fieldError(key){return errors[key]&&<small className={s.error} role="alert">{errors[key]}</small>}
 async function submit(event){
  event.preventDefault();if(lock.current||uncertain)return
  const validation=validateFee(values,policy);setErrors(validation);setError(null)
  if(Object.keys(validation).length){setError(new Error('Revise os campos destacados antes de salvar.'));requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus());return}
  lock.current=true;setBusy(true)
  try{await writeCash(rate?'taxas/'+rate.id:'taxas',feePayload(values,!!rate),rate?'PUT':'POST');onSaved()}
  catch(ex){setError(ex);setErrors(ex.fieldErrors||{});if(ex.status===0)setUncertain(true)}
  finally{lock.current=false;setBusy(false)}
 }
 async function verify(){
  if(lock.current)return
  lock.current=true;setBusy(true);setError(null)
  try{
   const data=await readCash('taxas',{forma:values.forma,pagina:0,tamanho:20})
   if(!Array.isArray(data?.itens)||data.ultima!==true)throw new Error('Não foi possível confirmar a lista completa desta forma de pagamento.')
   const existing=data.itens.find(row=>row.forma===values.forma&&Number(row.parcelas)===Number(values.parcelas))
   if(existing&&JSON.stringify(feePayload(feeDraft(existing),!!rate))===JSON.stringify(feePayload(values,!!rate))){onSaved();return}
   if(!rate&&existing){setError(new Error('Já existe uma taxa para esta combinação. Feche o formulário e edite o cadastro existente.'));return}
   setUncertain(false);setMessage('A lista consultada não confirma estes valores. O formulário foi mantido; confira antes de salvar novamente.')
  }catch(ex){setError(ex)}finally{lock.current=false;setBusy(false)}
 }
 return <Modal width="min(760px, calc(100vw - 32px))" title={<span className={s.title}><Percent size={20} aria-hidden="true"/>{rate?'Editar taxa':'Nova taxa'}</span>} subtitle="Defina os custos por transação e como serão absorvidos." busy={busy} onClose={onClose} footer={<><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" form={formId} className="gold" disabled={busy||uncertain||(values.repasse==='GLOBAL'&&(config.loading||!!config.error))}><Save size={15} aria-hidden="true"/>{busy?'Salvando…':'Salvar taxa'}</button></>}>
  <form id={formId} ref={form} onSubmit={submit} noValidate className={s.form}>
   {error&&<Notice title="Não foi possível salvar a taxa" focus>{error.message}</Notice>}
   {error?.status===409&&<Notice tone="info">A combinação de forma de pagamento e parcelas é única, mesmo para taxas inativas. Edite a taxa existente para alterar seus valores ou reativá-la.</Notice>}
   {uncertain&&<Notice tone="warning">A resposta não foi confirmada. Consulte a lista antes de repetir.<button type="button" disabled={busy} onClick={verify}>Conferir taxa salva</button></Notice>}
   {message&&<Notice tone="info">{message}</Notice>}
   <p className={s.hint}><b className={s.required}>*</b> Campos obrigatórios</p>
   <fieldset className={s.sections} disabled={busy||uncertain}>
    <section className={s.section}>
     <Heading title="Identificação da taxa" icon={CreditCard} help="Cada combinação de forma de pagamento e número de parcelas tem um único cadastro, inclusive se estiver inativo. Dinheiro não possui taxa. Forma e parcelas não podem ser alteradas na edição."/>
     <div className={s.grid}>
      <label><span>Forma de pagamento <b className={s.required}>*</b></span><select aria-label="Forma de pagamento da taxa" required disabled={!!rate} aria-invalid={!!errors.forma} value={values.forma} onChange={event=>change('forma',event.target.value)}><option value="">Selecione…</option>{Object.entries(FEE_FORMS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>{fieldError('forma')}</label>
      <label><span>Parcelas <b className={s.required}>*</b></span><select aria-label="Parcelas da taxa" required disabled={!!rate||values.forma!=='CREDITO'} aria-invalid={!!errors.parcelas} value={values.parcelas} onChange={event=>change('parcelas',event.target.value)}>{Array.from({length:12},(_,i)=>i+1).map(count=><option key={count} value={count}>{count===1?'1 parcela · à vista':count+' parcelas'}</option>)}</select><small>{rate?'Forma e parcelas identificam esta taxa e não são editáveis.':values.forma==='CREDITO'?'Crédito aceita de 1 a 12 parcelas.':'Pix e débito usam somente 1 parcela.'}</small>{fieldError('parcelas')}</label>
     </div>
    </section>
    <section className={s.section}>
     <Heading title="Custos por transação" icon={Percent} help="O percentual é a taxa total para esta quantidade de parcelas, não uma taxa mensal. A taxa fixa é cobrada uma vez por transação. Informe zero quando não houver um dos custos."/>
     <div className={s.grid}>
      <label onBlur={()=>blur('taxaPercentual')}><span>Taxa percentual (%) <b className={s.required}>*</b></span><input aria-label="Taxa percentual (%)" aria-invalid={!!errors.taxaPercentual} type="text" inputMode="decimal" required value={values.taxaPercentual} onChange={event=>change('taxaPercentual',event.target.value)} placeholder="Ex.: 3,5000"/><small>Percentual total. Até quatro casas decimais.</small>{fieldError('taxaPercentual')}</label>
      <label onBlur={()=>blur('taxaFixa')}><span>Taxa fixa (R$) <b className={s.required}>*</b></span><MoneyInput aria-label="Taxa fixa (R$)" aria-invalid={!!errors.taxaFixa} required value={values.taxaFixa} onValueChange={value=>change('taxaFixa',value)} placeholder="Ex.: 0,50"/><small>Valor por transação. Informe 0,00 se não houver.</small>{fieldError('taxaFixa')}</label>
     </div>
    </section>
    <section className={s.section}>
     <Heading title="Repasse e situação" icon={Settings2} help="Seguir a política geral usa a regra atual de Políticas e pagamentos. Uma regra própria desta taxa prevalece sobre a geral. Apenas taxas ativas são aplicadas nas novas cobranças; inativar preserva o cadastro."/>
     <label><span>Quem absorve a taxa <b className={s.required}>*</b></span><select aria-label="Quem absorve a taxa" required value={values.repasse} aria-invalid={!!errors.repasse} onChange={event=>change('repasse',event.target.value)}><option value="GLOBAL">Seguir política geral do caixa</option><option value="LOJA">A loja absorve a taxa</option><option value="CLIENTE">Repassar ao cliente</option></select>{fieldError('repasse')}</label>
     {config.loading&&values.repasse==='GLOBAL'&&<p className={s.hint} role="status">Consultando política geral…</p>}
     {config.error&&values.repasse==='GLOBAL'&&<ErrorBlock error={config.error} onRetry={config.reload}/>}
     {effective!=null&&<p className={s.hint}>{values.repasse==='GLOBAL'?'Política geral atual: ':'Regra desta taxa: '}{effective?'o cliente paga os encargos.':'a loja absorve os encargos.'}</p>}
     <label className={s.active}><input type="checkbox" aria-label="Taxa ativa" checked={values.ativo} onChange={event=>change('ativo',event.target.checked)}/><span><strong>Taxa ativa</strong><small>Desative para deixar de aplicar esta taxa, preservando seu cadastro.</small></span></label>
    </section>
   </fieldset>
   {example&&values.ativo&&<aside className={s.example} aria-label="Exemplo de cobrança"><h3>Exemplo para uma venda de R$ 100,00</h3><dl><div><dt>Cliente paga</dt><dd>{fmtBRL(example.charged)}</dd></div><div><dt>Encargos estimados</dt><dd>{fmtBRL(example.cost)}</dd></div><div><dt>Líquido estimado da loja</dt><dd>{fmtBRL(example.net)}</dd></div></dl><p>Simulação com os valores preenchidos. O servidor confirma o cálculo da cobrança; não representa uma liquidação real da operadora.</p></aside>}
   {!values.ativo&&<Notice tone="info">Esta taxa está inativa e não será usada no cálculo de novas cobranças.</Notice>}
  </form>
 </Modal>
}
