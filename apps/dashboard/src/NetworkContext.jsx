import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { api } from './api'

const NetworkContext = createContext({ info: null, status: 'loading', lastUpdated: null })

export function NetworkProvider({ children, interval = 30000 }) {
  const [info, setInfo] = useState(null)
  const [status, setStatus] = useState('loading')
  const [lastUpdated, setLastUpdated] = useState(null)
  const hasData = useRef(false)

  useEffect(() => {
    let cancelled = false
    let id = null

    const load = () => {
      api.networkInfo()
        .then(d => {
          if (cancelled) return
          setInfo(d)
          setStatus('ok')
          setLastUpdated(Date.now())
          hasData.current = true
        })
        .catch(() => { if (!cancelled && !hasData.current) setStatus('error') })
    }
    const start = () => { if (!id) id = setInterval(load, interval) }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    const onVisibility = () => {
      if (document.hidden) stop()
      else { load(); start() }
    }

    load()
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [interval])

  return (
    <NetworkContext.Provider value={{ info, status, lastUpdated }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetworkInfo() {
  return useContext(NetworkContext)
}
