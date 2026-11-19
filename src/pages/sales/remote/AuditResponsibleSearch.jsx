import { useId, useState } from 'react'
import { api } from '@/shared/api/api.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import css from '@/features/catalog/product-editor/ui/CategoryAutocomplete.module.css'

const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')

export function AuditResponsibleSearch({value,name,onChange,canReadUsers}) {
 const id=useId()
 const [requested,setRequested]=useState(false),[open,setOpen]=useState(false),[text,setText]=useState(''),[active,setActive]=useState(-1)
 // Fetch once, on first use; keystrokes only filter options already loaded.
 const users=useQueryResource(signal=>requested&&canReadUsers?api.usuarios.listar(signal):null,[requested,canReadUsers])
 if(!canReadUsers)return null
 const all=Array.isArray(users.data)?users.data:[]
 const matching=all.filter(user=>normalize(user.name).includes(normalize(text)))
 const options=matching.slice(0,20)
 const selectedName=name||all.find(user=>String(user.id)===String(value))?.name||''
 function choose(user){onChange(String(user.id),user.name);setText('');setOpen(false);setActive(-1)}
 function keys(event){
  if(event.key==='Escape'||event.key==='Tab'){setOpen(false);return}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setOpen(true);setRequested(true);setActive(index=>Math.max(0,Math.min(options.length-1,index+(event.key==='ArrowDown'?1:-1))))}
  if(event.key==='Enter'){event.preventDefault();if(open&&!users.loading&&options[active])choose(options[active])}
 }
 return <div className={css.root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)){setOpen(false);setText('')}}}>
  <label htmlFor={id}>Buscar responsável</label>
  <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={id+'-list'} aria-activedescendant={open&&active>=0?id+'-option-'+active:undefined} autoComplete="off" placeholder="Ex.: Ana ou João" value={open?text:value?selectedName:''} onFocus={()=>{setRequested(true);setOpen(true);setText('');setActive(-1)}} onClick={()=>{if(!open){setRequested(true);setOpen(true);setText('');setActive(-1)}}} onChange={event=>{setText(event.target.value);setActive(-1);setOpen(true)}} onKeyDown={keys}/>
  {open&&<div className={css.dropdown}>
   <div id={id+'-list'} role="listbox" aria-label="Responsáveis disponíveis">{!users.loading&&!users.error&&options.map((user,index)=><div key={user.id} id={id+'-option-'+index} role="option" aria-selected={active===index} className={css.option} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(user)}>{user.name}{user.active===false?' · Inativo':''}</div>)}</div>
   {users.loading?<p role="status">Carregando responsáveis…</p>:users.error?<Notice title="Não foi possível carregar responsáveis" onRetry={users.reload}>{users.error.message}</Notice>:!options.length?<p>Nenhum responsável encontrado.</p>:matching.length>20?<p>Mostrando os primeiros 20 nomes. Digite mais letras para refinar a busca.</p>:null}
  </div>}
 </div>
}
