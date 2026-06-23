import { useEffect, useRef, useState } from 'react'

/**
 * Charge des donnees via `fetcher`, puis les rafraichit toutes les `interval` ms
 * (live). `ready(d)` decide si la reponse est exploitable (status 'ok') ou vide
 * ('empty'). En cas d'echec d'un rafraichissement alors que des donnees sont
 * deja affichees, on garde l'affichage courant (pas de clignotement) ; on ne
 * passe en 'error' que si rien n'a jamais ete charge.
 *
 * Retourne { data, status } avec status ∈ 'loading' | 'ok' | 'empty' | 'error'.
 */
export function usePolledData(fetcher, ready, deps = [], interval = 30000) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const ref = useRef({ fetcher, ready })

  // Maj de la ref hors render (le polling lira toujours le dernier fetcher/ready).
  useEffect(() => {
    ref.current = { fetcher, ready }
  })

  useEffect(() => {
    let cancelled = false
    let hasData = false

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
          // sinon : echec d'un poll transitoire, on conserve l'affichage courant
        })
    }

    load()
    const id = setInterval(load, interval)
    return () => { cancelled = true; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, status }
}
