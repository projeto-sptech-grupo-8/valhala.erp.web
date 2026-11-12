import { useOutletContext, useSearchParams } from 'react-router-dom'
import { ConfigPage } from '@/pages/settings'
import { Auditoria } from '@/pages/sales/audit'
import { Cash } from '@/pages/sales/cash'
import { Cards } from '@/pages/catalog/categories'
import { Dashboard } from '@/pages/dashboard'
import { EntradaNF } from '@/pages/inventory/invoice-import'
import { Finance } from '@/pages/finance/overview'
import { Listing } from '@/pages/sales/invoices'
import { Movimentacoes } from '@/pages/inventory/movements'
import { Products } from '@/pages/catalog/products'
import { ProductEditorPage } from '@/pages/catalog/product-editor'
import { Relatorios } from '@/pages/finance/reports'
import { Reposicao } from '@/pages/inventory/restock'
import { Validades } from '@/pages/inventory/expiry'
import { ProfileDetail, ProfileFormPage, ProfilesList } from '@/pages/access/profiles'
import { UserDetail, UserFormPage, UsersList } from '@/pages/access/users'
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
  { id: 'reposicao', component: Reposicao },
  { id: 'financeiro', component: Finance },
  { id: 'validades', component: Validades },
  { id: 'entradanf', component: EntradaNF },
  { id: 'auditoria', component: Auditoria },
  { id: 'relatorios', component: Relatorios },
  { id: 'caixa', component: Cash },
  { id: 'notafiscal', component: Listing, props: () => ({ page: 'notafiscal' }) },
  { id: 'usuarios', component: UsersList },
  { id: 'novousuario', component: UserFormPage },
  { id: 'editarusuario', component: UserFormPage, props: ({ pageParams }) => ({ userId: pageParams.id }) },
  { id: 'usuario', component: UserDetail, props: ({ pageParams }) => ({ userId: pageParams.id }) },
  { id: 'perfis', component: ProfilesList },
  { id: 'novoperfil', component: ProfileFormPage, props: ({ pageParams }) => ({ copyFrom: pageParams.copiar }) },
  { id: 'perfil', component: ProfileDetail, props: ({ pageParams }) => ({ profileId: pageParams.id }) },
  { id: 'seguranca', component: ConfigPage },
  { id: 'notificacoes', component: ConfigPage },
  { id: 'geral', component: ConfigPage },
]

export function PanelRouteElement({ route }) {
  const navigate = usePanelNavigate()
  const [searchParams] = useSearchParams()
  const { setTitle } = useOutletContext()
  const pageParams = Object.fromEntries(searchParams)
  const Component = route.component
  const extraProps = route.props?.({ navigate, pageParams }) ?? {}

  return (
    <Component
      page={route.id}
      navigate={navigate}
      pageParams={pageParams}
      setTitle={setTitle}
      {...extraProps}
    />
  )
}
