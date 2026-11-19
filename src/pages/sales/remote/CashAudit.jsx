import { AuditResponsibleSearch } from './AuditResponsibleSearch.jsx'
import { AlertCircle, CheckCircle2, Clock3, Receipt, Settings2, ShieldCheck, Wallet, X } from 'lucide-react'
import { AUDIT_EVENTS, auditComparison, auditEvent, auditDateLabel, auditReference, readableAuditLabel } from '@/entities/sales/model/auditPresentation.js'
import { Drawer } from '@/shared/ui/drawer/Drawer.jsx'
import { fmtBRL } from '@/shared/lib/format.js'
import s from './SalesRemote.module.css'

export function AuditEventBadge({code}) {
 const event=auditEvent(code)
 const Icon=event.tone==='danger'?AlertCircle:event.tone==='success'?CheckCircle2:event.tone==='pending'?Clock3:event.group==='Configuração'?Settings2:event.group==='Caixa'?Wallet:Receipt
 return <span className={s.auditEvent} data-tone={event.tone}><Icon size={15} aria-hidden="true"/>{event.label}</span>
}
export function AuditResponsible({event}) {
 return <span className={s.auditResponsible}>{event.usuarioNome||'Responsável não informado'}</span>
}
export function AuditFilters({params,update,user,responsibleName,onResponsibleChange,canReadUsers}) {
 const groups=[...new Set(AUDIT_EVENTS.map(event=>event[2]))]
 return <>
  <label>Evento<select aria-label="Evento" value={params.tipoEvento||''} onChange={e=>update({tipoEvento:e.target.value})}><option value="">Todos os eventos</option>{params.tipoEvento&&!AUDIT_EVENTS.some(event=>event[0]===params.tipoEvento)&&<option value={params.tipoEvento}>{auditEvent(params.tipoEvento).label}</option>}{groups.map(group=><optgroup key={group} label={group}>{AUDIT_EVENTS.filter(event=>event[2]===group).map(([code,label])=><option key={code} value={code}>{label}</option>)}</optgroup>)}</select></label>
  <AuditResponsibleSearch value={params.usuarioId} name={params.usuarioId===String(user?.id)?user.name:responsibleName} onChange={onResponsibleChange} canReadUsers={canReadUsers}/ >
  {params.usuarioId&&<div className={s.auditUserFilter}><div className={s.auditFilterChip}><span>Responsável: {responsibleName||(params.usuarioId===String(user?.id)?user.name:'Responsável selecionado')}</span><button type="button" title="Remover filtro de responsável" aria-label="Remover filtro de responsável" onClick={()=>update({usuarioId:''})}><X size={14} aria-hidden="true"/></button></div></div>}
 </>
}
function displayValue(value,label) {
 if(value==null||value==='')return '—'
 if(typeof value==='boolean')return value?'Sim':'Não'
 if(typeof value==='number'){
  if(/valor|total|troco|dinheiro|preço|diferença|saldo|custo/i.test(label)&&!/quantidade|percentual|parcelas/i.test(label))return fmtBRL(value)
  return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:4}).format(value)
 }
 if(/^\d{4}-\d{2}-\d{2}T/.test(String(value)))return auditDateLabel(value)
 if(/^[A-Z][A-Z_]+$/.test(String(value)))return ({DINHEIRO:'Dinheiro',PIX:'Pix',DEBITO:'Cartão de débito',CREDITO:'Cartão de crédito',EM_ATENDIMENTO:'Em atendimento',CONCLUIDO:'Concluído',NAO:'Não'}[value]||readableAuditLabel(value))
 return String(value)
}
export function CashAuditDetail({event,onClose}) {
 const rows=auditComparison(event.dadosAnteriores,event.dadosNovos)
 return <Drawer title="Detalhes do evento" onClose={onClose}><div className={s.auditDetail}>
  <h2 className={s.drawerTitle}><ShieldCheck size={23} aria-hidden="true"/>Detalhes do evento</h2>
  <AuditEventBadge code={event.tipoEvento}/>
  <p className={s.auditDescription}>{event.descricao||'O servidor não informou uma descrição para este evento.'}</p>
  <dl className={s.auditMetadata}>
   <div><dt>Data e hora</dt><dd>{auditDateLabel(event.ocorridoEm)}</dd></div>
   <div><dt>Responsável</dt><dd>{event.usuarioNome||'Não informado'}</dd></div>
   <div><dt>Pedido / Referência</dt><dd>{auditReference(event)}</dd></div>
   <div><dt>Valor do evento</dt><dd className={s.auditValue}>{event.valor==null?'—':fmtBRL(event.valor)}</dd></div>
  </dl>
  <p className={s.auditValueHelp}>O valor está associado a este evento. Não representa, por si só, uma entrada ou saída de dinheiro.</p>
  <section className={s.auditDetailSection}><h3>Motivo</h3><p>{event.motivo||'Nenhum motivo informado.'}</p></section>
  <section className={s.auditDetailSection}><h3>Autorização</h3><p>{event.autorizadoPorNome||'Nenhuma autorização informada neste evento.'}</p></section>
  <section className={s.auditDetailSection}><h3>O que mudou</h3><p>Compare os dados registrados antes e depois da ação. Os campos alterados ficam destacados.</p>{rows.length?<div className={s.auditComparisonWrap}><table className={s.auditComparison}><caption className={s.auditSrOnly}>Dados antes e depois do evento</caption><thead><tr><th scope="col">Campo</th><th scope="col">Antes</th><th scope="col">Depois</th></tr></thead><tbody>{rows.map(row=><tr key={row.label} data-changed={row.changed}><th scope="row">{row.label}{row.changed&&<small>Alterado</small>}</th><td>{displayValue(row.before,row.label)}</td><td>{displayValue(row.after,row.label)}</td></tr>)}</tbody></table></div>:<p>Não há dados de comparação disponíveis para este evento.</p>}</section>
 </div></Drawer>
}
