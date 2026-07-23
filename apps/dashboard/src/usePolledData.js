import { useEffect, useRef, useState } from 'react'

export function usePolledData(fetcher, ready, deps = [], interval = 30000) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const ref = useRef({ fetcher, ready })


  useEffect(() => {
    ref.current = { fetcher, ready }
  })

  useEffect(() => {
    let cancelled = false
    let hasData = false
    let id = null

    const load = () => {
      ref.current.fetcher()
        .then(d => {
          if (cancelled) return
          if (ref.current.ready(d)) { hasData = true; setData(d); setStatus('ok') }
          else { hasData = false; setData(null); setStatus('empty') }
        })
        .catch(() => {
          if (cancelled) return
          if (!hasData) { setData(null); setStatus('error') }

        })
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

  }, deps)

  return { data, status }
}
