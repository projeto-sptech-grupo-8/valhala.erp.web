import { useId } from 'react'
import { CircleHelp } from 'lucide-react'
import { MOVEMENT_TYPES } from '@/entities/inventory/model/movementTypes.js'
import ui from './PageHeader.module.css'

export function MovementListHelp() {
  const id = useId()
  return <span className={ui.help}><button type="button" className={ui.helpButton} aria-label="Sobre os tipos de movimentação" aria-describedby={id}><CircleHelp size={19} aria-hidden="true" /></button><span id={id} role="tooltip" className={ui.helpText + ' ' + ui.auditLegend}>
    <strong className={ui.legendTitle}>Tipos de movimentação</strong>
    {Object.entries(MOVEMENT_TYPES).map(([type, meta]) => <span key={type} className={ui.legendRow}><span className={ui.legendDot} style={{ background: meta.color }} aria-hidden="true" /><span><strong style={{ color: meta.color }}>{meta.label}</strong><span>{meta.description}</span></span></span>)}
    <span className={ui.legendFooter}>As cores identificam o tipo retornado pelo servidor, sem destacar uma linha específica em amarelo. A quantidade mostra a entrada ou retirada na unidade-base do produto; fracionados usam mililitros. “Saldo após” é o saldo informado pelo servidor depois daquela movimentação, não necessariamente o saldo atual.</span>
  </span></span>
}
