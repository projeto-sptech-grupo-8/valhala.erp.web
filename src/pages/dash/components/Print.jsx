import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { fmtBRL, fmtDateTime } from '../../../lib/format.js'
import { ean13Modules } from '../../../lib/ean13.js'
import { useStore } from '../useStore.js'
import './print.css'

const money = (n) => fmtBRL(n).replace('R$', '').trim()

/* ─── EAN-13 em SVG (módulos de 1 unidade + zona de silêncio) ─── */
export function Barcode({ code, height = 38 }) {
  const bits = ean13Modules(code)
  if (!bits) return null
  const quiet = 9
  const w = bits.length + quiet * 2
  const bars = []
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== '1') continue
    let j = i
    while (bits[j + 1] === '1') j++
    const guard = i < 3 || (i >= 45 && i < 50) || i >= 92
    bars.push(<rect key={i} x={quiet + i} y="0" width={j - i + 1} height={guard ? height : height - 7} fill="#000" />)
    i = j
  }
  return (
    <svg viewBox={`0 0 ${w} ${height + 2}`} role="img" aria-label={`Código de barras ${code}`} data-ean={code}>
      {bars}
      <text x={w / 2} y={height + 1} textAnchor="middle" fontSize="8" fontFamily="Arial">{code}</text>
    </svg>
  )
}

/* ─── Cupom não fiscal (80 mm) ─── */
function Cupom({ venda, empresa, reimpressao }) {
  const temAlcool = venda.itens.some(i => !['Sem Álcool'].includes(i.cat))
  return (
    <div className="print-thermal" data-doc="cupom">
      <h1>{empresa.nome.toUpperCase()}</h1>
      <p className="c muted">CNPJ {empresa.cnpj}<br />{empresa.endereco}</p>
      <div className="hr" />
      <p className="warn">CUPOM NÃO FISCAL<br />NÃO É DOCUMENTO FISCAL</p>
      {reimpressao && <p className="warn">*** REIMPRESSÃO ***</p>}
      <div className="row"><span>Venda #{venda.num}</span><span>{fmtDateTime(venda.em)}</span></div>
      <div className="row"><span>{venda.mesa} · {venda.canal || 'Mesa'}</span><span>{venda.operador}</span></div>
      <div className="hr" />
      {venda.itens.map(i => (
        <div className="item" key={i.id}>
          <div className="row"><span>{i.qty} x {i.name}</span><span>{money(i.price * i.qty)}</span></div>
          {i.qty > 1 && <small>{money(i.price)} cada</small>}
        </div>
      ))}
      <div className="hr" />
      <div className="row"><span>Subtotal</span><span>{money(venda.subtotal)}</span></div>
      {venda.desconto > 0 && <div className="row"><span>Desconto</span><span>-{money(venda.desconto)}</span></div>}
      <div className="row big"><span>TOTAL</span><span>R$ {money(venda.total)}</span></div>
      {(venda.pagamentos || []).map((p, k) => <div className="row" key={k}><span>{p.forma}</span><span>{money(p.valor)}</span></div>)}
      {venda.troco > 0 && <div className="row"><span>Troco</span><span>{money(venda.troco)}</span></div>}
      <div className="hr" />
      <p className="c">Obrigado pela preferência!</p>
      {temAlcool && <p className="c muted">Venda de bebida alcoólica proibida para menores de 18 anos.</p>}
    </div>
  )
}

/* ─── Comanda do bar (80 mm, letras grandes) ─── */
function Comanda({ job, drinks, products }) {
  return (
    <div className="print-thermal print-comanda" data-doc="comanda">
      <h1>COMANDA · BAR</h1>
      <div className="row big"><span>{job.pedido}</span><span>{fmtDateTime(job.em).split(' · ')[1]}</span></div>
      <div className="hr" />
      {job.itens.map(i => {
        const d = drinks.find(x => x.id === i.id)
        return (
          <div className="drink" key={i.id}>
            <b>{i.qty}  {i.name.toUpperCase()}</b>
            {(d?.receita || []).map((r, k) => {
              const ins = products.find(p => p.id === r.produtoId)
              return <small key={k}>{r.livre ? (r.produtoId || 'insumo livre') : `${ins?.name || r.produtoId} · ${r.quantidade}ml`}</small>
            })}
          </div>
        )
      })}
      <div className="hr" />
      <p className="c muted">{job.itens.reduce((a, i) => a + i.qty, 0)} drink(s)</p>
    </div>
  )
}

/* ─── Etiquetas de gôndola (A4) ─── */
function unitPrice(p) {
  if (!p.volumeEmbalagem) return null
  const litros = p.volumeEmbalagem / 1000
  return { valor: p.price / litros, unidade: 'litro' }
}

function Etiquetas({ job }) {
  const labels = job.itens.flatMap(({ product, copias }) => Array.from({ length: copias }, (_, k) => ({ product, k })))
  return (
    <div className={`print-labels ${job.formato === 'grande' ? 'grande' : ''}`} data-doc="etiquetas">
      {labels.map(({ product: p, k }) => {
        const up = unitPrice(p)
        return (
          <div className="label" key={`${p.id}-${k}`} data-produto={p.id}>
            <div className="name">{p.name}</div>
            <div className="price"><small>R$</small>{money(p.price)}</div>
            <div className="foot">
              <div className="unit">
                {up && <>R$ {money(up.valor)} / {up.unidade}<br /></>}
                {p.id}
              </div>
              {p.ean && <Barcode code={p.ean} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/*
 * Host único de impressão. store.print({ tipo: 'cupom' | 'comanda' | 'etiquetas', ... })
 * renderiza fora do #root e chama window.print(); a página/margem é definida por tipo.
 */
export function PrintHost() {
  const { printJob, clearPrint, config, drinks, products } = useStore()

  useEffect(() => {
    if (!printJob) return
    const after = () => clearPrint()
    window.addEventListener('afterprint', after)
    const t = setTimeout(() => { if (!window.__valhallaNoPrint) window.print() }, 60)
    return () => { clearTimeout(t); window.removeEventListener('afterprint', after) }
  }, [printJob?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!printJob) return null
  const thermal = printJob.tipo !== 'etiquetas'
  const page = thermal ? '@page { margin: 2mm 4mm; }' : '@page { size: A4 portrait; margin: 13mm 7mm; }'
  const empresa = config.empresa || { nome: 'Adega Meraki', cnpj: '00.000.000/0001-00', endereco: 'R. das Bebidas, 420 · São Paulo' }

  return createPortal(
    <div className="print-root" data-kind={printJob.tipo}>
      <style>{`@media print { ${page} }`}</style>
      {printJob.tipo === 'cupom' && <Cupom venda={printJob.venda} empresa={empresa} reimpressao={printJob.reimpressao} />}
      {printJob.tipo === 'comanda' && <Comanda job={printJob} drinks={drinks} products={products} />}
      {printJob.tipo === 'etiquetas' && <Etiquetas job={printJob} />}
    </div>,
    document.body,
  )
}
