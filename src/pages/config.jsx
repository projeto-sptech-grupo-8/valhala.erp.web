import { useState } from 'react'
import { useToast, PENDING_BACKEND } from '../components/useToast.js'
import { ThemeSwitch } from './dash/components/ThemeSwitch.jsx'
import { useStore } from './dash/useStore.js'
import styles from './config.module.css'

/* Botão de ação que depende do backend: dá retorno em vez de não fazer nada */
function Pending({ title, className, children }) {
  const toast = useToast()
  return (
    <button className={className} onClick={() => toast(PENDING_BACKEND, { type: 'info', title })}>
      {children}
    </button>
  )
}

const sessions = [
  ['Windows · Chrome', 'São Paulo, Brasil', '10.0.0.24', 'Agora', true],
  ['iPhone 15 · Safari', 'São Paulo, Brasil', '10.0.0.31', 'Há 2 horas', false],
  ['MacBook · Firefox', 'Campinas, Brasil', '10.0.1.9', 'Há 3 dias', false],
]

const notifGroups = [
  ['Estoque', [
    ['Estoque crítico', 'Alertas quando um produto atinge o mínimo.', true],
    ['Entradas recebidas', 'Confirmação de recebimento de mercadoria.', true],
    ['Inventário concluído', 'Resumo ao finalizar uma contagem.', false],
  ]],
  ['Vendas & Financeiro', [
    ['Venda no caixa', 'Notificar cada venda concluída.', false],
    ['Contas a vencer', 'Aviso de títulos a pagar/receber.', true],
    ['Faturamento diário', 'Resumo do fechamento do dia.', true],
  ]],
  ['Segurança', [
    ['Login em novo dispositivo', 'Aviso de acesso em aparelho desconhecido.', true],
    ['Alteração de senha', 'Confirmação de troca de credenciais.', true],
  ]],
]

function Toggle({ on, set }) {
  return (
    <button
      className={`${styles.toggle}${on ? ' ' + styles.toggleOn : ''}`}
      onClick={() => set(!on)}
      aria-pressed={on}
    >
      <i />
    </button>
  )
}

function Security() {
  const [novaSenha, setNovaSenha] = useState('')
  const senhaChecks = (v) => [v.length >= 8, /[A-Z]/.test(v), /[0-9]/.test(v)]
  const senhaForce = senhaChecks(novaSenha).filter(Boolean).length

  return (
    <>
      <div className={styles.configBar}>
        <Pending title="Relatório de acessos">Baixar relatório de acessos</Pending>
      </div>
      <div className={styles.secGrid}>
        <article className="card form">
          <h3>Alterar senha</h3>
          <label>Senha atual<input type="password" placeholder="••••••••" /></label>
          <label>Nova senha
            <input
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
            />
          </label>
          <div className={styles.meter}>
            <i style={{ width: `${(senhaForce / 3) * 100}%`, background: senhaForce === 3 ? 'var(--green)' : senhaForce === 2 ? 'var(--gold)' : 'var(--red)' }} />
          </div>
          <small className={styles.hint}>
            {senhaForce === 0 && novaSenha ? 'Fraca — adicione números e maiúsculas.' : senhaForce === 1 ? 'Média — adicione mais variações.' : senhaForce >= 2 ? 'Forte — senha adequada.' : 'Use letras, números e maiúsculas.'}
          </small>
          <label>Confirmar nova senha<input type="password" placeholder="Repita a nova senha" /></label>
          <footer><Pending className="gold" title="Atualizar senha">Atualizar senha</Pending></footer>
        </article>
        <article className="card form">
          <h3>Sessões ativas</h3>
          {sessions.map((s, i) => (
            <div className={styles.session} key={i}>
              <i className={s[3] === 'Agora' ? styles.sessionDotOn : styles.sessionDot} />
              <span>
                <b>{s[0]}</b>
                <small>{s[1]} · IP {s[2]} · {s[3]}</small>
              </span>
              {s[4] ? <em className={`${styles.chip} ${styles.ok}`}>Atual</em> : <Pending className={styles.mini} title="Encerrar sessão">Encerrar</Pending>}
            </div>
          ))}
          <footer><Pending title="Encerrar sessões">Encerrar todas as outras sessões</Pending></footer>
        </article>
      </div>
      <article className={`card ${styles.loginLog}`}>
        <h3>Últimos acessos</h3>
        {[
          ['Hoje · 14:32', 'Login bem-sucedido', '10.0.0.24 · Windows · Chrome', 'ok'],
          ['Hoje · 09:15', 'Login bem-sucedido', '10.0.0.31 · iPhone · Safari', 'ok'],
          ['Ontem · 22:47', 'Tentativa bloqueada', '45.12.88.101 · desconhecido', 'bad'],
          ['Ontem · 18:03', 'Senha alterada', '10.0.0.24 · Windows · Chrome', 'warn'],
        ].map((l, i) => (
          <div key={i}>
            <span><b>{l[0]}</b><small>{l[2]}</small></span>
            <em className={`${styles.chip} ${styles[l[3]]}`}>{l[1]}</em>
          </div>
        ))}
      </article>
    </>
  )
}

function NotifRow({ name, desc, on }) {
  const [s, setS] = useState(on)
  return (
    <div className={styles.switchRow}>
      <span><b>{name}</b><small>{desc}</small></span>
      <Toggle on={s} set={setS} />
    </div>
  )
}

function Notifications() {
  return (
    <>
      <div className={styles.configBar}>
        <Pending className="gold" title="Restaurar padrão">Restaurar padrão</Pending>
      </div>
      <div className={styles.notif}>
        {notifGroups.map(([group, items]) => (
          <article className="card" key={group}>
            <h3>{group}</h3>
            {items.map(([name, desc, on]) => (
              <NotifRow key={name} name={name} desc={desc} on={on} />
            ))}
          </article>
        ))}
      </div>
    </>
  )
}

/* Regras do caixa (antifraude): limite de desconto sem autorização, PIN do gerente, cupom automático */
function CaixaRules() {
  const { config, setConfig, role } = useStore()
  const toast = useToast()
  const [limite, setLimite] = useState(String(config.limiteDescontoPct))
  const [pin, setPin] = useState(config.pinGerente)
  const [verPin, setVerPin] = useState(false)
  const [erro, setErro] = useState('')
  const podeEditar = ['Gerente', 'Administrador'].includes(role)
  const mudou = Number(limite) !== config.limiteDescontoPct || pin !== config.pinGerente

  function salvar(e) {
    e.preventDefault()
    const n = Number(String(limite).replace(',', '.'))
    if (!(n >= 0 && n <= 100)) return setErro('O limite deve ficar entre 0% e 100%.')
    if (!/^\d{4,8}$/.test(pin)) return setErro('O PIN deve ter de 4 a 8 dígitos.')
    setErro('')
    setConfig({ limiteDescontoPct: n, pinGerente: pin })
    toast(`Descontos acima de ${n}% passam a exigir autorização.`, { title: 'Regras do caixa salvas' })
  }

  return (
    <article className="card form">
      <h3>Regras do caixa</h3>
      <form onSubmit={salvar}>
        <div className="two">
          <label>Desconto sem autorização (até %)
            <input inputMode="decimal" value={limite} onChange={e => setLimite(e.target.value)} disabled={!podeEditar} />
          </label>
          <label>PIN do gerente
            <input type={verPin ? 'text' : 'password'} inputMode="numeric" autoComplete="off" value={pin} maxLength={8}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))} disabled={!podeEditar} />
          </label>
        </div>
        <small className={styles.hint}>
          Acima do limite e em cancelamentos, o caixa pede o PIN de um gerente. No mock o PIN fica neste navegador;
          com o backend, a aprovação vira um endpoint validado no servidor.
        </small>
        {erro && <small className={styles.hint} style={{ color: 'var(--red)' }} role="alert">{erro}</small>}
        <div className={styles.switchRow}>
          <span><b>Imprimir cupom ao finalizar a venda</b><small>Cupom não fiscal na impressora térmica de 80 mm.</small></span>
          <Toggle on={config.imprimirCupom} set={(v) => setConfig({ imprimirCupom: v })} />
        </div>
        {podeEditar && (
          <footer>
            <button type="button" onClick={() => setVerPin(v => !v)}>{verPin ? 'Ocultar PIN' : 'Mostrar PIN'}</button>
            <button type="submit" className="gold" disabled={!mudou}>Salvar regras</button>
          </footer>
        )}
      </form>
    </article>
  )
}

function General() {
  const [compact, setCompact] = useState(false)
  return (
    <>
      <div className={styles.configBar}>
        <Pending className="gold" title="Salvar configurações">Salvar alterações</Pending>
      </div>
      <div className={styles.secGrid}>
        <article className="card form">
          <h3>Dados da adega</h3>
          <div className={styles.logoUpload}>
            <img src="/valhalla-logo.png" alt="Logo Valhalla" />
            <div>
              <Pending title="Alterar logo">Alterar logo</Pending>
              <small>PNG ou SVG · até 2 MB</small>
            </div>
          </div>
          <div className="two">
            <label>Nome da adega<input defaultValue="Adega Meraki" /></label>
            <label>CNPJ<input defaultValue="00.000.000/0001-00" /></label>
            <label>E-mail de contato<input defaultValue="contato@meraki.com.br" /></label>
            <label>Telefone<input defaultValue="(11) 4000-0000" /></label>
          </div>
          <label>Endereço<input defaultValue="R. das Bebidas, 420 · São Paulo" /></label>
        </article>
        <div>
          <article className="card form">
            <h3>Preferências regionais</h3>
            <div className="two">
              <label>Idioma<select><option>Português (Brasil)</option><option>English</option><option>Español</option></select></label>
              <label>Fuso horário<select><option>GMT-3 · Brasília</option><option>GMT-5 · Nova York</option></select></label>
              <label>Moeda<select><option>R$ Real (BRL)</option><option>US$ Dólar (USD)</option></select></label>
              <label>Formato de data<select><option>DD/MM/AAAA</option><option>MM/DD/AAAA</option></select></label>
            </div>
          </article>
          <CaixaRules />
          <article className="card form">
            <h3>Aparência</h3>
            <div className={styles.switchRow}>
              <span><b>Tema</b><small>Escolha entre o tema escuro (padrão) e o claro. Vale para este navegador.</small></span>
              <ThemeSwitch label="Tema do painel" />
            </div>
            <div className={styles.switchRow}>
              <span><b>Modo compacto</b><small>Reduz o espaçamento das telas.</small></span>
              <Toggle on={compact} set={setCompact} />
            </div>
          </article>
        </div>
      </div>
    </>
  )
}

export function ConfigPage({ page }) {
  let content
  if (page === 'seguranca') content = <Security />
  else if (page === 'notificacoes') content = <Notifications />
  else content = <General />
  return <div className={styles.configWrap}>{content}</div>
}
