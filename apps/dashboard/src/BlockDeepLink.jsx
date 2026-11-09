import { useEffect, useState } from 'react'
import { api } from './api'
import BlockDetailModal from './BlockDetailModal'

const HASH = /^#(block|orphan)=([0-9a-f]{64})$/

// Ouvre la fiche d'un bloc depuis un lien /#block=<hash> (pages statiques,
// partage) ou /#orphan=<hash>, que l'API ne distingue pas d'un bloc canonique.
export default function BlockDeepLink() {
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const open = () => {
      const m = HASH.exec(window.location.hash)
      if (!m) return
      api.blockDetail(m[2])
        .then(d => d && setSelected({
          block: d,
          isOrphan: m[1] === 'orphan',
          agoSeconds: d.timestamp_unix ? Math.floor(Date.now() / 1000) - d.timestamp_unix : null,
        }))
        .catch(() => {})
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])

  const close = () => {
    setSelected(null)
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }

  return <BlockDetailModal selected={selected} onClose={close} />
}
