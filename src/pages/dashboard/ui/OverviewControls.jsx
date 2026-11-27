import { createPortal } from 'react-dom'
import { RefreshCw } from 'lucide-react'
import { Stat } from '@/shared/ui/primitives/ui.jsx'
import { DashboardHelp } from './DashboardHelp.jsx'
import s from './DashboardPage.module.css'

export function OverviewToolbar({ target, title, titleAction, detail, busy, refresh }) {
  if (!target) return null
  return createPortal(
    <section className={s.toolbar} aria-label="Consulta da visão geral">
      <div>
        <div className={s.toolbarTitle}><strong>{title}</strong>{titleAction}</div>
        {detail && <small>{detail}</small>}
      </div>
      <div className={s.controls}>
        <button type="button" disabled={busy} onClick={refresh} aria-label="Atualizar início">
          <RefreshCw size={16} aria-hidden="true" />{busy ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>
    </section>, target)
}

export function OverviewStat({ icon: Icon, label, value, description, help, accent = 'neutral', progress, action }) {
  return <div className={s.kpiCard} data-accent={accent}>
    <Stat a={<><span className={s.kpiIconWrap}><Icon className={s.kpiIcon} size={18} aria-hidden="true" /></span><span>{label}</span>
      {help && <DashboardHelp title={label}>{help}</DashboardHelp>}</>}
      b={value} c={action ? <>{description}{action}</> : description} progress={progress} progressLabel={label} />
  </div>
}
