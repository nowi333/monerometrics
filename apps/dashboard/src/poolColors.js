

export const POOL_COLORS = {
  'supportxmr.com': '#ff6600',
  'nanopool.org': '#06b6d4',
  'hashvault.pro': '#22c55e',
  'p2pool': '#3b82f6',
  'moneroocean.stream': '#a78bfa',
  'c3pool.com': '#f59e0b',
  'kryptex.com': '#ec4899',
  'herominers.com': '#ef4444',
  'xmrpool.eu': '#14b8a6',
  'monerohash.com': '#84cc16',
  'unknown': '#6b7280',
}

export function poolColor(pool) {
  return POOL_COLORS[pool] || POOL_COLORS['unknown']
}
