import { useId, useRef, useState } from 'react'
import { Save, Store } from 'lucide-react'
import { api } from '@/shared/api/api.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { LoadingBlock, Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import styles from './SettingsPage.module.css'

const fields = [
  { key: 'nome', label: 'Nome da adega', placeholder: 'Ex.: Adega da Vila', maxLength: 150, required: true, autoComplete: 'organization' },
  { key: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00', maxLength: 18, required: true },
  { key: 'emailContato', label: 'E-mail de contato', placeholder: 'contato@exemplo.com.br', type: 'email', maxLength: 255, autoComplete: 'email' },
  { key: 'telefone', label: 'Telefone', placeholder: '(11) 4000-0000', type: 'tel', maxLength: 20, autoComplete: 'tel' },
  { key: 'endereco', label: 'Endereço', placeholder: 'Ex.: Rua das Flores, 123', maxLength: 150, autoComplete: 'street-address', wide: true },
]

function EstablishmentForm({ data, canEdit }) {
  const id = useId()
  const toast = useToast()
  const submitting = useRef(false)
  const [saved, setSaved] = useState(data)
  const [draft, setDraft] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const changes = Object.fromEntries(
    Object.entries(draft).filter(([key, value]) => value !== (saved[key] ?? '')),
  )
  const changed = Object.keys(changes).length > 0

  async function submit(event) {
    event.preventDefault()
    if (!canEdit || !changed || submitting.current) return

    submitting.current = true
    setBusy(true)
    setError(null)
    try {
      const updated = await api.estabelecimento.atualizar(changes)
      if (!updated) throw new Error('O servidor não confirmou as alterações.')
      setSaved(updated)
      setDraft({})
      toast('Dados da adega atualizados.', { type: 'success' })
    } catch (err) {
      setError(err)
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={busy}>
      {error && <Notice title="Não foi possível salvar os dados da adega" focus>{error.message}</Notice>}
      <fieldset className={styles.establishmentFields} disabled={busy}>
        {fields.map(({ key, label, placeholder, wide, required, ...inputProps }) => {
          const fieldError = error?.fieldErrors?.[key]
          const errorId = `${id}-${key}-error`
          return (
            <label key={key} className={wide ? styles.wideField : undefined}>
              <span>{label}</span>
              <input
                {...inputProps}
                name={key}
                value={draft[key] ?? saved[key] ?? ''}
                readOnly={!canEdit}
                required={canEdit && required}
                placeholder={canEdit ? placeholder : 'Não informado'}
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? errorId : undefined}
                onChange={event => {
                  const value = event.target.value
                  setDraft(current => ({ ...current, [key]: value }))
                  setError(null)
                }}
              />
              {fieldError && <small className={styles.fieldError} id={errorId}>{fieldError}</small>}
            </label>
          )
        })}
      </fieldset>
      <footer className={styles.generalActions}>
        {canEdit ? (
          <div>
            {changed && <button type="button" disabled={busy} onClick={() => { setDraft({}); setError(null) }}>Descartar alterações</button>}
            <button type="submit" className="gold" disabled={busy || !changed}>
              <Save size={16} aria-hidden="true" />{busy ? 'Salvando…' : 'Salvar dados da adega'}
            </button>
          </div>
        ) : <span>Somente o perfil Gerente pode editar estes dados.</span>}
      </footer>
    </form>
  )
}

export function EstablishmentDetails({ canEdit }) {
  const id = useId()
  const query = useQueryResource(api.estabelecimento.obter, [])
  return (
    <article className="card" aria-labelledby={id}>
      <h3 id={id}><Store size={19} aria-hidden="true" />Dados da adega</h3>
      {query.loading && <LoadingBlock label="Carregando dados da adega…" lines={3} />}
      {query.error && <Notice title="Não foi possível carregar os dados da adega" onRetry={query.reload}>{query.error.message}</Notice>}
      {!query.loading && !query.error && query.data && <EstablishmentForm data={query.data} canEdit={canEdit} />}
    </article>
  )
}
