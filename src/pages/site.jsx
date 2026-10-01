import { useState } from 'react'
import {
  BarChart, Bar, AreaChart, Area,
  ResponsiveContainer, Tooltip, XAxis
} from 'recharts'
import { Button } from '../components/ui/button'
import s from './site.module.css'

const weekData = [
  { day: 'Seg', v: 4200 },
  { day: 'Ter', v: 6800 },
  { day: 'Qua', v: 5100 },
  { day: 'Qui', v: 8200 },
  { day: 'Sex', v: 7400 },
  { day: 'Sáb', v: 9600 },
  { day: 'Dom', v: 8100 },
]

const stockData = [
  { d: 'Abr', v: 58 }, { d: 'Mai', v: 76 }, { d: 'Jun', v: 64 },
  { d: 'Jul', v: 88 }, { d: 'Ago', v: 69 }, { d: 'Set', v: 94 }, { d: 'Out', v: 81 },
]

const metrics = [
  { label: 'Faturamento do mês', value: 'R$ 41.750', trend: '↑ 12%', pct: 72, ok: true },
  { label: 'Vendas', value: '312', trend: '+9%', pct: 55, ok: true },
  { label: 'Produtos ativos', value: '1.248', trend: 'estável', pct: 88, ok: false },
]

const features = [
  { icon: '▣', title: 'Estoque inteligente', desc: 'Monitore níveis, locais, entradas, saídas e alertas de reposição em tempo real.' },
  { icon: '◇', title: 'Vendas integradas', desc: 'Caixa, pedidos e orçamentos conectados ao estoque, sem lançamentos duplicados.' },
  { icon: '▤', title: 'Financeiro claro', desc: 'Acompanhe contas, fluxo de caixa, recebimentos e resultados em uma única visão.' },
  { icon: '✓', title: 'Inventário guiado', desc: 'Conte com agilidade, encontre divergências e ajuste o saldo com segurança.' },
  { icon: '≡', title: 'Fiscal organizado', desc: 'Centralize notas fiscais e mantenha o histórico de cada operação acessível.' },
  { icon: '↗', title: 'Relatórios estratégicos', desc: 'Transforme dados da rotina em indicadores para decisões mais inteligentes.' },
]


const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={s.tip}>
      <span>{label}</span>
      <b>R$ {(payload[0].value / 1000).toFixed(1)}k</b>
    </div>
  )
}

export default function Site({ go }) {
  const [open, setOpen] = useState(false)

  const scroll = (id) => {
    setOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className={s.root}>
      {/* ── Nav ── */}
      <header className={s.nav + (open ? ' ' + s.navOpen : '')}>
        <button className={s.logo} onClick={() => scroll('inicio')} aria-label="Ir ao início">
          <img src="/valhalla-logo.png" alt="Valhalla" />
        </button>
        <button
          className={s.toggle + (open ? ' ' + s.toggleOpen : '')}
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
        >
          <span /><span /><span />
        </button>
        <nav>
          <button onClick={() => scroll('solucao')}>A solução</button>
          <button onClick={() => scroll('recursos')}>Recursos</button>
          <button onClick={() => scroll('como-funciona')}>Como funciona</button>
          <button onClick={() => scroll('contato')}>Contato</button>
        </nav>
        <div className={s.navEnd}>
          <button className={s.navLogin} onClick={() => go('login')}>Entrar</button>
          <Button variant="primary" size="sm" onClick={() => go('signup')}>Começar agora</Button>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className={s.hero} id="inicio">
          <div className={s.heroCopy}>
            <h1>
              Suas contas<br />
              no comando.
            </h1>
            <p className={s.heroLead}>
              A Valhalla reúne estoque, vendas, pedidos e financeiro em uma
              experiência simples, precisa e feita para quem precisa decidir rápido.
            </p>
            <div className={s.heroActions}>
              <Button variant="primary" size="lg" onClick={() => go('signup')}>Conhecer a Valhalla</Button>
              <Button onClick={() => scroll('como-funciona')}>Veja como funciona</Button>
            </div>
          </div>

          {/* Painel de dados — sem chips flutuantes, sem perspective */}
          <div className={s.heroPanel}>
            <div className={s.panelHead}>
              <span>Painel geral</span>
              <span className={s.liveTag} />
            </div>
            {metrics.map((m) => (
              <div key={m.label} className={s.metric}>
                <div className={s.metricRow}>
                  <span className={s.metricLabel}>{m.label}</span>
                  <span className={m.ok ? s.trendGreen : s.trendNeutral}>{m.trend}</span>
                </div>
                <span className={s.metricValue}>{m.value}</span>
                <div className={s.bar}><div style={{ width: m.pct + '%' }} /></div>
              </div>
            ))}
            <div className={s.panelChart}>
              <span>Faturamento semanal</span>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={weekData} barSize={14} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fill: '#6b6862', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(201,162,39,.06)' }} />
                  <Bar dataKey="v" fill="#c9a227" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ── Solução ── */}
        <section className={s.solution} id="solucao">
          <div className={s.solutionCopy}>
            <h2>Menos improviso.</h2>
            <p>
              Quando cada informação está em um lugar diferente, a operação perde tempo
              e o gestor perde clareza. A Valhalla conecta toda a rotina da adega para
              que estoque, vendas e financeiro contem a mesma história.
            </p>
            <ul className={s.checkList}>
              <li>Informação centralizada e confiável</li>
              <li>Processos mais rápidos e organizados</li>
              <li>Decisões baseadas em dados reais</li>
            </ul>
          </div>
          <div className={s.solutionBoard}>
            <div className={s.boardHead}>
              <span><i />Visão geral</span>
              <small>Atualizado agora</small>
            </div>
            <div className={s.boardStats}>
              <span><small>Produtos ativos</small><b>1.248</b></span>
              <span><small>Estoque baixo</small><b>14</b></span>
              <span><small>Vendas no mês</small><b>312</b></span>
            </div>
            <div className={s.boardChart}>
              <span>Movimentação de estoque</span>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={stockData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gold-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c9a227" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#c9a227" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" tick={{ fill: '#6b6862', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ stroke: 'rgba(201,162,39,.2)', strokeWidth: 1 }}
                    contentStyle={{ background: '#1d1a17', border: '1px solid rgba(201,162,39,.2)', borderRadius: 8, fontSize: 11, color: '#e8e4dc' }}
                    formatter={(v) => [v + ' un', 'Estoque']}
                  />
                  <Area type="monotone" dataKey="v" stroke="#c9a227" strokeWidth={1.5} fill="url(#gold-fill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ── Recursos — bento grid assimétrico ── */}
        <section className={s.features} id="recursos">
          <div className={s.featureHeader}>
            <h2>O que você precisa.</h2>
          </div>
          <div className={s.bentoGrid}>
            {features.map(({ icon, title, desc }) => (
              <div key={title} className={s.bentoCard}>
                <i>{icon}</i>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Como funciona — 3 colunas sem numeração ── */}
        <section className={s.steps} id="como-funciona">
          <div className={s.stepsHeader}>
            <h2>Simples assim.</h2>
            <p>Sem projetos longos ou ferramentas complicadas. A Valhalla acompanha o ritmo da sua operação desde o primeiro dia.</p>
          </div>
          <div className={s.howGrid}>
            {[
              ['Configure', 'Cadastre produtos, categorias, fornecedores e locais de armazenamento em minutos.'],
              ['Opere', 'Venda, receba, movimente e conte o estoque — tudo sem sair do painel.'],
              ['Decida', 'Visualize indicadores reais e transforme a rotina em melhores resultados.'],
            ].map(([verb, desc]) => (
              <div key={verb} className={s.howStep}>
                <h3>{verb}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <div className={s.stepsCtaWrap}>
            <Button variant="primary" onClick={() => go('signup')}>Criar minha conta</Button>
          </div>
        </section>

        {/* ── Números ── */}
        <section className={s.numbers}>
          <h2 className={s.numbersTitle}>Valhalla em números.</h2>
          <p className={s.numbersSubtitle}>Resultados reais de quem já opera com controle.</p>
          <div className={s.numberGrid}>
            {[
              ['1.248', 'produtos sob controle'],
              ['312', 'vendas processadas no mês'],
              ['76%', 'do inventário concluído'],
              ['99,9%', 'de disponibilidade'],
            ].map(([n, l]) => (
              <div key={l} className={s.numberItem}><b>{n}</b><small>{l}</small></div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className={s.cta} id="contato">
          <h2>Organize hoje.</h2>
          <p>Conheça uma gestão mais simples, integrada e segura para a sua adega.</p>
          <div className={s.ctaActions}>
            <Button variant="primary" size="lg" onClick={() => go('signup')}>Começar gratuitamente</Button>
            <Button onClick={() => go('login')}>Acessar demonstração</Button>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className={s.footer}>
        <div>
          <img src="/valhalla-logo.png" alt="Valhalla" />
          <p>Gestão completa para adegas e negócios que querem crescer com controle.</p>
        </div>
        <nav>
          <b>Produto</b>
          <button onClick={() => scroll('solucao')}>A solução</button>
          <button onClick={() => scroll('recursos')}>Recursos</button>
          <button onClick={() => scroll('como-funciona')}>Como funciona</button>
        </nav>
        <nav>
          <b>Acesso</b>
          <button onClick={() => go('login')}>Entrar</button>
          <button onClick={() => go('signup')}>Criar conta</button>
        </nav>
        <nav>
          <b>Contato</b>
          <span>contato@valhalla.com.br</span>
          <span>São Paulo · Brasil</span>
        </nav>
        <div className={s.footerEnd}>
          <span>© 2026 Valhalla</span>
          <span>Feito para quem lidera.</span>
        </div>
      </footer>
    </div>
  )
}
