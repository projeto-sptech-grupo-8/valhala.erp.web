import { useState, useEffect } from 'react'
import siteStyles from './site.module.css'

export default function Site({ go }) {
  const [open, setOpen] = useState(false)

  const scroll = (id) => {
    setOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const features = [
    ['▣', 'Estoque inteligente', 'Monitore níveis, locais, entradas, saídas e alertas de reposição em tempo real.'],
    ['◇', 'Vendas integradas', 'Caixa, pedidos e orçamentos conectados ao estoque, sem lançamentos duplicados.'],
    ['▤', 'Financeiro claro', 'Acompanhe contas, fluxo de caixa, recebimentos e resultados em uma única visão.'],
    ['✓', 'Inventário guiado', 'Conte com agilidade, encontre divergências e ajuste o saldo com segurança.'],
    ['≡', 'Fiscal organizado', 'Centralize notas fiscais e mantenha o histórico de cada operação acessível.'],
    ['↗', 'Relatórios estratégicos', 'Transforme dados da rotina em indicadores para decisões mais inteligentes.'],
  ]

  return (
    <div className={siteStyles.institutional}>
      <header className={siteStyles.siteNav + (open ? ' ' + siteStyles.open : '')}>
        <button className={siteStyles.siteLogo} onClick={() => scroll('inicio')} aria-label="Ir ao início">
          <img src="/valhalla-logo.png" alt="Valhalla" />
        </button>
        <button
          className={siteStyles.navToggle + (open ? ' ' + siteStyles.open : '')}
          onClick={() => setOpen(!open)}
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>
        <nav aria-label="Navegação institucional">
          <button onClick={() => scroll('solucao')}>A solução</button>
          <button onClick={() => scroll('recursos')}>Recursos</button>
          <button onClick={() => scroll('como-funciona')}>Como funciona</button>
          <button onClick={() => scroll('contato')}>Contato</button>
        </nav>
        <div>
          <button className={siteStyles.navLogin} onClick={() => go('login')}>Entrar</button>
          <button className="gold" onClick={() => go('signup')}>Começar agora</button>
        </div>
      </header>

      <main>
        <section className={siteStyles.heroSite} id="inicio">
          <div className={siteStyles.heroCopy + ' reveal'} data-reveal>
            <p className={siteStyles.siteKicker}><i /> GESTÃO INTELIGENTE PARA O SEU NEGÓCIO</p>
            <h1>Seu salão no comando.<br /><em>Do estoque ao resultado.</em></h1>
            <span>
              A Valhalla reúne estoque, vendas, pedidos e financeiro em uma experiência simples,
              precisa e feita para quem precisa decidir rápido.
            </span>
            <div className={siteStyles.heroActions}>
              <button className="gold" onClick={() => go('signup')}>Conhecer a Valhalla　→</button>
              <button onClick={() => scroll('como-funciona')}>Veja como funciona</button>
            </div>
            <div className={siteStyles.heroProof}>
              <span><b>Controle total</b><small>em um único painel</small></span>
              <span><b>Dados em tempo real</b><small>para decisões seguras</small></span>
            </div>
          </div>
          <div className={siteStyles.heroVisual + ' reveal'} data-reveal aria-label="Visão ilustrativa do painel Valhalla">
            <div className={siteStyles.logoOrbit}>
              <img src="/valhalla-logo.png" alt="Logo Valhalla" />
            </div>
            <div className={siteStyles.miniPanel}>
              <span>
                <small>FATURAMENTO DO MÊS</small>
                <b>R$ 41.750</b>
                <em>↑ 12% este mês</em>
              </span>
              <div>
                {[42, 68, 54, 82, 74, 96].map((h, i) => <i key={i} style={{ height: h + '%' }} />)}
              </div>
            </div>
            <div className={siteStyles.floatChip + ' ' + siteStyles.chipOne}>
              <i>✓</i>
              <span><b>Estoque atualizado</b><small>agora mesmo</small></span>
            </div>
            <div className={siteStyles.floatChip + ' ' + siteStyles.chipTwo}>
              <i>↗</i>
              <span><b>+18% em vendas</b><small>comparado a ontem</small></span>
            </div>
          </div>
        </section>

        <section className={siteStyles.trustStrip}>
          <span>ESTOQUE</span><i /> <span>CAIXA</span><i /> <span>PEDIDOS</span><i /> <span>FINANCEIRO</span><i /> <span>RELATÓRIOS</span>
        </section>

        <section className={siteStyles.aboutSite} id="solucao">
          <div className={siteStyles.sectionCopy + ' reveal'} data-reveal>
            <p className={siteStyles.siteKicker}>A SOLUÇÃO</p>
            <h2>Menos improviso.<br /><em>Mais visão do negócio.</em></h2>
            <p>
              Quando cada informação está em um lugar diferente, a operação perde tempo e o gestor
              perde clareza. A Valhalla conecta toda a rotina do salão para que estoque, vendas e
              financeiro contem a mesma história.
            </p>
            <div className={siteStyles.checkList}>
              <span>✓ Informação centralizada e confiável</span>
              <span>✓ Processos mais rápidos e organizados</span>
              <span>✓ Decisões baseadas em dados reais</span>
            </div>
          </div>
          <div className={siteStyles.aboutBoard}>
            <div className={siteStyles.boardHead}>
              <span><i /> Visão geral</span>
              <small>Atualizado agora</small>
            </div>
            <div className={siteStyles.boardStats}>
              <span><small>PRODUTOS ATIVOS</small><b>1.248</b></span>
              <span><small>ESTOQUE BAIXO</small><b>14</b></span>
              <span><small>VENDAS NO MÊS</small><b>312</b></span>
            </div>
            <div className={siteStyles.boardChart}>
              <span>Movimentação de estoque</span>
              <div>
                {[58, 76, 64, 88, 69, 94, 81].map((h, i) => <i key={i} style={{ height: h + '%' }} />)}
              </div>
            </div>
          </div>
        </section>

        <section className={siteStyles.featuresSite} id="recursos">
          <div className={siteStyles.sectionCenter + ' reveal'} data-reveal>
            <p className={siteStyles.siteKicker}>RECURSOS</p>
            <h2>Tudo o que você precisa.<br /><em>Trabalhando em conjunto.</em></h2>
            <span>Uma operação conectada do primeiro cadastro ao relatório final.</span>
          </div>
          <div className={siteStyles.featureGrid}>
            {features.map(([icon, title, text], i) => (
              <article key={title} data-reveal className={'reveal ' + (i === 0 ? siteStyles.featured : '')}>
                <i>{icon}</i>
                <small>0{i + 1}</small>
                <h3>{title}</h3>
                <p>{text}</p>
                <span>Saiba mais　→</span>
              </article>
            ))}
          </div>
        </section>

        <section className={siteStyles.stepsSite} id="como-funciona">
          <div className={siteStyles.sectionCopy + ' reveal'} data-reveal>
            <p className={siteStyles.siteKicker}>COMO FUNCIONA</p>
            <h2>Comece simples.<br /><em>Evolua com controle.</em></h2>
            <p>
              Sem projetos longos ou ferramentas complicadas. A Valhalla acompanha o ritmo da sua
              operação desde o primeiro dia.
            </p>
            <button className="gold" onClick={() => go('signup')}>Criar minha conta　→</button>
          </div>
          <div className={siteStyles.stepsList + ' reveal'} data-reveal>
            {[
              ['01', 'Configure sua operação', 'Cadastre produtos, categorias, fornecedores e locais de armazenamento.'],
              ['02', 'Registre a rotina', 'Venda, receba, movimente e conte o estoque em poucos cliques.'],
              ['03', 'Acompanhe e decida', 'Visualize indicadores e transforme a rotina em melhores resultados.'],
            ].map(([n, t, d]) => (
              <article key={n}>
                <b>{n}</b>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={siteStyles.numbersSite}>
          <p className={siteStyles.siteKicker}>GESTÃO QUE APARECE NOS RESULTADOS</p>
          <div className="reveal" data-reveal>
            {[
              ['1.248', 'produtos sob controle'],
              ['312', 'vendas processadas no mês'],
              ['76%', 'do inventário concluído'],
              ['99,9%', 'de disponibilidade'],
            ].map(([n, l]) => (
              <span key={l}><b>{n}</b><small>{l}</small></span>
            ))}
          </div>
        </section>

        <section className={siteStyles.ctaSite} id="contato">
          <div className="reveal" data-reveal>
            <img src="/valhalla-logo.png" alt="Valhalla" />
            <p className={siteStyles.siteKicker}>PRONTO PARA ASSUMIR O CONTROLE?</p>
            <h2>Organize hoje.<br /><em>Cresça com inteligência.</em></h2>
            <span>Conheça uma gestão mais simples, integrada e segura para o seu salão.</span>
            <div>
              <button className="gold" onClick={() => go('signup')}>Começar gratuitamente　→</button>
              <button onClick={() => go('login')}>Acessar demonstração</button>
            </div>
          </div>
        </section>
      </main>

      <footer className={siteStyles.siteFooter}>
        <div>
          <img src="/valhalla-logo.png" alt="Valhalla" />
          <p>Gestão completa para negócios que querem crescer com controle.</p>
        </div>
        <nav>
          <b>Produto</b>
          <button onClick={() => scroll('solucao')}>A solução</button>
          <button onClick={() => scroll('recursos')}>Recursos</button>
          <button onClick={() => scroll('como-funciona')}>Como funciona</button>
        </nav>
        <nav>
          <b>Contato</b>
          <span>contato@valhalla.com.br</span>
          <span>São Paulo · Brasil</span>
        </nav>
        <div className={siteStyles.footerEnd}>
          <span>© 2026 Valhalla</span>
          <span>Feito para quem lidera.</span>
        </div>
      </footer>
    </div>
  )
}
