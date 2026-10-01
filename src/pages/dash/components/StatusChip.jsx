import s from '../dash.module.css'

/* ─── Chips de status ─── */
const chipClass = {
  Estável:       s.chipOk,
  Baixo:         s.chipWarn,
  Crítico:       s.chipBad,
  Zerado:        s.chipBad,
  Pendente:      s.chipWarn,
  Aprovado:      s.chipOk,
  Aprovada:      s.chipOk,
  Emitida:       s.chipOk,
  Cancelada:     s.chipBad,
  Expirado:      s.chipBad,
  Ativo:         s.chipOk,
  Revisão:       s.chipWarn,
  'Em trânsito': s.chipWarn,
  Recebida:      s.chipOk,
}


export function StatusChip({ status }) {
  return <em className={`${s.chip} ${chipClass[status] || s.chipOk}`}>{status}</em>
}
