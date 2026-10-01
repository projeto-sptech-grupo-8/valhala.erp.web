import { useRef, useState } from 'react'
import { ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react'
import { api } from '../../../lib/api.js'
import { useResource } from '../../../lib/useResource.js'
import { useToast } from '../../../components/useToast.js'
import { Modal } from '../components/Modal.jsx'
import { LoadingBlock, ErrorBlock } from './ui.jsx'
import { FuncionalidadesPicker } from './Permissoes.jsx'
import { validarNomePerfil } from './format.js'
import s from '../dash.module.css'
import a from './acesso.module.css'

/* ─── Novo perfil ─── */
export function ProfileForm({ navigate, copyFrom }) {
  const toast = useToast()
  const perfis = useResource(() => api.perfis.listar(), [])
  const funcs = useResource(() => api.funcionalidades.listar(), [])

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [codigos, setCodigos] = useState(null)
  const [base, setBase] = useState(copyFrom || '')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [leave, setLeave] = useState(false)
  const nomeRef = useRef(null)

  // pré-preenche ao duplicar um perfil (uma vez, quando os perfis chegam)
  if (codigos === null && perfis.data) {
    const src = perfis.data.find(p => p.id === copyFrom)
    setCodigos(src ? [...src.codigos] : [])
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
    setCodigos(src ? [...src.codigos] : [])
  }

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    const err = validarNomePerfil(nome, perfis.data)
    setErrors(err ? { nome: err } : {})
    if (err) { nomeRef.current?.focus(); return }
    setBusy(true)
    try {
      const p = await api.perfis.criar({ nome: nome.trim(), descricao: descricao.trim(), codigos })
      toast(`Perfil ${p.nome} criado com ${p.codigos.length} funcionalidade(s).`, { title: 'Perfil criado' })
      navigate('perfil', { id: p.id })
    } catch (ex) {
      setErrors(ex.fieldErrors || {})
      if (ex.fieldErrors?.nome) nomeRef.current?.focus()
      toast(ex.message, { type: 'error', title: 'Não foi possível criar' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={busy || undefined}>
      <div className={s.objBar}>
        <button type="button" className={a.backBtn} onClick={() => (dirty ? setLeave(true) : navigate('perfis'))}><ArrowLeft size={14} aria-hidden="true" /> Voltar para perfis</button>
        <div className={s.tabsActions}>
          <button type="button" onClick={() => (dirty ? setLeave(true) : navigate('perfis'))} disabled={busy}>Cancelar</button>
          <button type="submit" className="gold" disabled={busy}>{busy ? 'Criando…' : 'Criar perfil'} {!busy && <CheckCircle size={13} aria-hidden="true" />}</button>
        </div>
      </div>

      <section className={`card form ${s.objSection}`} aria-labelledby="pf-ident">
        <h3 id="pf-ident">Identificação</h3>
        <div className="two">
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
            <small className={s.hint}>Copia as funcionalidades; você ajusta abaixo.</small>
          </label>
        </div>
        <label htmlFor="pf-desc">
          <span>Descrição</span>
          <textarea id="pf-desc" rows={2} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Para quem é este perfil e o que ele permite?" />
        </label>
      </section>

      <section className={`card form ${s.objSection}`} aria-labelledby="pf-func">
        <h3 id="pf-func">Funcionalidades</h3>
        <p className={s.sectionDesc}>Marque o que os usuários com este perfil poderão fazer.</p>
        <FuncionalidadesPicker funcionalidades={funcs.data} value={codigos} onChange={setCodigos} idPrefix="new" />
        {codigos.length === 0 && (
          <p className={a.warnBox}><AlertTriangle size={14} aria-hidden="true" /> Sem funcionalidades, usuários com este perfil não conseguirão usar nenhuma tela.</p>
        )}
      </section>

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
