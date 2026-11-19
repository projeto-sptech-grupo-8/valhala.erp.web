import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useState } from 'react'
import { api } from '@/shared/api/api.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { lotDate, LOT_STATES } from '@/entities/inventory/model/remoteLots.js'
import { fmtNum } from '@/shared/lib/format.js'

export function LotSelect({ productId, value, onChange, allowExpired = false }) {
  const [page, setPage] = useState(0)
  const query = useQueryResource(signal => api.lotes.pagina({ produtoId: productId, incluirZerados: false, pagina: page, tamanho: 20, ordenarPor: 'validade', direcao: 'ASC' }, signal), [productId, page])
  const options = query.loading || query.error ? [] : query.data?.itens || []
  return <div>
    <label>Lote de origem<select aria-label="Lote de origem" disabled={query.loading || !!query.error} value={value?.id || ''} onChange={event => onChange(options.find(lot => String(lot.id) === event.target.value) || null)}>
      <option value="">Automático (FEFO no servidor)</option>
      {value && !options.some(lot => lot.id === value.id) && <option value={value.id}>{value.codigo}</option>}
      {options.map(lot => <option key={lot.id} value={lot.id} disabled={!allowExpired && lot.situacao === 'VENCIDO'}>{lot.codigo} · {fmtNum(lot.quantidadeAtual)} {lot.unidadeEstoque} · {lotDate(lot.validade)} · {LOT_STATES[lot.situacao]?.label || lot.situacao}</option>)}
    </select></label>
    {query.loading && <small role="status">Consultando lotes…</small>}
    {query.error && <Notice title="Não foi possível consultar os lotes" onRetry={query.reload}>{query.error.message}</Notice>}
    <small>Sem lote específico, o servidor escolhe os lotes por validade. Vencidos só podem ser consumidos nas operações permitidas pelo backend.</small>
    {query.data && !query.loading && (page > 0 || query.data.ultima === false) && <div><button type="button" disabled={page === 0} onClick={() => setPage(n => n - 1)}>Lotes anteriores</button><button type="button" disabled={query.data.ultima !== false} onClick={() => setPage(n => n + 1)}>Próximos lotes</button></div>}
  </div>
}
