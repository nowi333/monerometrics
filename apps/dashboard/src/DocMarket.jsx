import { useTranslation } from 'react-i18next'
import { api } from './api'
import { usePolledData } from './usePolledData'

/**
 * Les deux sections « marche » de la documentation, en schemas plutot qu'en
 * paragraphes. Les chiffres viennent de l'API en direct : un schema qui
 * montre le marche d'aujourd'hui explique mieux qu'un exemple fige, et ne
 * vieillit pas.
 */

const card = { background: 'var(--color-card)', borderColor: 'var(--color-border)' }
const BUY = 'var(--color-accent)'
const SELL = 'var(--color-info)'

// En dessous, la moyenne d'une methode tient a trois ou quatre echanges et ne
// dit rien. La documentation l'affirme, le schema doit s'y tenir.
const MIN_TRADES = 10

// Noms propres, sauf deux intitules generiques qui se traduisent.
const METHOD_NAMES = {
  TRANSFERWISE_USD: 'Wise', PAYPAL: 'PayPal', CASH_APP: 'Cash App', VENMO: 'Venmo',
  ZELLE: 'Zelle', REVOLUT: 'Revolut', ACH_TRANSFER: 'ACH', SWIFT: 'SWIFT',
}

function useFmt() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return {
    usd: (v) => v == null ? '—' : '$' + v.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    pct: (v, digits = Math.abs(v ?? 1) < 0.1 ? 2 : 1) => v == null ? '—'
      : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toLocaleString(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }) + ' %',
  }
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] rounded-full border px-2.5 py-1"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-dim)' }}>
      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--color-dim)' }} />
      {children}
    </span>
  )
}

function Title({ children, lead }) {
  return (
    <>
      <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>{children}</h2>
      {lead && <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>{lead}</p>}
    </>
  )
}

function Icon({ d, color }) {
  return (
    <span className="shrink-0 inline-flex items-center justify-center rounded-lg"
      style={{ width: 32, height: 32, background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Prix de l'XMR                                                        */
/* ------------------------------------------------------------------ */

/**
 * L'echelle des prix : les deux cotes du carnet de part et d'autre du spot.
 * L'ordre est fixe plutot que proportionnel au prix : quand la meilleure
 * offre colle au spot, une echelle proportionnelle superposerait les deux
 * lignes. Ce qui compte ici, c'est la structure, et l'ecart est ecrit en clair.
 */
function PriceLadder({ p }) {
  const { t } = useTranslation()
  const f = useFmt()
  const rows = [
    { key: 'askAvg', price: p?.haveno_ask_avg, pct: p?.ask_avg_premium_pct, color: BUY, strong: true },
    { key: 'ask', price: p?.haveno_ask, pct: p?.ask_premium_pct, color: BUY },
    { key: 'spot', price: p?.official_usd, pct: null, color: 'var(--color-text)', spot: true },
    { key: 'bid', price: p?.haveno_bid, pct: p?.bid_premium_pct, color: SELL },
    { key: 'bidAvg', price: p?.haveno_bid_avg, pct: p?.bid_avg_premium_pct, color: SELL, strong: true },
  ]
  const ROW = 44

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 sm:gap-5 max-w-2xl">
      <div className="relative" style={{ height: ROW * rows.length }}>
        {/* L'axe vertical qui relie les cinq prix. */}
        <span className="absolute w-px" style={{ left: 7, top: ROW / 2, bottom: ROW / 2, background: 'var(--color-border)' }} />
        {rows.map((r, i) => (
          <div key={r.key} className="absolute left-0 right-0 flex items-center gap-3" style={{ top: i * ROW, height: ROW }}>
            <span className="relative z-10 rounded-full shrink-0"
              style={{
                width: r.spot ? 15 : 11, height: r.spot ? 15 : 11, marginLeft: r.spot ? 0 : 2,
                background: r.spot ? 'var(--color-card)' : r.color,
                border: r.spot ? '2px solid var(--color-text)' : 'none',
                boxShadow: r.strong ? `0 0 0 3px color-mix(in srgb, ${r.color} 22%, transparent)` : 'none',
              }} />
            {/* Sur deux etages en dessous de 640 px : libelle, prix et ecart ne
                tiennent pas sur une ligne de telephone sans couper le libelle. */}
            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 leading-tight">
              <span className="text-[11px] sm:text-sm sm:truncate" style={{ color: r.spot ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
                {t(`doc.mkt.ladder.${r.key}`)}
              </span>
              <span className="flex items-baseline gap-2 shrink-0 font-mono">
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>{f.usd(r.price)}</span>
                {!r.spot && (
                  <span className="text-[11px] w-14 text-right" style={{ color: r.color }}>{f.pct(r.pct)}</span>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Une seule accolade : l'aller-retour, ecart entre les deux moyennes.
          Les primes de chaque cote sont deja ecrites sur leur ligne ; les
          repeter en accolades encombrait le schema sans rien apprendre. */}
      <div className="relative hidden sm:block w-[104px]" style={{ height: ROW * rows.length }}>
        <Brace top={ROW * 0.5} bottom={ROW * 4.5} color="var(--color-text)"
          label={t('doc.mkt.ladder.roundTrip')} value={f.pct(p?.round_trip_cost_pct)} />
      </div>
      {/* Sur un telephone, l'accolade prenait la place des libelles, qui
          finissaient tronques. L'aller-retour passe alors sous l'echelle. */}
      <div className="sm:hidden col-span-2 flex items-baseline justify-between border-t pt-3 mt-1" style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-dim)' }}>{t('doc.mkt.ladder.roundTrip')}</span>
        <span className="text-lg font-mono font-medium" style={{ color: 'var(--color-text)' }}>{f.pct(p?.round_trip_cost_pct)}</span>
      </div>
    </div>
  )
}

function Brace({ top, bottom, color, label, value }) {
  const h = bottom - top
  return (
    <div className="absolute left-0 right-0" style={{ top, height: h }}>
      <span className="absolute left-0 w-2.5 border-t border-b border-r rounded-r"
        style={{ top: 0, height: h, borderColor: 'var(--color-border)' }} />
      <div className="absolute flex flex-col justify-center leading-tight whitespace-nowrap" style={{ left: 16, top: 0, height: h }}>
        <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-dim)' }}>{label}</span>
        <span className="text-base sm:text-lg font-mono font-medium" style={{ color }}>{value}</span>
      </div>
    </div>
  )
}

/** Carnet en escalier, schematique : la forme, pas les chiffres du jour. */
function DepthSketch() {
  const { t } = useTranslation()
  // Chaque marche est un niveau de prix ; la hauteur cumule ce qui est dispo.
  const bids = [18, 30, 38, 52, 60]
  const asks = [10, 26, 46, 70, 92, 110]
  const W = 320, H = 130, mid = W / 2, step = 24, base = H - 18
  const path = (levels, dir) => {
    let x = mid, y = base, d = `M${mid},${base}`
    levels.forEach(v => {
      const ny = base - v
      d += ` L${x},${ny}`
      x += dir * step
      d += ` L${x},${ny}`
      y = ny
    })
    void y
    return d
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={t('doc.mkt.depth.alt')}>
      <line x1="10" x2={W - 10} y1={base} y2={base} stroke="var(--color-border)" />
      <path d={path(bids, -1)} fill="none" stroke={SELL} strokeWidth="2" strokeLinejoin="round" />
      <path d={path(asks, 1)} fill="none" stroke={BUY} strokeWidth="2" strokeLinejoin="round" />
      <line x1={mid} x2={mid} y1="8" y2={base} stroke="var(--color-text)" strokeDasharray="3 3" opacity=".6" />
      <text x={mid} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--color-dim)">spot</text>
      <text x={mid - 76} y={base - 70} textAnchor="middle" fontSize="10" fill={SELL}>{t('doc.mkt.depth.bids')}</text>
      <text x={mid + 78} y={base - 98} textAnchor="middle" fontSize="10" fill={BUY}>{t('doc.mkt.depth.asks')}</text>
    </svg>
  )
}

export function DocPrice() {
  const { t } = useTranslation()
  const f = useFmt()
  const { data: p } = usePolledData(() => api.price(), d => !!(d && d.official_usd), [], 60000)

  return (
    <section className="rounded-lg border p-5 sm:p-6" style={card}>
      <Title lead={t('doc.mkt.priceLead')}>{t('doc.price.title')}</Title>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {[
          { k: 'spot', color: 'var(--color-text-secondary)', value: p?.official_usd,
            icon: <><path d="M3 21h18M5 21V10l7-5 7 5v11" /><path d="M9 21v-6h6v6" /></> },
          { k: 'street', color: BUY, value: p?.haveno_ask_avg,
            icon: <><circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" /><path d="M3 20c0-3 2.5-5 5-5s5 2 5 5M11 20c0-3 2.5-5 5-5s5 2 5 5" /></> },
        ].map(c => (
          <div key={c.k} className="mm-node rounded-lg border p-4 flex gap-3">
            <Icon d={c.icon} color={c.color} />
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-dim)' }}>{t(`doc.mkt.${c.k}.label`)}</div>
              <div className="text-xl font-mono mt-0.5" style={{ color: 'var(--color-text)' }}>{f.usd(c.value)}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t(`doc.mkt.${c.k}.what`)}</div>
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('doc.mkt.ladder.title')}</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--color-dim)' }}>{t('doc.mkt.ladder.lead')}</p>
      <div className="mm-node rounded-lg border p-4 sm:p-5 mb-6">
        <PriceLadder p={p} />
      </div>

      <div className="grid sm:grid-cols-[1fr_1.1fr] gap-4 sm:gap-6 items-center mb-5">
        <div className="mm-node rounded-lg border p-3"><DepthSketch /></div>
        <div>
          <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('doc.mkt.depth.title')}</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.mkt.depth.text')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['usd', 'ads', 'lastTrade', 'since'].map(k => <Chip key={k}>{t(`doc.mkt.limits.${k}`)}</Chip>)}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Donnees Haveno                                                       */
/* ------------------------------------------------------------------ */

function MethodBars({ methods }) {
  const { t } = useTranslation()
  const f = useFmt()
  const rows = methods
    .filter(m => m.trades >= MIN_TRADES && m.avg_premium_pct != null)
    .sort((a, b) => b.avg_premium_pct - a.avg_premium_pct)
  const max = Math.max(1, ...rows.map(r => Math.abs(r.avg_premium_pct)))
  const name = (m) => METHOD_NAMES[m] || t(`doc.mkt.method.${m}`, { defaultValue: m.replace(/_/g, ' ').toLowerCase() })

  return (
    <div className="space-y-2">
      {rows.map(m => {
        const color = m.reversible ? 'var(--color-danger)' : 'var(--color-success)'
        return (
          <div key={m.payment_method} className="grid grid-cols-[92px_1fr_auto] sm:grid-cols-[128px_1fr_auto] items-center gap-3">
            <span className="text-xs leading-tight" style={{ color: 'var(--color-text)' }}>{name(m.payment_method)}</span>
            <span className="h-2.5 rounded-full relative" style={{ background: 'color-mix(in srgb, var(--color-border) 55%, transparent)' }}>
              <span className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${Math.max(2, Math.abs(m.avg_premium_pct) / max * 100)}%`, background: color }} />
            </span>
            <span className="text-xs font-mono w-[76px] text-right" style={{ color }}>
              {f.pct(m.avg_premium_pct)}
              <span className="block text-[10px]" style={{ color: 'var(--color-dim)' }}>{t('doc.mkt.trades', { n: m.trades })}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function DocHaveno() {
  const { t, i18n } = useTranslation()
  const { data, status } = usePolledData(() => api.havenoMethods('180d', 'USD'), d => !!(d && d.methods?.length), [], 600000)

  const MIRROR = [
    { k: 'trades', icon: <><path d="M7 7h11l-3-3M17 17H6l3 3" /></> },
    { k: 'book', icon: <><path d="M4 20V10M9 20V4M14 20v-8M19 20v-5" /></> },
    { k: 'liquidity', icon: <><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></> },
    { k: 'offers', icon: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2.5" /></> },
  ]

  return (
    <section className="rounded-lg border p-5 sm:p-6" style={card}>
      <Title lead={t('doc.mkt.havenoLead')}>{t('doc.haveno.title')}</Title>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {MIRROR.map(m => (
          <div key={m.k} className="mm-node rounded-lg border p-3">
            <Icon d={m.icon} color="var(--color-info)" />
            <div className="text-sm mt-2" style={{ color: 'var(--color-text)' }}>{t(`doc.mkt.mirror.${m.k}.name`)}</div>
            <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--color-dim)' }}>{t(`doc.mkt.mirror.${m.k}.when`)}</div>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('doc.mkt.finding.title')}</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--color-dim)' }}>
        {status === 'ok' ? t('doc.mkt.finding.sub', { n: data.trades_total.toLocaleString(i18n.language), min: MIN_TRADES }) : ' '}
      </p>
      <div className="mm-node rounded-lg border p-4 sm:p-5 mb-3">
        {status === 'ok'
          ? <MethodBars methods={data.methods} />
          : <div className="mm-skeleton" style={{ height: 180 }} />}
        <div className="flex gap-4 mt-4 pt-3 border-t text-[11px]" style={{ borderColor: 'var(--color-border)', color: 'var(--color-dim)' }}>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--color-danger)' }} />{t('doc.mkt.finding.reversible')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--color-success)' }} />{t('doc.mkt.finding.final')}</span>
        </div>
      </div>
      <p className="text-sm mb-7" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.mkt.finding.takeaway')}</p>

      <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('doc.mkt.scope.title')}</h3>
      <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>{t('doc.mkt.scope.sub')}</p>
      <div className="flex h-8 rounded-lg overflow-hidden text-[11px] font-mono mb-2">
        <span className="flex items-center px-3" style={{ width: '95%', background: 'color-mix(in srgb, var(--color-border) 70%, transparent)', color: 'var(--color-dim)' }}>
          {t('doc.mkt.scope.crypto')}
        </span>
        <span className="flex items-center justify-center whitespace-nowrap px-2" style={{ width: '5%', minWidth: 64, background: BUY, color: 'var(--color-card)' }}>{t('doc.mkt.scope.fiat')}</span>
      </div>
      <p className="text-xs mb-5" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.mkt.scope.why')}</p>

      <div className="flex flex-wrap gap-2">
        {['ours', 'fragile', 'daily', 'before'].map(k => <Chip key={k}>{t(`doc.mkt.hlimits.${k}`)}</Chip>)}
      </div>
    </section>
  )
}
