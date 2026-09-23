import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setThemeState] = useState(() => {

    if (typeof window === 'undefined') return 'dark'

    // Le stockage peut etre bloque (navigation privee stricte) : il ne doit
    // jamais empecher l'application de demarrer.
    let saved = null
    try { saved = localStorage.getItem('theme') } catch { /* stockage indisponible */ }
    if (saved === 'light' || saved === 'dark') return saved

    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light')
    } else {
      root.removeAttribute('data-theme')
    }
    try { localStorage.setItem('theme', theme) } catch { /* stockage indisponible */ }
  }, [theme])

  const toggleTheme = () => setThemeState(t => (t === 'dark' ? 'light' : 'dark'))
  const setTheme = (newTheme) => setThemeState(newTheme)

  return { theme, toggleTheme, setTheme }
}
