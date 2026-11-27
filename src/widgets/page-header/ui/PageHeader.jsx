import { AuditColorLegend } from './AuditColorLegend.jsx'
import { CatalogListHelp } from './CatalogListHelp.jsx'
import { FinanceMetricsHelp } from './FinanceMetricsHelp.jsx'
import { MovementListHelp } from './MovementListHelp.jsx'
import ui from './PageHeader.module.css'
import { ArrowLeft, Package, Wine, CircleAlert, UserPlus, KeyRound, CalendarClock } from 'lucide-react'
import { useId } from 'react'
import { pages } from '@/entities/access'
import s from '@/shared/styles/panel.module.css'

/* Cabeçalho com retorno para a tela de origem, título e descrição. */
export function PageHeader({ page, navigate, extra, onBack, help, onActionsMount, action, reportTab }) {
  const helpId = useId()
  const meta = pages[page]
  if (!meta) return null
  const TitleIcon = page === 'dashboard' ? meta.icon : page === 'sessoescaixa' ? CalendarClock : ['caixa', 'pedidos', 'auditoria', 'ajustescaixa', 'notafiscal', 'financeiro', 'relatorios'].includes(page) ? meta.icon : page === 'novoperfil' ? KeyRound : page === 'novousuario' ? UserPlus : page === 'novo' && extra === 'Novo produto padrão' ? Package : page === 'novo' && extra === 'Novo drink' ? Wine : ['Catálogo', 'Estoque', 'Controle de acesso', 'Sistema'].includes(meta.section) && !meta.parent ? meta.icon : null
  const helpText = help || (page === 'reposicao' ? 'Os indicadores resumem os dados do servidor. A lista abaixo mostra os alertas prioritários retornados e pode ser limitada; não corresponde a uma lista completa de compras.' : null)
  const title = extra || meta.title
  const backTarget = meta.parent || (meta.section === 'Catálogo' && page !== 'produtos' ? 'produtos' : meta.section === 'Estoque' && page !== 'movimentacoes' ? 'movimentacoes' : 'dashboard')
  const headerLayout = page === 'dashboard' ? ui.dashboardHeader : (page === 'relatorios' || action) ? ui.inlineActionsHeader : ''
  const hasFinanceHelp = page === 'financeiro' || page === 'relatorios'

  return (
    <header className={[s.pageHeader, headerLayout].filter(Boolean).join(' ')}>
      {!['dashboard', 'produtos', 'categorias', 'reposicao', 'validades', 'movimentacoes', 'usuarios', 'perfis', 'geral', 'caixa', 'pedidos', 'sessoescaixa', 'ajustescaixa', 'auditoria', 'notafiscal', 'financeiro', 'relatorios'].includes(page) && <button type="button" className={ui.back} title={'Voltar para ' + (pages[backTarget]?.title || 'o início')} onClick={() => { if (!onBack?.()) navigate(backTarget) }}><ArrowLeft size={17} aria-hidden="true" />Voltar</button>}
      <h1 className={TitleIcon ? ui.titleWithIcon + (hasFinanceHelp ? ' ' + ui.titleWithMetricsHelp : '') : undefined}>
        {TitleIcon && <TitleIcon size={26} strokeWidth={1.8} aria-hidden="true" />}
        {title}
        {page === 'produtos' && <CatalogListHelp />}
        {page === 'movimentacoes' && <MovementListHelp />}
        {page === 'auditoria' && <AuditColorLegend />}
        {hasFinanceHelp && <FinanceMetricsHelp reports={page === 'relatorios'} reportTab={reportTab} />}
        {helpText && <span className={ui.help}><button type="button" className={ui.helpButton} aria-label={page === 'validades' ? 'Sobre os indicadores de validade e lotes' : 'Sobre os indicadores de reposição'} aria-describedby={helpId}><CircleAlert size={19} aria-hidden="true" /></button><span id={helpId} role="tooltip" className={ui.helpText}>{helpText}</span></span>}
      </h1>
      <p>{page === 'novo' && extra === 'Novo produto padrão' ? 'Cadastre a identificação, os preços e o estoque de um produto vendido por unidade ou de forma fracionada.' : page === 'novo' && extra === 'Novo drink' ? 'Defina o preço e os ingredientes da receita para controlar o consumo de cada drink.' : meta.desc}</p>
      {page === 'dashboard' && <div ref={onActionsMount} id="dashboard-header-actions" className={ui.dashboardActions} />}
      {page === 'relatorios' && <div ref={onActionsMount} className={ui.inlineActions} />}
      {action && <div className={ui.inlineActions}>{action}</div>}
    </header>
  )
}
