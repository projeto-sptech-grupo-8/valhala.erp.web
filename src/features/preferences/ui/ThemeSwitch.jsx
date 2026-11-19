import { Moon, Sun } from 'lucide-react'
import { useId } from 'react'
import { THEMES } from '@/entities/preferences'
import { useStore } from '@/entities/store'
import s from './ThemeSwitch.module.css'

const ICON = { dark: Moon, light: Sun }

/* Seletor de tema: Escuro | Claro (radiogroup — setas do teclado funcionam nativamente) */
export function ThemeSwitch({ label = 'Tema', compact = false }) {
  const { theme, setTheme } = useStore()
  const groupId = useId()
  return (
    <div className={`${s.root} ${compact ? s.compact : ''}`} role="radiogroup" aria-label={label}>
      {THEMES.map(t => {
        const Icon = ICON[t.id]
        const on = theme === t.id
        return (
          <label key={t.id} className={`${s.option} ${on ? s.selected : ''}`} title={'Usar tema ' + t.label.toLowerCase()}>
            <input type="radio" name={`tema-${groupId}`} value={t.id} checked={on} onChange={() => setTheme(t.id)} />
            <Icon size={14} aria-hidden="true" />
            <span>{t.label}</span>
          </label>
        )
      })}
    </div>
  )
}
