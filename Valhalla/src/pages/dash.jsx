import { useState } from 'react'
import Brand from '../components/Brand.jsx'
import { Head, Stat } from '../components/ui.jsx'
import { ConfigPage } from './config.jsx'
import dashStyles from './dash.module.css'

const nav = {
  ESTOQUE: [
    ['dashboard', 'Dashboard'],
    ['produtos', 'Produtos'],
    ['categorias', 'Categorias'],
    ['fornecedores', 'Fornecedores'],
    ['movimentacoes', 'Movimentações'],
    ['estocagem', 'Tipos de Estocagem'],
    ['inventario', 'Inventário'],
  ],
  VENDAS: [
    ['caixa', 'Caixa'],
    ['pedido', 'Novo Pedido'],
    ['orcamento', 'Orçamentos'],
    ['notafiscal', 'Notas Fiscais'],
  ],
  GESTÃO: [
    ['financeiro', 'Financeiro'],
    ['relatorios', 'Relatórios'],
  ],
  CONFIGURAÇÕES: [
    ['usuarios', 'Usuários'],
    ['seguranca', 'Segurança & 2FA'],
    ['notificacoes', 'Notificações'],
    ['geral', 'Configurações Gerais'],
  ],
}

const products = [
  ['PRD-001', 'Tinta Esmalte Sintético', 'Químicos', '5 un', 'R$ 89,90', 'Crítico'],
  ['PRD-014', 'Alicate Universal 8”', 'Ferramentas', '12 un', 'R$ 42,50', 'Baixo'],
  ['PRD-028', 'Parafuso Sextavado M8', 'Fixadores', '300 un', 'R$ 1,25', 'Estável'],
  ['PRD-032', 'Luva de Proteção EPI', 'EPI', '8 un', 'R$ 19,90', 'Crítico'],
  ['PRD-047', 'Gin Amazônico Premium', 'Bebidas', '3 un', 'R$ 119,00', 'Baixo'],
]

const cats = [
  ['Fixadores', '312 itens', 72],
  ['Ferramentas', '198 itens', 45],
  ['Químicos', '54 itens', 22],
  ['Elétrica', '143 itens', 57],
  ['EPI', '67 itens', 35],
  ['Ferragens Diversas', '474 itens', 92],
]

const stores = [
  ['Prateleira A1–A6', '78% ocupado', 78],
  ['Depósito Central', '74% ocupado', 74],
  ['Armário Químico', '67% ocupado', 67],
  ['Área Externa', '27% ocupado', 27],
  ['Câmara Climatizada', '67% ocupado', 67],
  ['Balcão de Vendas', '91% ocupado', 91],
]

const lists = {
  fornecedores: [
    ['FORNECEDOR', 'CONTATO', 'CATEGORIA', 'PRODUTOS', 'STATUS'],
    [
      ['Fixa Forte', 'Mariana Costa', 'Fixadores', '186', 'Ativo'],
      ['Construtora Nortex', 'Paulo Lima', 'Ferramentas', '94', 'Ativo'],
      ['Química Aurora', 'Beatriz Nunes', 'Químicos', '38', 'Revisão'],
      ['EPI Brasil', 'Rafael Dias', 'EPI', '62', 'Ativo'],
    ],
  ],
  movimentacoes: [
    ['DATA / HORA', 'PRODUTO', 'TIPO', 'QTD.', 'OPERADOR', 'STATUS'],
    [
      ['30/09 · 14:32', 'Tinta Esmalte', 'Entrada', '15', 'Carlos S.', 'Entrada'],
      ['30/09 · 13:10', 'Fita Isolante', 'Saída', '20', 'Maria J.', 'Saída'],
      ['29/09 · 17:22', 'Alicate Universal', 'Saída', '5', 'Roberto A.', 'Saída'],
    ],
  ],
  orcamento: [
    ['Nº', 'CLIENTE', 'EMITIDO', 'VALIDADE', 'VALOR', 'STATUS'],
    [
      ['ORC-1042', 'Construtora Norte', '30/09', '15 dias', 'R$ 3.420', 'Pendente'],
      ['ORC-1041', 'Ana Carolina', '29/09', '10 dias', 'R$ 890', 'Aprovado'],
      ['ORC-1039', 'Madeireira Sol', '25/09', '7 dias', 'R$ 1.250', 'Expirado'],
    ],
  ],
  notafiscal: [
    ['Nº NF-E', 'CLIENTE', 'EMISSÃO', 'CHAVE', 'VALOR', 'STATUS'],
    [
      ['000.128', 'Construtora Norte', '30/09', '3526…9831', 'R$ 3.420', 'Emitida'],
      ['000.127', 'Ana Carolina', '29/09', '3526…7410', 'R$ 890', 'Emitida'],
      ['000.126', 'Madeireira Sol', '25/09', '3526…3109', 'R$ 1.250', 'Cancelada'],
    ],
  ],
}

function Sidebar({ page, setPage, exit }) {
  return (
    <aside>
      <Brand />
      <nav>
        {Object.entries(nav).map(([group, items]) => (
          <section key={group}>
            <p>{group}</p>
            {items.map(([id, name]) => (
              <button
                key={id}
                className={page === id ? dashStyles.on : ''}
                onClick={() => setPage(id)}
              >
                ◇ <span>{name}</span>
              </button>
            ))}
          </section>
        ))}
      </nav>
      <footer>
        <i>V</i>
        <span>
          <b>Admin Valhalla</b>
          <small>Painel de controle</small>
        </span>
        <button onClick={exit}>↪</button>
      </footer>
    </aside>
  )
}

function Table({ heads, rows }) {
  return (
    <div className="table">
      <div>{heads.map((x) => <b key={x}>{x}</b>)}</div>
      {rows.map((r, i) => (
        <div key={i}>
          {r.map((x, j) => (
            <span key={j} className={j === r.length - 1 ? dashStyles.status : ''}>{x}</span>
          ))}
        </div>
      ))}
    </div>
  )
}

function Bars() {
  return (
    <div className={dashStyles.bars}>
      {[62, 78, 91, 70, 55, 96].map((h, i) => (
        <i key={i}>
          <b style={{ height: h + '%' }} />
          <em style={{ height: h * 0.62 + '%' }} />
          <small>{['Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'][i]}</small>
        </i>
      ))}
    </div>
  )
}

function Dashboard() {
  return (
    <>
      <Head page="dashboard">
        <button>Imprimir relatório</button>
      </Head>
      <div className="stats">
        <Stat a="FATURAMENTO DO DIA" b="R$ 3.240" c="↑ 18% vs. ontem" />
        <Stat a="TOTAL DE PRODUTOS" b="1.248" c="Ativos no catálogo" />
        <Stat a="PRODUTOS EM BAIXA" b="14" c="Abaixo do estoque mínimo" />
        <Stat a="VENDAS NO CAIXA (MÊS)" b="312" c="+9% vs. mês anterior" />
      </div>
      <div className={dashStyles.dash}>
        <article className="card">
          <h3>Movimentação de Estoque · 6 Meses</h3>
          <Bars />
        </article>
        <article className={'card ' + dashStyles.feed}>
          <h3>Últimas movimentações</h3>
          {products.slice(0, 4).map((p, i) => (
            <div key={i}>
              <i>{i % 2 ? '↓' : '↑'}</i>
              <span>
                <b>{p[1]}</b>
                <small>30/09 · Carlos S.</small>
              </span>
              <strong>{i % 2 ? '−5' : '+15'}</strong>
            </div>
          ))}
        </article>
        <article className={'card ' + dashStyles.alerts}>
          <h3>Alertas de estoque crítico</h3>
          {products.slice(0, 4).map((p, i) => (
            <div key={i}>
              <span>
                <b>{p[1]}</b>
                <small>{p[2]} · Estoque mínimo</small>
              </span>
              <strong>{p[3]}</strong>
            </div>
          ))}
        </article>
        <article className={'card ' + dashStyles.pay}>
          <h3>Formas de pagamento · Hoje</h3>
          {[['Pix', 48], ['Cartão', 36], ['Dinheiro', 16]].map((x) => (
            <div key={x[0]}>
              <span>{x[0]} <b>{x[1]}%</b></span>
              <i><em style={{ width: x[1] + '%' }} /></i>
            </div>
          ))}
        </article>
      </div>
    </>
  )
}

function Cards({ page }) {
  const data = page === 'categorias' ? cats : stores
  return (
    <>
      <Head page={page}>
        <button className="gold">＋ Novo</button>
      </Head>
      <div className={dashStyles.cards}>
        {data.map((x) => (
          <article className="card" key={x[0]}>
            <i>◆</i>
            <h3>{x[0]}</h3>
            <p>{x[1]}</p>
            <div><span style={{ width: x[2] + '%' }} /></div>
          </article>
        ))}
      </div>
    </>
  )
}

function Products({ setPage }) {
  return (
    <>
      <Head page="produtos">
        <button>Exportar</button>
        <button className="gold" onClick={() => setPage('novo')}>＋ Adicionar produto</button>
      </Head>
      <div className={dashStyles.tools}>
        <input placeholder="Buscar produto por nome ou código..." />
        <select><option>Categoria: Todas</option></select>
        <select><option>Status: Todos</option></select>
      </div>
      <Table
        heads={['CÓDIGO', 'NOME', 'CATEGORIA', 'QTD.', 'PREÇO UNIT.', 'STATUS']}
        rows={products}
      />
    </>
  )
}

function New({ setPage }) {
  const [t, setT] = useState(0)
  const tabs = ['Identificação', 'Unidade e preço', 'Fracionamento', 'Fiscal']
  return (
    <>
      <Head page="novo">
        <button onClick={() => setPage('produtos')}>Cancelar</button>
        <button className="gold" onClick={() => setPage('produtos')}>Salvar produto</button>
      </Head>
      <div className={dashStyles.tabs}>
        {tabs.map((x, i) => (
          <button key={x} className={t === i ? dashStyles.on : ''} onClick={() => setT(i)}>
            {i + 1}. {x}
          </button>
        ))}
      </div>
      <article className="card form">
        <h3>{tabs[t]} do produto</h3>
        <div className="two">
          <label>Nome do produto<input placeholder="Ex.: Tinta Esmalte Sintético" /></label>
          <label>Código / SKU<input placeholder="PRD-001" /></label>
          <label>Categoria<select><option>Selecione</option></select></label>
          <label>Fornecedor principal<input placeholder="Nome do fornecedor" /></label>
        </div>
        <label>Descrição<textarea placeholder="Detalhes, aplicação e observações..." /></label>
        <footer>
          <button disabled={!t} onClick={() => setT(t - 1)}>← Voltar</button>
          <button className="gold" onClick={() => (t < 3 ? setT(t + 1) : setPage('produtos'))}>
            {t < 3 ? 'Avançar →' : 'Concluir'}
          </button>
        </footer>
      </article>
    </>
  )
}

function Listing({ page }) {
  const x = lists[page]
  return (
    <>
      <Head page={page}>
        <button className="gold">{page === 'movimentacoes' ? 'Exportar' : '＋ Novo'}</button>
      </Head>
      {page === 'movimentacoes' && (
        <div className={dashStyles.tools}>
          <button>Todos</button>
          <button>Entradas</button>
          <input placeholder="Buscar produto..." />
        </div>
      )}
      <Table heads={x[0]} rows={x[1]} />
    </>
  )
}

function Finance() {
  return (
    <>
      <Head page="financeiro">
        <button>Nova conta a pagar</button>
        <button className="gold">Nova conta a receber</button>
      </Head>
      <div className="stats">
        <Stat a="SALDO EM CAIXA" b="R$ 18.420" c="Atualizado hoje" />
        <Stat a="A RECEBER (30 DIAS)" b="R$ 12.860" c="7 títulos em aberto" />
        <Stat a="A PAGAR (30 DIAS)" b="R$ 6.310" c="3 vencem esta semana" />
        <Stat a="FATURAMENTO (MÊS)" b="R$ 41.750" c="+12% vs. mês anterior" />
      </div>
      <div className={dashStyles.dash + ' ' + dashStyles.finance}>
        <article className="card">
          <h3>Fluxo de Caixa · 6 Meses</h3>
          <Bars />
        </article>
        <article className="card">
          <h3>Próximos vencimentos</h3>
          {['Fixa Forte · R$ 2.140', 'Construtora Nortex · R$ 4.320', 'Aluguel do salão · R$ 3.200', 'Reforma Predial · R$ 8.740'].map((x) => (
            <p key={x}>○ {x}</p>
          ))}
        </article>
      </div>
    </>
  )
}

function Cash() {
  const [c, setC] = useState([])
  const items = products.slice(0, 4)
  return (
    <>
      <Head page="caixa">
        <button>Vendas do dia</button>
      </Head>
      <div className={dashStyles.pos}>
        <article className="card">
          <input placeholder="Buscar produto ou ler código de barras..." />
          <div className={dashStyles.products}>
            {items.map((x) => (
              <button key={x[0]} onClick={() => setC([...c, x])}>
                <i>▣</i>
                <b>{x[1]}</b>
                <span>{x[4]}</span>
              </button>
            ))}
          </div>
        </article>
        <article className={'card ' + dashStyles.cart}>
          <h3>Venda atual <small>{c.length} itens</small></h3>
          {c.map((x, i) => (
            <div key={i}>
              {x[1]}
              <button onClick={() => setC(c.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <footer>
            <b>Total: R$ {(c.length * 42.5).toFixed(2).replace('.', ',')}</b>
            <button className="gold">Finalizar venda</button>
          </footer>
        </article>
      </div>
    </>
  )
}

function Order() {
  return (
    <>
      <Head page="pedido">
        <button>Salvar rascunho</button>
        <button className="gold">Confirmar pedido</button>
      </Head>
      <article className="card form">
        <div className="two">
          <label>Cliente<input /></label>
          <label>Data de entrega<input type="date" /></label>
          <label>Forma de entrega<select><option>Retirada</option></select></label>
          <label>Vendedor<input /></label>
        </div>
      </article>
      <Table
        heads={['PRODUTO', 'QTD.', 'PREÇO UNIT.', 'SUBTOTAL', 'AÇÃO']}
        rows={products.slice(0, 3).map((x) => [x[1], '1', x[4], x[4], 'Editar'])}
      />
    </>
  )
}

function Special({ page }) {
  if (page === 'relatorios')
    return (
      <>
        <Head page={page}>
          <button className="gold">Exportar tudo em Excel</button>
        </Head>
        <div className={dashStyles.cards}>
          {['Estoque', 'Vendas', 'Financeiro', 'Movimentações', 'Inventário', 'Fiscal'].map((x) => (
            <article className={'card ' + dashStyles.report} key={x}>
              <i>▥</i>
              <h3>Relatório de {x}</h3>
              <p>Dados consolidados, filtros e indicadores do período.</p>
              <button>Exportar Excel</button>
            </article>
          ))}
        </div>
      </>
    )
  if (page === 'inventario')
    return (
      <>
        <Head page={page}>
          <button>Salvar progresso</button>
          <button className="gold">Concluir inventário</button>
        </Head>
        <article className={'card ' + dashStyles.progress}>
          <span>
            <small>PROGRESSO DA CONTAGEM</small>
            <b>182 de 240 itens</b>
          </span>
          <i><em /></i>
          <b>76%</b>
        </article>
        <Table
          heads={['PRODUTO', 'LOCAL', 'QTD. SISTEMA', 'QTD. CONTADA', 'DIFERENÇA', 'STATUS']}
          rows={products.map((p, i) => [
            p[1],
            'Depósito Central',
            p[3],
            i % 2 ? p[3] : '—',
            i % 2 ? '0' : '—',
            i % 2 ? 'Conferido' : 'Pendente',
          ])}
        />
      </>
    )
  if (page === 'caixa') return <Cash />
  return <Order />
}

const configPages = ['usuarios', 'novousuario', 'seguranca', 'notificacoes', 'geral']

function Page({ page, setPage }) {
  if (page === 'dashboard') return <Dashboard />
  if (page === 'produtos') return <Products setPage={setPage} />
  if (page === 'novo') return <New setPage={setPage} />
  if (['categorias', 'estocagem'].includes(page)) return <Cards page={page} />
  if (Object.keys(lists).includes(page)) return <Listing page={page} />
  if (page === 'financeiro') return <Finance />
  if (configPages.includes(page)) return <ConfigPage page={page} setPage={setPage} />
  return <Special page={page} />
}

export default function Dash({ exit }) {
  const [page, setPage] = useState('dashboard')
  return (
    <div className={dashStyles.app}>
      <Sidebar page={page} setPage={setPage} exit={exit} />
      <main className={dashStyles.content}>
        <Page page={page} setPage={setPage} />
      </main>
    </div>
  )
}
