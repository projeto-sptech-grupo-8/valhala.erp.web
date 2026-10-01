import { Moon, Sun } from 'lucide-react'
import { THEMES } from '../../../lib/theme.js'
import { useStore } from '../useStore.js'
import s from '../dash.module.css'

const ICON = { dark: Moon, light: Sun }

/* Seletor de tema: Escuro | Claro (radiogroup — setas do teclado funcionam nativamente) */
export function ThemeSwitch({ label = 'Tema', compact = false }) {
  const { theme, setTheme } = useStore()
  return (
    <div className={`${s.themeSwitch} ${compact ? s.themeCompact : ''}`} role="radiogroup" aria-label={label}>
      {THEMES.map(t => {
        const Icon = ICON[t.id]
        const on = theme === t.id
        return (
          <label key={t.id} className={on ? s.themeOn : undefined}>
            <input type="radio" name={`tema-${compact ? 'c' : 'f'}`} value={t.id} checked={on} onChange={() => setTheme(t.id)} />
            <Icon size={14} aria-hidden="true" />
            <span>{t.label}</span>
          </label>
        )
      })}
    </div>
  )
}
