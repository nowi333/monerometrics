import logging
import sys
from contextlib import asynccontextmanager
import time
from collections import defaultdict, deque
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from db import init_pool, close_pool, get_pool, get_database_url
import asyncpg
import httpx
import json
import os
import re
from models import HealthResponse, InfoResponse, Block, ChainWindowResponse, Reorg, ReorgsResponse, ReorgStatsWindow, ReorgStatsResponse, PoolShare, PoolDistributionResponse, PoolSource, PoolSourcesResponse, OrphanBlock, OrphansResponse, NetworkInfoResponse, HashratePoint, HashrateResponse, BlocktimePoint, BlocktimeResponse, ForkBlock, ForkWindowResponse, MempoolPoint, MempoolResponse, EmissionPoint, EmissionResponse, MergeMinedChain, BlockDetailResponse, ProvenanceBucket, ProvenanceResponse, PriceResponse
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s', stream=sys.stdout)
log = logging.getLogger('monerometrics-api')

@asynccontextmanager
async def lifespan(app: FastAPI):
    database_url, source = get_database_url()
    log.info(f'Postgres credentials source: {source}')
    log.info('Initializing asyncpg connection pool...')
    await init_pool(database_url)
    log.info('Pool initialized. API ready.')
    yield
    log.info('Shutting down...')
    await close_pool()
app = FastAPI(title='monerometrics API', description="API publique lecture seule sur l'indexation Monero", version='0.7.3', lifespan=lifespan)
RATE_LIMIT_PER_MIN = int(os.getenv('RATE_LIMIT_PER_MIN', '120'))
ONION_HEADER = 'x-mm-onion'
ONION_BUCKET_KEY = '__onion__'
RATE_LIMIT_ONION_PER_MIN = int(os.getenv('RATE_LIMIT_ONION_PER_MIN', '1200'))
_rate_buckets: dict[str, deque] = defaultdict(deque)
_rate_last_sweep = 0.0

def _is_onion(request: Request) -> bool:
    return request.headers.get(ONION_HEADER, '').strip() == '1'

def _client_ip(request: Request) -> str:
    if _is_onion(request):
        return ONION_BUCKET_KEY
    for header in ('cf-connecting-ip', 'x-real-ip'):
        value = request.headers.get(header, '').strip()
        if value:
            return value
    return request.client.host if request.client else 'unknown'

@app.middleware('http')
async def rate_limit(request: Request, call_next):
    global _rate_last_sweep
    now = time.time()
    client_ip = _client_ip(request)
    limit = RATE_LIMIT_ONION_PER_MIN if client_ip == ONION_BUCKET_KEY else RATE_LIMIT_PER_MIN
    bucket = _rate_buckets[client_ip]
    while bucket and now - bucket[0] > 60:
        bucket.popleft()
    if len(bucket) >= limit:
        return JSONResponse(status_code=429, content={'detail': 'Too many requests'}, headers={'Retry-After': '60'})
    bucket.append(now)
    if now - _rate_last_sweep > 300:
        _rate_last_sweep = now
        for ip in list(_rate_buckets.keys()):
            b = _rate_buckets[ip]
            while b and now - b[0] > 60:
                b.popleft()
            if not b:
                del _rate_buckets[ip]
    return await call_next(request)
app.add_middleware(CORSMiddleware, allow_origins=['https://monerometrics.net', 'https://www.monerometrics.net', 'http://localhost:5173', 'http://localhost:4173'], allow_credentials=False, allow_methods=['GET'], allow_headers=['*'])

@app.get('/health', response_model=HealthResponse)
async def health():
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval('SELECT 1')
        return HealthResponse(status='ok', db_connected=True)
    except Exception as e:
        log.error(f'Health check failed: {e}')
        return HealthResponse(status='degraded', db_connected=False)

@app.get('/info', response_model=InfoResponse)
async def info():
    pool = get_pool()
    async with pool.acquire() as conn:
        latest = await conn.fetchval('SELECT MAX(height) FROM blocks WHERE is_canonical = true')
        total_blocks = await conn.fetchval('SELECT COUNT(*) FROM blocks WHERE is_canonical = true')
        total_orphans = await conn.fetchval('SELECT COUNT(*) FROM blocks WHERE is_canonical = false')
        total_reorgs = await conn.fetchval('SELECT COUNT(*) FROM reorgs_detected')
    return InfoResponse(api_version=app.version, latest_indexed_height=latest, total_blocks_indexed=total_blocks or 0, total_orphan_blocks=total_orphans or 0, total_reorgs_detected=total_reorgs or 0)

@app.get('/chain/window', response_model=ChainWindowResponse)
async def chain_window(from_height: int=Query(..., alias='from', ge=0), to_height: int=Query(..., alias='to', ge=0)):
    if to_height < from_height:
        raise HTTPException(400, 'to must be >= from')
    if to_height - from_height > 1000:
        raise HTTPException(400, 'max 1000 blocks per request')
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('\n            SELECT height, hash, prev_hash, timestamp_unix, timestamp_human,\n                   difficulty::text AS difficulty, tx_count, size_bytes,\n                   miner_pool, pool_source, merge_mining, reward_xmr::text AS reward_xmr, is_canonical\n            FROM blocks\n            WHERE height BETWEEN $1 AND $2\n            ORDER BY height\n            ', from_height, to_height)
    blocks = [Block(**dict(r)) for r in rows]
    return ChainWindowResponse(from_height=from_height, to_height=to_height, count=len(blocks), blocks=blocks)

@app.get('/reorgs', response_model=ReorgsResponse)
async def reorgs(limit: int=Query(100, ge=1, le=1000)):
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('\n            SELECT id, detected_at, fork_point_height, depth,\n                   old_chain_tip_hash, new_chain_tip_hash,\n                   affected_tx_count, notes\n            FROM reorgs_detected\n            ORDER BY detected_at DESC\n            LIMIT $1\n            ', limit)
    reorgs_list = [Reorg(**dict(r)) for r in rows]
    return ReorgsResponse(count=len(reorgs_list), reorgs=reorgs_list)

@app.get('/reorgs/stats', response_model=ReorgStatsResponse)
async def reorgs_stats():
    pool = get_pool()
    windows_config = [('24h', '24 hours'), ('7d', '7 days'), ('30d', '30 days')]
    windows = []
    async with pool.acquire() as conn:
        for label, interval in windows_config:
            row = await conn.fetchrow(f"\n                SELECT COUNT(*) AS count,\n                       AVG(depth)::float AS avg_depth,\n                       MAX(depth) AS max_depth,\n                       COALESCE(SUM(affected_tx_count), 0) AS total_affected_tx\n                FROM reorgs_detected\n                WHERE detected_at >= NOW() - INTERVAL '{interval}'\n                ")
            windows.append(ReorgStatsWindow(window=label, count=row['count'] or 0, avg_depth=row['avg_depth'], max_depth=row['max_depth'], total_affected_tx=row['total_affected_tx'] or 0))
    return ReorgStatsResponse(windows=windows)

@app.get('/pools/distribution', response_model=PoolDistributionResponse)
async def pools_distribution(window: str=Query('24h', regex='^(1h|6h|24h|48h|7d)$')):
    cached = _agg_cache_get(f'pools:{window}', 60)
    if cached is not None:
        return cached
    interval_map = {'1h': '1 hour', '6h': '6 hours', '24h': '24 hours', '48h': '48 hours', '7d': '7 days'}
    interval = interval_map[window]
    pool_obj = get_pool()
    async with pool_obj.acquire() as conn:
        rows = await conn.fetch(f"\n            SELECT COALESCE(miner_pool, 'unknown') AS pool,\n                   COUNT(*) AS block_count\n            FROM blocks\n            WHERE is_canonical = true\n              AND timestamp_human >= NOW() - INTERVAL '{interval}'\n            GROUP BY miner_pool\n            ORDER BY block_count DESC\n            ")
    total = sum((r['block_count'] for r in rows))
    distribution = [PoolShare(pool=r['pool'], block_count=r['block_count'], percentage=round(r['block_count'] * 100.0 / total, 2) if total else 0.0) for r in rows]
    named = sorted([(r['pool'], r['block_count']) for r in rows if r['pool'] != 'unknown'], key=lambda x: x[1], reverse=True)
    top_pool = named[0][0] if named else None
    top_pool_share = round(named[0][1] * 100.0 / total, 2) if named and total else 0.0
    nakamoto = 0
    if total and named:
        cumulative = 0
        for _name, count in named:
            cumulative += count
            nakamoto += 1
            if cumulative * 100.0 / total > 50:
                break
    response = PoolDistributionResponse(window=window, total_blocks=total, top_pool=top_pool, top_pool_share=top_pool_share, nakamoto_coefficient=nakamoto, distribution=distribution)
    _agg_cache_set(f'pools:{window}', response)
    return response


def _parse_tx_extra(extra) -> dict:
    """Walk tx_extra and report what it carries: tx public key, merge-mining tags."""
    b = bytes(extra or [])
    out = {'merge_mining': []}
    i = 0
    while i < len(b):
        tag = b[i]
        if tag == 0x00:
            i += 1
            continue
        if tag == 0x01:
            i += 33
            continue
        if tag == 0x02:
            if i + 1 >= len(b):
                break
            i += 2 + b[i + 1]
            continue
        if tag == 0x03:
            if i + 1 >= len(b):
                break
            size = b[i + 1]
            payload = b[i + 2:i + 2 + size]
            root = payload[-32:].hex() if len(payload) >= 32 else None
            out['merge_mining'].append({'id': root})
            i += 2 + size
            continue
        if tag == 0x04:
            if i + 1 >= len(b):
                break
            i += 2 + b[i + 1] * 32
            continue
        break
    return out


@app.get('/chain/block/{block_hash}', response_model=BlockDetailResponse)
async def block_detail(block_hash: str):
    """Full detail for one block: coinbase, weights, transactions, merge mining.

    Read live from the node so nothing extra has to be stored, and enriched with
    the pool attribution and, when the block was proven, the public inputs that
    let anyone re-verify the proof themselves.
    """
    if not re.fullmatch(r'[0-9a-fA-F]{64}', block_hash):
        raise HTTPException(400, 'block_hash must be 64 hex characters')
    block_hash = block_hash.lower()

    payload = {'jsonrpc': '2.0', 'id': '0', 'method': 'get_block',
               'params': {'hash': block_hash}}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(f'{MONEROD_RPC_URL}/json_rpc', json=payload)
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        log.warning(f'monerod get_block failed: {e}')
        raise HTTPException(503, 'monerod unreachable')
    if 'error' in data:
        raise HTTPException(404, 'block not found')

    result = data.get('result') or {}
    header = result.get('block_header') or {}
    try:
        bj = json.loads(result.get('json') or '{}')
    except ValueError:
        bj = {}
    miner_tx = bj.get('miner_tx') or {}
    extra = _parse_tx_extra(miner_tx.get('extra'))

    pool_obj = get_pool()
    async with pool_obj.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT miner_pool, pool_source FROM blocks WHERE hash = $1', block_hash)

    miner_pool = row['miner_pool'] if row else None
    pool_source = row['pool_source'] if row else None

    proof_address = proof_viewkey = None
    if pool_source == 'viewkey_proof' and miner_pool:
        entry = _POOL_PROOFS.get(miner_pool)
        if entry:
            proof_address = entry.get('address')
            proof_viewkey = entry.get('viewkey')

    reward = header.get('reward')
    return BlockDetailResponse(
        height=header.get('height', 0),
        hash=block_hash,
        prev_hash=header.get('prev_hash'),
        timestamp_unix=header.get('timestamp'),
        difficulty=str(header.get('difficulty')) if header.get('difficulty') is not None else None,
        reward_xmr=f"{reward / 1e12:.12f}" if isinstance(reward, int) else None,
        size_bytes=header.get('block_size'),
        weight=header.get('block_weight'),
        long_term_weight=header.get('long_term_weight'),
        coinbase_hash=result.get('miner_tx_hash'),
        coinbase_outputs=len(miner_tx.get('vout') or []) or None,
        tx_count=header.get('num_txes', 0) or 0,
        tx_hashes=result.get('tx_hashes') or [],
        merge_mining=[MergeMinedChain(**m) for m in extra['merge_mining']],
        miner_pool=miner_pool,
        pool_source=pool_source,
        proof_address=proof_address,
        proof_viewkey=proof_viewkey,
    )


@app.get('/chain/provenance', response_model=ProvenanceResponse)
async def chain_provenance(window: str=Query('24h', regex='^(1h|6h|24h|48h|7d)$')):
    """How our attribution was established over a window.

    Most trackers publish pool shares without saying where the number comes
    from. This reports the evidence behind ours: cryptographically proven,
    claimed by a pool API, structurally inferred, or unattributed -- including
    claims a pool could not prove with its own published key.
    """
    cached = _agg_cache_get(f'prov:{window}', 60)
    if cached is not None:
        return cached

    interval_map = {'1h': '1 hour', '6h': '6 hours', '24h': '24 hours',
                    '48h': '48 hours', '7d': '7 days'}
    interval = interval_map[window]
    pool_obj = get_pool()
    async with pool_obj.acquire() as conn:
        rows = await conn.fetch(f"""
            SELECT COALESCE(pool_source, 'none') AS source, COUNT(*) AS block_count
            FROM blocks
            WHERE is_canonical = true
              AND timestamp_human >= NOW() - INTERVAL '{interval}'
            GROUP BY pool_source
            ORDER BY block_count DESC
        """)

    async with pool_obj.acquire() as conn:
        mm_row = await conn.fetchrow(f"""
            SELECT COUNT(*) FILTER (WHERE merge_mining > 0) AS merge_mined,
                   COUNT(*) AS total
            FROM blocks
            WHERE is_canonical = true
              AND timestamp_human >= NOW() - INTERVAL '{interval}'
        """)

    total = sum(r['block_count'] for r in rows) or 0
    counts = {r['source']: r['block_count'] for r in rows}
    proven = counts.get('viewkey_proof', 0)
    unproven = counts.get('pool_api_unproven', 0)
    unattributed = counts.get('none', 0)

    result = ProvenanceResponse(
        window=window,
        total_blocks=total,
        attributed=total - unattributed,
        proven=proven,
        proven_share=round(proven / total * 100, 2) if total else 0.0,
        unproven_claims=unproven,
        merge_mined=mm_row['merge_mined'] or 0,
        merge_mined_share=round((mm_row['merge_mined'] or 0) / mm_row['total'] * 100, 2) if mm_row['total'] else 0.0,
        breakdown=[
            ProvenanceBucket(
                source=r['source'],
                block_count=r['block_count'],
                percentage=round(r['block_count'] / total * 100, 2) if total else 0.0,
            ) for r in rows
        ],
    )
    _agg_cache_set(f'prov:{window}', result)
    return result


async def _official_price():
    """Spot XMR/USD from CoinGecko, falling back to Kraken."""
    async with httpx.AsyncClient(timeout=8) as client:
        try:
            r = await client.get('https://api.coingecko.com/api/v3/simple/price',
                                  params={'ids': 'monero', 'vs_currencies': 'usd',
                                          'include_24hr_change': 'true'})
            r.raise_for_status()
            m = r.json()['monero']
            return float(m['usd']), m.get('usd_24h_change'), 'coingecko'
        except Exception as e:
            log.warning(f'coingecko price failed: {e}')
        try:
            r = await client.get('https://api.kraken.com/0/public/Ticker',
                                  params={'pair': 'XMRUSD'})
            r.raise_for_status()
            res = r.json()['result']
            k = next(iter(res))
            return float(res[k]['c'][0]), None, 'kraken'
        except Exception as e:
            log.warning(f'kraken price failed: {e}')
    return None, None, None


async def _haveno_price():
    """XMR/USD as it trades on Haveno (RetoSwap network) via haveno.markets."""
    async with httpx.AsyncClient(timeout=8) as client:
        try:
            r = await client.get('https://haveno.markets/api/v1/tickers',
                                  params={'network': 'reto', 'time_period': '24h'})
            r.raise_for_status()
            usd = r.json().get('USD') or {}
            def _f(v):
                try:
                    return float(v)
                except (TypeError, ValueError):
                    return None
            return _f(usd.get('last_price')), _f(usd.get('highest_bid')), _f(usd.get('lowest_ask'))
        except Exception as e:
            log.warning(f'haveno price failed: {e}')
    return None, None, None


@app.get('/price', response_model=PriceResponse)
async def price():
    """XMR/USD: centralised reference plus the Haveno peer-to-peer street price."""
    cached = _agg_cache_get('price', 5)
    if cached is not None:
        return cached

    official, change, source = await _official_price()
    haveno, bid, ask = await _haveno_price()
    premium = None
    if official and haveno:
        premium = round((haveno / official - 1) * 100, 1)

    result = PriceResponse(
        official_usd=round(official, 2) if official else None,
        official_change_24h=round(change, 2) if change is not None else None,
        official_source=source,
        haveno_usd=round(haveno, 2) if haveno else None,
        haveno_bid=round(bid, 2) if bid else None,
        haveno_ask=round(ask, 2) if ask else None,
        premium_pct=premium,
    )
    _agg_cache_set('price', result)
    return result

@app.get('/pools/sources', response_model=PoolSourcesResponse)
async def pools_sources():
    cached = _agg_cache_get('pools:sources', 60)
    if cached is not None:
        return cached
    pool_obj = get_pool()
    async with pool_obj.acquire() as conn:
        try:
            rows = await conn.fetch('SELECT pool, url, ok, blocks, checked_at FROM pool_sources ORDER BY blocks DESC, pool')
        except asyncpg.exceptions.UndefinedTableError:
            rows = []
    result = PoolSourcesResponse(sources=[PoolSource(pool=r['pool'], url=r['url'], ok=r['ok'], blocks=r['blocks'], checked_at=r['checked_at'].isoformat() if r['checked_at'] else None) for r in rows])
    _agg_cache_set('pools:sources', result)
    return result

@app.get('/orphans/recent', response_model=OrphansResponse)
async def orphans_recent(limit: int=Query(50, ge=1, le=500)):
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('\n            SELECT o.height, o.hash AS orphan_hash, c.hash AS canonical_hash,\n                   o.timestamp_human, o.miner_pool, o.tx_count\n            FROM blocks o\n            LEFT JOIN blocks c ON c.height = o.height AND c.is_canonical = true\n            WHERE o.is_canonical = false\n            ORDER BY o.height DESC\n            LIMIT $1\n            ', limit)
    orphans = [OrphanBlock(**dict(r)) for r in rows]
    return OrphansResponse(count=len(orphans), orphans=orphans)
MONEROD_RPC_URL = os.getenv('MONEROD_RPC_URL', 'http://monerod:18081')

def _load_pool_proofs() -> dict:
    """Public proof inputs (address + view key) per pool, so a reader can
    re-verify a proven block without trusting us. Optional: absent file is fine."""
    path = os.getenv('POOL_PROOFS_FILE', os.path.join(os.path.dirname(__file__), 'pool_proofs.json'))
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}

_POOL_PROOFS = _load_pool_proofs()

async def monerod_get_info():
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(f'{MONEROD_RPC_URL}/get_info')
        response.raise_for_status()
        return response.json()
WINDOW_CONFIG = {'1h': ('1 hour', 'minute'), '24h': ('24 hours', 'hour'), '7d': ('7 days', 'hour'), '30d': ('30 days', 'day'), '90d': ('90 days', 'day'), '1y': ('365 days', 'week'), '5y': ('1825 days', 'month')}
WINDOW_REGEX = '^(1h|24h|7d|30d|90d|1y|5y)$'
_network_info_cache = {'data': None, 'timestamp': 0}
_agg_cache: dict[str, tuple] = {}

def _agg_cache_get(key: str, ttl: int):
    import time
    entry = _agg_cache.get(key)
    if entry and time.time() - entry[1] < ttl:
        return entry[0]
    return None

def _agg_cache_set(key: str, value) -> None:
    import time
    _agg_cache[key] = (value, time.time())

_SERIES_TTL = {'1h': 45, '24h': 60, '7d': 180, '30d': 600, '90d': 1200, '1y': 1800, '5y': 3600}

def _series_ttl(window: str) -> int:
    return _SERIES_TTL.get(window, 60)

@app.get('/network/info', response_model=NetworkInfoResponse)
async def network_info():
    import time
    now = time.time()
    if _network_info_cache['data'] and now - _network_info_cache['timestamp'] < 60:
        return _network_info_cache['data']
    try:
        info = await monerod_get_info()
    except Exception as e:
        log.warning(f'monerod /get_info failed: {e}, returning cached if any')
        if _network_info_cache['data']:
            return _network_info_cache['data']
        raise HTTPException(503, 'monerod unreachable')
    mempool_count = int(info.get('tx_pool_size', 0) or 0)
    wide = info.get('wide_difficulty')
    try:
        difficulty = int(str(wide), 16) if wide else int(info.get('difficulty', 0) or 0)
    except (ValueError, TypeError):
        difficulty = int(info.get('difficulty', 0) or 0)
    hashrate = difficulty // 120 if difficulty else None
    height = info.get('height', 0)
    target = info.get('target_height', 0) or height
    sync_pct = height / target * 100 if target else 0.0
    pool_obj = get_pool()
    last_block_age = None
    async with pool_obj.acquire() as conn:
        ts = await conn.fetchval('SELECT timestamp_unix FROM blocks WHERE is_canonical = true ORDER BY height DESC LIMIT 1')
        if ts:
            import time
            last_block_age = int(time.time()) - ts
    response = NetworkInfoResponse(block_height=height, block_hash=info.get('top_block_hash', ''), target_height=target, sync_pct=round(sync_pct, 2), synced=info.get('synchronized', False), difficulty=str(difficulty), mempool_tx_count=mempool_count, network_hashrate_h_s=hashrate, last_block_age_seconds=last_block_age)
    _network_info_cache['data'] = response
    _network_info_cache['timestamp'] = now
    return response

@app.get('/network/hashrate', response_model=HashrateResponse)
async def network_hashrate(window: str=Query('30d', regex=WINDOW_REGEX)):
    cached = _agg_cache_get(f'hashrate:{window}', _series_ttl(window))
    if cached is not None:
        return cached
    interval, grain = WINDOW_CONFIG[window]
    bucket_size = f'1 {grain}'
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(f"\n            SELECT date_trunc('{grain}', timestamp_human) AS bucket,\n                   (AVG(difficulty) / 120)::bigint AS hashrate_h_s\n            FROM blocks\n            WHERE is_canonical = true\n              AND timestamp_unix > 0\n              AND timestamp_human >= NOW() - INTERVAL '{interval}'\n            GROUP BY bucket\n            ORDER BY bucket\n            ")
    points = [HashratePoint(bucket=r['bucket'], hashrate_h_s=r['hashrate_h_s'] or 0) for r in rows]
    response = HashrateResponse(window=window, bucket_size=bucket_size, points=points)
    _agg_cache_set(f'hashrate:{window}', response)
    return response

@app.get('/network/blocktime', response_model=BlocktimeResponse)
async def network_blocktime(window: str=Query('24h', regex=WINDOW_REGEX)):
    cached = _agg_cache_get(f'blocktime:{window}', _series_ttl(window))
    if cached is not None:
        return cached
    interval, _grain = WINDOW_CONFIG[window]
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(f"\n            WITH ordered AS (\n                SELECT height, timestamp_unix,\n                       LAG(timestamp_unix) OVER (ORDER BY height) AS prev_ts\n                FROM blocks\n                WHERE is_canonical = true\n                  AND timestamp_human >= NOW() - INTERVAL '{interval}'\n            )\n            SELECT height, timestamp_unix, (timestamp_unix - prev_ts) AS delta_seconds\n            FROM ordered\n            WHERE prev_ts IS NOT NULL\n              AND (timestamp_unix - prev_ts) BETWEEN 0 AND 3600\n            ORDER BY height\n            ")
    points = [BlocktimePoint(**dict(r)) for r in rows]
    if points:
        deltas = sorted((p.delta_seconds for p in points))
        avg = sum(deltas) / len(deltas)
        median = deltas[len(deltas) // 2]
    else:
        avg = 0.0
        median = 0
    max_points = 1500
    if len(points) > max_points:
        step = len(points) / max_points
        points = [points[int(i * step)] for i in range(max_points)]
    response = BlocktimeResponse(window=window, avg_delta=round(avg, 2), median_delta=median, points=points)
    _agg_cache_set(f'blocktime:{window}', response)
    return response

@app.get('/network/mempool', response_model=MempoolResponse)
async def network_mempool(window: str=Query('24h', regex=WINDOW_REGEX)):
    cached = _agg_cache_get(f'mempool:{window}', _series_ttl(window))
    if cached is not None:
        return cached
    interval, grain = WINDOW_CONFIG[window]
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(f"\n            SELECT date_trunc('{grain}', observed_at) AS bucket,\n                   AVG(tx_count)::int AS tx_count\n            FROM mempool_snapshots\n            WHERE observed_at >= NOW() - INTERVAL '{interval}'\n            GROUP BY bucket\n            ORDER BY bucket\n            ")
        current = await conn.fetchval('SELECT tx_count FROM mempool_snapshots ORDER BY observed_at DESC LIMIT 1')
    points = [MempoolPoint(bucket=r['bucket'], tx_count=r['tx_count'] or 0) for r in rows]
    response = MempoolResponse(window=window, bucket_size=f'1 {grain}', current=current or 0, points=points)
    _agg_cache_set(f'mempool:{window}', response)
    return response

@app.get('/network/emission', response_model=EmissionResponse)
async def network_emission(window: str=Query('30d', regex=WINDOW_REGEX)):
    cached = _agg_cache_get(f'emission:{window}', _series_ttl(window))
    if cached is not None:
        return cached
    interval, grain = WINDOW_CONFIG[window]
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(f"\n            SELECT date_trunc('{grain}', timestamp_human) AS bucket,\n                   AVG(reward_xmr)::numeric(20,12)::text AS avg_reward_xmr,\n                   COUNT(*) AS blocks\n            FROM blocks\n            WHERE is_canonical = true\n              AND timestamp_human >= NOW() - INTERVAL '{interval}'\n            GROUP BY bucket\n            ORDER BY bucket\n            ")
    points = [EmissionPoint(bucket=r['bucket'], avg_reward_xmr=r['avg_reward_xmr'] or '0', blocks=r['blocks']) for r in rows]
    response = EmissionResponse(window=window, bucket_size=f'1 {grain}', points=points)
    _agg_cache_set(f'emission:{window}', response)
    return response

@app.get('/chain/fork-window', response_model=ForkWindowResponse)
async def chain_fork_window(limit: int=Query(80, ge=10, le=500)):
    pool = get_pool()
    async with pool.acquire() as conn:
        tip = await conn.fetchval('SELECT MAX(height) FROM blocks WHERE is_canonical = true')
        if not tip:
            return ForkWindowResponse(tip_height=0, blocks_count=0, reorgs_count=0, blocks=[])
        fork_heights = set()
        reorg_rows = await conn.fetch('\n            SELECT fork_point_height FROM reorgs_detected\n            WHERE fork_point_height >= $1\n            ', tip - limit)
        fork_heights = {r['fork_point_height'] for r in reorg_rows}
        rows = await conn.fetch('\n            SELECT height, hash, prev_hash, is_canonical,\n                   miner_pool, pool_source, merge_mining, timestamp_unix, tx_count\n            FROM blocks\n            WHERE height BETWEEN $1 AND $2\n            ORDER BY height DESC, is_canonical DESC\n            ', tip - limit, tip)
    blocks = []
    for r in rows:
        d = dict(r)
        d['is_fork_point'] = d['height'] in fork_heights
        blocks.append(ForkBlock(**d))
    return ForkWindowResponse(tip_height=tip, blocks_count=len(blocks), reorgs_count=len(fork_heights), blocks=blocks)
