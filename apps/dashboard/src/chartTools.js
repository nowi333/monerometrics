/**
 * Greffons de dessin communs aux graphiques : reticule avec ses etiquettes
 * d'axes, et pastille de derniere valeur.
 *
 * Chart.js dessine dans le canevas, ou les variables CSS du theme ne veulent
 * rien dire. Les couleurs sont donc lues sur l'element racine au moment du
 * trace, pour que le theme clair et le theme sombre restent corrects.
 */
function theme(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  } catch {
    return fallback
  }
}

function tag(ctx, text, x, y, align) {
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
  const padX = 5
  const w = ctx.measureText(text).width + padX * 2
  const bx = align === 'right' ? x - w : x
  ctx.fillStyle = theme('--color-dim', '#8b949e')
  ctx.fillRect(bx, y - 8, w, 16)
  ctx.fillStyle = theme('--color-card', '#0b0d12')
  ctx.textBaseline = 'middle'
  ctx.fillText(text, bx + padX, y)
  return w
}

/**
 * Reticule complet : trait vertical et horizontal, valeur sur l'axe des
 * ordonnees, date sur celui des abscisses. Sans l'etiquette horizontale, on
 * sait ce qu'on lit mais pas quand.
 */
export const crosshair = {
  id: 'crosshair',
  afterDraw(chart) {
    try {
      if (!chart.chartArea || !chart.scales?.y) return
      const active = chart.tooltip?.getActiveElements?.()
      if (!active || !active.length) return
      const el = active[0].element
      if (!el) return
      const { ctx, chartArea } = chart
      const x = el.x
      const y = el.y
      ctx.save()
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(139,144,153,0.55)'
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.moveTo(x, chartArea.top)
      ctx.lineTo(x, chartArea.bottom)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(chartArea.left, y)
      ctx.lineTo(chartArea.right, y)
      ctx.stroke()
      ctx.setLineDash([])

      const opts = chart.options?.plugins?.crosshair || {}
      if (opts.format) tag(ctx, opts.format(chart.scales.y.getValueForPixel(y)), chartArea.right, y, 'right')

      const label = opts.labels?.[active[0].index]
      if (label) {
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
        const w = ctx.measureText(label).width + 10
        // L'etiquette de date reste dans le cadre plutot que de deborder.
        const bx = Math.max(chartArea.left, Math.min(x - w / 2, chartArea.right - w))
        tag(ctx, label, bx, chartArea.bottom + 9, 'left')
      }
      ctx.restore()
    } catch { /* un reticule rate ne doit jamais casser le graphique */ }
  },
}

/**
 * Pastille de derniere valeur, collee a l'axe : on lit la valeur courante sans
 * viser la fin de la courbe.
 */
export const lastValueTag = {
  id: 'lastValueTag',
  afterDatasetsDraw(chart) {
    try {
      const opts = chart.options?.plugins?.lastValueTag
      if (!opts?.format) return
      const meta = chart.getDatasetMeta(0)
      const pt = meta?.data?.[meta.data.length - 1]
      if (!pt || !chart.chartArea) return
      const { ctx, chartArea } = chart
      const y = Math.max(chartArea.top + 8, Math.min(pt.y, chartArea.bottom - 8))
      ctx.save()
      ctx.beginPath()
      ctx.setLineDash([2, 3])
      ctx.strokeStyle = opts.color || '#8b949e'
      ctx.globalAlpha = 0.5
      ctx.moveTo(chartArea.left, y)
      ctx.lineTo(chartArea.right, y)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.setLineDash([])
      const text = opts.format(chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1])
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
      const w = ctx.measureText(text).width + 10
      ctx.fillStyle = opts.color || '#8b949e'
      ctx.fillRect(chartArea.right - w, y - 8, w, 16)
      ctx.fillStyle = theme('--color-card', '#0b0d12')
      ctx.textBaseline = 'middle'
      ctx.fillText(text, chartArea.right - w + 5, y)
      ctx.restore()
    } catch { /* idem */ }
  },
}
