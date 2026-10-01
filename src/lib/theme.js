/*
 * Tema do painel (claro / escuro).
 * Aplicado em <html data-theme> só enquanto o painel está aberto — landing e login são sempre escuros.
 * index.html aplica o tema salvo antes do primeiro paint (sem "piscar" ao recarregar).
 */
export const THEME_KEY = 'valhalla:tema'
export const THEMES = [
  { id: 'dark', label: 'Escuro' },
  { id: 'light', label: 'Claro' },
]

const META = { dark: '#161412', light: '#f6f3ee' }

export function readTheme() {
  try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark' } catch { return 'dark' }
}

export function saveTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme) } catch { /* storage indisponível */ }
}

export function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'light') root.dataset.theme = 'light'
  else delete root.dataset.theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[theme] || META.dark)
}

export function clearTheme() {
  applyTheme('dark')
}
