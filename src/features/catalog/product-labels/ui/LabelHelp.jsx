import { useId } from 'react'
import { CircleHelp, CircleAlert } from 'lucide-react'
import s from './EtiquetasModal.module.css'

export function LabelHelp({ title, children, notice = false }) {
  const id = useId()
  const Icon = notice ? CircleAlert : CircleHelp
  return <span className={s.help + (notice ? ' ' + s.noticeHelp : '')}><button type="button" aria-label={`Ajuda: ${title}`} aria-describedby={id}><Icon size={16} aria-hidden="true" /></button><span role="tooltip" id={id} className={s.tooltip}>{children}</span></span>
}
