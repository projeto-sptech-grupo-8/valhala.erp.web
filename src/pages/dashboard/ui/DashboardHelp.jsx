import { useId } from 'react'
import { CircleHelp } from 'lucide-react'
import s from './DashboardPage.module.css'

export function DashboardHelp({ title, children }) {
  const id = useId()
  return <span className={s.help}><button type="button" aria-label={'Sobre ' + title} aria-describedby={id}><CircleHelp size={15} aria-hidden="true" /></button><span id={id} role="tooltip">{children}</span></span>
}
