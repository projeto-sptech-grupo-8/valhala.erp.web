import { ChevronRight } from 'lucide-react'
import { pages } from '../pages.js'
import s from '../dash.module.css'

/* ─── Cabeçalho de página: breadcrumb + título + descrição ─── */
export function PageHeader({ page, navigate, extra }) {
  const meta = pages[page]
  if (!meta) return null
  const parent = meta.parent && pages[meta.parent]

  return (
    <header className={s.pageHeader}>
      <nav aria-label="Trilha de navegação" className={s.crumbs}>
        <ol>
          {meta.section !== (extra || meta.title) && <li>{meta.section}</li>}
          {parent && (
            <li>
              <ChevronRight size={12} aria-hidden="true" />
              <a href={`#/${meta.parent}`} onClick={e => { e.preventDefault(); navigate(meta.parent) }}>{parent.title}</a>
            </li>
          )}
          <li aria-current="page">
            {(parent || meta.section !== (extra || meta.title)) && <ChevronRight size={12} aria-hidden="true" />}
            {extra || meta.title}
          </li>
        </ol>
      </nav>
      <h1>{extra || meta.title}</h1>
      <p>{meta.desc}</p>
    </header>
  )
}
