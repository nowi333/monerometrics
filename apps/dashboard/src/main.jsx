import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { i18nReady } from './i18n'
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
