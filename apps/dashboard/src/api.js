// API client monerometrics
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.monerometrics.net'

async function fetchJSON(path) {
  const url = `${API_BASE}${path}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`API ${path} returned ${response.status}`)
  }
  return response.json()
}

export const api = {
  health: () => fetchJSON('/health'),
  info: () => fetchJSON('/info'),
  reorgsStats: () => fetchJSON('/reorgs/stats'),
  poolsDistribution: (window = '24h') => fetchJSON(`/pools/distribution?window=${window}`),
  orphansRecent: (limit = 50) => fetchJSON(`/orphans/recent?limit=${limit}`),
  reorgs: (limit = 100) => fetchJSON(`/reorgs?limit=${limit}`),
}
