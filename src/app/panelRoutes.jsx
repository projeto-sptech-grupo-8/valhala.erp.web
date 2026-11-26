import { CashRemote, OrdersPage, SessionsPage, AuditPage, CashSettings } from '@/pages/sales/remote/SalesRemote.jsx'
import { Navigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { ConfigPage } from '@/pages/settings'


import { Cards } from '@/pages/catalog/categories'
import { Dashboard } from '@/pages/dashboard'
import { EntradaNF } from '@/pages/inventory/invoice-import'
import { Finance } from '@/pages/finance/overview'
import { Listing } from '@/pages/sales/invoices'
import { Movimentacoes } from '@/pages/inventory/movements'
import { NewMovementPage } from '@/pages/inventory/movements/ui/NewMovementPage.jsx'
import { Products } from '@/pages/catalog/products'
import { ProductEditorPage } from '@/pages/catalog/product-editor'
import { Relatorios } from '@/pages/finance/reports'
import { Reposicao } from '@/pages/inventory/restock'
import { Validades } from '@/pages/inventory/expiry'
import { ProfileFormPage, ProfilesList } from '@/pages/access/profiles'
import { UserFormPage, UsersList } from '@/pages/access/users'
import { usePanelNavigate } from '@/shared/lib/navigation/usePanelNavigate.js'

/**
 * Registro das rotas do painel. O id de cada item também é a chave dos metadados
 * de navegação/permissão em pages.js e o caminho preservado no hash da URL.
 */
export const panelRoutes = [
  { id: 'dashboard', component: Dashboard },
  { id: 'produtos', component: Products },
  { id: 'novo', component: ProductEditorPage },
  { id: 'editar', component: ProductEditorPage, props: ({ pageParams }) => ({ editId: pageParams.id }) },
  { id: 'categorias', component: Cards },
  { id: 'movimentacoes', component: Movimentacoes },
  { id: 'novamovimentacao', component: NewMovementPage },
  { id: 'reposicao', component: Reposicao },
  { id: 'financeiro', component: Finance },
  { id: 'validades', component: Validades },
  { id: 'entradanf', component: EntradaNF },
  { id: 'auditoria', component: AuditPage },
  { id: 'relatorios', component: Relatorios },
  { id: 'caixa', component: CashRemote },
  { id: 'pedidos', component: OrdersPage },
  { id: 'sessoescaixa', component: SessionsPage },
  { id: 'ajustescaixa', component: CashSettings },
  { id: 'notafiscal', component: Listing, props: () => ({ page: 'notafiscal' }) },
  { id: 'usuarios', component: UsersList },
  { id: 'novousuario', component: UserFormPage },
  { id: 'editarusuario', component: LegacyUserRedirect, props: () => ({ editing: true }) },
  { id: 'usuario', component: LegacyUserRedirect },
  { id: 'perfis', component: ProfilesList },
  { id: 'novoperfil', component: ProfileFormPage, props: ({ pageParams }) => ({ copyFrom: pageParams.copiar }) },
  { id: 'perfil', component: LegacyProfileRedirect },
  { id: 'seguranca', component: LegacySettingsRedirect, props: () => ({ tab: 'seguranca' }) },
  { id: 'notificacoes', component: LegacySettingsRedirect },
  { id: 'geral', component: ConfigPage },
]

export function PanelRouteElement({ route }) {
  const navigate = usePanelNavigate()
  const [searchParams] = useSearchParams()
  const { setTitle, setBackAction, setHeaderHelp, headerActionsElement } = useOutletContext()
  const pageParams = Object.fromEntries(searchParams)
  const Component = route.component
  const extraProps = route.props?.({ navigate, pageParams }) ?? {}

  return (
    <Component
      page={route.id}
      navigate={navigate}
      pageParams={pageParams}
      setTitle={setTitle}
      setBackAction={setBackAction}
      setHeaderHelp={setHeaderHelp}
      headerActionsElement={headerActionsElement}
      {...extraProps}
    />
  )
}

function LegacyUserRedirect({ pageParams, editing }) {
  const query = pageParams.id ? new URLSearchParams({ [editing ? 'editar' : 'detalhe']: pageParams.id }).toString() : ''
  return <Navigate replace to={'/usuarios' + (query ? '?' + query : '')} />
}

function LegacyProfileRedirect({ pageParams }) {
  const query = pageParams.id ? new URLSearchParams({ detalhe: pageParams.id }).toString() : ''
  return <Navigate replace to={'/perfis' + (query ? '?' + query : '')} />
}

function LegacySettingsRedirect({ tab }) { return <Navigate replace to={tab ? '/geral?aba=' + tab : '/geral'} /> }
