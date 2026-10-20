import { useState } from 'react'
import { Tag, Pencil, Eye, Plus } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useResource } from '../../lib/useResource.js'
import { useToast } from '../../components/useToast.js'
import { useStore } from './useStore.js'
import { getStatus } from './estoque.js'
import { METAS, toneHigher } from '../../lib/kpi.js'
import { ToneBadge } from '../../components/ui.jsx'
import { Modal } from './components/Modal.jsx'
import { StatusChip } from './components/StatusChip.jsx'
import { ConfirmModal, ErrorBlock, LoadingBlock } from './acesso/ui.jsx'
import s from './dash.module.css'
import a from './acesso/acesso.module.css'

const norm = (v = '') => v.trim().toLocaleLowerCase('pt-BR')

/* ─── Categorias (GET/POST/PATCH/DELETE /categorias) ─── */
export function Cards({ navigate }) {
  const { products, drinks, can } = useStore()
  const cats = useResource(() => api.categorias.listar(), [])
  const [modal, setModal] = useState(null) // { categoria? }
  const podeEditar = can('GERENCIAR_ESTOQUE')

  if (cats.error) return <ErrorBlock error={cats.error} onRetry={cats.reload} />
  if (!cats.data) return <LoadingBlock lines={4} label="Carregando categorias" />

  const all = [...products, ...drinks]
  const data = cats.data.map(c => {
    const items = products.filter(p => norm(p.cat) === norm(c.nome))
    const total = all.filter(p => norm(p.cat) === norm(c.nome)).length
    const saudaveis = items.filter(p => getStatus(p) === 'Estável').length
    const pct = items.length ? Math.round((saudaveis / items.length) * 100) : 100
    return { ...c, total, pct, tracked: items.length > 0 }
  })

  const onSaved = () => { setModal(null); cats.reload() }

  return (
    <>
      {data.length === 0 && (
        <p className={a.muted}>Nenhuma categoria cadastrada ainda.{podeEditar && ' Crie a primeira para organizar o catálogo.'}</p>
      )}
      <div className={s.cards}>
        {data.map(c => (
          <article className="card" key={c.id} aria-label={`Categoria ${c.nome}`}>
            <div className={s.cardHead}>
              <Tag size={16} style={{ color: 'var(--gold)' }} aria-hidden="true" />
              <div className={s.cardBtns}>
                {podeEditar && (
                  <button className={s.iconBtn} title="Editar categoria" aria-label={`Editar categoria ${c.nome}`} onClick={() => setModal({ categoria: c })}>
                    <Pencil size={13} />
                  </button>
                )}
                <button className={s.iconBtn} title="Ver produtos" aria-label={`Ver produtos de ${c.nome}`} onClick={() => navigate('produtos', { cat: c.nome })}>
                  <Eye size={13} />
                </button>
              </div>
            </div>
            <h3>{c.nome}</h3>
            {!c.ativo && <StatusChip status="Inativa" />}
            {c.descricao && <p className={s.hint}>{c.descricao}</p>}
            <p>{c.total} {c.total === 1 ? 'produto' : 'produtos'}</p>
            {c.tracked && (
              <>
                <div className={s.barTrack} role="meter" aria-valuenow={c.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Itens com estoque saudável">
                  <span style={{ width: c.pct + '%' }} />
                </div>
                <div className={s.cardFoot}><small className={s.hint}>{c.pct}% com estoque saudável</small><ToneBadge tone={toneHigher(c.pct, METAS.saudeEstoque)} /></div>
              </>
            )}
          </article>
        ))}
        {podeEditar && (
          <button className={s.cardNew} onClick={() => setModal({})}>
            <Plus size={22} style={{ color: 'var(--gold)' }} aria-hidden="true" />
            <span>Nova categoria</span>
          </button>
        )}
      </div>
      {modal && <CategoriaModal categoria={modal.categoria} categorias={cats.data} onClose={() => setModal(null)} onSaved={onSaved} />}
    </>
  )
}

/* ─── Criar / editar (PATCH só com o que mudou) / excluir ─── */
function CategoriaModal({ categoria, categorias, onClose, onSaved }) {
  const toast = useToast()
  const isEdit = !!categoria
  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [descricao, setDescricao] = useState(categoria?.descricao ?? '')
  const [ativo, setAtivo] = useState(categoria?.ativo ?? true)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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
    setBusy(true)
    try {
      const c = isEdit
        ? await api.categorias.atualizar(categoria.id, patch)
        : await api.categorias.criar({ nome: nome.trim(), descricao: descricao.trim() })
      toast(`Categoria ${c.nome} ${isEdit ? 'atualizada' : 'criada'}.`, { title: isEdit ? 'Alterações salvas' : 'Categoria criada' })
      onSaved(c)
    } catch (ex) {
      setErrors(ex.status === 409 ? { nome: ex.message } : ex.fieldErrors || {})
      toast(ex.message, { type: 'error', title: 'Não foi possível salvar' })
    } finally {
      setBusy(false)
    }
  }

  async function excluir() {
    setBusy(true)
    try {
      await api.categorias.excluir(categoria.id)
      toast(`Categoria ${categoria.nome} excluída.`, { title: 'Categoria excluída' })
      onSaved(null)
    } catch (ex) {
      setConfirmDelete(false)
      toast(ex.message, { type: 'error', title: 'Não foi possível excluir' })
    } finally {
      setBusy(false)
    }
  }

  if (confirmDelete) {
    return (
      <ConfirmModal
        title={`Excluir a categoria ${categoria.nome}?`} confirmLabel="Excluir categoria" danger busy={busy}
        onConfirm={excluir} onClose={() => setConfirmDelete(false)}
      >
        <p className={a.muted}>Categorias com produtos vinculados não podem ser excluídas — nesse caso, inative-a.</p>
      </ConfirmModal>
    )
  }

  return (
    <Modal
      title={isEdit ? 'Editar categoria' : 'Nova categoria'} width={480}
      onClose={busy ? () => {} : onClose}
      footer={<>
        {isEdit && <button type="button" className={a.dangerSolid} onClick={() => setConfirmDelete(true)} disabled={busy} style={{ marginRight: 'auto' }}>Excluir</button>}
        <button type="button" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="submit" form="form-categoria" className="gold" disabled={!changed || busy}>{busy ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar categoria'}</button>
      </>}
    >
      <form id="form-categoria" onSubmit={submit} noValidate className={a.modalForm}>
        <label className={errors.nome ? s.fieldError : undefined}>
          <span>Nome <i className={s.req} aria-hidden="true">*</i></span>
          <input value={nome} onChange={e => { setNome(e.target.value); setErrors({}) }} maxLength={100} data-autofocus aria-invalid={!!errors.nome} placeholder="Ex.: Cervejas especiais" />
          {errors.nome && <small className={s.errMsg} role="alert">{errors.nome}</small>}
        </label>
        <label>
          <span>Descrição</span>
          <textarea rows={2} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Opcional" />
        </label>
        {isEdit && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} /> Categoria ativa
          </label>
        )}
      </form>
    </Modal>
  )
}
