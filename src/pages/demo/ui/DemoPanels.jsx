import { useState } from 'react'
import {
  AlertTriangle, ArrowLeftRight, ArrowUpRight, Banknote, Boxes, CalendarClock, CalendarX,
  ChartNoAxesCombined, CircleDollarSign, CreditCard, PackageX, Receipt, Settings2, ShieldCheck,
  SlidersHorizontal, Wallet,
} from 'lucide-react'
import { OverviewStat } from '@/pages/dashboard/ui/OverviewControls.jsx'
import { MovementChart } from '@/pages/dashboard/ui/MovementChart.jsx'
import { FluxoDeCaixa } from '@/pages/finance/overview/ui/FinancePage.jsx'
import { MetricCard } from '@/shared/ui/primitives/MetricCard.jsx'
import { fmtBRL } from '@/shared/lib/format.js'
import s from './DemoPage.module.css'

const stockHealth = Math.round(48 / 55 * 100)
const restockRows = [
  ['Espumante Brut 750ml', 'Vinho', '0 un', '6 un', '6 un', ['Zerado', 'bad']],
  ["Jack Daniel’s 1L", 'Destilados', '1.150 ml', '6.000 ml', '4.850 ml', ['Crítico', 'warn']],
  ['Stella Artois 350ml', 'Cerveja', '8 un', '24 un', '16 un', ['Crítico', 'warn']],
]
const expiryRows = [
  ['Vencidos', '3 lotes', ['Atenção', 'bad']],
  ['Vencem em até 7 dias', '4 lotes', ['Até 7 dias', 'warn']],
  ['Vencem em 8 a 30 dias', '6 lotes', ['8 a 30 dias', 'info']],
]
const movements = [
  ['Estoque · Entrada', 'Água tônica 350ml', '+48 un', ['Entrada', 'ok']],
  ['Caixa · Venda', 'Stella Artois 350ml', '−12 un', ['Saída', 'info']],
  ['Estoque · Perda', 'Espumante Brut 750ml', '−2 un', ['Perda', 'bad']],
]
const series = [
  { mes: '2026-09', m: 'Set/26', entradas: 28, saidas: 56 },
  { mes: '2026-10', m: 'Out/26', entradas: 36, saidas: 74 },
  { mes: '2026-11', m: 'Nov/26', entradas: 32, saidas: 69 },
]
const products = [
  { name: 'Espumante Brut 750ml', sku: 'PRD-001', category: 'Vinho', type: 'Padrão', price: 69.90, stock: '0 un', active: true },
  { name: 'Stella Artois 350ml', sku: 'PRD-002', category: 'Cerveja', type: 'Padrão', price: 8.90, stock: '8 un', active: true },
  { name: 'Água tônica 350ml', sku: 'PRD-003', category: 'Sem Álcool', type: 'Padrão', price: 6.50, stock: '48 un', active: true },
  { name: 'Gin tônica', sku: 'DRK-001', category: 'Drinks', type: 'Drink', price: 26.90, stock: 'Na receita', active: true },
  { name: 'Negroni', sku: 'DRK-002', category: 'Drinks', type: 'Drink', price: 32.90, stock: 'Na receita', active: false },
]
const accounts = [
  ['Fornecedor de bebidas', 'Mercadoria', 3500, ['Vencida', 'bad']],
  ['Aluguel da adega', 'Operacional', 2900, ['Vence em até 7 dias', 'warn']],
  ['Reposição de insumos', 'Mercadoria', 1450, ['A pagar', 'info']],
]
const payments = [['Dinheiro', 280], ['Pix', 325.70], ['Cartão de crédito', 200]]
const received = payments.reduce((total, [, value]) => total + value, 0)
const revenue = 41750
const goodsCost = 16700
const expenses = 12370
const cashFlow = [
  { mes: '2026-06', receitas: 25800, despesas: 20700 },
  { mes: '2026-07', receitas: 31150, despesas: 23400 },
  { mes: '2026-08', receitas: 29500, despesas: 25120 },
  { mes: '2026-09', receitas: 37000, despesas: 28270 },
  { mes: '2026-10', receitas: 39800, despesas: 30090 },
  { mes: '2026-11', receitas: revenue, despesas: goodsCost + expenses },
]

function Segments({ label, options, value, onChange }) {
  return <div className={s.segments} role="group" aria-label={label}>
    {options.map(option => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>)}
  </div>
}

function Table({ title, headers, rows }) {
  return <div className={s.tableScroll} role="region" aria-label={title} tabIndex={0}>
    <table className={s.table}>
      <thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
      <tbody>{rows.length ? rows.map(([name, ...values]) => (
        <tr key={name}><th scope="row">{name}</th>{values.map((value, index) => (
          <td key={headers[index + 1]}>{Array.isArray(value) ? <span className={s.badge} data-tone={value[1]}>{value[0]}</span> : value}</td>
        ))}</tr>
      )) : <tr><td colSpan={headers.length}>Nenhum produto encontrado.</td></tr>}</tbody>
    </table>
  </div>
}

function DemoCard({ title, Icon, children }) {
  return <section className={s.card}><h3><Icon size={17} aria-hidden="true" />{title}</h3>{children}</section>
}

function Amounts({ rows }) {
  return <dl className={s.amounts}>{rows.map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd>{fmtBRL(value)}</dd></div>
  )}</dl>
}

function StockOverview() {
  return <>
    <h3 className={s.sectionTitle}>Estoque do estabelecimento</h3>
    <div className={'stats ' + s.metrics}>
      <OverviewStat icon={AlertTriangle} label="Estoque crítico" value="5" accent="warn" description="Produtos com saldo abaixo do mínimo." />
      <OverviewStat icon={PackageX} label="Produtos zerados" value="2" accent="bad" description="Produtos ativos sem saldo disponível." />
      <OverviewStat icon={ShieldCheck} label="Saúde do estoque" value={stockHealth + '%'} accent="ok" progress={stockHealth} description="48 de 55 produtos com mínimo definido têm saldo suficiente." />
      <OverviewStat icon={CalendarX} label="Lotes vencidos" value="3" accent="bad" description="Lotes com saldo e validade passada." />
    </div>
    <div className={s.cardGrid}>
      <DemoCard title="Prioridades de reposição" Icon={AlertTriangle}>
        <p>Os 3 itens mais críticos entre 7 produtos abaixo do mínimo.</p>
        <ul className={s.priorities}>
          {restockRows.map(([name, category, balance, minimum, missing, [status, tone]]) => <li key={name}>
            <div><strong>{name}</strong><span className={s.badge} data-tone={tone}>{status}</span></div>
            <small>{category}</small>
            <dl>{[['Saldo atual', balance], ['Mínimo', minimum], ['Falta para o mínimo', missing]].map(([label, value]) =>
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            )}</dl>
          </li>)}
        </ul>
      </DemoCard>
      <DemoCard title="Validade dos lotes" Icon={CalendarClock}>
        <Table title="Validade dos lotes" headers={['Período', 'Quantidade', 'Situação']} rows={expiryRows} />
      </DemoCard>
    </div>
    <DemoCard title="Movimentação de estoque · 3 meses" Icon={ChartNoAxesCombined}><MovementChart serie={series} /></DemoCard>
    <DemoCard title="Últimas movimentações" Icon={ArrowLeftRight}>
      <Table title="Últimas movimentações" headers={['Origem', 'Produto', 'Quantidade', 'Tipo']} rows={movements} />
    </DemoCard>
  </>
}

function CashOverview() {
  return <>
    <h3 className={s.sectionTitle}>Caixa Eventos <span className={s.badge} data-tone="ok">Aberto</span></h3>
    <div className={'stats ' + s.metrics}>
      <OverviewStat icon={CreditCard} label="Recebido no turno" value={fmtBRL(received)} accent="ok" description="Pagamentos aprovados neste turno." />
      <OverviewStat icon={Receipt} label="Pedidos com pagamento" value="12" accent="info" description="Pedidos com pelo menos um pagamento aprovado." />
      <OverviewStat icon={Wallet} label="Dinheiro esperado" value={fmtBRL(350)} accent="info" description="Saldo previsto na gaveta." />
      <OverviewStat icon={CircleDollarSign} label="Média recebida por pedido" value={fmtBRL(received / 12)} accent="info" description="Total aprovado dividido pelos pedidos com pagamento." />
    </div>
    <div className={s.cardGrid}>
      <DemoCard title="Formas de pagamento" Icon={CreditCard}><Amounts rows={payments} /></DemoCard>
      <DemoCard title="Composição da gaveta" Icon={Banknote}>
        <Amounts rows={ [['Fundo de troco', 120], ['Recebido em dinheiro', 280], ['Sangrias', -50], ['Dinheiro esperado', 350]] } />
      </DemoCard>
    </div>
  </>
}

export function DashboardPreview() {
  const [active, setActive] = useState('Estoque')
  return <>
    <Segments label="Módulos da visão geral" options={['Estoque', 'Caixa']} value={active} onChange={setActive} />
    {active === 'Estoque' ? <StockOverview /> : <CashOverview />}
  </>
}

const normalize = text => text.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()

export function ProductsPreview() {
  const [type, setType] = useState('Todos')
  const [status, setStatus] = useState('Todos')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const rows = products.filter(product => (type === 'Todos' || product.type === (type === 'Drinks' ? 'Drink' : type))
    && (status === 'Todos' || product.active === (status === 'Ativos'))
    && normalize(product.name + ' ' + product.sku).includes(normalize(name))
    && normalize(product.category).includes(normalize(category)))

  return <>
    <DemoCard title="Filtro de produtos" Icon={SlidersHorizontal}>
      <div className={s.filterGrid}>
        <div><span>Tipo</span><Segments label="Tipo" options={['Todos', 'Padrão', 'Drinks']} value={type} onChange={setType} /></div>
        <div><span>Status</span><Segments label="Status" options={['Todos', 'Ativos', 'Inativos']} value={status} onChange={setStatus} /></div>
        <label>Buscar nome<input type="search" placeholder="Digite o nome ou código do produto" value={name} onChange={event => setName(event.target.value)} /></label>
        <label>Buscar categoria<input type="search" placeholder="Digite o nome da categoria" value={category} onChange={event => setCategory(event.target.value)} /></label>
      </div>
    </DemoCard>
    <DemoCard title="Lista de produtos" Icon={Boxes}>
      <Table title="Lista de produtos" headers={['Produto', 'Categoria', 'Tipo', 'Saldo', 'Preço de venda', 'Status']}
        rows={rows.map(product => [product.name, product.category, product.type, product.stock, fmtBRL(product.price), product.active ? ['Ativo', 'ok'] : ['Inativo', 'bad']])} />
    </DemoCard>
  </>
}

export function RestockPreview() {
  return <>
    <div className={s.metrics}>
      <MetricCard label="Produtos zerados" value="2" Icon={PackageX} tone="bad" description="Produtos sem saldo em estoque." />
      <MetricCard label="Estoque crítico" value="5" Icon={AlertTriangle} tone="warn" description="Produtos com saldo abaixo do mínimo." />
      <MetricCard label="Sem mínimo definido" value="9" Icon={Settings2} tone="warn" description="Produtos sem referência para reposição." />
      <MetricCard label="Saúde do estoque" value={stockHealth + '%'} Icon={ShieldCheck} tone="ok" statusLabel="Bom" description="48 de 55 produtos têm saldo suficiente." />
    </div>
    <DemoCard title="Produtos para reposição" Icon={Boxes}>
      <Table title="Produtos para reposição" headers={['Produto', 'Categoria', 'Saldo atual', 'Mínimo', 'Falta para o mínimo', 'Situação']} rows={restockRows} />
    </DemoCard>
  </>
}

export function FinancePreview() {
  const [active, setActive] = useState('Saldos e contas a pagar')
  const payable = accounts.reduce((total, [, , value]) => total + value, 0)
  return <>
    <Segments label="Seções do Financeiro" options={['Saldos e contas a pagar', 'Resultado e vendas']} value={active} onChange={setActive} />
    {active === 'Saldos e contas a pagar' ? <>
      <h3 className={s.sectionTitle}>Saldos e compromissos</h3>
      <div className={s.balanceGrid}>
        <MetricCard label="Saldo financeiro acumulado" value={fmtBRL(18420.70)} Icon={Wallet} tone="ok" statusLabel="Bom" description="Equivale a 2,35× as contas a pagar em 30 dias." />
        <MetricCard label="A pagar em 30 dias" value={fmtBRL(payable)} Icon={ArrowUpRight} tone="bad" statusLabel="Vencida" description="1 conta vencida e 1 conta vence em até 7 dias." />
      </div>
      <div className={s.card}><FluxoDeCaixa fluxo={cashFlow} /></div>
      <DemoCard title="Contas a pagar" Icon={CalendarClock}>
        <Table title="Contas a pagar" headers={['Descrição', 'Centro de custo', 'Valor', 'Situação']}
          rows={accounts.map(([name, center, value, status]) => [name, center, fmtBRL(value), status])} />
      </DemoCard>
    </> : <>
      <h3 className={s.sectionTitle}>Resultado do período · Novembro de 2026</h3>
      <div className={s.metrics}>
        <MetricCard label="Receita líquida" value={fmtBRL(revenue)} Icon={CreditCard} tone="info" description="Vendas líquidas no período." />
        <MetricCard label="Lucro líquido" value={fmtBRL(revenue - goodsCost - expenses)} Icon={Wallet} tone="ok" statusLabel="Bom" description="30,37% da receita líquida." />
        <MetricCard label="Lucro bruto" value={fmtBRL(revenue - goodsCost)} Icon={ChartNoAxesCombined} tone="ok" statusLabel="Bom" description="60% da receita líquida." />
        <MetricCard label="Custo das mercadorias vendidas" value={fmtBRL(goodsCost)} Icon={Boxes} tone="warn" description="40% da receita líquida." />
      </div>
      <DemoCard title="Composição do resultado" Icon={Receipt}>
        <Amounts rows={ [['Receita líquida', revenue], ['Custo das mercadorias vendidas', -goodsCost], ['Despesas operacionais', -expenses], ['Lucro líquido', revenue - goodsCost - expenses]] } />
      </DemoCard>
    </>}
  </>
}
