import { ChangePasswordForm } from '@/features/account/change-password/ui/ChangePasswordForm.jsx'
import { useState } from 'react'
import { Settings, Shield, Bell, Palette, Package, CreditCard, RotateCcw } from 'lucide-react'
import { canAccess } from '@/entities/access'
import { ThemeSwitch } from '@/features/preferences'
import { useStore } from '@/entities/store'
import { AccessHistory } from './AccessHistory.jsx'
import { EstablishmentDetails } from './EstablishmentDetails.jsx'
import styles from '@/pages/settings/ui/SettingsPage.module.css'

const notifGroups = [
  ['Estoque', [
    ['Estoque crítico', 'Alertas quando um produto atinge o mínimo.', true],
    ['Entradas recebidas', 'Confirmação de recebimento de mercadoria.', true],
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

function Toggle({ name, on, set }) {
  return (
    <button
      className={`${styles.toggle}${on ? ' ' + styles.toggleOn : ''}`}
      onClick={() => set(!on)}
      type="button"
      role="switch"
      aria-label={name}
      aria-checked={on}
    >
      <i />
    </button>
  )
}

function Security({ active, userId }) {
  return (
    <>
      <div className={styles.secGrid}>
        <ChangePasswordForm />
      </div>
      {active && <AccessHistory key={userId} />}
    </>
  )
}

const notificationDefaults = Object.fromEntries(
  notifGroups.flatMap(([, items]) => items.map(([name, , enabled]) => [name, enabled])),
)

function Notifications() {
  const [preferences, setPreferences] = useState(notificationDefaults)
  const changed = Object.keys(notificationDefaults).some(name => preferences[name] !== notificationDefaults[name])

  return (
    <>
      <p className={styles.notificationIntro}>As opções abaixo permitem visualizar as preferências de aviso. As escolhas são temporárias e o envio de notificações está indisponível.</p>
      <div className={styles.notif}>
        {notifGroups.map(([group, items]) => (
          <article className="card" key={group}>
            <h3>{group === 'Estoque' ? <Package size={19} aria-hidden="true" /> : group === 'Segurança' ? <Shield size={19} aria-hidden="true" /> : <CreditCard size={19} aria-hidden="true" />}{group}</h3>
            {items.map(([name, description]) => (
              <div className={styles.switchRow} key={name}>
                <span><b>{name}</b><small>{description}</small></span>
                <Toggle name={name} on={preferences[name]} set={enabled => setPreferences(current => ({ ...current, [name]: enabled }))} />
              </div>
            ))}
          </article>
        ))}
      </div>
      <footer className={styles.notificationActions}>
        <button type="button" disabled={!changed} onClick={() => setPreferences(notificationDefaults)}>
          <RotateCcw size={16} aria-hidden="true" />Restaurar padrão
        </button>
      </footer>
    </>
  )
}

function General({ userId, canEdit }) {
  return (
    <div className={styles.secGrid}>
      <EstablishmentDetails key={userId} canEdit={canEdit} />
      <article className="card form">
        <h3><Palette size={19} aria-hidden="true" />Aparência</h3>
        <div className={styles.switchRow}>
          <span><b>Tema</b><small>Escolha entre o tema escuro (padrão) e o claro. Vale para este navegador.</small></span>
          <ThemeSwitch label="Tema do painel" />
        </div>
      </article>
    </div>
  )
}

export function ConfigPage({ navigate, pageParams }) {
  const { role, can, user } = useStore()
  const tabs = [
    ...(['Gerente', 'Administrador'].includes(role) ? [{ id: 'geral', title: 'Geral', Icon: Settings, Content: General }] : []),
    ...(canAccess(role, 'seguranca', can) ? [{ id: 'seguranca', title: 'Segurança', Icon: Shield, Content: Security }] : []),
    ...(canAccess(role, 'notificacoes', can) ? [{ id: 'notificacoes', title: 'Notificações', Icon: Bell, Content: Notifications }] : []),
  ]
  const active = tabs.find(tab => tab.id === pageParams?.aba)?.id || tabs[0]?.id
  return <div className={styles.configWrap}>
    <nav className={styles.tabs} aria-label="Seções de configurações">{tabs.map(({ id, title, Icon }) => <a key={id} href={'#/geral?aba=' + id} aria-current={active === id ? 'page' : undefined} onClick={e => { e.preventDefault(); navigate('geral', { aba: id }) }}><Icon size={17} aria-hidden="true" />{title}</a>)}</nav>
    {tabs.map(({ id, title, Content }) => (
      <section key={id} hidden={active !== id} aria-label={title}>
        <Content active={active === id} userId={user?.id} canEdit={role === 'Gerente'} />
      </section>
    ))}
  </div>
}
