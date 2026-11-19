import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ProductLabel } from '@/features/catalog/product-labels/ui/ProductLabel.jsx'
import { useStore } from '@/entities/store'
import '@/features/printing/ui/print.css'

/* ─── Etiquetas de gôndola (A4) ─── */
function Etiquetas({ job }) {
  const labels = job.itens.flatMap(({ product, copias, appearance }, entryIndex) => Array.from({ length: copias }, (_, k) => ({ product, appearance, k: entryIndex + '-' + k })))
  return <div className={`print-labels ${job.formato === 'grande' ? 'grande' : ''}`} data-doc="etiquetas">
    {labels.map(({ product, appearance, k }) => <ProductLabel key={product.id + '-' + k} product={product} appearance={appearance} large={job.formato === 'grande'} />)}
  </div>
}

export function PrintHost() {
  const { printJob, clearPrint } = useStore()
  useEffect(() => {
    if (!printJob) return
    const after = () => clearPrint()
    window.addEventListener('afterprint', after)
    const timer = setTimeout(() => { if (!window.__valhallaNoPrint) window.print() }, 60)
    return () => { clearTimeout(timer); window.removeEventListener('afterprint', after) }
  }, [printJob?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!printJob) return null
  const page = printJob.formato === 'grande' ? '@page { size: A4 portrait; margin: 6mm 4mm; }' : '@page { size: A4 portrait; margin: 12mm 7mm; }'
  return createPortal(<div className="print-root" data-kind={printJob.tipo}>
    <style>{`@media print { ${page} }`}</style>
    {printJob.tipo === 'etiquetas' && <Etiquetas job={printJob} />}
  </div>, document.body)
}
