import { useRef, useState } from 'react'
import { readCash, writeCash } from '@/entities/sales/api/cashApi.js'
import { Modal, Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { MoneyInput } from '@/features/catalog/product-editor/ui/MoneyInput.jsx'
import { fmtBRL } from '@/shared/lib/format.js'
import { LockKeyhole, LogOut } from 'lucide-react'
import s from './cashLogout.module.css'

export function useCashLogout({ can, onLogout, navigate }) {
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [counted, setCounted] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const lock = useRef(false)
  const expected = dialog?.turn?.resumoAtual?.dinheiroEsperado
  const hasExpected = expected != null && Number.isFinite(Number(expected))
  const difference = counted !== '' && hasExpected ? Math.round((Number(counted) - Number(expected)) * 100) / 100 : null
  function close() { if (!lock.current) setDialog(null) }
  async function logout() {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try { await onLogout() } finally { lock.current = false; setBusy(false) }
  }
  async function requestLogout() {
    if (lock.current) return
    if (!can('CAIXA_VISUALIZAR')) return logout()
    lock.current = true; setBusy(true); setError(''); setUncertain(false)
    setCounted(''); setReason(''); setNote(''); setDialog({ phase: 'checking' })
    try {
      const turn = await readCash('sessoes/atual')
      if (turn == null) { await onLogout(); setDialog(null) }
      else if (turn.id && turn.status === 'ABERTA') setDialog({ phase: 'close', turn })
      else throw new Error('Não foi possível confirmar a situação do seu caixa. Atualize antes de sair.')
    } catch (ex) {
      if (ex.status === 401) { await onLogout(); setDialog(null) }
      else { setDialog({ phase: 'error' }); setError(ex.message) }
    } finally { lock.current = false; setBusy(false) }
  }
  async function verify() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try {
      const turn = await readCash('sessoes/' + encodeURIComponent(dialog.turn.id))
      if (!turn?.id || turn.id !== dialog.turn.id || !['ABERTA', 'FECHADA', 'EM_FECHAMENTO'].includes(turn.status)) throw new Error('O servidor não confirmou a situação do fechamento.')
      if (turn.status === 'FECHADA') { await onLogout(); setDialog(null) }
      else if (turn.status === 'EM_FECHAMENTO') setDialog({ phase: 'pending', turn })
      else { setDialog({ phase: 'close', turn }); setUncertain(false); setError('O caixa continua aberto. Confira os campos antes de tentar fechar novamente.') }
    } catch (ex) { setError(ex.message) }
    finally { lock.current = false; setBusy(false) }
  }
  async function submit(event) {
    event.preventDefault()
    if (lock.current || uncertain || !can('CAIXA_FECHAR')) return
    if (counted === '' || !Number.isFinite(Number(counted)) || Number(counted) < 0 || Number(counted) > 9999999999.99) { setError('Informe o dinheiro contado, incluindo zero quando não houver dinheiro na gaveta.'); return }
    if (difference !== null && difference !== 0 && !reason.trim()) { setError('Informe a justificativa para a diferença entre o dinheiro esperado e o contado.'); return }
    lock.current = true; setBusy(true); setError('')
    try {
      const turn = await writeCash('sessoes/' + encodeURIComponent(dialog.turn.id) + '/fechamento', { dinheiroContado: Number(counted), justificativaDivergencia: reason.trim() || null, observacao: note.trim() || null })
      if (!turn?.id || turn.id !== dialog.turn.id || !['FECHADA', 'EM_FECHAMENTO'].includes(turn.status)) { setUncertain(true); throw new Error('A resposta não confirmou o fechamento. Confira a situação antes de reenviar.') }
      if (turn.status === 'FECHADA') { await onLogout(); setDialog(null) }
      else setDialog({ phase: 'pending', turn })
    } catch (ex) { setError(ex.message); if (ex.status === 0 || ex.status >= 500) setUncertain(true) }
    finally { lock.current = false; setBusy(false) }
  }
  const modal = dialog && <Modal title={<span className={s.title}><LockKeyhole size={20} aria-hidden="true" />{dialog.phase === 'pending' ? 'Fechamento com divergência' : 'Fechar caixa e sair'}</span>} subtitle="A conferência do caixa acontece antes de encerrar seu acesso." busy={busy} onClose={close} width="min(540px, calc(100vw - 40px))" footer={<>
    <button type="button" disabled={busy} onClick={close}>Cancelar</button>
    {dialog.phase === 'error' && <button type="button" disabled={busy} onClick={requestLogout}>Tentar novamente</button>}
    {dialog.phase === 'pending' && <button type="button" className="gold" disabled={busy} onClick={logout}><LogOut size={15} aria-hidden="true" />Sair do sistema</button>}
    {dialog.phase === 'close' && (uncertain ? <button type="button" disabled={busy} onClick={verify}>Conferir fechamento</button> : can('CAIXA_FECHAR') && <button type="submit" form="close-cash-logout" className="gold" disabled={busy}><LockKeyhole size={15} aria-hidden="true" />{busy ? 'Fechando…' : 'Fechar caixa e sair'}</button>)}
  </>}>
    {error && <Notice title="Não foi possível concluir a saída" focus>{error}</Notice>}
    {dialog.phase === 'checking' && <p role="status">Conferindo se você possui um caixa aberto…</p>}
    {dialog.phase === 'pending' && <Notice tone="warning" title="Fechamento enviado para aprovação">O servidor registrou a conferência com divergência. A sessão está em fechamento e exige aprovação gerencial; ela ainda não está definitivamente fechada. Você pode encerrar seu acesso.</Notice>}
    {dialog.phase === 'close' && <><p className={s.context}><strong>{dialog.turn.caixaNome || 'Seu caixa'}</strong><span>Dinheiro esperado: {hasExpected ? fmtBRL(expected) : 'Não informado'}</span></p>
      {!can('CAIXA_FECHAR') ? <Notice tone="warning" title="É necessário fechar o caixa">Você não possui permissão para fechar esta sessão. Solicite a conferência a um responsável antes de sair.<button type="button" onClick={() => { close(); navigate('caixa') }}>Ir para o caixa</button></Notice> : <form id="close-cash-logout" onSubmit={submit} className={s.form}>
        <fieldset disabled={busy || uncertain}><label>Dinheiro contado (R$) <b className={s.required}>*</b><MoneyInput aria-label="Dinheiro contado (R$)" autoComplete="off" placeholder="Ex.: 150,00" value={counted} onValueChange={setCounted} data-autofocus /></label>
        {difference != null && <p className={s.difference}>Diferença: <strong>{fmtBRL(difference)}</strong></p>}
        <label>Justificativa da diferença{difference != null && difference !== 0 && <b className={s.required}> *</b>}<textarea rows={3} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explique a diferença, se houver" /></label>
        <label>Observação (opcional)<textarea rows={2} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="Informações sobre o encerramento do turno" /></label></fieldset>
        <p className={s.hint}>Pagamentos pendentes podem impedir o fechamento. Os valores finais e a diferença são conferidos pelo servidor.</p>
      </form>}
      {uncertain && <Notice tone="warning" title="Fechamento sem confirmação">O envio não será repetido automaticamente. Confira a situação da sessão antes de tentar novamente.</Notice>}
    </>}
  </Modal>
  return { requestLogout, modal }
}
