import { useEffect, useState } from 'react'

// Couleurs lues dans les variables CSS du theme : ecrites en dur, les
// graduations et la grille restaient pensees pour le fond sombre et
// devenaient presque invisibles en theme clair.
function readTheme() {
  const css = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null
  const v = (name, fallback) => (css && css.getPropertyValue(name).trim()) || fallback
  return {
    dim: v('--color-dim', '#8b9099'),
    grid: v('--color-border', 'rgba(255,255,255,0.08)'),
    success: v('--color-success', '#22c55e'),
    light: typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light',
  }
}

// Teintes vives pensees pour le fond sombre : sur fond clair elles manquaient
// de contraste, on passe a une nuance plus foncee de la meme couleur.
const LIGHT_SHADES = {
  '#ff6600': '#c94a00',
  '#22c55e': '#15803d',
  '#3b82f6': '#1d4ed8',
  '#06b6d4': '#0e7490',
  '#22d3ee': '#0e7490',
}

export function shade(color, light) {
  return (light && LIGHT_SHADES[String(color).toLowerCase()]) || color
}

export function useThemeColors() {
  const [colors, setColors] = useState(readTheme)
  useEffect(() => {
    // Le theme bascule par un attribut sur <html> : on relit les couleurs a
    // chaque changement pour redessiner sans recharger.
    const obs = new MutationObserver(() => setColors(readTheme()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return colors
}
