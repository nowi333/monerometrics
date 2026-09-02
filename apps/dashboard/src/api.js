

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
  orphansRecent: (limit = 50) => fetchJSON(`/orphans/recent?limit=${limit}`),
  reorgs: (limit = 100) => fetchJSON(`/reorgs?limit=${limit}`),

  networkInfo: () => fetchJSON('/network/info'),
  networkHashrate: (window = '30d') => fetchJSON(`/network/hashrate?window=${window}`),
  networkBlocktime: (window = '24h') => cachedJSON(`/network/blocktime?window=${window}`),
  networkMempool: (window = '24h') => fetchJSON(`/network/mempool?window=${window}`),
  networkEmission: (window = '30d') => fetchJSON(`/network/emission?window=${window}`),
  chainForkWindow: (limit = 250, to = null) => fetchJSON(`/chain/fork-window?limit=${limit}${to != null ? `&to=${to}` : ''}`),
  chainWindow: (from, to) => fetchJSON(`/chain/window?from=${from}&to=${to}`),
  blockDetail: (hash) => fetchJSON(`/chain/block/${hash}`),
  chainProvenance: (window = '24h') => fetchJSON(`/chain/provenance?window=${window}`),
  price: () => fetchJSON('/price'),
  priceSpread: (window = '7d') => fetchJSON(`/price/spread?window=${window}`),
  havenoMethods: (window = '180d', currency = 'USD') => fetchJSON(`/haveno/methods?window=${window}&currency=${currency}`),
  havenoLiquidity: (window = '90d', currency = 'USD') => fetchJSON(`/haveno/liquidity?window=${window}&currency=${currency}`),
  havenoTrades: (limit = 100, currency = 'USD') => fetchJSON(`/haveno/trades?limit=${limit}&currency=${currency}`),
  havenoBook: () => fetchJSON('/haveno/book'),
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
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
