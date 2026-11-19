import { MOVEMENT_TYPES } from '../model/movementTypes.js'
import s from './MovementTypeBadge.module.css'

export function MovementTypeBadge({ type }) {
  const meta = MOVEMENT_TYPES[type]
  return <span className={s.badge} style={{ '--movement-color': meta?.color || 'var(--dim)' }} title={meta?.description}><i aria-hidden="true" />{meta?.label || type || 'Não informado'}</span>
}
