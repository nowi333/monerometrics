import { useTranslation } from 'react-i18next'
import data from './supporters.json'

// Le mur remplace la case de don pendant la campagne Kuno. Les noms viennent
// de supporters.json, tenu a la main a chaque preuve de paiement recue : rien
// n'y entre sans la demande de la personne.
//
// Format : node = {"name"} ou null ; charts = [{"name", "chart"}] ;
// readme et wall = listes de noms. raisedXmr est recopie depuis Kuno.
const MONO = { fontFamily: 'var(--font-mono)' }

export const WALL_ACTIVE = !!data.kunoUrl

function Tier({ title, price, children }) {
  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>{title}</span>
        <span className="text-[11px]" style={{ ...MONO, color: 'var(--color-dim)' }}>{price}</span>
      </div>
      {children}
    </div>
  )
}

export default function SupportersWall() {
  const { t, i18n } = useTranslation()
  const fmt = (n) => Number(n).toLocaleString(i18n.language, { maximumFractionDigits: 2 })

  const shown = (data.node ? 1 : 0) + data.charts.length + data.readme.length + data.wall.length
  const pct = Math.max(0, Math.min(100, (data.raisedXmr / data.goalXmr) * 100))
  const empty = shown === 0

  return (
    // Meme habillage que la case de don qu'il remplace : bordure doree animee,
    // reflet et halo orange.
    <section className="mm-iridescent mm-iridescent-glow mm-glow-soft relative overflow-hidden rounded-xl border p-5 sm:p-7 mb-4"
      style={{
        background: 'color-mix(in srgb, var(--color-accent) 2%, var(--color-card))',
        borderColor: 'color-mix(in srgb, var(--color-accent) 28%, var(--color-border))',
      }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full"
        style={{ background: 'color-mix(in srgb, var(--color-accent) 9%, transparent)', filter: 'blur(48px)' }}
      />
      <div className="relative flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex flex-col gap-1.5">
          <h3 className="m-0 text-lg sm:text-xl font-semibold" style={{ color: 'var(--color-text)' }}>{t('wall.title')}</h3>
          <p className="m-0 text-[13px] leading-relaxed max-w-[620px]" style={{ color: 'var(--color-text-secondary)' }}>{t('wall.lead')}</p>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-5 shrink-0">
          <div className="flex flex-col sm:items-end gap-0.5">
            <span className="text-xl sm:text-[22px]" style={{ ...MONO, color: 'var(--color-text)' }}>{shown}</span>
            <span className="text-[11px]" style={{ color: 'var(--color-dim)' }}>{t('wall.shown')}</span>
          </div>
          <div className="flex flex-col sm:items-end gap-0.5">
            <span className="text-xl sm:text-[22px]" style={{ ...MONO, color: 'var(--color-accent)' }}>{fmt(data.raisedXmr)} XMR</span>
            <span className="text-[11px]" style={{ color: 'var(--color-dim)' }}>{t('wall.goal', { goal: fmt(data.goalXmr) })}</span>
          </div>
        </div>
      </div>

      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--color-text) 7%, transparent)' }}
        role="progressbar" aria-valuemin={0} aria-valuemax={data.goalXmr} aria-valuenow={data.raisedXmr} aria-label={t('wall.goal', { goal: fmt(data.goalXmr) })}>
        <div className="h-1.5" style={{ width: `${pct}%`, background: 'var(--color-accent)' }} />
      </div>

      {empty ? (
        <div className="rounded-lg border border-dashed px-6 py-9 flex flex-col items-center gap-2 text-center" style={{ borderColor: 'var(--color-border-strong)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-dim)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" /></svg>
          <span className="text-[15px]" style={{ color: 'var(--color-text)' }}>{t('wall.empty.title')}</span>
          <span className="text-[13px] leading-relaxed max-w-[520px]" style={{ color: 'var(--color-dim)' }}>{t('wall.empty.body')}</span>
        </div>
      ) : (
        <>
          <div className="rounded-lg border px-4 py-4 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4"
            style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 45%, transparent)', background: 'color-mix(in srgb, var(--color-accent) 6%, transparent)' }}>
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--color-accent)' }}>{t('wall.node.title')}</span>
              <span className="text-sm sm:text-[15px]" style={{ color: 'var(--color-text)' }}>
                {t('wall.node.named')}{' '}
                <span style={{ ...MONO, color: 'var(--color-accent)' }}>node-{data.node ? data.node.name : '…'}</span>
              </span>
            </div>
            <span className="text-xs" style={{ color: 'var(--color-dim)' }}>{data.node ? t('wall.node.taken') : t('wall.node.open')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <Tier title={t('wall.tier.chart')} price="1 XMR">
              {data.charts.length ? data.charts.map((m, i) => (
                <div key={i} className="flex justify-between gap-3 text-[13px]">
                  <span style={{ color: 'var(--color-text)' }}>{m.name}</span>
                  <span className="text-right" style={{ color: 'var(--color-dim)' }}>{m.chart}</span>
                </div>
              )) : <span className="text-xs" style={{ color: 'var(--color-dim)' }}>{t('wall.tier.none')}</span>}
            </Tier>
            <Tier title={t('wall.tier.readme')} price={`${fmt(0.25)} XMR`}>
              <div className="flex flex-wrap gap-2">
                {data.readme.length ? data.readme.map((n, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full border" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border-strong)' }}>{n}</span>
                )) : <span className="text-xs" style={{ color: 'var(--color-dim)' }}>{t('wall.tier.none')}</span>}
              </div>
            </Tier>
            <Tier title={t('wall.tier.wall')} price={`${fmt(0.05)} XMR`}>
              <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {data.wall.length ? data.wall.map((n, i) => <span key={i}>{n}</span>)
                  : <span style={{ color: 'var(--color-dim)' }}>{t('wall.tier.none')}</span>}
              </div>
            </Tier>
          </div>
        </>
      )}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <p className="m-0 text-xs leading-relaxed max-w-[720px]" style={{ color: 'var(--color-dim)' }}>{t('wall.howto')}</p>
        {/* Seul moyen de soutenir pendant la campagne, onion compris : un lien
            que le visiteur choisit de suivre, rien ne se charge a son insu. */}
        <a href={data.kunoUrl} target="_blank" rel="noopener noreferrer"
          className="mm-iridescent mm-kuno-cta shrink-0 inline-flex items-center justify-center gap-2 min-h-[44px] px-6 rounded-lg text-sm font-semibold">
          {t('wall.cta')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
        </a>
      </div>
      </div>
    </section>
  )
}
