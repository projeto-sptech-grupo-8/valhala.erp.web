import { useLayoutEffect, useRef } from 'react'

const digits = text => text.replace(/\D/g, '')
function format(value) {
  const pattern = value.length <= 11 ? '###.###.###-##' : '##.###.###/####-##'
  let result = '', index = 0
  for (const character of pattern) {
    if (index === value.length) break
    result += character === '#' ? value[index++] : character
  }
  return result
}

export function TaxDocumentInput({ value = '', onChange, disabled }) {
  const input = useRef(null), cursor = useRef(null)
  const raw = digits(value).slice(0, 14)
  function restoreCursor() {
    if (cursor.current == null) return
    const count = cursor.current
    cursor.current = null
    let offset = 0, seen = 0
    const text = input.current.value
    while (offset < text.length && seen < count) {
      if (/\d/.test(text[offset])) seen++
      offset++
    }
    input.current.setSelectionRange(offset, offset)
  }
  useLayoutEffect(restoreCursor, [raw])
  function change(next, position) {
    cursor.current = position
    if (next !== raw) onChange(next)
    else {
      input.current.value = format(raw)
      restoreCursor()
    }
  }
  function remove(event) {
    if (event.key !== 'Backspace' && event.key !== 'Delete') return
    const {value:text, selectionStart:start, selectionEnd:end} = event.currentTarget
    if (start !== end) return
    const before = digits(text.slice(0, start)).length
    const index = event.key === 'Backspace' ? before - 1 : before
    if (index < 0 || index >= raw.length) return
    event.preventDefault()
    change(raw.slice(0,index) + raw.slice(index+1), index)
  }
  return <input ref={input} type="text" inputMode="numeric" disabled={disabled}
    placeholder="Ex.: 123.456.789-09" value={format(raw)} onKeyDown={remove}
    onChange={({currentTarget:el}) => change(digits(el.value).slice(0,14), digits(el.value.slice(0,el.selectionStart)).length)} />
}
