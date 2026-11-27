import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useRef, useState } from 'react'
import { Tag, ListChecks, CheckCircle, AlertTriangle } from 'lucide-react'
import { api } from '@/shared/api/api.js'
import { useResource } from '@/shared/lib/hooks/useResource.js'
import { useStore } from '@/entities/store'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { Modal } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { FuncionalidadesPicker } from '@/features/access-management/permissions/ui/PermissionsEditor.jsx'
import { agruparPorModulo } from '@/shared/config/funcionalidades.js'
import { isManagerProfile, validarNomePerfil } from '@/entities/access'
import s from '@/shared/styles/panel.module.css'
import a from '@/entities/access/ui/access.module.css'
import layout from './ProfileForm.module.css'

const cashSupervision = new Set([
  'CAIXA_CONFIGURAR',
  'CAIXA_ESTORNAR',
  'CAIXA_AUTORIZAR_DESCONTO',
  'CAIXA_RESOLVER_DIVERGENCIA',
])

function groupProfilePermissions(functionalities) {
  const supervision = functionalities.filter(item => cashSupervision.has(item.codigo))
  const groups = agruparPorModulo(functionalities.filter(item => !cashSupervision.has(item.codigo)))
  return supervision.length
    ? [...groups, { id: 'SUPERVISAO_CAIXA', nome: 'Supervisão do caixa', itens: supervision }]
    : groups
}

/* ─── Novo perfil ─── */
export function ProfileForm({ navigate, copyFrom }) {
  const toast = useToast()
  const { can } = useStore()
  const perfis = useResource(() => api.perfis.listar(), [])
  const funcs = useResource(() => api.funcionalidades.listar(), [])

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [codigos, setCodigos] = useState(null)
  const [base, setBase] = useState(copyFrom || '')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const [leave, setLeave] = useState(false)
  const nomeRef = useRef(null)

  // pré-preenche ao duplicar um perfil (uma vez, quando os perfis chegam)
  if (codigos === null && perfis.data) {
    const src = perfis.data.find(p => p.id === copyFrom)
    setCodigos(src?.codigos.filter(can) ?? [])
    if (src) { setNome(`${src.nome} (cópia)`); setDescricao(src.descricao) }
  }

  if (perfis.error || funcs.error) {
    return <ErrorBlock error={perfis.error || funcs.error} onRetry={() => { perfis.reload(); funcs.reload() }} onBack={() => navigate('perfis')} backLabel="Voltar para perfis" />
  }
  if (!perfis.data || !funcs.data || codigos === null) return <LoadingBlock lines={7} label="Carregando" />

  const dirty = nome.trim() || descricao.trim() || codigos.length

  function applyBase(id) {
    setBase(id)
    const src = perfis.data.find(p => p.id === id)
    setCodigos(src?.codigos.filter(can) ?? [])
  }

  async function submit(e) {
    e.preventDefault()
    if (busy || uncertain) return
    const err = isManagerProfile(nome) ? 'Gerente é um nome reservado.' : validarNomePerfil(nome, perfis.data)
    setErrors(err ? { nome: err } : {})
    if (err) { nomeRef.current?.focus(); return }
    setSaveError('')
    setBusy(true)
    try {
      const p = await api.perfis.criar({ nome: nome.trim(), descricao: descricao.trim(), codigos })
      toast(`Perfil ${p.nome} criado com ${p.codigos.length} funcionalidade(s).`, { title: 'Perfil criado' })
      navigate('perfis', { detalhe: p.id })
    } catch (ex) {
      setErrors(ex.fieldErrors || {})
      if (ex.fieldErrors?.nome) nomeRef.current?.focus()
      setSaveError(ex.message)
      if (ex.status === 0) setUncertain(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={layout.editor} onSubmit={submit} noValidate aria-busy={busy || undefined}>
      {uncertain && <Notice tone="warning" title="Cadastro sem confirmação">A conexão caiu antes da confirmação. Consulte a lista antes de tentar cadastrar novamente. <button type="button" onClick={() => navigate('perfis')}>Consultar perfis</button></Notice>}
      {saveError && <Notice title="Não foi possível criar o perfil" focus>{saveError}</Notice>}
      <fieldset disabled={busy || uncertain} className={layout.sections}>
      <section className={`card form`} aria-labelledby="pf-ident">
        <h3 id="pf-ident"><Tag size={19} aria-hidden="true" />Identificação</h3>
        <div className={layout.identificationFields}>
          <label className={errors.nome ? s.fieldError : undefined} htmlFor="pf-nome">
            <span>Nome do perfil <i className={s.req} aria-hidden="true">*</i></span>
            <input id="pf-nome" ref={nomeRef} value={nome} maxLength={100} autoFocus placeholder="Ex.: Caixa noturno"
              onChange={e => { setNome(e.target.value); if (errors.nome) setErrors({}) }}
              aria-invalid={!!errors.nome} aria-describedby="pf-nome-hint" />
            <small id="pf-nome-hint" className={s.hint}>Único no estabelecimento · {nome.trim().length}/100</small>
            {errors.nome && <small className={s.errMsg} role="alert">{errors.nome}</small>}
          </label>
          <label htmlFor="pf-base">
            <span>Começar a partir de</span>
            <select id="pf-base" value={base} onChange={e => applyBase(e.target.value)}>
              <option value="">Perfil em branco</option>
              {perfis.data.map(p => <option key={p.id} value={p.id}>Copiar de {p.nome} ({p.codigos.length})</option>)}
            </select>
            <small className={s.hint}>Copia as funcionalidades que você pode conceder.</small>
          </label>
        </div>
        <label htmlFor="pf-desc">
          <span>Descrição</span>
          <textarea id="pf-desc" rows={2} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Para quem é este perfil e o que ele permite?" />
        </label>
      </section>

      <section className={`card form`} aria-labelledby="pf-func">
        <h3 id="pf-func"><ListChecks size={19} aria-hidden="true" />Funcionalidades</h3>
        <p className={s.sectionDesc}>Marque o que os usuários com este perfil poderão fazer.</p>
        <FuncionalidadesPicker className={layout.functionPicker} groupBy={groupProfilePermissions} funcionalidades={funcs.data.filter(f => can(f.codigo))} value={codigos} onChange={setCodigos} idPrefix="new" />
        {codigos.length === 0 && (
          <p className={a.warnBox}><AlertTriangle size={14} aria-hidden="true" /> Sem funcionalidades, o perfil terá acesso ao início e às configurações da conta.</p>
        )}
      </section>

      </fieldset>
      <footer className={layout.footer}>
        <button type="button" onClick={() => (dirty ? setLeave(true) : navigate('perfis'))} disabled={busy}>Cancelar</button>
        <button type="submit" className="gold" disabled={busy || uncertain}>{busy ? 'Criando…' : 'Criar perfil'} {!busy && <CheckCircle size={15} aria-hidden="true" />}</button>
      </footer>

      {leave && (
        <Modal title="Descartar perfil?" subtitle="As informações preenchidas serão perdidas." width={420} onClose={() => setLeave(false)}
          footer={<>
            <button type="button" onClick={() => setLeave(false)} data-autofocus>Continuar editando</button>
            <button type="button" className={s.dangerBtn} onClick={() => navigate('perfis')}>Descartar</button>
          </>}
        />
      )}
    </form>
  )
}
