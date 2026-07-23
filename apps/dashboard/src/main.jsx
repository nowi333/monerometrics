import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
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
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <NetworkProvider>
        <App />
      </NetworkProvider>
    </StrictMode>,
  )
}
