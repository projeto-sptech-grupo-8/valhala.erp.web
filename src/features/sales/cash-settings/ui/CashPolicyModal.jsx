import { useId, useRef, useState } from 'react'
import { Banknote, CircleHelp, CreditCard, Percent, Printer, QrCode, Save, Settings2, ShieldCheck, Wallet } from 'lucide-react'
import { Modal, Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { MoneyInput } from '@/features/catalog/product-editor/ui/MoneyInput.jsx'
import { readCash, writeCash } from '@/entities/sales/api/cashApi.js'
import { policyDraft, policyPayload, validatePolicy } from '../model/cashPolicyRules.js'
import s from './CashPolicyModal.module.css'

function Section({id,title,icon:Icon,help,children}) {
 const helpId=useId()
 return <section className={s.section} aria-labelledby={id}><header className={s.sectionHeading}><h3 id={id}><Icon size={18} aria-hidden="true"/>{title}</h3><span className={s.help}><button type="button" aria-label={'Sobre '+title.toLowerCase()} aria-describedby={helpId}><CircleHelp size={17} aria-hidden="true"/></button><span id={helpId} role="tooltip">{help}</span></span></header>{children}</section>
}
function Toggle({label,description,checked,onChange,icon:Icon,disabled,error}) {
 return <div><button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={()=>onChange(!checked)} className={s.toggle} data-on={checked}><span className={s.toggleLabel}>{Icon&&<Icon size={17} aria-hidden="true"/>}<span><strong>{label}</strong>{description&&<small>{description}</small>}</span></span><span className={s.switchTrack} aria-hidden="true"><span/></span></button>{error&&<small className={s.fieldError} role="alert">{error}</small>}</div>
}
function Field({label,required=true,error,hint,onBlur,children}) {
 return <label className={s.field} onBlur={onBlur}><span>{label}{required&&<b className={s.required}> *</b>}</span>{children}{error?<small className={s.fieldError} role="alert">{error}</small>:hint&&<small>{hint}</small>}</label>
}
export function CashPolicyModal({config,onClose,onSaved}) {
 const formId=useId(),form=useRef(null),lock=useRef(false)
 const [values,setValues]=useState(()=>policyDraft(config)),[errors,setErrors]=useState({}),[error,setError]=useState(null),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[message,setMessage]=useState('')
 const dirty=JSON.stringify(policyPayload(values))!==JSON.stringify(policyPayload(policyDraft(config)))
 const parcelFields=['parcelasMinimas','parcelasMaximas','valorMinimoParcela','politicaJuros']
 const showParcel=values.parcelamentoHabilitado||parcelFields.some(key=>errors[key])
 function change(key,value){
  const next={...values,[key]:value};setValues(next);setMessage('')
  setErrors(previous=>{const validation=validatePolicy(next);return Object.fromEntries(Object.keys(previous).filter(k=>validation[k]).map(k=>[k,validation[k]]))})
 }
 function blur(key){const validation=validatePolicy(values);setErrors(previous=>{const next={...previous};if(validation[key])next[key]=validation[key];else delete next[key];return next})}
 function inputProps(key,label){return {id:formId+'-'+key,'aria-label':label,'aria-invalid':!!errors[key],value:values[key],onChange:event=>change(key,event.target.value)}}
 async function submit(event){
  event.preventDefault();if(lock.current||uncertain||!dirty)return
  const validation=validatePolicy(values);setErrors(validation);setError(null);setMessage('')
  if(Object.keys(validation).length){setError(new Error('Revise os campos destacados antes de salvar.'));requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus());return}
  lock.current=true;setBusy(true)
  try{await writeCash('configuracao',policyPayload(values),'PUT');onSaved()}
  catch(ex){setError(ex);const fields={...(ex.fieldErrors||{})};if(/terminal ativo/i.test(ex.message||''))fields.pointHabilitado=ex.message;setErrors(fields);if(ex.status===0)setUncertain(true)}
  finally{lock.current=false;setBusy(false)}
 }
 async function verify(){
  if(lock.current)return
  lock.current=true;setBusy(true);setError(null)
  try{
   const current=await readCash('configuracao')
   if(JSON.stringify(policyPayload(policyDraft(current)))===JSON.stringify(policyPayload(values))){onSaved();return}
   setUncertain(false);setMessage('A configuração consultada difere deste formulário. Seus campos foram mantidos; confira antes de salvar novamente.')
  }catch(ex){setError(ex)}finally{lock.current=false;setBusy(false)}
 }
 return <Modal width={820} className={s.modal} title={<span className={s.title}><Settings2 size={21} aria-hidden="true"/>Editar políticas do caixa</span>} subtitle="Defina as formas de recebimento e os limites usados nos atendimentos." busy={busy} onClose={onClose} footer={<><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" form={formId} className="gold" disabled={busy||uncertain||!dirty}><Save size={16} aria-hidden="true"/>{busy?'Salvando…':'Salvar políticas'}</button></>}>
  <form id={formId} ref={form} onSubmit={submit} noValidate className={s.form}>
   {error&&<Notice title="Não foi possível salvar as políticas" focus>{error.message}</Notice>}
   {uncertain&&<Notice tone="warning" title="Confira o resultado antes de repetir">A resposta não foi confirmada. Consulte as políticas salvas para verificar o resultado.<button type="button" disabled={busy} onClick={verify}>Conferir políticas salvas</button></Notice>}
   {message&&<Notice tone="info">{message}</Notice>}
   <p className={s.requiredHint}><b className={s.required}>*</b> Campos obrigatórios</p>
   <fieldset disabled={busy||uncertain} className={s.sections}>
    <Section id={formId+'-payments'} title="Formas de pagamento" icon={Wallet} help="Escolha as formas aceitas no caixa. Pelo menos uma deve permanecer habilitada. A forma disponível em cada cobrança também depende da integração configurada.">
     <div className={s.grid}>{[['dinheiroHabilitado','Dinheiro',Banknote],['pixHabilitado','Pix',QrCode],['debitoHabilitado','Débito',CreditCard],['creditoHabilitado','Crédito',CreditCard]].map(([key,label,Icon])=><Toggle key={key} label={label} icon={Icon} checked={values[key]} onChange={value=>change(key,value)}/>)}</div>
     {errors.formas&&<small className={s.fieldError} role="alert">{errors.formas}</small>}
    </Section>
    <Section id={formId+'-point'} title="Maquininha e comprovante" icon={Printer} help="A integração Point exige pelo menos uma maquininha ativa cadastrada. O servidor verifica essa disponibilidade ao salvar. Pagamentos manuais são registrados sem a cobrança integrada e seguem o fluxo de conferência do caixa.">
     <div className={s.grid}>
      <Toggle label="Integração Point" description="Exige uma maquininha ativa cadastrada." icon={CreditCard} checked={values.pointHabilitado} onChange={value=>change('pointHabilitado',value)} error={errors.pointHabilitado}/>
      <Toggle label="Imprimir comprovante" description="Impressão na maquininha, conforme o equipamento." icon={Printer} checked={values.imprimirComprovante} onChange={value=>change('imprimirComprovante',value)}/>
      <Field label="Prazo da cobrança (segundos)" error={errors.validadeCobrancaSegundos} hint="De 60 a 600 segundos (1 a 10 minutos). Usado nas cobranças pela Point." onBlur={()=>blur('validadeCobrancaSegundos')}><input {...inputProps('validadeCobrancaSegundos','Prazo da cobrança (segundos)')} type="number" inputMode="numeric" required min={60} max={600} step={1} placeholder="Ex.: 300"/></Field>
      <Toggle label="Permitir pagamento manual" description="Permite registrar recebimentos externos à Point." icon={ShieldCheck} checked={values.permitirPagamentoManual} onChange={value=>change('permitirPagamentoManual',value)}/>
     </div>
     {Number(values.validadeCobrancaSegundos)>600&&<p className={s.inlineWarning}>O prazo atual ultrapassa 600 segundos. Ajuste-o para salvar as políticas neste formulário.</p>}
    </Section>
    <Section id={formId+'-installments'} title="Parcelamento e juros" icon={CreditCard} help="Parcelamento se aplica ao crédito. O mínimo e o máximo devem ficar entre 1 e 12, e o máximo não pode ser menor que o mínimo. A política de juros define quem absorve os encargos. Ao desativar, os valores configurados são preservados.">
     <Toggle label="Permitir parcelamento" description={values.creditoHabilitado?'Disponível para pagamentos no crédito.':'Habilite crédito na seção Formas de pagamento.'} checked={values.parcelamentoHabilitado} disabled={!values.creditoHabilitado&&!values.parcelamentoHabilitado} onChange={value=>change('parcelamentoHabilitado',value)} error={errors.parcelamentoHabilitado}/>
     {showParcel?<div className={s.grid}>
      {['parcelasMinimas','parcelasMaximas'].map((key,index)=><Field key={key} label={index?'Máximo de parcelas':'Mínimo de parcelas'} error={errors[key]} onBlur={()=>blur(key)}><input {...inputProps(key,index?'Máximo de parcelas':'Mínimo de parcelas')} type="number" inputMode="numeric" required min={1} max={12} step={1} placeholder={index?'Ex.: 6':'Ex.: 1'}/></Field>)}
      <Field label="Valor mínimo da parcela (R$)" required={false} error={errors.valorMinimoParcela} hint="Opcional. Deixe em branco para não limitar o valor." onBlur={()=>blur('valorMinimoParcela')}><MoneyInput aria-label="Valor mínimo da parcela (R$)" aria-invalid={!!errors.valorMinimoParcela} value={values.valorMinimoParcela} onValueChange={value=>change('valorMinimoParcela',value)} placeholder="Ex.: 10,00"/></Field>
      <Field label="Quem absorve os juros" error={errors.politicaJuros}><select {...inputProps('politicaJuros','Quem absorve os juros')} required><option value="ABSORVIDA_PELA_LOJA">A loja absorve os juros</option><option value="REPASSADA_AO_CLIENTE">O cliente paga os juros</option></select></Field>
     </div>:<p className={s.hint}>Parcelamento desativado. Os limites e a política de juros configurados serão preservados.</p>}
    </Section>
    <Section id={formId+'-discounts'} title="Descontos sem autorização" icon={Percent} help="O operador pode conceder desconto sem autorização até o menor valor entre o percentual do pedido e o limite em reais. Acima disso, o caixa segue o fluxo de autorização. Zero bloqueia o desconto sem autorização.">
     <div className={s.grid}>
      <Field label="Limite percentual (%)" error={errors.limiteDescontoPercentual} hint="De 0 a 100%. Até duas casas decimais." onBlur={()=>blur('limiteDescontoPercentual')}><input {...inputProps('limiteDescontoPercentual','Limite percentual (%)')} type="text" inputMode="decimal" required placeholder="Ex.: 10,00"/></Field>
      <Field label="Limite em reais (R$)" error={errors.limiteDescontoValor} hint="O limite pode ser R$ 0,00." onBlur={()=>blur('limiteDescontoValor')}><MoneyInput aria-label="Limite em reais (R$)" required aria-invalid={!!errors.limiteDescontoValor} value={values.limiteDescontoValor} onValueChange={value=>change('limiteDescontoValor',value)} placeholder="Ex.: 20,00"/></Field>
     </div>
     <p className={s.hint}>Vale o menor dos dois limites. Exemplo: em um pedido de R$ 100,00, com limites de 10% e R$ 20,00, o desconto sem autorização é de até R$ 10,00.</p>
    </Section>
   </fieldset>
  </form>
 </Modal>
}
