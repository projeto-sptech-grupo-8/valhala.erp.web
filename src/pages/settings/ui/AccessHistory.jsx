import { useId } from 'react'
import { History } from 'lucide-react'
import { api } from '@/shared/api/api.js'
import { fmtDateTime } from '@/shared/lib/format.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { LoadingBlock, Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import styles from './SettingsPage.module.css'

const eventTypes = {
  LOGIN_SUCESSO: { label: 'Login realizado', tone: styles.ok },
  SENHA_INCORRETA: { label: 'Tentativa com senha incorreta', tone: styles.bad },
  SENHA_ALTERADA: { label: 'Senha alterada', tone: styles.warn },
}

export function AccessHistory() {
  const id = useId()
  const query = useQueryResource(api.usuarios.meusAcessos, [])
  const events = !query.loading && !query.error ? query.data : null

  return (
    <article className={`card ${styles.loginLog}`} aria-labelledby={id}>
      <h3 id={id}><History size={19} aria-hidden="true" />Últimos acessos</h3>
      {query.loading && <LoadingBlock label="Carregando histórico de acessos…" lines={3} />}
      {query.error && <Notice title="Não foi possível carregar os últimos acessos" onRetry={query.reload}>{query.error.message}</Notice>}
      {events?.length === 0 && <p className={styles.hint}>Sua conta ainda não tem eventos de acesso registrados.</p>}
      {events?.length > 0 && (
        <ul className={styles.accessList} aria-label="Eventos recentes da sua conta">
          {events.map(({ id, tipoEvento, dispositivo, ocorridoEm }) => {
            const type = eventTypes[tipoEvento] ?? { label: 'Evento da conta', tone: styles.off }
            return (
              <li key={id}>
                <div className={styles.accessEvent}>
                  <strong className={`${styles.chip} ${type.tone}`}>{type.label}</strong>
                  <span>{dispositivo || 'Dispositivo não identificado'}</span>
                </div>
                {ocorridoEm && <time dateTime={ocorridoEm}>{fmtDateTime(ocorridoEm)}</time>}
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}
