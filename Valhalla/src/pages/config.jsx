import { useState } from 'react'
import { Head, Stat } from '../components/ui.jsx'
import styles from './config.module.css'

const users = [
  ['Carlos Souza', 'carlos@valhalla.com', 'Administrador', 'Ativado', 'Ativo'],
  ['Maria Jesus', 'maria@valhalla.com', 'Gerente', 'Ativado', 'Ativo'],
  ['Roberto Alves', 'roberto@valhalla.com', 'Caixa', 'Pendente', 'Ativo'],
  ['Ana Paula', 'ana@valhalla.com', 'Estoquista', 'Desativado', 'Inativo'],
  ['Beatriz Nunes', 'beatriz@valhalla.com', 'Financeiro', 'Ativado', 'Ativo'],
]

const roles = ['Administrador', 'Gerente', 'Caixa', 'Estoquista', 'Financeiro', 'Somente leitura']

const permGroups = [
  ['Estoque', ['Ver estoque', 'Editar produtos', 'Movimentar estoque', 'Inventário']],
  ['Vendas', ['Abrir caixa', 'Registrar pedidos', 'Emitir notas', 'Orçamentos']],
  ['Gestão', ['Financeiro', 'Relatórios']],
  ['Sistema', ['Gerenciar usuários', 'Configurações', 'Autenticação (2FA)']],
]

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

function QR() {
  const size = 21
  const cells = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inTopLeft = x < 7 && y < 7
      const inTopRight = x >= size - 7 && y < 7
      const inBotLeft = x < 7 && y >= size - 7
      const finder = inTopLeft || inTopRight || inBotLeft
      let on = false
      if (finder) {
        const fx = inTopLeft ? x : inTopRight ? x - (size - 7) : x
        const fy = inTopLeft ? y : inTopRight ? y : y - (size - 7)
        const ring = fx === 0 || fx === 6 || fy === 0 || fy === 6
        const core = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4
        on = ring || core
      } else {
        on = (x * 13 + y * 7 + ((x * y) % 5)) % 3 === 0
      }
      if (on) cells.push(`${x},${y}`)
    }
  }
  return (
    <svg className={styles.qr} viewBox="0 0 21 21" aria-hidden="true">
      <rect width="21" height="21" fill="#f4efe4" />
      {cells.map((c) => {
        const [x, y] = c.split(',').map(Number)
        return <rect key={c} x={x} y={y} width="1" height="1" fill="#161412" />
      })}
    </svg>
  )
}

function TwoFactor() {
  const [on, setOn] = useState(true)
  const [step, setStep] = useState(2)
  const [code, setCode] = useState('')
  const [showCodes, setShowCodes] = useState(false)
  const codes = ['K7T9-M2PX-QW4R', 'N3ZB-8HYK-FL5D', 'V6MC-2RTG-P8JS', 'X9PL-4QWZ-N7H3']
  return (
    <article className={`card ${styles.twofa}`}>
      <div className={styles.twofaHead}>
        <i className={styles.glyph}>2FA</i>
        <div>
          <h3>Autenticação de dois fatores</h3>
          <p>Adicione uma camada extra de proteção com um código gerado no celular.</p>
        </div>
        <Toggle on={on} set={setOn} />
      </div>
      {!on && (
        <p className={styles.twofaOff}>2FA desativado. Qualquer pessoa com sua senha poderá acessar o painel.</p>
      )}
      {on && (
        <div className={styles.twofaBody}>
          <div className={styles.qrCol}>
            <QR />
            <span>Escaneie com o app autenticador<br />(Google Authenticator, Authy…)</span>
          </div>
          <div className={styles.stepsCol}>
            <ol>
              <li className={step >= 1 ? styles.done : ''}>Instale um app autenticador no celular.</li>
              <li className={step >= 2 ? styles.done : ''}>Escaneie o QR code ao lado.</li>
              <li className={step >= 3 ? styles.done : ''}>Digite o código de 6 dígitos para confirmar.</li>
            </ol>
            <label>Chave manual (backup)<input readOnly value="VALH 4XQ9 2KZR 7TW8" /></label>
            <label>Código de verificação
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                className={styles.code}
              />
            </label>
            <button className="gold" disabled={code.length !== 6} onClick={() => setStep(3)}>
              {step >= 3 ? '✓ 2FA ativado' : 'Verificar e ativar'}
            </button>
          </div>
          <div className={styles.recovery}>
            <h4>⌁ Códigos de recuperação</h4>
            <p>Guarde-os em local seguro. Cada código pode ser usado uma única vez.</p>
            <div className={showCodes ? styles.codes : `${styles.codes} ${styles.codesHidden}`}>
              {codes.map((c) => <b key={c}>{c}</b>)}
            </div>
            <button onClick={() => setShowCodes(!showCodes)}>
              {showCodes ? 'Ocultar códigos' : 'Exibir códigos'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function UsersTable() {
  return (
    <div className="table">
      <div>
        {['USUÁRIO', 'E-MAIL', 'FUNÇÃO', '2FA', 'STATUS', 'AÇÃO'].map((x) => <b key={x}>{x}</b>)}
      </div>
      {users.map((u, i) => (
        <div key={i}>
          <span className={styles.who}><i>{u[0][0]}</i><b>{u[0]}</b></span>
          <span>{u[1]}</span>
          <span>{u[2]}</span>
          <span><em className={`${styles.chip} ${u[3] === 'Ativado' ? styles.ok : u[3] === 'Pendente' ? styles.warn : styles.off}`}>{u[3]}</em></span>
          <span><em className={`${styles.chip} ${u[4] === 'Ativo' ? styles.ok : styles.off}`}>{u[4]}</em></span>
          <span><button className={styles.mini}>⋯</button></span>
        </div>
      ))}
    </div>
  )
}

function Users({ setPage }) {
  return (
    <>
      <Head page="usuarios">
        <button>Convidar por e-mail</button>
        <button className="gold" onClick={() => setPage('novousuario')}>＋ Novo usuário</button>
      </Head>
      <div className={`stats ${styles.statsSmall}`}>
        <Stat a="USUÁRIOS ATIVOS" b="4" c="de 5 contas criadas" />
        <Stat a="COM 2FA ATIVADO" b="3" c="60% das contas protegidas" />
        <Stat a="LOGINS HOJE" b="17" c="1 acesso em novo dispositivo" />
        <Stat a="CONVITES PENDENTES" b="1" c="Roberto · caixa" />
      </div>
      <TwoFactor />
      <UsersTable />
    </>
  )
}

function NewUser({ setPage }) {
  const [twoFA, setTwoFA] = useState(false)
  return (
    <>
      <Head page="novousuario">
        <button onClick={() => setPage('usuarios')}>Cancelar</button>
        <button className="gold" onClick={() => setPage('usuarios')}>Salvar usuário</button>
      </Head>
      <article className="card form">
        <h3>Dados da conta</h3>
        <div className="two">
          <label>Nome completo<input placeholder="Ex.: Mariana Costa" /></label>
          <label>E-mail<input type="email" placeholder="nome@valhalla.com" /></label>
          <label>Função<select>{roles.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>Telefone (opcional)<input placeholder="(11) 9 0000-0000" /></label>
        </div>
        <div className={styles.switchRow}>
          <span>
            <b>Exigir autenticação de dois fatores</b>
            <small>O usuário será obrigado a configurar o 2FA no primeiro acesso.</small>
          </span>
          <Toggle on={twoFA} set={setTwoFA} />
        </div>
        <h3 className={styles.mt}>Permissões de acesso</h3>
        <div className={styles.perms}>
          {permGroups.map(([group, items]) => (
            <div key={group}>
              <b>{group}</b>
              {items.map((p) => (
                <label key={p}><input type="checkbox" defaultChecked={group !== 'Sistema'} />{p}</label>
              ))}
            </div>
          ))}
        </div>
        <footer>
          <button onClick={() => setPage('usuarios')}>← Voltar</button>
          <button className="gold" onClick={() => setPage('usuarios')}>Salvar usuário</button>
        </footer>
      </article>
    </>
  )
}

function Security() {
  return (
    <>
      <Head page="seguranca">
        <button>Baixar relatório de acessos</button>
      </Head>
      <TwoFactor />
      <div className={styles.secGrid}>
        <article className="card form">
          <h3>Alterar senha</h3>
          <label>Senha atual<input type="password" placeholder="••••••••" /></label>
          <label>Nova senha<input type="password" placeholder="Mínimo 8 caracteres" /></label>
          <label>Confirmar nova senha<input type="password" placeholder="Repita a nova senha" /></label>
          <div className={styles.meter}><i style={{ width: '55%' }} /></div>
          <small className={styles.hint}>Use letras, números e símbolos. Evite senhas já utilizadas.</small>
          <footer><button className="gold">Atualizar senha</button></footer>
        </article>
        <article className="card form">
          <h3>Sessões ativas</h3>
          {sessions.map((s, i) => (
            <div className={styles.session} key={i}>
              <i>{s[3] === 'Agora' ? '●' : '○'}</i>
              <span>
                <b>{s[0]}</b>
                <small>{s[1]} · IP {s[2]} · {s[3]}</small>
              </span>
              {s[4] ? <em className={`${styles.chip} ${styles.ok}`}>Este dispositivo</em> : <button className={styles.mini}>Encerrar</button>}
            </div>
          ))}
          <footer><button>Encerrar todas as outras sessões</button></footer>
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
      <Head page="notificacoes">
        <button className="gold">Restaurar padrão</button>
      </Head>
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

function General() {
  const [dark, setDark] = useState(true)
  const [compact, setCompact] = useState(false)
  return (
    <>
      <Head page="geral">
        <button className="gold">Salvar alterações</button>
      </Head>
      <div className={styles.secGrid}>
        <article className="card form">
          <h3>Dados do salão</h3>
          <div className={styles.logoUpload}>
            <img src="/valhalla-logo.png" alt="Logo Valhalla" />
            <div>
              <button>Alterar logo</button>
              <small>PNG ou SVG · até 2 MB</small>
            </div>
          </div>
          <div className="two">
            <label>Nome do salão<input defaultValue="Valhalla" /></label>
            <label>CNPJ<input defaultValue="00.000.000/0001-00" /></label>
            <label>E-mail de contato<input defaultValue="contato@valhalla.com" /></label>
            <label>Telefone<input defaultValue="(11) 4000-0000" /></label>
          </div>
          <label>Endereço<input defaultValue="Av. dos Deuses, 900 · Asgard" /></label>
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
          <article className="card form">
            <h3>Aparência</h3>
            <div className={styles.switchRow}>
              <span><b>Tema escuro</b><small>Usar o tema padrão do Valhalla.</small></span>
              <Toggle on={dark} set={setDark} />
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

export function ConfigPage({ page, setPage }) {
  if (page === 'novousuario') return <NewUser setPage={setPage} />
  if (page === 'seguranca') return <Security />
  if (page === 'notificacoes') return <Notifications />
  if (page === 'geral') return <General />
  return <Users setPage={setPage} />
}
