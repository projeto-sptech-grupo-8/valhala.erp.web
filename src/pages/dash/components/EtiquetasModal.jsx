import { useState } from 'react'
import { Printer, AlertTriangle } from 'lucide-react'
import { fmtBRL } from '../../../lib/format.js'
import { isValidEan13 } from '../../../lib/ean13.js'
import { useStore } from '../useStore.js'
import { Modal } from './Modal.jsx'
import s from '../dash.module.css'

const FORMATOS = [
  ['padrao', 'Padrão · A4 3×8 (63,5 × 33,9 mm) — 24 por folha'],
  ['grande', 'Grande · A4 2×5 (99 × 57 mm) — 10 por folha'],
]

/* ─── Etiquetas de gôndola: escolher quantidades e formato ─── */
export function EtiquetasModal({ products, onClose }) {
  const { print } = useStore()
  const [formato, setFormato] = useState('padrao')
  const [copias, setCopias] = useState(() => Object.fromEntries(products.map(p => [p.id, 1])))
  const total = Object.values(copias).reduce((a, n) => a + (Number(n) || 0), 0)
  const porFolha = formato === 'grande' ? 10 : 24
  const semEan = products.filter(p => !isValidEan13(p.ean))

  function imprimir() {
    const itens = products.map(p => ({ product: p, copias: Math.max(0, Math.min(99, Number(copias[p.id]) || 0)) })).filter(i => i.copias > 0)
    print({ tipo: 'etiquetas', formato, itens })
    onClose()
  }

  return (
    <Modal
      title="Imprimir etiquetas de gôndola"
      subtitle={`${products.length} produto(s) · ${total} etiqueta(s) · ${Math.ceil(total / porFolha) || 0} folha(s) A4`}
      width={560}
      onClose={onClose}
      footer={<>
        <button onClick={onClose}>Cancelar</button>
        <button className="gold" onClick={imprimir} disabled={!total}><Printer size={14} aria-hidden="true" /> Imprimir {total}</button>
      </>}
    >
      <label>
        <span>Formato da folha</span>
        <select value={formato} onChange={e => setFormato(e.target.value)} data-autofocus>
          {FORMATOS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
      </label>
      <ul className={s.labelPick}>
        {products.map(p => (
          <li key={p.id}>
            <span><b>{p.name}</b><small>{fmtBRL(p.price)}{p.volumeEmbalagem ? ` · ${fmtBRL(p.price / (p.volumeEmbalagem / 1000))}/litro` : ''}</small></span>
            <label>
              <span className={s.srOnly}>Cópias de {p.name}</span>
              <input type="number" min="0" max="99" value={copias[p.id]} onChange={e => setCopias(c => ({ ...c, [p.id]: e.target.value }))} />
            </label>
          </li>
        ))}
      </ul>
      {semEan.length > 0 && <p className={s.nfWarn}><AlertTriangle size={13} aria-hidden="true" /> {semEan.length} produto(s) sem EAN válido sairão sem código de barras.</p>}
      <p className={s.muted}>A etiqueta traz o <b>preço por litro</b> quando o produto tem volume cadastrado — facilita a comparação para o cliente.</p>
    </Modal>
  )
}
