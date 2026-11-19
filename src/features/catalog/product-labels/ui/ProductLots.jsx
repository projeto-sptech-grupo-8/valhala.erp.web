import { useState } from 'react'
import { Eye, ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react'
import { api } from '@/shared/api/api.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { formatExpiry, expiryAppearance, validCopies } from '../model/labelSettings.js'
import s from './EtiquetasModal.module.css'

export function ProductLots({ product, selections, onChange, onPreview, previewLot, reference }) {
  const [page, setPage] = useState(0)
  const [range, setRange] = useState('')
  const query = useQueryResource(signal => api.lotes.pagina({ produtoId: product.id, incluirZerados: false, pagina: page, tamanho: 5, ...(range ? { situacao: range } : {}), ordenarPor: 'validade', direcao: 'ASC' }, signal), [product.id, page, range])
  const change = (lot, copies) => onChange({ ...selections, [lot.id]: { lot, copies } })
  const remove = id => { const next = { ...selections }; delete next[id]; onChange(next) }
  const rows = query.loading || query.error ? [] : query.data?.itens || []
  const visibleIds = new Set(rows.map(lot => String(lot.id)))
  const outside = Object.values(selections).filter(item => !visibleIds.has(item.lot.id))
  return <section className={s.lots} aria-label={'Lotes de ' + product.name}>
    <div className={s.title}><CalendarClock size={16} aria-hidden="true" /><strong>Lotes de {product.name}</strong></div>
    <p className={s.note}>Marque os lotes e defina de 1 a 99 etiquetas para cada um. O saldo é informativo; imprimir não movimenta o estoque.</p>
    <div className={s.lotFilters}><label>Faixa de validade<select aria-label={'Faixa de validade de ' + product.name} value={range} onChange={e => { setRange(e.target.value); setPage(0) }}><option value="">Todas as cores / validades</option><option value="VENCIDO">Vencido · vermelho</option><option value="VENCE_EM_7_DIAS">Hoje a 7 dias · laranja</option><option value="VENCE_EM_30_DIAS">8 a 30 dias · amarelo</option><option value="VALIDO">Mais de 30 dias · verde</option><option value="SEM_VALIDADE">Sem validade · cinza</option></select></label><button type="button" disabled={!range} onClick={() => { setRange(''); setPage(0) }}>Limpar filtro</button><span>5 lotes por página · consulta no servidor</span></div>
    <p className={s.note}>As faixas seguem a mesma métrica das cores da etiqueta. Vence hoje entra em “Hoje a 7 dias”. Lotes selecionados fora do filtro continuam na impressão.</p>
    {query.loading ? <p role="status">Consultando lotes…</p> : query.error ? <p role="alert">Não foi possível consultar os lotes. <button type="button" onClick={query.reload}>Tentar novamente</button></p> : !rows.length ? <p>Nenhum lote com saldo nesta página.</p> : <div className={s.tableScroll}><table className={s.table}>
      <thead><tr><th>Selecionar</th><th>Lote / validade</th><th>Saldo</th><th>Etiquetas</th><th>Prévia</th></tr></thead>
      <tbody>{rows.map(raw => {
        const lot = { id: String(raw.id), lote: raw.codigo, validade: raw.validade }
        const item = selections[lot.id]
        const status = expiryAppearance(lot.validade, reference)
        const label = product.name + ' / ' + lot.lote
        return <tr key={lot.id} data-selected={!!item}>
          <td><input type="checkbox" aria-label={'Selecionar lote ' + label} checked={!!item} onChange={e => e.target.checked ? change(lot, 1) : remove(lot.id)} /></td>
          <td><strong>{lot.lote}</strong><span className={s.lotStatus} style={{ '--lot-color': status.color }}>{formatExpiry(lot.validade)} · {status.text}</span></td>
          <td>{raw.quantidadeAtual == null ? '—' : Number(raw.quantidadeAtual).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {raw.unidadeEstoque || 'unidade-base'}</td>
          <td>{item ? <><input className={s.quantity} type="number" min="1" max="99" step="1" aria-label={'Etiquetas do lote ' + label} value={item.copies} aria-invalid={!validCopies(item.copies)} onChange={e => change(lot, e.target.value)} />{!validCopies(item.copies) && <small className={s.error}>Use um inteiro de 1 a 99.</small>}</> : '—'}</td>
          <td><button className={s.previewButton} type="button" aria-label={'Prévia do lote ' + label} aria-pressed={previewLot === lot.id} aria-controls="label-preview-content" onClick={() => onPreview(lot)}><Eye size={16} aria-hidden="true" /></button></td>
        </tr>
      })}</tbody>
    </table></div>}
    {outside.length > 0 && <div className={s.savedLots}><p className={s.note}>Lotes selecionados fora desta página (mantidos na impressão):</p>{outside.map(item => <div key={item.lot.id}><span>{item.lot.lote} · {formatExpiry(item.lot.validade)} · {item.copies || '—'} etiqueta(s)</span><button type="button" onClick={() => remove(item.lot.id)} aria-label={'Remover lote ' + product.name + ' / ' + item.lot.lote}>Remover</button></div>)}</div>}
    <nav className={s.pager} aria-label={'Paginação dos lotes de ' + product.name}><span>Página {page + 1} · até 5 lotes</span><div><button type="button" disabled={query.loading || page === 0} aria-label={'Lotes anteriores de ' + product.name} onClick={() => setPage(n => n - 1)}><ChevronLeft size={16} aria-hidden="true" /></button><button type="button" disabled={query.loading || !!query.error || query.data?.ultima !== false} aria-label={'Próximos lotes de ' + product.name} onClick={() => setPage(n => n + 1)}><ChevronRight size={16} aria-hidden="true" /></button></div></nav>
  </section>
}
