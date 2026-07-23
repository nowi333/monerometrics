import { useEffect, useRef, useState } from 'react'

const readTheme = () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark')

export default function TradingViewMini({ symbol = 'KRAKEN:XMRUSD', locale = 'en' }) {
  const ref = useRef(null)
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(readTheme()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = '<div class="tradingview-widget-container__widget"></div>'
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol,
      width: '100%',
      isTransparent: true,
      colorTheme: theme,
      locale,
    })
    el.appendChild(script)
    return () => { el.innerHTML = '' }
  }, [symbol, locale, theme])

  return <div ref={ref} className="tradingview-widget-container" style={{ width: '100%' }} />
}
