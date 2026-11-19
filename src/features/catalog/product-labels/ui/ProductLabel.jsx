import { fmtBRL } from '@/shared/lib/format.js'
import { formatExpiry, stripeTextColor } from '../model/labelSettings.js'
import s from './ProductLabel.module.css'

// The preview and the printed label use exactly the same component.
export function ProductLabel({ product: p, appearance = {}, large = false }) {
  const pricePerLitre = p.volumeEmbalagem > 0 ? p.price / (p.volumeEmbalagem / 1000) : null
  return <div className={`${s.label} ${large ? s.large : ''}`} data-produto={p.id}>
    <div className={s.stripe} style={appearance.color ? { backgroundColor: appearance.color, color: stripeTextColor(appearance.color) } : undefined}>{appearance.text || 'Preço de venda'}</div>
    <div className={s.name}>{p.name}</div>
    <div className={s.price}>{fmtBRL(p.price)}</div>
    <div className={s.footer}>
      <div className={s.metadata}>
        {pricePerLitre !== null && <div>{fmtBRL(pricePerLitre)} / litro</div>}
        <div>{p.sku || 'SKU não informado'}</div>
        {appearance.lote && <div>Lote: {appearance.lote}</div>}
        {appearance.validade && <div>Validade: {formatExpiry(appearance.validade)}</div>}
      </div>
    </div>
  </div>
}
