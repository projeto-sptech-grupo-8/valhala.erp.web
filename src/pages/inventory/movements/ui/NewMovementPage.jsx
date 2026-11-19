import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/shared/api/api.js'
import { useStore } from '@/entities/store'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { QueryFeedback } from '@/features/catalog/remote/RemoteControls.jsx'
import { RecordAutocomplete } from '@/features/catalog/product-editor/ui/CategoryAutocomplete.jsx'
import { LotSelect } from '@/features/catalog/remote/LotSelect.jsx'
import { ConfirmModal } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { fmtNum } from '@/shared/lib/format.js'
import s from '@/features/catalog/remote/remote.module.css'
import layout from '@/features/catalog/product-editor/ui/ProductFormLayout.module.css'
import ui from './MovementsPage.module.css'
const TYPES = { ENTRADA: 'Entrada', SAIDA: 'Saída', SAIDA_DRINK: 'Saída de drink', PERDA: 'Perda', AJUSTE_POSITIVO: 'Ajuste positivo', AJUSTE_NEGATIVO: 'Ajuste negativo' }
const POSITIVE = ['ENTRADA', 'AJUSTE_POSITIVO']
export function NewMovementPage({ navigate, pageParams, setBackAction }) {
  const initialId = pageParams?.produto || ''
  const { can } = useStore()
  const [discard, setDiscard] = useState(false)
  const [dirty, setDirty] = useState(false)
  function back() {
    let filters = {}
    try { filters = JSON.parse(pageParams?.retorno || '{}') } catch { /* default history */ }
    navigate('movimentacoes', filters)
  }
  function cancel() { if (dirty) setDiscard(true); else back() }
  function onSaved() { setDirty(false); navigate('movimentacoes') }
  const { invalidateCatalog } = useStore()
  const toast = useToast()
  const [produtoId, setProdutoId] = useState(initialId)
  const [tipo, setTipo] = useState('ENTRADA')
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const [lote, setLote] = useState('')
  const [nf, setNf] = useState('')
  const [validade, setValidade] = useState('')
  const [selectedLot, setSelectedLot] = useState(null)
  const [emFardo, setEmFardo] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setBackAction?.(() => {
      if (busy) return
      if (dirty) { setDiscard(true); return }
      let filters = {}
      try { filters = JSON.parse(pageParams?.retorno || '{}') } catch { /* default history */ }
      navigate('movimentacoes', filters)
    })
    return () => setBackAction?.(null)
  }, [setBackAction, busy, dirty, navigate, pageParams?.retorno])
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const sending = useRef(false)
  const product = useQueryResource(signal => produtoId ? api.produtos.obter(produtoId, signal) : null, [produtoId])
  const p = product.data?.id === produtoId ? product.data : null
  const drink = tipo === 'SAIDA_DRINK'
  const base = p?.fracionado ? p.volumeEmbalagem : 1
  const unit = drink ? p?.unit || 'drink(s)' : p?.fracionado ? 'ml' : p?.unit || 'un'
  const credit = POSITIVE.includes(tipo)
  const canBundle = p?.vendaFardo && !p.fracionado && !drink
  const asBundle = canBundle && emFardo
  const quantityBase = Number(quantidade) * (asBundle ? p.unidadesFardo : 1)
  const saldo = p ? p.quantidadeEstoqueBase ?? p.qty * base : null
  async function submit(event) {
    event.preventDefault()
    if (sending.current || uncertain) return
    if (!p || product.loading || product.error || !p.ativo || !(Number(quantidade) > 0) || !Number.isFinite(Number(quantidade))) { setError('Selecione um produto ativo e informe uma quantidade maior que zero.'); return }
    if ((tipo.startsWith('AJUSTE') || tipo === 'PERDA') && !motivo.trim()) { setError('Informe a justificativa do ajuste ou perda.'); return }
    sending.current = true; setBusy(true); setError('')
    try {
      const result = drink
        ? await api.movimentacoes.saidaDrink({ drinkId: produtoId, quantidade: Number(quantidade), motivo: motivo.trim() })
        : await api.movimentacoes.registrar({ produtoId, tipo, quantidade: Number(quantidade), motivo: motivo.trim(), lote: credit ? lote || undefined : undefined, validade: credit ? validade || undefined : undefined, loteId: !credit ? selectedLot?.id : undefined, emFardo: asBundle || undefined, numeroNotaFiscal: tipo === 'ENTRADA' ? nf || undefined : undefined })
      invalidateCatalog?.()
      toast(drink ? 'Ingredientes baixados pelo servidor.' : 'Saldo confirmado: ' + fmtNum(result.saldoPosterior) + ' ' + result.unidadeEstoque, { title: 'Movimentação registrada' })
      onSaved()
    } catch (ex) {
      setError(ex.message)
      if (ex.status === 0) setUncertain(true)
      product.reload()
    } finally { sending.current = false; setBusy(false) }
  }
  if (!can('MOVIMENTAR_ESTOQUE')) return <p role="alert">Você não tem permissão para movimentar o estoque.</p>
  return <form className={layout.editor + ' ' + ui.newMovement} onSubmit={submit} onChange={() => setDirty(true)} aria-busy={busy}>
    {error && <Notice title="Não foi possível registrar a movimentação" focus>{error}</Notice>}
    {uncertain && <p className={s.notice}>Não foi possível confirmar a resposta. Consulte e atualize o histórico antes de iniciar outra operação, para evitar duplicidade.</p>}
    <fieldset disabled={busy || uncertain} style={{ border: 0, padding: 0 }}><section className={'card form ' + ui.formCard}><h3>Dados da movimentação</h3><div className={s.grid + ' ' + ui.formGrid}>
      <label>Operação<select aria-label="Operação" value={tipo} onChange={e => { setTipo(e.target.value); setProdutoId(''); setQuantidade(''); setSelectedLot(null); setEmFardo(false); setValidade(''); setLote('') }}>{Object.entries(TYPES).filter(([k]) => k !== 'ENTRADA_INICIAL').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <RecordAutocomplete kind="produtos" label="Produto da movimentação" placeholder="Ex.: Vodka, morango ou caipirinha" productType={drink ? 'DRINK' : 'PADRAO'} value={produtoId} onChange={id => { setProdutoId(id); setSelectedLot(null); setEmFardo(false); setDirty(true) }} />
      <label>Quantidade ({asBundle ? 'fardos' : unit})<input placeholder="Ex.: 50" aria-label="Quantidade" type="number" min="0.001" step="any" required value={quantidade} onChange={e => setQuantidade(e.target.value)} /></label>
      <label>Justificativa<input placeholder="Ex.: Recebimento de mercadoria ou contagem física" value={motivo} onChange={e => setMotivo(e.target.value)} required={tipo.startsWith('AJUSTE') || tipo === 'PERDA'} /></label>
      {canBundle && <label>Quantidade informada em<select aria-label="Quantidade informada em" value={String(emFardo)} onChange={e => setEmFardo(e.target.value === 'true')}><option value="false">Unidades</option><option value="true">Fardos ({p.unidadesFardo} unidades cada)</option></select></label>}
      {credit && <><label>Lote (referência)<input placeholder="Ex.: LOTE-2026-01" maxLength={100} value={lote} onChange={e => setLote(e.target.value)} /></label><label>Validade do lote<input type="date" value={validade} onChange={e => setValidade(e.target.value)} /></label></>}
      {tipo === 'ENTRADA' && <label>Número da NF<input placeholder="Ex.: 12345" maxLength={50} value={nf} onChange={e => setNf(e.target.value)} /></label>}
      {p && !drink && !credit && <LotSelect key={produtoId + tipo} productId={produtoId} value={selectedLot} onChange={lot => { setSelectedLot(lot); setDirty(true) }} allowExpired={tipo === 'PERDA' || tipo === 'AJUSTE_NEGATIVO'} />}
    </div>
    <QueryFeedback query={product} />
    {p && !drink && !product.loading && <p>Saldo consultado: {fmtNum(saldo)} {unit}. {Number(quantidade) > 0 && <>Estimativa após: {fmtNum(saldo + (POSITIVE.includes(tipo) ? 1 : -1) * quantityBase)} {unit}.</>} O servidor confirma o saldo.</p>}
    <p>Lote e validade são persistidos nas entradas e ajustes positivos. Saídas usam FEFO quando nenhum lote é selecionado. O custo médio de entrada não é atualizado por esta operação.</p>
    </section></fieldset>
    <div className={layout.footer}><button type="button" disabled={busy} onClick={cancel}>Cancelar</button><button type="submit" className="gold" disabled={busy || uncertain || product.loading || !!product.error || !p}>{busy ? 'Salvando…' : 'Salvar movimentação'}</button></div>
    {discard && <ConfirmModal title="Descartar alterações?" confirmLabel="Descartar" onClose={() => setDiscard(false)} onConfirm={back}><p>Os dados preenchidos nesta movimentação serão perdidos.</p></ConfirmModal>}
  </form>
}
