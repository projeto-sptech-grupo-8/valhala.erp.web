import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { ErrorBlock, LoadingBlock, ConfirmModal } from '@/shared/ui/feedback/FeedbackBlocks.jsx'
import { FileUp, FileCode2, Download, CheckCircle2, AlertTriangle, ArrowLeft, Link2, Ban, PackageCheck } from 'lucide-react'
import { ToneBadge } from '@/shared/ui/primitives/ui.jsx'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { fmtBRL, fmtNum, fmtDateTime } from '@/shared/lib/format.js'
import { parseNFe, fatorPelaUnidade, fmtCNPJ, fmtChave, sampleNFe } from '@/entities/invoices'
import { useStore } from '@/entities/store'
import { daysUntil } from '@/entities/inventory'
import { Modal } from '@/shared/ui/modal/Modal.jsx'
import s from '@/shared/styles/panel.module.css'

const PERECIVEIS = ['Cerveja', 'Sem Álcool', 'Combos']
const VAR_LIMITE = 15 // % de variação de custo que pede atenção

function montarItens(parsed, products, vinculos) {
  const { nf, itens } = parsed
  return itens.map(it => {
    const salvo = vinculos[`${nf.cnpj}|${it.cProd}`]
    const produtoId = products.some(p => p.id === salvo?.produtoId) ? salvo.produtoId : ''
    const origem = produtoId ? 'vinculo' : 'nenhum'
    const fatorSug = fatorPelaUnidade(it.uCom, it.xProd)
    return {
      ...it,
      produtoId,
      origem,
      fator: salvo?.fator ?? fatorSug ?? 1,
      fatorConfirmar: !salvo && fatorSug == null,
      lote: it.lote,
      validade: it.validade,
      ignorar: false,
    }
  })
}

/* ─── Entrada de mercadoria por XML da NF-e ─── */
export function EntradaNF() {
  return <Navigate replace to="/produtos?importar=1" />
}

export function ImportProductsModal({ navigate, onClose }) {
  const { catalog, can } = useStore()
  const load = useQueryResource(async () => { await catalog.reload(); return true }, [])
  const [progress, setProgress] = useState({ etapa: 'upload', busy: false })
  const [confirmClose, setConfirmClose] = useState(false)
  function close() {
    if (progress.busy) return
    if (progress.etapa === 'conferencia') setConfirmClose(true)
    else onClose()
  }
  if (!can('MOVIMENTAR_ESTOQUE')) return null
  return <>
    <Modal title="Importar produtos" subtitle="Arraste o XML de uma NF-e, vincule os itens aos produtos cadastrados e confira as quantidades antes de confirmar a entrada." width={1040} onClose={close}>
      <p className={s.ruleNote}>A importação registra entradas para produtos já cadastrados; não cria produtos automaticamente. Envie um XML de até 5 MB. Lotes e validade são enviados nas entradas. Vincule os itens manualmente ou por vínculo salvo; o catálogo atual não permite associação por EAN. Vínculos com fornecedores e controle da NF são locais; custo médio não é persistido. Em falha, confira o histórico antes de repetir.</p>
      {load.loading || catalog.status === 'loading' ? <LoadingBlock label="Preparando a importação" /> : catalog.status === 'error' ? <ErrorBlock error={catalog.error} onRetry={load.reload} /> : <LocalEntradaNF onStateChange={setProgress} navigate={(page, params) => { onClose(); navigate(page, params) }} />}
    </Modal>
    {confirmClose && <ConfirmModal title="Descartar a conferência?" confirmLabel="Descartar e fechar" onClose={() => setConfirmClose(false)} onConfirm={onClose}><p>Os itens ainda não confirmados serão descartados. Nenhuma entrada será enviada.</p></ConfirmModal>}
  </>
}

function LocalEntradaNF({ navigate, onStateChange }) {
  const { products, vinculos, nfsImportadas, importarNF } = useStore()
  const toast = useToast()
  const [etapa, setEtapa] = useState('upload') // upload | conferencia | concluido
  const [nf, setNf] = useState(null)
  const [itens, setItens] = useState([])
  const [erro, setErro] = useState('')
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [sair, setSair] = useState(false)
  const fileRef = useRef(null)
  useEffect(() => { onStateChange?.({ etapa, busy }) }, [etapa, busy, onStateChange])

  function carregar(xml, nome) {
    setErro('')
    try {
      const parsed = parseNFe(xml)
      if (nfsImportadas.some(x => x.chave === parsed.nf.chave)) {
        setErro(`A NF-e nº ${parsed.nf.numero} de ${parsed.nf.emitente} já foi importada. Entrada duplicada bloqueada.`)
        return
      }
      setNf(parsed.nf)
      setItens(montarItens(parsed, products, vinculos))
      setEtapa('conferencia')
      toast(`${parsed.itens.length} itens lidos de ${nome || 'NF-e'}.`, { title: `NF-e ${parsed.nf.numero} carregada`, type: 'info' })
    } catch (e) {
      setErro(e.message || 'Não foi possível ler o arquivo.')
    }
  }

  function lerArquivo(file) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setErro('O XML deve ter no máximo 5 MB.'); return }
    if (!/\.xml$/i.test(file.name) && file.type !== 'text/xml' && file.type !== 'application/xml') {
      setErro('Envie o arquivo .xml da NF-e (não o PDF/DANFE).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => carregar(String(reader.result), file.name)
    reader.onerror = () => setErro('Não foi possível ler o arquivo.')
    reader.readAsText(file)
  }

  function baixarExemplo() {
    const blob = new Blob([sampleNFe()], { type: 'application/xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'nfe-exemplo-distribuidora-norte.xml'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const upd = (i, patch) => setItens(list => list.map((it, j) => (j === i ? { ...it, ...patch } : it)))

  /* ─── análise da conferência ─── */
  const linhas = itens.map(it => {
    const prod = products.find(p => p.id === it.produtoId)
    const fator = Number(it.fator) || 0
    const qty = Math.round(it.qCom * fator * 1000) / 1000
    const custo = fator > 0 ? Math.round((it.vUnCom / fator) * 10000) / 10000 : 0
    const variacao = prod && prod.cost > 0 ? Math.round(((custo - prod.cost) / prod.cost) * 100) : null
    const dias = daysUntil(it.validade)
    const problemas = []
    if (!it.ignorar) {
      if (!prod) problemas.push('Vincule a um produto do catálogo ou ignore o item.')
      if (!(fator > 0) || !Number.isInteger(fator)) problemas.push('Fator de conversão deve ser um número inteiro maior que zero.')
      if (it.validade && dias < 0) problemas.push('Validade já vencida — recuse o item na entrega ou corrija a data.')
    }
    const avisos = []
    if (!it.ignorar && prod) {
      if (variacao != null && Math.abs(variacao) > VAR_LIMITE) avisos.push(`Custo ${variacao > 0 ? 'subiu' : 'caiu'} ${Math.abs(variacao)}% em relação ao atual (${fmtBRL(prod.cost)}).`)
      if (!it.validade && PERECIVEIS.includes(prod.cat)) avisos.push('Sem validade: este lote não gera alerta de vencimento e fica por último no FEFO.')
      if (it.validade && dias <= 30 && dias >= 0) avisos.push(`Validade curta: vence em ${dias} dia(s).`)
      if (it.fatorConfirmar) avisos.push(`Unidade "${it.uCom}" sem fator conhecido — confirme quantas unidades vêm em cada ${it.uCom}.`)
    }
    return { it, prod, fator, qty, custo, variacao, problemas, avisos }
  })
  const ativos = linhas.filter(l => !l.it.ignorar)
  const pendentes = linhas.filter(l => l.problemas.length)
  const somaItens = linhas.reduce((a, l) => a + l.it.vProd, 0)
  const somaAtivos = ativos.reduce((a, l) => a + l.it.vProd, 0)
  const confere = nf && Math.abs(somaItens - nf.valor) < 0.05

  async function confirmar() {
    setBusy(true)
    try {
      const reg = await importarNF({
        nf,
        itens: linhas.map(l => ({
          cProd: l.it.cProd, uCom: l.it.uCom, qCom: l.it.qCom, fator: l.fator, ignorar: l.it.ignorar,
          produtoId: l.it.produtoId, qty: l.qty, custo: l.custo, lote: l.it.lote, validade: l.it.validade || null,
        })),
      })
      setResultado({ reg, linhas: ativos })
      setEtapa('concluido')
      toast(`${reg.itens} item(ns) deram entrada no estoque.`, { title: `NF-e ${reg.numero} importada` })
    } catch (e) {
      toast(e.message, { type: 'error', title: 'Entrada não concluída' })
    } finally {
      setBusy(false)
    }
  }

  function recomecar() {
    setEtapa('upload'); setNf(null); setItens([]); setErro(''); setResultado(null)
  }

  /* ═══ 1. upload ═══ */
  if (etapa === 'upload') {
    return (
      <>
        <div
          className={`${s.dropZone} ${drag ? s.dropOn : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); lerArquivo(e.dataTransfer.files?.[0]) }}
        >
          <FileUp size={30} aria-hidden="true" />
          <h3>Arraste o XML da NF-e</h3>
          <p>Ou selecione o arquivo no computador. Depois, escolha os produtos correspondentes e confira os dados antes de confirmar.</p>
          <div className={s.dropActions}>
            <button className="gold" onClick={() => fileRef.current?.click()}><FileCode2 size={14} aria-hidden="true" /> Selecionar arquivo .xml</button>
            <button onClick={() => carregar(sampleNFe(), 'XML de exemplo')}>Usar XML de exemplo</button>
            <button onClick={baixarExemplo}><Download size={14} aria-hidden="true" /> Baixar exemplo</button>
          </div>
          <input ref={fileRef} type="file" accept=".xml,text/xml,application/xml" hidden onChange={e => { lerArquivo(e.target.files?.[0]); e.target.value = '' }} aria-label="Arquivo XML da NF-e" />
          {erro && <p className={s.dropError} role="alert"><AlertTriangle size={14} aria-hidden="true" /> {erro}</p>}
        </div>

        <article className="card">
          <h3>Últimas notas importadas</h3>
          {nfsImportadas.length === 0
            ? <p className={s.muted}>Nenhuma nota importada ainda.</p>
            : (
              <table className={s.simpleTable}>
                <thead><tr><th scope="col">NF-e</th><th scope="col">Emitente</th><th scope="col">Itens</th><th scope="col">Valor</th><th scope="col">Importada em</th><th scope="col">Por</th></tr></thead>
                <tbody>
                  {nfsImportadas.slice(0, 8).map(n => (
                    <tr key={n.chave}>
                      <td><b>{n.numero}</b><small className={s.muted}> série {n.serie}</small></td>
                      <td>{n.emitente ?? n.fornecedor}</td>
                      <td>{n.itens}{n.ignorados ? <small className={s.muted}> (+{n.ignorados} ignorado{n.ignorados > 1 ? 's' : ''})</small> : null}</td>
                      <td>{fmtBRL(n.valor)}</td>
                      <td>{fmtDateTime(n.em)}</td>
                      <td>{n.operador}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </article>
      </>
    )
  }

  /* ═══ 3. concluído ═══ */
  if (etapa === 'concluido') {
    return (
      <article className={`card ${s.doneCard}`}>
        <PackageCheck size={30} aria-hidden="true" />
        <h3>NF-e {resultado.reg.numero} importada</h3>
        <p>{resultado.reg.itens} item(ns) de {resultado.reg.emitente} tiveram entradas registradas. Lote e validade foram enviados ao servidor nas entradas; vínculos da NF são locais e o custo médio não é atualizado.</p>
        <ul className={s.confirmList}>
          {resultado.linhas.map(l => (
            <li key={l.it.nItem}><b>{l.prod.name}</b> · +{fmtNum(l.qty)} {l.prod.unit} · {fmtBRL(l.custo)}/un · lote {l.it.lote || 'SEM-LOTE'}</li>
          ))}
        </ul>
        <div className={s.dropActions}>
          <button className="gold" onClick={recomecar}>Importar outra NF-e</button>
          <button onClick={() => navigate('movimentacoes')}>Ver movimentações</button>
          <button onClick={() => navigate('validades')}>Ver validades</button>
        </div>
      </article>
    )
  }

  /* ═══ 2. conferência ═══ */
  return (
    <>
      <div className={s.objBar}>
        <button type="button" className={s.backLink} onClick={() => setSair(true)}><ArrowLeft size={14} aria-hidden="true" /> Trocar arquivo</button>
        <div className={s.tabsActions}>
          <span className={s.muted} aria-live="polite">
            {pendentes.length ? `${pendentes.length} item(ns) pendente(s)` : `${ativos.length} de ${linhas.length} itens prontos`}
          </span>
          {pendentes.length > 0 && <button type="button" onClick={() => {
            const next = document.getElementById('nf-item-' + pendentes[0].it.nItem)
            next?.focus()
            next?.scrollIntoView({ block: 'center' })
          }}>Conferir primeiro item pendente</button>}
          <button className="gold" disabled={busy || pendentes.length > 0 || !ativos.length} onClick={confirmar}>
            {busy ? 'Dando entrada…' : `Confirmar entrada (${ativos.length})`} {!busy && <CheckCircle2 size={14} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <article className={`card ${s.nfHead}`}>
        <div><small>NF-e</small><b>{nf.numero}</b><span>série {nf.serie}</span></div>
        <div><small>Emitente</small><b>{nf.emitente}</b><span>CNPJ {fmtCNPJ(nf.cnpj)}</span></div>
        <div><small>Emissão</small><b>{nf.emissao ? fmtDateTime(nf.emissao) : '—'}</b><span>&nbsp;</span></div>
        <div>
          <small>Valor da nota</small><b>{fmtBRL(nf.valor)}</b>
          <span>{confere ? <ToneBadge tone="ok" label="Soma dos itens confere" /> : <ToneBadge tone="warn" label={`Itens somam ${fmtBRL(somaItens)}`} />}</span>
        </div>
        <p className={s.nfChave}><small>Chave de acesso</small><code>{fmtChave(nf.chave)}</code></p>
      </article>

      <div className={s.nfItems}>
        {linhas.map((l, i) => {
          const { it, prod } = l
          return (
            <article key={it.nItem} id={'nf-item-' + it.nItem} tabIndex={-1} className={`card ${s.nfItem} ${it.ignorar ? s.nfIgnored : ''} ${l.problemas.length ? s.nfPending : ''}`} aria-label={`Item ${it.nItem}: ${it.xProd}`}>
              <header>
                <div>
                  <small>Item {it.nItem} · cód. {it.cProd}{it.cEAN ? ` · EAN ${it.cEAN}` : ' · sem GTIN'}</small>
                  <b>{it.xProd}</b>
                  <span>{fmtNum(it.qCom)} {it.uCom} × {fmtBRL(it.vUnCom)} = {fmtBRL(it.vProd)}</span>
                </div>
                <label className={s.inlineCheck}>
                  <input type="checkbox" checked={it.ignorar} onChange={e => upd(i, { ignorar: e.target.checked })} />
                  <Ban size={13} aria-hidden="true" /> Ignorar item
                </label>
              </header>

              {!it.ignorar && (
                <div className={s.nfGrid}>
                  <label>
                    <span>Produto no catálogo {it.origem === 'vinculo' && <ToneBadge tone="ok" label="vínculo salvo" />}{it.origem === 'nenhum' && !it.produtoId && <ToneBadge tone="warn" label="sem vínculo" />}</span>
                    <select value={it.produtoId} onChange={e => upd(i, { produtoId: e.target.value, origem: e.target.value ? 'manual' : 'nenhum' })} aria-invalid={!prod || undefined}>
                      <option value="">Selecione o produto…</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku || p.id})</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Fator ({it.uCom} → {prod?.unit || 'un'})</span>
                    <input type="number" min="1" step="1" value={it.fator} onChange={e => upd(i, { fator: e.target.value, fatorConfirmar: false })} />
                    <small className={s.hint}>1 {it.uCom} = {l.fator || '?'} {prod?.unit || 'un'}</small>
                  </label>
                  <div className={s.nfCalc}>
                    <span>Entra no estoque</span>
                    <b>{fmtNum(l.qty)} {prod?.unit || 'un'}</b>
                    <small>custo {fmtBRL(l.custo)}/{prod?.unit || 'un'}
                      {l.variacao != null && <> · {l.variacao === 0 ? 'igual ao atual' : `${l.variacao > 0 ? '+' : ''}${l.variacao}% vs atual`}</>}
                    </small>
                  </div>
                  <label>
                    <span>Lote</span>
                    <input value={it.lote} onChange={e => upd(i, { lote: e.target.value })} placeholder="SEM-LOTE" />
                  </label>
                  <label>
                    <span>Validade</span>
                    <input type="date" value={it.validade} onChange={e => upd(i, { validade: e.target.value })} aria-invalid={(it.validade && daysUntil(it.validade) < 0) || undefined} />
                  </label>
                </div>
              )}

              {(l.problemas.length > 0 || l.avisos.length > 0) && (
                <ul className={s.nfNotes}>
                  {l.problemas.map(p => <li key={p} className={s.nfErr}><AlertTriangle size={13} aria-hidden="true" /> {p}</li>)}
                  {l.avisos.map(a => <li key={a} className={s.nfWarn}><Link2 size={13} aria-hidden="true" /> {a}</li>)}
                </ul>
              )}
            </article>
          )
        })}
      </div>

      <p className={s.ruleNote}>
        Ao confirmar: entradas com o número da NF são enviadas ao servidor. Lotes e validade são enviados ao servidor; vínculos e controle da NF são locais e o custo médio de entrada não é persistido
        e vínculo código do item do emitente → produto salvo para as próximas notas.
        {linhas.some(l => l.it.ignorar) && <> Itens ignorados somam {fmtBRL(somaItens - somaAtivos)} e ficam fora da entrada.</>}
      </p>

      {sair && (
        <Modal title="Descartar a conferência?" subtitle="Os vínculos e ajustes feitos nesta nota serão perdidos." width={420} onClose={() => setSair(false)}
          footer={<>
            <button onClick={() => setSair(false)} data-autofocus>Continuar conferindo</button>
            <button className={s.dangerBtn} onClick={() => { setSair(false); recomecar() }}>Descartar</button>
          </>}
        />
      )}
    </>
  )
}
