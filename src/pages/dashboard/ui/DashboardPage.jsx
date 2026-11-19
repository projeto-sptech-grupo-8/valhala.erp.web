import { Link } from 'react-router-dom'
import { Boxes, Wallet } from 'lucide-react'
import { useStore } from '@/entities/store'
import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import tabs from '@/entities/access/ui/access.module.css'
import s from './DashboardPage.module.css'
import { StockOverview } from './StockOverview.jsx'
import { CashOverview } from './CashOverview.jsx'

const modules = [
  { id: 'estoque', label: 'Estoque', permission: 'VISUALIZAR_ESTOQUE', Icon: Boxes },
  { id: 'caixa', label: 'Caixa', permission: 'CAIXA_VISUALIZAR', Icon: Wallet },
]

export function Dashboard({ navigate, pageParams, headerActionsElement }) {
  const { can } = useStore()
  const available = modules.filter(module => can(module.permission))
  const active = available.find(module => module.id === pageParams.aba) || available[0]

  if (!active) return <Notice tone="info" title="Indicadores sem acesso">Seu perfil precisa de acesso ao estoque ou ao caixa para consultar os indicadores.</Notice>

  return <>
    <nav className={tabs.tabs + ' ' + s.moduleNav} aria-label="Módulos da visão geral">
      {available.map(({ id, label, Icon }) => (
        <Link key={id} to={'/dashboard?aba=' + id} className={id === active.id ? tabs.tabOn : tabs.tab} aria-current={id === active.id ? 'page' : undefined}>
          <Icon size={16} aria-hidden="true" />{label}
        </Link>
      ))}
    </nav>
    {active.id === 'estoque'
      ? <StockOverview navigate={navigate} headerTarget={headerActionsElement} />
      : <CashOverview navigate={navigate} headerTarget={headerActionsElement} />}
  </>
}
