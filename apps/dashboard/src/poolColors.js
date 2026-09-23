

// Aucune couleur de pool ne reprend celles qui ont un sens ailleurs sur le
// site (rouge d'alerte, vert de succes, ambre de vigilance). supportxmr garde
// l'orange Monero, sa couleur historique sur le site.
export const POOL_COLORS = {
  'supportxmr.com': '#ff6600',
  'p2pool': '#6366f1',
  'hashvault.pro': '#d946ef',
  'nanopool.org': '#14b8a6',
  'moneroocean.stream': '#a855f7',
  'kryptex.com': '#ec4899',
  'c3pool.com': '#64748b',
  'herominers.com': '#1e40af',
  'xmrpool.eu': '#06b6d4',
  'ownblock.xyz': '#a8a29e',
  'monerohash.com': '#7dd3fc',
  'unknown': '#6b7280',
}

export function poolColor(pool) {
  return POOL_COLORS[pool] || POOL_COLORS['unknown']
}
