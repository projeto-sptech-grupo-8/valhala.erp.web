import { ChangePasswordForm } from '@/features/account/change-password/ui/ChangePasswordForm.jsx'
import { Settings, Shield, Palette } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { canAccess } from '@/entities/access'
import { ThemeSwitch } from '@/features/preferences'
import { useStore } from '@/entities/store'
import { AccessHistory } from './AccessHistory.jsx'
import { EstablishmentDetails } from './EstablishmentDetails.jsx'
import styles from '@/pages/settings/ui/SettingsPage.module.css'

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

function General({ userId, canEdit }) {
  return (
    <div className={styles.secGrid + ' ' + styles.generalGrid}>
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
  if (pageParams?.aba === 'notificacoes') return <Navigate replace to="/geral" />
  const tabs = [
    ...(['Gerente', 'Administrador'].includes(role) ? [{ id: 'geral', title: 'Geral', Icon: Settings, Content: General }] : []),
    ...(canAccess(role, 'seguranca', can) ? [{ id: 'seguranca', title: 'Segurança', Icon: Shield, Content: Security }] : []),
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
