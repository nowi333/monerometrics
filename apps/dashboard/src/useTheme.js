import { useEffect, useState } from 'react'

/**
 * Hook gestion theme dark/light avec persistance localStorage.
 *
 * Logique :
 * 1. Au mount : lire localStorage.theme
 * 2. Si absent : utiliser prefers-color-scheme du systeme
 * 3. Appliquer data-theme sur <html>
 * 4. Persister le choix utilisateur
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    // SSR safety
    if (typeof window === 'undefined') return 'dark'

    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved

    // Fallback : detection systeme
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light')
    } else {
      root.removeAttribute('data-theme')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setThemeState(t => (t === 'dark' ? 'light' : 'dark'))
  const setTheme = (newTheme) => setThemeState(newTheme)

  return { theme, toggleTheme, setTheme }
}
