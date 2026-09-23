import i18n from './i18n'


const isOnion = typeof window !== 'undefined' && window.location.hostname.endsWith('.onion')

const API_BASE = isOnion
  ? '/api'
  : import.meta.env.VITE_API_URL || 'https://api.monerometrics.net'

async function fetchJSON(path) {
  const url = `${API_BASE}${path}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    const err = new Error(`API ${path} returned ${response.status}`)
    // Le code permet a l'appelant de distinguer un refus passager (429, 5xx)
    // d'une vraie erreur, et de reessayer plutot que de vider le panneau.
    err.status = response.status
    throw err
  }
  return response.json()
}

// Le hash d'une recherche voyage dans le corps, jamais dans l'URL : il
// n'apparait ainsi ni dans les journaux d'acces ni dans l'historique.
async function postJSON(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const err = new Error(`API ${path} returned ${response.status}`)
    err.status = response.status
    throw err
  }
  return response.json()
}

const shortCache = new Map()

function cachedJSON(path, ttl = 25000) {
  const now = Date.now()
  const hit = shortCache.get(path)
  if (hit && now - hit.at < ttl) return hit.promise
  const promise = fetchJSON(path).catch(e => { shortCache.delete(path); throw e })
  shortCache.set(path, { at: now, promise })
  return promise
}

export const api = {

  health: () => fetchJSON('/health'),
  info: () => fetchJSON('/info'),
  usageExternal: () => fetchJSON('/usage/external'),

  reorgsStats: () => fetchJSON('/reorgs/stats'),
  poolsDistribution: (window = '24h') => fetchJSON(`/pools/distribution?window=${window}`),
  poolsSources: () => fetchJSON('/pools/sources'),
  orphansRecent: (window = '7d') => fetchJSON(`/orphans/recent?window=${window}`),
  reorgs: (limit = 100) => fetchJSON(`/reorgs?limit=${limit}`),

  networkInfo: () => fetchJSON('/network/info'),
  networkHashrate: (window = '30d') => fetchJSON(`/network/hashrate?window=${window}`),
  networkBlocktime: (window = '24h') => cachedJSON(`/network/blocktime?window=${window}`),
  networkMempool: (window = '24h') => fetchJSON(`/network/mempool?window=${window}`),
  networkEmission: (window = '30d') => fetchJSON(`/network/emission?window=${window}`),
  chainForkWindow: (limit = 250, to = null) => fetchJSON(`/chain/fork-window?limit=${limit}${to != null ? `&to=${to}` : ''}`),
  chainWindow: (from, to) => fetchJSON(`/chain/window?from=${from}&to=${to}`),
  blockDetail: (hash) => fetchJSON(`/chain/block/${hash}`),
  search: (query) => postJSON('/chain/search', { query }),
  chainProvenance: (window = '24h') => fetchJSON(`/chain/provenance?window=${window}`),
  price: () => fetchJSON('/price'),
  priceSpread: (window = '7d') => fetchJSON(`/price/spread?window=${window}`),
  havenoMethods: (window = '180d', currency = 'USD') => fetchJSON(`/haveno/methods?window=${window}&currency=${currency}`),
  havenoLiquidity: (window = '90d', currency = 'USD') => fetchJSON(`/haveno/liquidity?window=${window}&currency=${currency}`),
  havenoTrades: (limit = 100, currency = 'USD') => fetchJSON(`/haveno/trades?limit=${limit}&currency=${currency}`),
  havenoBook: () => fetchJSON('/haveno/book'),
  status: () => fetchJSON('/status'),
  news: () => fetchJSON('/news'),
  networkFees: () => fetchJSON('/network/fees'),
  networkFeesHistory: (window = '30d') => fetchJSON(`/network/fees/history?window=${window}`),
}

export function formatHashrate(hs) {
  if (!hs) return '-'
  if (hs >= 1e12) return `${(hs / 1e12).toFixed(2)} TH/s`
  if (hs >= 1e9) return `${(hs / 1e9).toFixed(2)} GH/s`
  if (hs >= 1e6) return `${(hs / 1e6).toFixed(2)} MH/s`
  if (hs >= 1e3) return `${(hs / 1e3).toFixed(2)} kH/s`
  return `${hs} H/s`
}

export function timeAgo(seconds) {
  if (seconds === null || seconds === undefined) return '-'
  const lang = i18n.language || 'en'
  const units = [[86400, 'day'], [3600, 'hour'], [60, 'minute'], [1, 'second']]
  const [size, unit] = units.find(([u]) => seconds >= u) || units[3]
  try {
    // « narrow » donne « 7d ago » en anglais mais « -7 j » en francais :
    // on ne le garde que pour l'anglais.
    const style = lang.startsWith('en') ? 'narrow' : 'short'
    return new Intl.RelativeTimeFormat(lang, { numeric: 'always', style })
      .format(-Math.floor(seconds / size), unit)
  } catch {
    return `${Math.floor(seconds / size)}${unit[0]} ago`
  }
}
