"""Trois lectures derivees des donnees brutes, pour un usage direct par des tiers.

- Confirmations recommandees : combien de blocs un marchand doit attendre,
  d'apres les reorganisations observees et la part du plus gros pool.
- Indice de prime Haveno : un chiffre hebdomadaire, nomme et stable.
- Rapport mensuel : le bilan du minage d'un mois termine, en page HTML.
"""
import math
import time
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query

from db import get_pool
import seo

router = APIRouter()
pages = APIRouter(prefix='/seo', include_in_schema=False)

BLOCK_SECONDS = 120
WATCH_START = date(2026, 8, 1)   # debut de la surveillance des reorgs

# Montant (USD) -> risque de double depense accepte. Plus le montant est eleve,
# plus le risque tolere est faible : la perte attendue reste du meme ordre.
TIERS = [
    (100, 1e-2, 'under $100'),
    (1_000, 1e-3, '$100 to $1,000'),
    (10_000, 1e-4, '$1,000 to $10,000'),
    (None, 1e-5, 'over $10,000'),
]

_cache: dict[str, tuple[float, object]] = {}


def _get(key: str, ttl: int):
    hit = _cache.get(key)
    return hit[1] if hit and time.time() - hit[0] < ttl else None


def _set(key: str, value):
    _cache[key] = (time.time(), value)
    return value


# --- Confirmations ----------------------------------------------------------

def attacker_success(q: float, z: int) -> float:
    """Probabilite qu'un mineur detenant la part q du hashrate rattrape z blocs.

    Calcul de la section 11 du livre blanc de Bitcoin, valable pour toute chaine
    en preuve de travail ou la chaine la plus lourde l'emporte.
    """
    p = 1 - q
    if q >= p:
        return 1.0
    lam = z * q / p
    s = 1.0
    for k in range(z + 1):
        # En logarithmes : lam ** k deborde des flottants pour q proche de 0,5.
        poisson = math.exp(-lam + k * math.log(lam) - math.lgamma(k + 1)) if lam else float(k == 0)
        s -= poisson * (1 - (q / p) ** (z - k))
    return max(s, 0.0)


def confirmations_for(q: float, risk: float, floor: int = 1, cap: int = 200) -> int | None:
    for z in range(max(floor, 1), cap + 1):
        if attacker_success(q, z) <= risk:
            return z
    return None


async def _mining_inputs(conn) -> dict:
    rows = await conn.fetch('''
        SELECT COALESCE(miner_pool, 'unknown') AS pool, COUNT(*) AS n
        FROM blocks WHERE is_canonical AND timestamp_human >= NOW() - INTERVAL '7 days'
        GROUP BY 1 ORDER BY 2 DESC''')
    total = sum(r['n'] for r in rows) or 1
    named = [r for r in rows if r['pool'] != 'unknown']
    reorg = await conn.fetchrow('''
        SELECT COUNT(*) AS n, COALESCE(MAX(depth), 0) AS max_depth, MIN(detected_at) AS since
        FROM reorgs_detected''')
    return {
        'top_pool': named[0]['pool'] if named else None,
        'top_share': named[0]['n'] / total if named else 0.0,
        'top2_share': sum(r['n'] for r in named[:2]) / total,
        'reorgs': reorg['n'], 'max_depth': reorg['max_depth'], 'since': reorg['since'],
    }


def _tier_for(amount: float | None):
    if amount is None:
        return None
    for limit, risk, label in TIERS:
        if limit is None or amount < limit:
            return risk, label
    return TIERS[-1][1], TIERS[-1][2]


async def recommendation() -> dict:
    hit = _get('confirmations', 300)
    if hit:
        return hit
    async with get_pool().acquire() as conn:
        m = await _mining_inputs(conn)
    # Plancher empirique : on a vu des reorgs de profondeur max_depth, une
    # confirmation de moins que ca n'est jamais sure, quelle que soit la theorie.
    floor = m['max_depth'] + 1
    tiers = []
    for limit, risk, label in TIERS:
        z = confirmations_for(m['top_share'], risk, floor)
        z2 = confirmations_for(m['top2_share'], risk, floor)
        tiers.append({
            'amount_usd': label, 'max_amount_usd': limit, 'risk': risk,
            'confirmations': z, 'minutes': z * BLOCK_SECONDS // 60 if z else None,
            'confirmations_if_two_largest_collude': z2,
        })
    return _set('confirmations', {
        'tiers': tiers,
        'inputs': {
            'largest_pool': m['top_pool'],
            'largest_pool_share_7d': round(m['top_share'] * 100, 2),
            'two_largest_share_7d': round(m['top2_share'] * 100, 2),
            'reorgs_observed': m['reorgs'],
            'deepest_reorg_observed': m['max_depth'],
            'observed_since': m['since'].isoformat() if m['since'] else None,
            'empirical_floor': floor,
        },
        'method': ('Smallest number of confirmations z such that a miner with the largest pool\'s 7-day share q '
                   'catches up z blocks with probability below the target risk (Bitcoin whitepaper, section 11), '
                   'and never fewer than the deepest reorganization observed plus one.'),
        'caveats': [
            'Observation by a single node since August 2026; deeper reorganizations can happen.',
            'Worst case: assumes the largest pool turns hostile. An attacker with no more than that share needs these confirmations; colluding pools need more.',
            'null means more than 200 confirmations: near half the hashrate, no wait is safe.',
            'Monero outputs stay locked for 10 blocks before they can be spent, whatever you credit.',
            'Decision aid, not a guarantee.',
        ],
        'generated_unix': int(time.time()),
    })


@router.get('/confirmations/recommended')
async def confirmations_recommended(amount_usd: float | None = Query(None, ge=0, le=1e9)):
    """How many confirmations a merchant should wait, from observed reorgs and pool concentration."""
    rec = await recommendation()
    tier = _tier_for(amount_usd)
    if tier is None:
        return rec
    risk, label = tier
    pick = next(t for t in rec['tiers'] if t['risk'] == risk)
    return {'amount_usd': amount_usd, 'recommended': pick, **rec}


# --- Indice de prime Haveno ---------------------------------------------------

def weighted_median(pairs: list[tuple[float, float]]) -> float | None:
    """Mediane de valeurs ponderees : la valeur ou le poids cumule passe la moitie."""
    pairs = sorted((v, w) for v, w in pairs if w and w > 0)
    total = sum(w for _, w in pairs)
    if not total:
        return None
    acc = 0.0
    for v, w in pairs:
        acc += w
        if acc >= total / 2:
            return v
    return pairs[-1][0]


async def _premiums(conn, start: datetime, end: datetime, currency: str = 'USD'):
    return await conn.fetch('''
        SELECT t.payment_method, t.base_vol::float AS w, (t.price / s.price - 1)::float * 100 AS premium
        FROM haveno_trades t
        JOIN spot_daily s ON s.day = t.traded_at::date AND s.currency = t.currency
        WHERE t.currency = $1 AND t.traded_at >= $2 AND t.traded_at < $3''', currency, start, end)


def _index_of(rows) -> dict:
    import main
    split = {'reversible': [], 'final': []}
    for r in rows:
        kind = main._reversible(r['payment_method'])
        if kind is not None:
            split['reversible' if kind else 'final'].append((r['premium'], r['w']))
    value = weighted_median([(r['premium'], r['w']) for r in rows])
    return {
        'index_pct': round(value, 2) if value is not None else None,
        'reversible_pct': _round(weighted_median(split['reversible'])),
        'final_pct': _round(weighted_median(split['final'])),
        'trades': len(rows),
        'reliable': len(rows) >= 20,
    }


def _round(v):
    return round(v, 2) if v is not None else None


@router.get('/haveno/index')
async def haveno_index(weeks: int = Query(12, ge=1, le=52)):
    """monerometrics Haveno Premium Index: volume-weighted median premium of executed Haveno trades over spot, per week."""
    key = f'hvindex:{weeks}'
    hit = _get(key, 900)
    if hit:
        return hit
    now = datetime.now(timezone.utc)
    async with get_pool().acquire() as conn:
        current = _index_of(await _premiums(conn, now - timedelta(days=7), now))
        monday = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        history = []
        for i in range(weeks, 0, -1):
            start = monday - timedelta(weeks=i)
            history.append({'week_start': start.date().isoformat(),
                            **_index_of(await _premiums(conn, start, start + timedelta(weeks=1)))})
    return _set(key, {
        'name': 'monerometrics Haveno Premium Index',
        'currency': 'USD',
        'current_7d': current,
        'weekly': history,
        'method': ('Volume-weighted median of (trade price / centralized spot - 1) over executed Haveno trades. '
                   'Sub-indices split payment methods into reversible (chargeback possible) and final.'),
        'generated_unix': int(now.timestamp()),
    })


# --- Rapport mensuel ------------------------------------------------------------

def _month_bounds(ym: str) -> tuple[datetime, datetime]:
    try:
        y, m = (int(x) for x in ym.split('-'))
        start = datetime(y, m, 1, tzinfo=timezone.utc)
    except (ValueError, TypeError):
        raise HTTPException(404)
    end = datetime(y + (m == 12), m % 12 + 1, 1, tzinfo=timezone.utc)
    return start, end


def available_months(today: date | None = None) -> list[str]:
    today = today or datetime.now(timezone.utc).date()
    out, d = [], WATCH_START
    while (d.year, d.month) < (today.year, today.month):
        out.append(f'{d.year}-{d.month:02d}')
        d = date(d.year + (d.month == 12), d.month % 12 + 1, 1)
    return out


def _prev(ym: str) -> str:
    y, m = (int(x) for x in ym.split('-'))
    return f'{y - (m == 1)}-{(m - 2) % 12 + 1:02d}'


async def month_report(conn, ym: str) -> dict:
    start, end = _month_bounds(ym)
    pools = await conn.fetch('''
        SELECT COALESCE(miner_pool, 'unknown') AS pool, COUNT(*) AS n
        FROM blocks WHERE is_canonical AND timestamp_human >= $1 AND timestamp_human < $2
        GROUP BY 1 ORDER BY 2 DESC''', start, end)
    total = sum(r['n'] for r in pools)
    named = [r for r in pools if r['pool'] != 'unknown']
    prov = await conn.fetch('''
        SELECT COALESCE(pool_source, 'none') AS src, COUNT(*) AS n
        FROM blocks WHERE is_canonical AND timestamp_human >= $1 AND timestamp_human < $2
        GROUP BY 1''', start, end)
    chain = await conn.fetchrow('''
        SELECT AVG(difficulty)::float AS diff, AVG(tx_count)::float AS txs,
               COUNT(*) FILTER (WHERE NOT is_canonical) AS orphans
        FROM blocks WHERE timestamp_human >= $1 AND timestamp_human < $2''', start, end)
    reorgs = await conn.fetchrow('''
        SELECT COUNT(*) AS n, COALESCE(MAX(depth), 0) AS max_depth, COALESCE(SUM(affected_tx_count), 0) AS txs
        FROM reorgs_detected WHERE detected_at >= $1 AND detected_at < $2''', start, end)
    haveno = _index_of(await _premiums(conn, start, end))
    share = {r['pool']: r['n'] * 100 / total for r in pools} if total else {}
    provenance = {r['src']: r['n'] * 100 / total for r in prov} if total else {}
    return {
        'month': ym, 'blocks': total,
        'pools': [{'pool': r['pool'], 'blocks': r['n'], 'share_pct': round(share[r['pool']], 2)} for r in pools],
        'largest_pool': named[0]['pool'] if named else None,
        'largest_share_pct': round(share[named[0]['pool']], 2) if named else 0,
        'two_largest_share_pct': round(sum(r['n'] for r in named[:2]) * 100 / total, 2) if total else 0,
        'nakamoto': seo._nakamoto(pools, total),
        'unattributed_pct': round(share.get('unknown', 0), 2),
        'proven_pct': round(provenance.get('viewkey_proof', 0), 2),
        'pool_api_pct': round(provenance.get('pool_api', 0), 2),
        'hashrate_hs': (chain['diff'] or 0) / BLOCK_SECONDS,
        'avg_txs_per_block': round(chain['txs'] or 0, 1),
        'orphans': chain['orphans'],
        'reorgs': reorgs['n'], 'deepest_reorg': reorgs['max_depth'], 'reorg_txs': reorgs['txs'],
        'haveno': haveno,
    }


def highlights(cur: dict, prev: dict | None) -> list[str]:
    out = []
    if prev and prev['blocks']:
        d = cur['largest_share_pct'] - prev['largest_share_pct']
        verb = 'up' if d > 0 else 'down'
        out.append(f"The largest pool, {cur['largest_pool']}, mined {cur['largest_share_pct']:.1f}% of blocks, "
                   f"{verb} {abs(d):.1f} points from the previous month.")
        if cur['nakamoto'] != prev['nakamoto']:
            out.append(f"The Nakamoto coefficient moved from {prev['nakamoto']} to {cur['nakamoto']}.")
        dp = cur['proven_pct'] - prev['proven_pct']
        if abs(dp) >= 1:
            out.append(f"{cur['proven_pct']:.0f}% of blocks were proven with the pools' own view keys "
                       f"({'+' if dp > 0 else ''}{dp:.0f} points).")
    else:
        out.append(f"The largest pool, {cur['largest_pool']}, mined {cur['largest_share_pct']:.1f}% of blocks.")
    if cur['reorgs']:
        out.append(f"{cur['reorgs']} chain reorganizations, the deepest {cur['deepest_reorg']} block(s), "
                   f"displaced {cur['reorg_txs']:,} transactions.")
    else:
        out.append('No chain reorganization was observed.')
    if cur['haveno']['index_pct'] is not None:
        out.append(f"Haveno trades settled at a median {cur['haveno']['index_pct']:+.1f}% against spot "
                   f"across {cur['haveno']['trades']} trades.")
    return out


@router.get('/reports/{ym}')
async def report_json(ym: str):
    """Monthly State of Monero mining report, as JSON (completed months only)."""
    if ym not in available_months():
        raise HTTPException(404)
    hit = _get(f'report:{ym}', 86400)
    if hit:
        return hit
    async with get_pool().acquire() as conn:
        cur = await month_report(conn, ym)
        prev = await month_report(conn, _prev(ym)) if _prev(ym) in available_months() else None
    return _set(f'report:{ym}', {**cur, 'previous': prev, 'highlights': highlights(cur, prev)})


def _month_name(ym: str) -> str:
    y, m = (int(x) for x in ym.split('-'))
    return date(y, m, 1).strftime('%B %Y')


e = seo.e


@pages.get('/reports')
async def reports_index():
    months = available_months()[::-1]
    items = ''.join(f'<li><a href="/reports/{m}">State of Monero mining, {_month_name(m)}</a></li>' for m in months)
    body = (f'<h1>State of Monero mining: monthly reports</h1>'
            f'<p class="lead">Every month: pool shares and how they are proven, the Nakamoto coefficient, '
            f'chain reorganizations and orphan blocks, hashrate, and the Haveno premium. From our own node, since August 2026.</p>'
            f'<div class="card"><ul>{items or "<li>The first report is published at the start of next month.</li>"}</ul></div>'
            f'<p class="cta">Raw data: <code class="mono">GET https://api.monerometrics.net/reports/YYYY-MM</code></p>')
    page = seo._layout('State of Monero mining: monthly reports | monerometrics',
                       'Monthly reports on Monero mining decentralization, reorgs, orphans and the Haveno premium.',
                       '/reports', body, seo._breadcrumb([('monerometrics', '/'), ('Reports', '/reports')]))
    return seo._page(page, 3600)


@pages.get('/reports/{ym}')
async def report_page(ym: str):
    r = await report_json(ym)
    name = _month_name(ym)
    prev = r['previous']

    def delta(key, fmt='{:+.1f}'):
        return f' <span class="dim">({fmt.format(r[key] - prev[key])})</span>' if prev and prev['blocks'] else ''

    trs = ''.join(
        f'<tr><td>{seo._pool_link(p["pool"])}</td><td class="n">{p["blocks"]:,}</td><td class="n">{p["share_pct"]:.1f}%</td>'
        f'<td><div class="bar"><i style="width:{p["share_pct"] * 100 / max(r["largest_share_pct"], 1):.0f}%"></i></div></td></tr>'
        for p in r['pools'][:12])
    hl = ''.join(f'<li>{e(h)}</li>' for h in r['highlights'])
    hv = r['haveno']
    hv_v = f"{hv['index_pct']:+.1f}%" if hv['index_pct'] is not None else '-'
    desc = f'State of Monero mining, {name}: ' + ' '.join(r['highlights'][:2])
    body = (f'<h1>State of Monero mining, {name}</h1><p class="lead">{e(desc)}</p>'
            f'<div class="kpis">'
            f'<div class="card"><div class="l">Largest pool</div><div class="v">{r["largest_share_pct"]:.1f}%</div>{delta("largest_share_pct")}</div>'
            f'<div class="card"><div class="l">Two largest</div><div class="v">{r["two_largest_share_pct"]:.1f}%</div>{delta("two_largest_share_pct")}</div>'
            f'<div class="card"><div class="l">Nakamoto coefficient</div><div class="v">{r["nakamoto"]}</div>{delta("nakamoto", "{:+d}")}</div>'
            f'<div class="card"><div class="l">Proven by view key</div><div class="v">{r["proven_pct"]:.0f}%</div>{delta("proven_pct", "{:+.0f}")}</div>'
            f'<div class="card"><div class="l">Reorgs</div><div class="v">{r["reorgs"]}</div></div>'
            f'<div class="card"><div class="l">Orphan blocks</div><div class="v">{r["orphans"]}</div></div>'
            f'<div class="card"><div class="l">Avg hashrate</div><div class="v">{seo._hs(r["hashrate_hs"])}</div></div>'
            f'<div class="card"><div class="l">Haveno premium</div><div class="v">{hv_v}</div></div>'
            f'</div><h2>Highlights</h2><div class="card"><ul>{hl}</ul></div>'
            f'<h2>Share of blocks by pool</h2><div class="card"><table><thead><tr><th>Pool</th><th class="n">Blocks</th>'
            f'<th class="n">Share</th><th></th></tr></thead><tbody>{trs}</tbody></table></div>'
            f'<h2>Method</h2><p>{r["blocks"]:,} canonical blocks mined between the first and the last day of the month (UTC). '
            f'{r["unattributed_pct"]:.1f}% matched no known pool and stay unattributed. {r["proven_pct"]:.0f}% were proven with the pool\'s '
            f'published view key, {r["pool_api_pct"]:.0f}% rest on the pool\'s own block list. Reorganizations and orphans are those '
            f'our node observed live. The Haveno premium is the <a href="/haveno">monerometrics Haveno Premium Index</a> over the month.</p>'
            f'<p class="cta"><a href="/reports">All reports</a> · JSON: <code class="mono">GET https://api.monerometrics.net/reports/{ym}</code></p>')
    page = seo._layout(f'State of Monero mining, {name} | monerometrics', desc, f'/reports/{ym}', body,
                       seo._breadcrumb([('monerometrics', '/'), ('Reports', '/reports'), (name, f'/reports/{ym}')]))
    return seo._page(page, 3600)


@pages.get('/confirmations')
async def confirmations_page():
    rec = await recommendation()
    i = rec['inputs']
    trs = ''.join(
        f'<tr><td>{e(t["amount_usd"])}</td><td class="n">{t["risk"] * 100:g}%</td>'
        f'<td class="n"><b>{t["confirmations"] or "-"}</b></td><td class="n">~{t["minutes"] or "-"} min</td>'
        f'<td class="n dim">{t["confirmations_if_two_largest_collude"] or "200+"}</td></tr>' for t in rec['tiers'])
    small = rec['tiers'][0]['confirmations']
    desc = (f'How many confirmations to wait for a Monero (XMR) payment, from live data: {small} for small amounts. '
            f'Largest pool {i["largest_pool_share_7d"]:.1f}% of blocks, deepest reorg observed {i["deepest_reorg_observed"]} block(s).')
    body = (f'<h1>How many confirmations for a Monero payment?</h1><p class="lead">{e(desc)}</p>'
            f'<div class="card"><table><thead><tr><th>Payment</th><th class="n">Accepted risk</th><th class="n">Confirmations</th>'
            f'<th class="n">Wait</th><th class="n">If the two largest pools collude</th></tr></thead><tbody>{trs}</tbody></table></div>'
            f'<h2>Why these numbers</h2><p>A payment can be reversed if a miner builds a longer competing chain that leaves it out. '
            f'The risk depends on how much hashrate one actor controls. Today the largest pool, {e(i["largest_pool"] or "unknown")}, '
            f'mined {i["largest_pool_share_7d"]:.1f}% of blocks over 7 days, and the two largest {i["two_largest_share_7d"]:.1f}%. '
            f'For each amount we take the smallest number of confirmations that keeps the chance of such a miner catching up below '
            f'the accepted risk (the calculation of section 11 of the Bitcoin whitepaper, which holds for any proof-of-work chain).</p>'
            f'<p>The numbers never go below what was actually seen: our node has observed {i["reorgs_observed"]} reorganizations since '
            f'August 2026, the deepest {i["deepest_reorg_observed"]} block(s), so at least {i["empirical_floor"]} confirmations are always required. '
            f'They update by themselves: if mining concentrates, the recommendation tightens.</p>'
            f'<h2>Limits</h2><ul>' + ''.join(f'<li>{e(c)}</li>' for c in rec['caveats']) + '</ul>'
            f'<h2>Use it in your checkout</h2><p><code class="mono">GET https://api.monerometrics.net/confirmations/recommended?amount_usd=250</code> '
            f'returns the confirmations to wait for that amount. Free, no key. See <a href="/build">Build with monerometrics</a>.</p>')
    page = seo._layout('How many confirmations for a Monero (XMR) payment? | monerometrics', desc, '/confirmations', body,
                       seo._breadcrumb([('monerometrics', '/'), ('Confirmations', '/confirmations')]))
    return seo._page(page, 600)
