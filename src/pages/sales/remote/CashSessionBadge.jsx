import { AlertCircle, CalendarClock, LockKeyhole, LockKeyholeOpen } from 'lucide-react'
import s from './SalesRemote.module.css'

const sessionStatus = {
  ABERTA: { label: 'Aberta', tone: 'success', Icon: LockKeyholeOpen },
  FECHADA: { label: 'Fechada', tone: 'info', Icon: LockKeyhole },
  EM_FECHAMENTO: { label: 'Divergência pendente', tone: 'danger', Icon: AlertCircle },
  CANCELADA: { label: 'Cancelada', tone: 'danger', Icon: AlertCircle },
}

export function CashSessionBadge({ value }) {
  const { label, tone, Icon } = sessionStatus[value] ?? {
    label: value || 'Não informado', tone: 'pending', Icon: CalendarClock,
  }
  return <span className={s.badge} data-tone={tone}><Icon size={13} aria-hidden="true" />{label}</span>
}
