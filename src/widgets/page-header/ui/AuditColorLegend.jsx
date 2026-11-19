import { useId } from 'react'
import { CircleHelp } from 'lucide-react'
import { AUDIT_EVENTS } from '@/entities/sales/model/auditPresentation.js'
import ui from './PageHeader.module.css'

const colors=[
 ['teal','Verde-água','#76d2bd'],['purple','Roxo','#c5a4ee'],
 ['orange','Laranja','#edb276'],['pending','Amarelo','var(--gold2)'],
 ['success','Verde','#86c49a'],['danger','Vermelho','#ef8990'],
 ['info','Azul','#86b6e1'],
]

export function AuditColorLegend() {
 const id=useId()
 return <span className={ui.help}>
  <button type="button" className={ui.helpButton} aria-label="Legenda das cores dos eventos de auditoria" aria-describedby={id}><CircleHelp size={19} aria-hidden="true"/></button>
  <span id={id} role="tooltip" className={ui.helpText+' '+ui.auditLegend}>
   <strong className={ui.legendTitle}>Cores dos eventos</strong>
   <span className={ui.legendIntro}>As cores identificam o tipo de ação. Confira as tags de cada grupo:</span>
   {colors.map(([tone,label,color])=><span className={ui.legendRow} key={tone}><span className={ui.legendDot} style={{background:color}} aria-hidden="true"/><span><strong style={{color}}>{label}</strong><span>{AUDIT_EVENTS.filter(event=>event[3]===tone).map(event=>event[1]).join(' · ')}</span></span></span>)}
   <span className={ui.legendRow}><span className={ui.legendDot} style={{background:'var(--dim)'}} aria-hidden="true"/><span><strong>Neutro</strong><span>Outros eventos ainda sem uma cor específica.</span></span></span>
   <span className={ui.legendFooter}>A cor descreve o evento. Não indica, por si só, entrada ou saída de dinheiro.</span>
  </span>
 </span>
}
