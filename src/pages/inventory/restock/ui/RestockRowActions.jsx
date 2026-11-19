import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal, History, Pencil, ArrowDownToLine } from 'lucide-react'
import s from '@/pages/catalog/products/ui/ProductsPage.module.css'

export function RestockRowActions({ product, can, navigate }) {
  const trigger = useRef(null)
  const menu = useRef(null)
  const [position, setPosition] = useState(null)
  function close(restore = false) { setPosition(null); if (restore) trigger.current?.focus() }
  useEffect(() => {
    if (!position) return
    menu.current?.querySelector('button')?.focus({ preventScroll: true })
    const outside = e => { if (!menu.current?.contains(e.target) && !trigger.current?.contains(e.target)) close() }
    const dismiss = () => close()
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', dismiss)
    window.addEventListener('wheel', dismiss, { capture: true, passive: true })
    window.addEventListener('touchmove', dismiss, { capture: true, passive: true })
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', dismiss); window.removeEventListener('wheel', dismiss, true); window.removeEventListener('touchmove', dismiss, true) }
  }, [position])
  function open() {
    if (position) { close(true); return }
    const rect = trigger.current.getBoundingClientRect()
    setPosition({ left: Math.max(8, Math.min(rect.right - 208, window.innerWidth - 216)), top: rect.bottom + 170 > window.innerHeight ? Math.max(8, rect.top - 160) : rect.bottom + 6 })
  }
  function action(callback) { close(true); callback() }
  function keys(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(true) }
    if (event.key === 'Tab') close()
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const items = [...menu.current.querySelectorAll('button')]
      const current = items.indexOf(document.activeElement)
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      items[index]?.focus()
    }
  }
  return <>
    <button ref={trigger} type="button" className={s.more} aria-label={`Ações de ${product.nome}`} aria-haspopup="menu" aria-expanded={!!position} onClick={open}><MoreHorizontal size={19} aria-hidden="true" /></button>
    {position && createPortal(<div ref={menu} role="menu" aria-label={`Opções de ${product.nome}`} className={s.menu} style={position} onKeyDown={keys}>
      <button role="menuitem" onClick={() => action(() => navigate('movimentacoes', { produtoId: product.produtoId }))}><History size={15} aria-hidden="true" />Ver histórico</button>
      {can('GERENCIAR_ESTOQUE') && <button role="menuitem" onClick={() => action(() => navigate('editar', { id: product.produtoId }))}><Pencil size={15} aria-hidden="true" />Editar produto e mínimo</button>}
      {can('MOVIMENTAR_ESTOQUE') && <button role="menuitem" onClick={() => action(() => navigate('novamovimentacao', { produto: product.produtoId }))}><ArrowDownToLine size={15} aria-hidden="true" />Registrar entrada</button>}
    </div>, document.body)}
  </>
}
