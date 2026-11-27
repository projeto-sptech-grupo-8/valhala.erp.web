import { useState } from 'react'
import { ArrowLeft, ArrowRight, Boxes, ChartNoAxesCombined, LayoutDashboard, Package, Wine } from 'lucide-react'
import Brand from '@/shared/ui/brand/Brand.jsx'
import { DashboardPreview, FinancePreview, ProductsPreview, RestockPreview } from './DemoPanels.jsx'
import s from './DemoPage.module.css'

const views = [
  { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard, description: 'Estoque do estabelecimento e recebimentos do turno.', Preview: DashboardPreview },
  { id: 'produtos', label: 'Produtos e drinks', icon: Package, description: 'Bebidas e drinks vendidos pela adega.', Preview: ProductsPreview },
  { id: 'estoque', label: 'Reposição', icon: Boxes, description: 'Produtos que precisam ser reabastecidos.', Preview: RestockPreview },
  { id: 'financeiro', label: 'Financeiro', icon: ChartNoAxesCombined, description: 'Fluxo de caixa, resultado e contas a pagar.', Preview: FinancePreview },
]

function PreviewScreen({ view }) {
  const { label, description, icon: ScreenIcon, Preview } = views.find(item => item.id === view)
  return <div className={s.screen}>
    <aside className={s.screenSidebar} aria-hidden="true">
      <div className={s.sideMark}><Wine size={18} /></div>
      {views.map(({ id, icon: Icon }) => <span key={id} className={id === view ? s.sideActive : ''}><Icon size={16} /></span>)}
    </aside>
    <div className={s.screenContent}>
      <div className={s.screenTop}><span>VALHALLA</span><span className={s.profile}>Gerente</span></div>
      <div className={s.screenHeading}>
        <h2><ScreenIcon size={23} aria-hidden="true" />{label}</h2>
        <p>{description}</p>
      </div>
      <Preview />
    </div>
  </div>
}

export default function Demo({ go }) {
  const [active, setActive] = useState('dashboard')

  return (
    <main className={s.root}>
      <header className={s.header}>
        <Brand />
        <button className={s.back} onClick={() => go('landing')}><ArrowLeft size={15} /> Voltar ao site</button>
      </header>
      <section className={s.intro}>
        <span className={s.eyebrow}>PRÉVIA DO SISTEMA</span>
        <h1>Conheça as telas da Valhalla.</h1>
        <p>Explore uma prévia dos principais módulos e veja como as informações da sua adega se organizam no sistema.</p>
      </section>
      <section className={s.showcase} aria-label="Prévia das telas do sistema">
        <div className={s.tabs} role="tablist" aria-label="Módulos da demonstração">
          {views.map(({ id, label, icon: Icon }) => (
            <button key={id} id={`demo-tab-${id}`} role="tab" aria-selected={active === id} aria-controls="demo-panel"
              className={active === id ? s.tabActive : ''} onClick={() => setActive(id)}>
              <Icon size={16} aria-hidden="true" />{label}
            </button>
          ))}
        </div>
        <div id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${active}`}>
          <PreviewScreen view={active} />
        </div>
        <p className={s.note}>Prévia ilustrativa. Os valores e registros exibidos são fictícios.</p>
      </section>
      <section className={s.nextStep}>
        <div><h2>Quer conhecer o sistema completo?</h2><p>Entre na sua conta para acessar o painel da sua operação.</p></div>
        <button onClick={() => go('login')}>Acessar minha conta <ArrowRight size={16} /></button>
      </section>
    </main>
  )
}
