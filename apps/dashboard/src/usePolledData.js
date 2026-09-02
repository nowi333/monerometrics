import { useEffect, useRef, useState } from 'react'
import { markRefreshed } from './refreshStore'

// Delais de reprise, en millisecondes. La limite de debit de l'API glisse sur
// soixante secondes : quelques secondes suffisent presque toujours a liberer
// une place, inutile d'attendre le Retry-After complet.
const RETRIES = [1200, 3500]
const JITTER_MS = 700

export function usePolledData(fetcher, ready, deps = [], interval = 30000) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  // Horodatage de la derniere reponse exploitable : chaque panneau peut ainsi
  // dater sa mesure sans refaire d'appel.
  const [updatedAt, setUpdatedAt] = useState(null)
  const ref = useRef({ fetcher, ready })


  useEffect(() => {
    ref.current = { fetcher, ready }
  })

  useEffect(() => {
    let cancelled = false
    let hasData = false
    let id = null
    let retryId = null
    let firstId = null

    // Un refus passager ne doit pas vider le panneau. C'est surtout vrai au
    // changement de fenetre : la requete repart de zero, et sans reprise le
    // premier 429 affichait « erreur API » alors que la suivante aurait abouti.
    const transient = (e) => {
      const s = e && e.status
      return s === undefined || s === 429 || s === 408 || (s >= 500 && s < 600)
    }

    const load = (attempt = 0) => {
      ref.current.fetcher()
        .then(d => {
          if (cancelled) return
          if (ref.current.ready(d)) { hasData = true; setData(d); setStatus('ok'); setUpdatedAt(Date.now()); markRefreshed() }
          else { hasData = false; setData(null); setStatus('empty') }
        })
        .catch(e => {
          if (cancelled) return
          if (transient(e) && attempt < RETRIES.length) {
            retryId = setTimeout(() => load(attempt + 1), RETRIES[attempt])
            return
          }
          if (!hasData) { setData(null); setStatus('error') }
        })
    }



    const start = () => { if (!id) id = setInterval(load, interval) }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    const onVisibility = () => {
      if (document.hidden) stop()
      else { load(); start() }
    }

    // Seize panneaux qui demarrent ensemble envoyaient dix-sept requetes dans la
    // meme seconde. Un decalage aleatoire etale la rafale sans retarder
    // perceptiblement l'affichage.
    firstId = setTimeout(() => load(), Math.random() * JITTER_MS)
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      stop()
      if (retryId) clearTimeout(retryId)
      if (firstId) clearTimeout(firstId)
      document.removeEventListener('visibilitychange', onVisibility)
    }

  }, [interval, ...deps])

  return { data, status, updatedAt }
}
