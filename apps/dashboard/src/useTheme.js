import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setThemeState] = useState(() => {

    if (typeof window === 'undefined') return 'dark'

    const saved = localStorage.getItem('theme')
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
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setThemeState(t => (t === 'dark' ? 'light' : 'dark'))
  const setTheme = (newTheme) => setThemeState(newTheme)

  return { theme, toggleTheme, setTheme }
}
