import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { i18nReady } from './i18n'
import { prefetch } from './api'
import App from './App.jsx'
import { NetworkProvider } from './NetworkContext'

const ONION_HOST = '6wbhchvavey26lbtscl6w6qg76balycixtsklcggrsslyk4xah6sbbad.onion'

const ALLOWED_HOSTS = [
  'monerometrics.net',
  'www.monerometrics.net',
  ...(ONION_HOST ? [ONION_HOST] : []),
]

if (import.meta.env.PROD && !ALLOWED_HOSTS.includes(window.location.hostname)) {
  window.location.replace('https://monerometrics.net/')
} else {
  // Theme choisi applique tout de suite, pour que le squelette ait deja la
  // bonne couleur (useTheme le reprend ensuite).
  try {
    const saved = localStorage.getItem('theme')
    const light = saved ? saved === 'light' : window.matchMedia('(prefers-color-scheme: light)').matches
    if (light) document.documentElement.setAttribute('data-theme', 'light')
  } catch { /* stockage indisponible */ }
  // Le haut de page part chercher ses donnees pendant que la langue se charge,
  // au lieu d'attendre le montage des composants.
  if (window.location.pathname.replace(/\/$/, '') !== '/docs') {
    prefetch(['/status', '/network/info', '/news', '/price', '/chain/fork-window?limit=250'])
  }
  // On attend la langue du visiteur avant le premier rendu : sans cela la page
  // s'afficherait un instant en anglais avant de basculer.
  i18nReady.then(() => createRoot(document.getElementById('root')).render(
    <StrictMode>
      <NetworkProvider>
        <App />
      </NetworkProvider>
    </StrictMode>,
  ))
}
