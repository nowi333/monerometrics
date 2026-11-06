"""Pages HTML indexables servies sous monerometrics.net.

Le dashboard est une application JavaScript : un moteur de recherche n'y voit
qu'une page. Ces pages rendent cote serveur, sans script, les faits que les
gens cherchent (un bloc, un pool, l'historique des reorganisations) et
renvoient vers le dashboard pour le reste.
"""
import html
import re
import time
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, Response

from db import get_pool

SITE = 'https://monerometrics.net'
router = APIRouter(prefix='/seo', include_in_schema=False)

_cache: dict[str, tuple[float, str]] = {}


def _cached(key: str, ttl: int):
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    return None


def _store(key: str, body: str) -> str:
    # Borne grossiere : les pages de blocs sont innombrables, le cache ne doit
    # pas grossir avec chaque robot qui les parcourt.
    if len(_cache) > 5000:
        _cache.clear()
    _cache[key] = (time.time(), body)
    return body


def _page(body: str, max_age: int) -> HTMLResponse:
    return HTMLResponse(body, headers={'Cache-Control': f'public, max-age={max_age}'})


e = html.escape


def _ts(unix: int | None) -> str:
    if not unix:
        return '-'
    return datetime.fromtimestamp(unix, timezone.utc).strftime('%Y-%m-%d %H:%M UTC')


def _pool_link(pool: str | None) -> str:
    if not pool or pool == 'unknown':
        return '<span class="dim">unattributed</span>'
    return f'<a href="/pool/{e(pool)}">{e(pool)}</a>'


SOURCE_LABEL = {
    'viewkey_proof': 'proven by view key',
    'pool_api': 'listed by the pool',
    'coinbase_tag': 'inferred from coinbase',
}

CSS = """
:root{--bg:#eef1f5;--card:#fff;--chrome:#dde3eb;--bd:rgba(20,30,50,.11);--tx:#111620;--tx2:#283040;--dim:#566072;--acc:#c94a00;--ok:#15803d;--warn:#b45309}
@media (prefers-color-scheme:dark){:root{--bg:#0a0c12;--card:#151922;--chrome:#0a0c12;--bd:rgba(255,255,255,.08);--tx:#e6e8eb;--tx2:#b4b8bf;--dim:#8b9099;--acc:#ff6600;--ok:#22c55e;--warn:#f59e0b}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
a{color:var(--acc)}.dim{color:var(--dim)}
header,footer{background:var(--chrome);border-bottom:1px solid var(--bd)}footer{border-top:1px solid var(--bd);border-bottom:0;margin-top:40px}
.in{max-width:1000px;margin:0 auto;padding:14px 16px}
header .in{display:flex;flex-wrap:wrap;gap:6px 20px;align-items:center}
header b{font-family:ui-monospace,Menlo,monospace;margin-right:auto}header b a{color:var(--tx);text-decoration:none}
header a{font-size:14px}
main{max-width:1000px;margin:0 auto;padding:24px 16px}
h1{font-size:24px;margin:0 0 6px}h2{font-size:17px;margin:28px 0 10px}
.lead{color:var(--tx2);margin:0 0 18px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:8px;padding:16px;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:14px}th{text-align:left;color:var(--dim);font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.04em;padding:6px 8px;border-bottom:1px solid var(--bd)}
td{padding:7px 8px;border-bottom:1px solid var(--bd);vertical-align:top}td.n,th.n{text-align:right}
.mono,td.n{font-family:ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}
.hash{font-family:ui-monospace,Menlo,monospace;font-size:13px;word-break:break-all}
dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 18px;margin:0}dt{color:var(--dim)}dd{margin:0}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:8px}
.kpis .card .v{font:600 24px ui-monospace,Menlo,monospace}.kpis .card .l{font-size:12px;color:var(--dim);text-transform:uppercase;letter-spacing:.04em}
.bar{height:7px;background:var(--bd);border-radius:2px;min-width:80px}.bar i{display:block;height:100%;background:var(--acc);border-radius:2px}
.nav{display:flex;justify-content:space-between;gap:12px;margin-top:16px}
.cta{margin-top:24px}code{word-break:break-all}
"""

NAV = [('/', 'Dashboard'), ('/pools', 'Mining pools'), ('/reorgs', 'Reorgs'),
       ('/orphans', 'Orphan blocks'), ('/docs', 'API')]


def _layout(title: str, description: str, path: str, body: str, jsonld: str = '') -> str:
    nav = ''.join(f'<a href="{href}">{label}</a>' for href, label in NAV)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{SITE}{e(path)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="website"><meta property="og:site_name" content="monerometrics">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(description)}">
<meta property="og:url" content="{SITE}{e(path)}"><meta property="og:image" content="{SITE}/og-image.png?v=4">
<meta name="twitter:card" content="summary_large_image">
<style>{CSS}</style>{jsonld}</head><body>
<header><div class="in"><b><a href="/">monerometrics.net</a></b>{nav}</div></header>
<main>{body}</main>
<footer><div class="in dim">Reorg-aware observatory of the Monero network. Own node, every block indexed,
free read-only <a href="/docs">API</a> and <a href="https://api.monerometrics.net/mcp">MCP server</a>. No tracking.</div></footer>
</body></html>"""


def _breadcrumb(items: list[tuple[str, str]]) -> str:
    parts = ','.join(
        f'{{"@type":"ListItem","position":{i + 1},"name":"{e(name)}","item":"{SITE}{e(path)}"}}'
        for i, (name, path) in enumerate(items))
    return f'<script type="application/ld+json">{{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{parts}]}}</script>'


@router.get('/block/{height}')
async def block_page(height: int):
    if height < 0:
        raise HTTPException(404)
    key = f'block:{height}'
    hit = _cached(key, 120)
    if hit:
        return _page(hit, 300)
    async with get_pool().acquire() as conn:
        rows = await conn.fetch('''
            SELECT hash, prev_hash, timestamp_unix, difficulty::text AS difficulty, tx_count,
                   size_bytes, miner_pool, pool_source, merge_mining, reward_xmr::text AS reward,
                   is_canonical
            FROM blocks WHERE height = $1 ORDER BY is_canonical DESC''', height)
        tip = await conn.fetchval('SELECT MAX(height) FROM blocks WHERE is_canonical')
        fork = await conn.fetchrow(
            'SELECT depth, detected_at FROM reorgs_detected WHERE fork_point_height < $1 '
            'AND fork_point_height + depth >= $1 ORDER BY detected_at DESC LIMIT 1', height)
    canon = next((r for r in rows if r['is_canonical']), None)
    if not canon:
        raise HTTPException(404, 'block not indexed')
    orphans = [r for r in rows if not r['is_canonical']]
    conf = (tip - height + 1) if tip is not None else None
    pool = canon['miner_pool']
    reward = float(canon['reward']) if canon['reward'] else None

    facts = [
        ('Hash', f'<span class="hash">{e(canon["hash"])}</span>'),
        ('Previous block', f'<a class="hash" href="/block/{height - 1}">{e(canon["prev_hash"])}</a>' if height else '-'),
        ('Time', _ts(canon['timestamp_unix'])),
        ('Mined by', _pool_link(pool) + (f' <span class="dim">({SOURCE_LABEL.get(canon["pool_source"], canon["pool_source"])})</span>' if canon['pool_source'] else '')),
        ('Transactions', str(canon['tx_count'])),
        ('Size', f'{canon["size_bytes"]:,} bytes'),
        ('Block reward', f'{reward:.6f} XMR' if reward is not None else '-'),
        ('Difficulty', f'{int(canon["difficulty"]):,}'),
        ('Confirmations', f'{conf:,}' if conf else '-'),
        ('Merge mining', 'yes' if canon['merge_mining'] else 'no'),
    ]
    dl = ''.join(f'<dt>{k}</dt><dd>{v}</dd>' for k, v in facts)
    orphan_html = ''
    if orphans:
        trs = ''.join(
            f'<tr><td class="hash">{e(o["hash"])}</td><td>{_pool_link(o["miner_pool"])}</td>'
            f'<td class="n">{o["tx_count"]}</td><td class="n">{_ts(o["timestamp_unix"])}</td></tr>' for o in orphans)
        orphan_html = (f'<h2>Competing orphan block{"s" if len(orphans) > 1 else ""} at this height</h2>'
                       f'<p class="lead">Another miner found a valid block at the same height, but the network kept the one above.</p>'
                       f'<div class="card"><table><thead><tr><th>Orphan hash</th><th>Pool</th><th class="n">Tx</th><th class="n">Time</th></tr></thead><tbody>{trs}</tbody></table></div>')
    if fork:
        orphan_html += (f'<h2>Reorganization</h2><p class="lead">This height was rewritten by a chain reorganization of depth '
                        f'{fork["depth"]} detected on {fork["detected_at"]:%Y-%m-%d}. See <a href="/reorgs">all reorgs</a>.</p>')
    nxt = f'<a href="/block/{height + 1}">Block {height + 1:,} →</a>' if tip is not None and height < tip else '<span></span>'
    prv = f'<a href="/block/{height - 1}">← Block {height - 1:,}</a>' if height else '<span></span>'
    who = f'mined by {pool}' if pool and pool != 'unknown' else 'unattributed miner'
    desc = (f'Monero block {height:,}: {who}, {canon["tx_count"]} transactions, {canon["size_bytes"]:,} bytes, '
            f'mined {_ts(canon["timestamp_unix"])}' + (f', {len(orphans)} competing orphan block(s).' if orphans else '.'))
    body = (f'<h1>Monero block {height:,}</h1><p class="lead">{e(desc)}</p>'
            f'<div class="card"><dl>{dl}</dl></div>{orphan_html}'
            f'<div class="nav">{prv}{nxt}</div>'
            f'<p class="cta">Explore the chain and its forks live in the <a href="/">chain visualizer</a>, '
            f'or fetch this block as JSON: <code class="mono">GET https://api.monerometrics.net/chain/block/{e(canon["hash"])}</code></p>')
    page = _layout(f'Monero block {height:,} · {who} | monerometrics', desc, f'/block/{height}', body,
                   _breadcrumb([('monerometrics', '/'), (f'Block {height}', f'/block/{height}')]))
    return _page(_store(key, page), 300)


async def _distribution(conn, interval: str):
    rows = await conn.fetch(f'''
        SELECT COALESCE(miner_pool, 'unknown') AS pool, COUNT(*) AS n
        FROM blocks WHERE is_canonical AND timestamp_human >= NOW() - INTERVAL '{interval}'
        GROUP BY 1 ORDER BY 2 DESC''')
    total = sum(r['n'] for r in rows)
    return rows, total


def _nakamoto(rows, total) -> int:
    acc = n = 0
    for r in rows:
        if r['pool'] == 'unknown':
            continue
        acc += r['n']
        n += 1
        if acc * 2 > total:
            return n
    return n


@router.get('/pools')
async def pools_page():
    hit = _cached('pools', 120)
    if hit:
        return _page(hit, 300)
    async with get_pool().acquire() as conn:
        day, day_total = await _distribution(conn, '24 hours')
        week, week_total = await _distribution(conn, '7 days')
        month, month_total = await _distribution(conn, '30 days')
    week_share = {r['pool']: r['n'] * 100 / week_total for r in week} if week_total else {}
    month_share = {r['pool']: r['n'] * 100 / month_total for r in month} if month_total else {}
    top = max((r['n'] for r in day if r['pool'] != 'unknown'), default=0)
    trs = ''.join(
        f'<tr><td>{_pool_link(r["pool"])}</td><td class="n">{r["n"]}</td><td class="n">{r["n"] * 100 / day_total:.1f}%</td>'
        f'<td class="n">{week_share.get(r["pool"], 0):.1f}%</td><td class="n">{month_share.get(r["pool"], 0):.1f}%</td>'
        f'<td><div class="bar"><i style="width:{(r["n"] * 100 / top) if top and r["pool"] != "unknown" else 0:.0f}%"></i></div></td></tr>'
        for r in day)
    named = [r for r in day if r['pool'] != 'unknown']
    top_share = named[0]['n'] * 100 / day_total if named and day_total else 0
    top2 = sum(r['n'] for r in named[:2]) * 100 / day_total if day_total else 0
    nak = _nakamoto(day, day_total)
    desc = (f'Monero mining pool distribution, last 24 hours: largest pool {top_share:.1f}%, two largest {top2:.1f}%, '
            f'Nakamoto coefficient {nak}. Updated live from our own node.')
    body = (f'<h1>Monero mining pool distribution</h1><p class="lead">{e(desc)}</p>'
            f'<div class="kpis"><div class="card"><div class="l">Largest pool, 24 h</div><div class="v">{top_share:.1f}%</div></div>'
            f'<div class="card"><div class="l">Two largest, 24 h</div><div class="v">{top2:.1f}%</div></div>'
            f'<div class="card"><div class="l">Nakamoto coefficient</div><div class="v">{nak}</div></div>'
            f'<div class="card"><div class="l">Blocks, 24 h</div><div class="v">{day_total}</div></div></div>'
            f'<h2>Share of blocks by pool</h2><div class="card"><table><thead><tr><th>Pool</th><th class="n">Blocks 24 h</th>'
            f'<th class="n">24 h</th><th class="n">7 d</th><th class="n">30 d</th><th></th></tr></thead><tbody>{trs}</tbody></table></div>'
            f'<h2>How blocks are attributed</h2><p>Attribution is verified, not guessed. Where a pool publishes its wallet view key, '
            f'the coinbase output is checked cryptographically; otherwise blocks are matched against the pool\'s public block list. '
            f'Blocks matching no known pool stay <span class="dim">unattributed</span> and are counted in the denominator. '
            f'The Nakamoto coefficient is the smallest number of pools that together produced more than half of the blocks.</p>'
            f'<p class="cta">Daily history and percentiles are on the <a href="/">dashboard</a>; raw data: '
            f'<code class="mono">GET https://api.monerometrics.net/pools/distribution?window=24h</code></p>')
    page = _layout('Monero mining pool distribution & Nakamoto coefficient | monerometrics', desc, '/pools', body,
                   _breadcrumb([('monerometrics', '/'), ('Mining pools', '/pools')]))
    return _page(_store('pools', page), 300)


_POOL_RE = re.compile(r'[a-z0-9][a-z0-9.\-]{0,62}')


@router.get('/pool/{name}')
async def pool_page(name: str):
    if not _POOL_RE.fullmatch(name) or name == 'unknown':
        raise HTTPException(404)
    key = f'pool:{name}'
    hit = _cached(key, 120)
    if hit:
        return _page(hit, 300)
    async with get_pool().acquire() as conn:
        shares = {}
        for label, interval in (('24 h', '24 hours'), ('7 d', '7 days'), ('30 d', '30 days')):
            rows, total = await _distribution(conn, interval)
            n = next((r['n'] for r in rows if r['pool'] == name), 0)
            shares[label] = (n, n * 100 / total if total else 0)
        blocks = await conn.fetch('''
            SELECT height, hash, timestamp_unix, tx_count, pool_source, reward_xmr::text AS reward
            FROM blocks WHERE is_canonical AND miner_pool = $1
              AND timestamp_human >= NOW() - INTERVAL '90 days'
            ORDER BY height DESC LIMIT 50''', name)
        orphaned = await conn.fetchval(
            "SELECT COUNT(*) FROM blocks WHERE NOT is_canonical AND miner_pool = $1 "
            "AND timestamp_human >= NOW() - INTERVAL '90 days'", name)
    if not blocks and not shares['30 d'][0]:
        raise HTTPException(404)
    kpis = ''.join(f'<div class="card"><div class="l">Share, {k}</div><div class="v">{p:.1f}%</div>'
                   f'<div class="dim">{n} blocks</div></div>' for k, (n, p) in shares.items())
    kpis += f'<div class="card"><div class="l">Orphaned, 90 d</div><div class="v">{orphaned}</div></div>'
    trs = ''.join(
        f'<tr><td class="n"><a href="/block/{b["height"]}">{b["height"]:,}</a></td><td class="n">{_ts(b["timestamp_unix"])}</td>'
        f'<td class="n">{b["tx_count"]}</td><td class="n">{float(b["reward"] or 0):.4f}</td>'
        f'<td class="dim">{SOURCE_LABEL.get(b["pool_source"], b["pool_source"] or "")}</td></tr>' for b in blocks)
    desc = (f'{name} on Monero: {shares["24 h"][1]:.1f}% of blocks in the last 24 hours, {shares["7 d"][1]:.1f}% over 7 days, '
            f'{shares["30 d"][1]:.1f}% over 30 days. Latest blocks mined and how each was attributed.')
    body = (f'<h1>{e(name)} · Monero mining pool</h1><p class="lead">{e(desc)}</p><div class="kpis">{kpis}</div>'
            f'<h2>Latest blocks</h2><div class="card"><table><thead><tr><th class="n">Height</th><th class="n">Time</th>'
            f'<th class="n">Tx</th><th class="n">Reward XMR</th><th>Attribution</th></tr></thead><tbody>{trs}</tbody></table></div>'
            f'<p class="cta">Compare with every other pool on the <a href="/pools">pool distribution</a> page.</p>')
    page = _layout(f'{name} Monero mining pool share & blocks | monerometrics', desc, f'/pool/{name}', body,
                   _breadcrumb([('monerometrics', '/'), ('Mining pools', '/pools'), (name, f'/pool/{name}')]))
    return _page(_store(key, page), 300)


@router.get('/reorgs')
async def reorgs_page():
    hit = _cached('reorgs', 120)
    if hit:
        return _page(hit, 300)
    async with get_pool().acquire() as conn:
        rows = await conn.fetch('''SELECT detected_at, fork_point_height, depth, affected_tx_count
                                   FROM reorgs_detected ORDER BY detected_at DESC''')
        since = await conn.fetchval('SELECT MIN(detected_at) FROM reorgs_detected')
    deepest = max((r['depth'] for r in rows), default=0)
    trs = ''.join(
        f'<tr><td class="n">{r["detected_at"]:%Y-%m-%d %H:%M}</td><td class="n"><a href="/block/{r["fork_point_height"] + 1}">'
        f'{r["fork_point_height"]:,}</a></td><td class="n">{r["depth"]}</td><td class="n">{r["affected_tx_count"] or 0}</td></tr>'
        for r in rows)
    desc = (f'Every Monero chain reorganization detected by our node since {since:%Y-%m-%d}: {len(rows)} reorgs, '
            f'deepest {deepest} blocks. Fork point, depth and affected transactions.') if since else 'Monero chain reorganizations.'
    body = (f'<h1>Monero chain reorganizations</h1><p class="lead">{e(desc)}</p>'
            f'<div class="card"><table><thead><tr><th class="n">Detected (UTC)</th><th class="n">Fork point</th>'
            f'<th class="n">Depth</th><th class="n">Affected tx</th></tr></thead><tbody>{trs}</tbody></table></div>'
            f'<h2>What is a reorg?</h2><p>A reorganization happens when the network replaces one or more recent blocks with a '
            f'competing branch that becomes the canonical chain. Transactions in the replaced blocks return to the mempool and '
            f'are usually mined again; a deep reorg can undo payments that looked confirmed. On 14 September 2025 an alternate '
            f'chain replaced 18 Monero blocks, past the ten confirmations most services treat as final.</p>'
            f'<p class="cta">Watch the chain and its forks in the <a href="/">live visualizer</a>, or see '
            f'<a href="/orphans">orphan blocks</a>.</p>')
    page = _layout('Monero reorg history: every chain reorganization detected | monerometrics', desc, '/reorgs', body,
                   _breadcrumb([('monerometrics', '/'), ('Reorgs', '/reorgs')]))
    return _page(_store('reorgs', page), 300)


@router.get('/orphans')
async def orphans_page():
    hit = _cached('orphans', 120)
    if hit:
        return _page(hit, 300)
    async with get_pool().acquire() as conn:
        rows = await conn.fetch('''
            SELECT o.height, o.miner_pool, o.timestamp_unix, o.tx_count, c.miner_pool AS winner
            FROM blocks o LEFT JOIN blocks c ON c.height = o.height AND c.is_canonical
            WHERE NOT o.is_canonical ORDER BY o.height DESC LIMIT 200''')
        month = await conn.fetchval("SELECT COUNT(*) FROM blocks WHERE NOT is_canonical "
                                    "AND timestamp_human >= NOW() - INTERVAL '30 days'")
    trs = ''.join(
        f'<tr><td class="n"><a href="/block/{r["height"]}">{r["height"]:,}</a></td><td class="n">{_ts(r["timestamp_unix"])}</td>'
        f'<td>{_pool_link(r["miner_pool"])}</td><td>{_pool_link(r["winner"])}</td><td class="n">{r["tx_count"]}</td></tr>'
        for r in rows)
    desc = (f'Monero orphan blocks: {month} in the last 30 days. Each orphan with the pool that mined it and the pool '
            f'whose block won the same height.')
    body = (f'<h1>Monero orphan blocks</h1><p class="lead">{e(desc)}</p>'
            f'<div class="card"><table><thead><tr><th class="n">Height</th><th class="n">Time</th><th>Orphaned pool</th>'
            f'<th>Winning pool</th><th class="n">Tx</th></tr></thead><tbody>{trs}</tbody></table></div>'
            f'<h2>What is an orphan block?</h2><p>A valid block that was mined but did not end up in the canonical chain, '
            f'because a competing block at the same height won. Orphans are normal at a low rate; a rising rate or a pool '
            f'that keeps orphaning others can signal selfish mining.</p>')
    page = _layout('Monero orphan blocks: latest orphaned blocks by pool | monerometrics', desc, '/orphans', body,
                   _breadcrumb([('monerometrics', '/'), ('Orphan blocks', '/orphans')]))
    return _page(_store('orphans', page), 300)


@router.get('/sitemap.xml')
async def sitemap():
    hit = _cached('sitemap', 3600)
    if hit is None:
        async with get_pool().acquire() as conn:
            pools = await conn.fetch(
                "SELECT DISTINCT miner_pool FROM blocks WHERE is_canonical AND miner_pool IS NOT NULL "
                "AND miner_pool <> 'unknown' AND timestamp_human >= NOW() - INTERVAL '30 days'")
            heights = await conn.fetch('''
                SELECT height FROM blocks WHERE NOT is_canonical
                UNION SELECT fork_point_height + 1 FROM reorgs_detected
                UNION (SELECT height FROM blocks WHERE is_canonical ORDER BY height DESC LIMIT 2000)''')
        day = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        urls = [('/', 'hourly', '1.0'), ('/pools', 'hourly', '0.9'), ('/reorgs', 'daily', '0.9'),
                ('/orphans', 'daily', '0.8'), ('/docs', 'weekly', '0.7')]
        urls += [(f'/pool/{r["miner_pool"]}', 'daily', '0.6') for r in pools if _POOL_RE.fullmatch(r['miner_pool'])]
        urls += [(f'/block/{r["height"]}', 'monthly', '0.4') for r in heights]
        items = ''.join(f'<url><loc>{SITE}{e(u)}</loc><lastmod>{day}</lastmod><changefreq>{f}</changefreq>'
                        f'<priority>{p}</priority></url>' for u, f, p in urls)
        hit = _store('sitemap', f'<?xml version="1.0" encoding="UTF-8"?>\n'
                                f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{items}</urlset>\n')
    return Response(hit, media_type='application/xml', headers={'Cache-Control': 'public, max-age=3600'})
