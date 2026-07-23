import { useEffect, useRef } from 'react'

export function useModalDismiss(open, onClose) {
  const cb = useRef(onClose)
  useEffect(() => { cb.current = onClose })

  useEffect(() => {
    if (!open) return
    const prevFocus = document.activeElement
    const onKey = (e) => { if (e.key === 'Escape') cb.current() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      if (prevFocus && prevFocus.focus) prevFocus.focus()
    }
  }, [open])
}
