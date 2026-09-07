// Geometrie du carnet, extraite du composant pour une raison precise : la courbe
// tracee et la valeur lue au survol doivent venir du meme endroit. Quand les deux
// vivaient dans le composant, elles ont diverge — le survol rapportait de la
// profondeur au-dela de la derniere marche dessinee.

export const usable = (side) => (side || []).filter(l => l.premium_pct != null)

// La marche est tracee point par point plutot que confiee a `stepped`, dont la
// convention se prete a l'erreur : dessiner la mauvaise moitie de chaque marche
// ferait croire a de la profondeur disponible a un prix ou elle ne l'est pas.
//
// Vente : a un prix p, le cumul est celui de toutes les offres a prix <= p,
// donc la valeur du palier de GAUCHE tient l'intervalle.
// Achat : a un prix p, le cumul est celui des offres a prix >= p,
// donc c'est la valeur du palier de DROITE qui tient l'intervalle.
export const staircase = (levels, carry) => {
  const p = usable(levels)
    .map(l => ({ x: l.premium_pct, y: l.cumulative }))
    .sort((a, b) => a.x - b.x)
  if (!p.length) return []
  const out = [{ x: p[0].x, y: p[0].y }]
  for (let i = 0; i < p.length - 1; i++) {
    const held = carry === 'left' ? p[i].y : p[i + 1].y
    out.push({ x: p[i].x, y: held })
    out.push({ x: p[i + 1].x, y: held })
  }
  out.push({ x: p[p.length - 1].x, y: p[p.length - 1].y })
  return out
}

// Bornes fixees a la main : Chart.js en choisit de plus larges que les donnees,
// et la ou la courbe s'arretait le survol continuait de rapporter.
export const axisBounds = (bids, asks) => {
  const all = [...usable(bids), ...usable(asks)].map(l => l.premium_pct)
  const lo = all.length ? Math.min(...all) : -1
  const hi = all.length ? Math.max(...all) : 1
  const pad = Math.max((hi - lo) * 0.04, 0.5)
  // Arrondi au pourcent entier vers l'exterieur : Chart.js gradue jusqu'aux
  // bornes exactes, et une borne comme -28.446800000000003 s'affichait telle
  // quelle sur l'axe. Elargir ne casse rien, les paliers restent couverts.
  return { xMin: Math.floor(lo - pad), xMax: Math.ceil(hi + pad) }
}

// Sous l'offre d'achat la plus basse, toutes les offres restent preneuses : la
// profondeur est plate, pas absente. Idem au-dela de la vente la plus haute.
export const curves = (bids, asks) => {
  const { xMin, xMax } = axisBounds(bids, asks)
  const b = staircase(bids, 'right')
  const a = staircase(asks, 'left')
  return {
    xMin,
    xMax,
    bids: b.length ? [{ x: xMin, y: b[0].y }, ...b] : b,
    asks: a.length ? [...a, { x: xMax, y: a[a.length - 1].y }] : a,
  }
}

// Profondeur exacte au prix survole, en sommant les paliers atteints, plutot
// qu'en interpolant entre deux points de la courbe.
export const reach = (levels, direction, p) => {
  const hit = usable(levels).filter(l => direction === 'up' ? l.premium_pct <= p : l.premium_pct >= p)
  if (!hit.length) return null
  return {
    cumulative: Math.max(...hit.map(l => l.cumulative)),
    offers: hit.reduce((n, l) => n + (l.offers || 0), 0),
  }
}

// Valeur de la courbe telle qu'elle est reellement dessinee, segment par segment.
// Sert aux tests : c'est la reference contre laquelle `reach` doit tomber juste.
export const curveAt = (points, x) => {
  if (!points.length) return null
  if (x < points[0].x - 1e-9 || x > points[points.length - 1].x + 1e-9) return null
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    if (x >= a.x - 1e-9 && x <= b.x + 1e-9) {
      if (Math.abs(b.x - a.x) < 1e-12) return b.y
      return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x)
    }
  }
  return points[points.length - 1].y
}
