import { useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, LogIn, Save, X } from 'lucide-react'
import { useStore } from '@/entities/store'
import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { changeOwnPassword } from '../api/changePassword.js'
import { validatePasswordChange } from '../model/passwordRules.js'
import s from './ChangePasswordForm.module.css'

export function ChangePasswordForm() {
 const {user,session}=useStore(),navigate=useNavigate(),toast=useToast(),id=useId(),form=useRef(null),lock=useRef(false)
 const [currentPassword,setCurrentPassword]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[visible,setVisible]=useState({currentPassword:false,password:false,confirmation:false}),[errors,setErrors]=useState({}),[error,setError]=useState(null),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false)
 function clear(){setCurrentPassword('');setPassword('');setConfirmation('');setErrors({});setError(null);setVisible({currentPassword:false,password:false,confirmation:false})}
 async function goToLogin(){
  setBusy(true)
  try{if(await session.logout()!==false)navigate('/login',{replace:true})}finally{setBusy(false)}
 }
 async function submit(event){
  event.preventDefault();if(lock.current||uncertain||!user?.id)return
  const validation=validatePasswordChange(currentPassword,password,confirmation);setErrors(validation);setError(null)
  if(Object.keys(validation).length){requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus());return}
  lock.current=true;setBusy(true)
  let saved=false
  try{
   await changeOwnPassword(user.id,currentPassword,password)
   saved=true;clear()
   toast('Entre novamente com a nova senha. As sessões anteriores foram revogadas.',{type:'success',title:'Senha atualizada',duration:8000})
   await goToLogin()
  }catch(ex){
   if(saved){navigate('/login',{replace:true});return}
   const nextErrors={}
   const currentMessage=ex.fieldErrors?.senhaAtual||ex.fieldErrors?.currentPassword
   const passwordMessage=ex.fieldErrors?.senha||ex.fieldErrors?.password
   if(currentMessage)nextErrors.currentPassword=currentMessage
   else if(ex.status===400&&/senha atual/i.test(ex.message||''))nextErrors.currentPassword=ex.message
   if(passwordMessage)nextErrors.password=passwordMessage
   setErrors(nextErrors)
   setError(ex)
   if(Object.keys(nextErrors).length){requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus())}
   if(ex.status===0||ex.status>=500){setUncertain(true);setCurrentPassword('');setPassword('');setConfirmation('');setVisible({currentPassword:false,password:false,confirmation:false})}
  }finally{lock.current=false;setBusy(false)}
 }
 function change(key,value){if(key==='currentPassword')setCurrentPassword(value);else if(key==='password')setPassword(value);else setConfirmation(value);setErrors(previous=>({...previous,[key]:undefined}));setError(null)}
 const hasAnyValue=Boolean(currentPassword||password||confirmation)
 return <article className={'card '+s.card} aria-labelledby={id+'-title'}>
  <h3 id={id+'-title'} className={s.title}><KeyRound size={19} aria-hidden="true"/>Alterar senha</h3>
  <p className={s.description}>Confirme sua senha atual e defina uma nova senha para sua conta. Após a alteração, será necessário entrar novamente.</p>
  {!user?.id&&<Notice title="Conta não identificada">Entre novamente para alterar sua senha.</Notice>}
  {error&&<Notice title="Não foi possível confirmar a alteração" focus>{error.status===401?'Sua sessão expirou. Entre novamente antes de alterar a senha.':error.message}{error.status===401&&<button type="button" disabled={busy} onClick={goToLogin}><LogIn size={15} aria-hidden="true"/>Ir para o login</button>}</Notice>}
  {uncertain&&<Notice tone="warning" title="Confira sua senha antes de repetir">O servidor pode ter concluído a alteração. O formulário foi bloqueado para evitar um novo envio. Entre novamente com a nova senha; se ela não funcionar, use a anterior.<button type="button" disabled={busy} onClick={goToLogin}><LogIn size={15} aria-hidden="true"/>Ir para o login</button></Notice>}
  <form ref={form} onSubmit={submit} noValidate aria-busy={busy}>
   <fieldset disabled={busy||uncertain||!user?.id||error?.status===401} className={s.fields}>
    {[
     ['currentPassword','Senha atual',currentPassword,'Obrigatória para confirmar sua identidade.','current-password','Informe sua senha atual',s.full,undefined],
     ['password','Nova senha',password,'De 8 a 72 caracteres. Caracteres acentuados e emojis podem reduzir o limite.','new-password','Crie sua nova senha','',72],
     ['confirmation','Confirmar nova senha',confirmation,'Repita exatamente a nova senha.','new-password','Repita a nova senha','',72],
    ].map(([key,label,value,hint,autoComplete,placeholder,fieldClass,maxLength])=>{
     const Icon=visible[key]?EyeOff:Eye
     return <div className={s.field+(fieldClass?' '+fieldClass:'')} key={key}><label htmlFor={id+'-'+key}>{label} <b className={s.required}>*</b></label><div className={s.input}><input id={id+'-'+key} aria-label={label} type={visible[key]?'text':'password'} autoComplete={autoComplete} value={value} maxLength={maxLength} required aria-invalid={!!errors[key]} aria-describedby={id+'-'+key+'-hint'} placeholder={placeholder} onChange={event=>change(key,event.target.value)}/><button type="button" className={s.reveal} aria-label={(visible[key]?'Ocultar ':'Mostrar ')+label.toLowerCase()} aria-pressed={visible[key]} onClick={()=>setVisible(previous=>({...previous,[key]:!previous[key]}))}><Icon size={17} aria-hidden="true"/></button></div><small id={id+'-'+key+'-hint'} className={errors[key]?s.error:undefined} role={errors[key]?'alert':undefined}>{errors[key]||hint}</small></div>
    })}
   </fieldset>
   <footer className={s.footer}><span><b className={s.required}>*</b> Campos obrigatórios</span><div>{hasAnyValue&&!uncertain&&error?.status!==401&&<button type="button" disabled={busy} onClick={clear}><X size={16} aria-hidden="true"/>Cancelar</button>}<button type="submit" className="gold" disabled={busy||uncertain||!user?.id||error?.status===401||!hasAnyValue}><Save size={16} aria-hidden="true"/>{busy?'Atualizando…':'Atualizar senha'}</button></div></footer>
  </form>
 </article>
}
