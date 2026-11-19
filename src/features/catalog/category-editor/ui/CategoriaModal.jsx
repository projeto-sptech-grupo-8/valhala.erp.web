import { useState } from 'react'
import { api } from '@/shared/api/api.js'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { Modal, Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import s from '@/shared/styles/panel.module.css'
import a from './CategoriaModal.module.css'
const norm = (v = '') => v.trim().toLocaleLowerCase('pt-BR')

export function CategoriaModal({ categoria, categorias = [], onClose, onSaved }) {
  const toast = useToast()
  const isEdit = !!categoria
  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [descricao, setDescricao] = useState(categoria?.descricao ?? '')
  const [ativo, setAtivo] = useState(categoria?.ativo ?? true)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const [busy, setBusy] = useState(false)


  const patch = {}
  if (nome.trim() !== (categoria?.nome ?? '')) patch.nome = nome.trim()
  if (descricao.trim() !== (categoria?.descricao ?? '')) patch.descricao = descricao.trim()
  if (isEdit && ativo !== categoria.ativo) patch.ativo = ativo
  const changed = Object.keys(patch).length > 0

  function validar() {
    if (!nome.trim()) return 'O nome da categoria é obrigatório.'
    if (nome.trim().length > 100) return 'Use no máximo 100 caracteres.'
    if (categorias.some(c => c.id !== categoria?.id && norm(c.nome) === norm(nome))) return 'Já existe uma categoria com este nome.'
    return null
  }

  async function submit(e) {
    e?.preventDefault()
    const err = validar()
    if (err) { setErrors({ nome: err }); return }
    if (!changed) return
    if (busy || uncertain) return
    setBusy(true)
    setSaveError('')
    try {
      const c = isEdit
        ? await api.categorias.atualizar(categoria.id, patch)
        : await api.categorias.criar({ nome: nome.trim(), descricao: descricao.trim() })
      toast(`Categoria ${c.nome} ${isEdit ? 'atualizada' : 'criada'}.`, { title: isEdit ? 'Alterações salvas' : 'Categoria criada' })
      onSaved(c)
    } catch (ex) {
      setErrors(ex.status === 409 ? { nome: ex.message } : ex.fieldErrors || {})
      setSaveError(ex.message)
      if (ex.status === 0 && !isEdit) setUncertain(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Editar categoria' : 'Nova categoria'} width={480}
      className={a.categoryModal}
      subtitle={isEdit ? 'Atualize os dados e o status desta categoria.' : 'Organize seus produtos e drinks por categoria.'}
      busy={busy} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="submit" form="form-categoria" className="gold" disabled={!changed || busy || uncertain}>{busy ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar categoria'}</button>
      </>}
    >
      <form aria-busy={busy} id="form-categoria" onSubmit={submit} noValidate className={a.modalForm}>
        {uncertain && <Notice tone="warning" title="Cadastro sem confirmação">Feche esta janela e atualize a lista para conferir se a categoria foi criada antes de tentar novamente.</Notice>}
        {saveError && <Notice title="Não foi possível salvar a categoria" focus>{saveError}</Notice>}
        <fieldset disabled={busy || uncertain} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 16 }}>
        <label className={errors.nome ? s.fieldError : undefined}>
          <span>Nome <i className={s.req} aria-hidden="true">*</i></span>
          <input value={nome} onChange={e => { setNome(e.target.value); setErrors({}) }} maxLength={100} data-autofocus aria-invalid={!!errors.nome} placeholder="Ex.: Cervejas especiais" />
          {errors.nome && <small className={s.errMsg} role="alert">{errors.nome}</small>}
        </label>
        <label>
          <span>Descrição</span>
          <textarea rows={3} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex.: Cervejas nacionais e importadas (opcional)" />
        </label>
        {isEdit && (
          <label>
            <span>Status</span>
            <select value={String(ativo)} onChange={e => setAtivo(e.target.value === 'true')} disabled={busy}>
              <option value="true">Ativa</option>
              <option value="false">Inativa</option>
            </select>
            <small className={a.muted}>Os produtos continuam vinculados. Uma categoria inativa não poderá ser escolhida em novos vínculos.</small>
          </label>
        )}
        </fieldset>
      </form>
    </Modal>
  )
}

