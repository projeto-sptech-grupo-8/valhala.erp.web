import { useState } from 'react'
import { ArrowLeft, ArrowRight, Boxes, ChartNoAxesCombined, LayoutDashboard, Package, Wine } from 'lucide-react'
import Brand from '@/shared/ui/brand/Brand.jsx'
import s from '@/pages/demo/ui/DemoPage.module.css'

const views = [
  { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'produtos', label: 'Produtos e drinks', icon: Package },
  { id: 'estoque', label: 'Estoque', icon: Boxes },
  { id: 'financeiro', label: 'Financeiro', icon: ChartNoAxesCombined },
]

const samples = {
  dashboard: {
    title: 'Visão geral',
    description: 'Indicadores para acompanhar a operação da adega.',
    metrics: [['Vendas no mês', 'R$ 41.750'], ['Produtos ativos', '1.248'], ['Itens para repor', '12']],
    rows: [['Movimentações hoje', '32 registros', 'Atualizado agora'], ['Produtos em atenção', '8 itens', 'Estoque baixo'], ['Validades próximas', '4 lotes', 'Próximos 30 dias']],
  },
  produtos: {
    title: 'Produtos e drinks',
    description: 'Consulte preços, categorias e saldo dos itens.',
    metrics: [['Itens cadastrados', '1.248'], ['Categorias', '18'], ['Drinks', '36']],
    rows: [['Gin London Dry 750ml', 'R$ 119,90', 'Em estoque'], ['Vodka Premium 1L', 'R$ 89,90', 'Estoque baixo'], ['Água tônica 350ml', 'R$ 6,50', 'Em estoque']],
  },
  estoque: {
    title: 'Controle de estoque',
    description: 'Visualize entradas, saídas, lotes e sugestões de reposição.',
    metrics: [['Entradas hoje', '18'], ['Saídas hoje', '14'], ['Abaixo do mínimo', '12']],
    rows: [['Cerveja Pilsen 350ml', '−12 unidades', 'Saída'], ['Whisky 12 anos 1L', '+6 unidades', 'Entrada'], ['Gin London Dry 750ml', '−2 unidades', 'Venda']],
  },
  financeiro: {
    title: 'Resumo financeiro',
    description: 'Acompanhe faturamento, custos e resultado em um só lugar.',
    metrics: [['Faturamento', 'R$ 41.750'], ['Despesas', 'R$ 18.340'], ['Resultado', 'R$ 12.680']],
    rows: [['Vendas de balcão', 'R$ 28.420', 'Receita'], ['Pedidos e mesas', 'R$ 13.330', 'Receita'], ['Custos operacionais', 'R$ 18.340', 'Despesa']],
  },
}

function PreviewScreen({ view }) {
  const sample = samples[view]
  return (
    <div className={s.screen}>
      <aside className={s.screenSidebar} aria-hidden="true">
        <div className={s.sideMark}><Wine size={18} /></div>
        {views.map(({ id, icon: Icon }) => <span key={id} className={id === view ? s.sideActive : ''}><Icon size={16} /></span>)}
        <i />
      </aside>
      <div className={s.screenContent}>
        <div className={s.screenTop}><span>VALHALLA <b>·</b> PAINEL</span><span className={s.profile}>Administrador</span></div>
        <div className={s.screenHeading}><div><h2>{sample.title}</h2><p>{sample.description}</p></div><span className={s.dateLabel}>Este mês⌄</span></div>
        <div className={s.metrics}>
          {sample.metrics.map(([label, value]) => <article key={label}><small>{label}</small><strong>{value}</strong><i /></article>)}
        </div>
        <div className={s.tableCard}>
          <div className={s.tableTitle}><b>{view === 'financeiro' ? 'Resumo do período' : 'Atividade recente'}</b><span>Ver detalhes&nbsp; →</span></div>
          {sample.rows.map(([name, value, status]) => <div className={s.tableRow} key={name}><span>{name}</span><b>{value}</b><small>{status}</small></div>)}
        </div>
      </div>
    </div>
  )
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
