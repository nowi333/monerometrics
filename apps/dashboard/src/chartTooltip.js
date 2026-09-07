// Une seule bulle de survol pour tous les graphiques, calquee sur celle de la
// profondeur du carnet : fond de carte, pastille coloree, intitule au-dessus
// de la valeur. Chart.js dessine ses infobulles dans le canevas, ou les
// variables CSS du theme ne veulent rien dire ; celle-ci est du HTML, elle
// suit donc le theme clair comme le sombre sans conversion.

let el = null

// Un seul element pour toute la page : il ne peut y avoir qu'une bulle a la
// fois, et le placer sur <body> le met hors de portee des rendus de React.
function element() {
  if (el) return el
  el = document.createElement('div')
  el.setAttribute('role', 'presentation')
  Object.assign(el.style, {
    position: 'fixed',
    zIndex: '60',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 120ms ease',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-card)',
    boxShadow: '0 8px 24px rgba(0,0,0,.28)',
    font: '400 12px/1.35 system-ui, -apple-system, sans-serif',
    maxWidth: '260px',
  })
  document.body.appendChild(el)
  return el
}

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/**
 * Gestionnaire `external` de Chart.js.
 *
 * Chaque ligne du corps peut porter deux entrees : la premiere sert
 * d'intitule, les suivantes de valeur. Un `label` qui renvoie un tableau
 * `[nom, valeur]` produit donc la meme mise en forme que le carnet.
 */
export function externalTooltip(context) {
  const { chart, tooltip } = context
  const box = element()

  if (!tooltip || tooltip.opacity === 0) {
    box.style.opacity = '0'
    return
  }

  const title = (tooltip.title || []).join(' ')
  const rows = (tooltip.body || []).map((b, i) => {
    const lines = b.lines || []
    const color = (tooltip.labelColors || [])[i] || {}
    const dot = color.borderColor || color.backgroundColor || 'var(--color-dim)'
    const head = lines[0] != null ? esc(lines[0]) : ''
    const rest = lines.slice(1).map(esc).join(' · ')
    return `
      <div style="display:flex;align-items:flex-start;gap:8px;margin-top:2px">
        <span style="flex:none;width:8px;height:8px;border-radius:50%;margin-top:4px;background:${esc(dot)}"></span>
        <span style="min-width:0">
          ${rest
            ? `<span style="display:block;color:var(--color-dim)">${head}</span>
               <span style="display:block;font-family:ui-monospace,monospace;color:var(--color-text)">${rest}</span>`
            : `<span style="display:block;font-family:ui-monospace,monospace;color:var(--color-text)">${head}</span>`}
        </span>
      </div>`
  }).join('')

  box.innerHTML = `${title
    ? `<div style="font-family:ui-monospace,monospace;color:var(--color-text);margin-bottom:6px">${esc(title)}</div>`
    : ''}${rows}`

  // Position figee dans la fenetre, bornee par le canevas : la bulle suit le
  // curseur mais ne sort jamais du graphique, meme au ras des bords.
  const r = chart.canvas.getBoundingClientRect()
  box.style.opacity = '1'
  const w = box.offsetWidth
  const h = box.offsetHeight
  const flip = tooltip.caretX + 12 + w > r.width
  const left = Math.min(
    Math.max(r.left + (flip ? tooltip.caretX - w - 12 : tooltip.caretX + 12), r.left + 2),
    Math.max(r.right - w - 2, r.left + 2),
  )
  const top = Math.min(Math.max(r.top + tooltip.caretY - h / 2, r.top + 2), Math.max(r.bottom - h - 2, r.top + 2))
  box.style.left = `${Math.round(left)}px`
  box.style.top = `${Math.round(top)}px`
}

// Options a etaler dans `plugins.tooltip` de n'importe quel graphique.
export const tooltipPlugin = { enabled: false, external: externalTooltip }
