import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { RequiredMark } from '@/shared/ui/forms/RequiredMark.jsx'
import { useEffect, useId, useState } from 'react'
import { api } from '@/shared/api/api.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import css from './CategoryAutocomplete.module.css'

export function CategoryAutocomplete(props) {
  return <RecordAutocomplete required {...props} />
}

export function RecordAutocomplete({ value, onChange, kind = 'categorias', label = 'Categoria', placeholder = 'Ex.: Bebidas, frutas ou destilados', active: onlyActive = true, productType = 'PADRAO', required = false }) {
  const id = useId()
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [page, setPage] = useState(0)
  const selected = useQueryResource(signal => value ? api[kind].obter(value, signal) : null, [kind, value])
  const query = useQueryResource(signal => open ? api[kind].pagina({ busca: search, ativo: onlyActive ? true : undefined, tipo: kind === 'produtos' ? productType : undefined, pagina: page, tamanho: 20 }, signal) : null, [kind, open, search, page, onlyActive, productType])
  useEffect(() => { const timer = setTimeout(() => { setSearch(text); setPage(0); setActive(-1) }, 300); return () => clearTimeout(timer) }, [text])
  const options = query.loading || query.error || search !== text ? [] : query.data?.itens || []
  function choose(category) { onChange(String(category.id), category); setText(category.name || category.nome); setOpen(false); setActive(-1) }
  const displayed = !open && selected.data && String(selected.data.id) === String(value) ? (selected.data.name || selected.data.nome) : text
  function keys(event) {
    if (event.key === 'Escape') { setOpen(false); return }
    if (event.key === 'Tab') { setOpen(false); return }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(i => Math.max(0, Math.min(options.length - 1, i + (event.key === 'ArrowDown' ? 1 : -1)))) }
    if (event.key === 'Enter' && open) { event.preventDefault(); if (!query.loading && search === text && options[active]) choose(options[active]) }
  }
  return <div className={css.root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <label htmlFor={id}><span>{label}{required && <RequiredMark />}</span></label>
    <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={id + '-options'} aria-activedescendant={open && active >= 0 ? id + '-option-' + active : undefined} aria-label={label} aria-required={required || undefined} autoComplete="off" placeholder={placeholder} value={displayed} onFocus={() => { setOpen(true); if (value && selected.data) setText(selected.data.name || selected.data.nome) }} onChange={event => { setText(event.target.value); onChange(''); setOpen(true); setActive(-1) }} onKeyDown={keys} />
    {open && <div className={css.dropdown}>
      <div id={id + '-options'} role="listbox" aria-label={label + ' — opções disponíveis'}>
        {!query.loading && search === text && options.map((category, index) => <div id={id + '-option-' + index} key={category.id} role="option" aria-selected={active === index} className={css.option} onMouseDown={event => event.preventDefault()} onClick={() => choose(category)}>{category.name || category.nome}</div>)}
      </div>
      {(query.loading || search !== text) ? <p role="status">Buscando opções…</p> : query.error ? <Notice title="Não foi possível buscar opções" onRetry={query.reload}>{query.error.message}</Notice> : !options.length ? <p>Nenhum resultado encontrado.</p> : null}
      {!query.loading && (page > 0 || query.data?.ultima === false) && <div className={css.pager}><button type="button" disabled={!page} onClick={() => { setPage(p => p - 1); setActive(-1) }}>Anteriores</button><button type="button" disabled={query.data?.ultima !== false} onClick={() => { setPage(p => p + 1); setActive(-1) }}>Mais opções</button></div>}
    </div>}
    {selected.loading && value && !open && <small role="status">Carregando seleção…</small>}
    {selected.error && value && <Notice title="Não foi possível carregar a seleção" onRetry={selected.reload}>{selected.error.message}</Notice>}
  </div>
}
