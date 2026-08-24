import os
import sys
import time
import logging
from decimal import Decimal
from datetime import datetime, timezone
import httpx
import psycopg
from prometheus_client import start_http_server, Counter, Gauge
import pools
import pool_proofs
MONEROD_URL = os.getenv('MONEROD_URL', 'http://monerod:18081')
POLL_INTERVAL = int(os.getenv('POLL_INTERVAL', '30'))
MAX_BLOCKS_PER_BATCH = int(os.getenv('MAX_BLOCKS_PER_BATCH', '100'))
CONFIRMATION_WINDOW = int(os.getenv('CONFIRMATION_WINDOW', '60'))
LIVE_BLOCKS = int(os.getenv('LIVE_BLOCKS', '1000'))
BACKFILL_CHUNK = int(os.getenv('BACKFILL_CHUNK', '1000'))
BACKFILL_CHUNKS_PER_POLL = int(os.getenv('BACKFILL_CHUNKS_PER_POLL', '20'))
POOL_INDEX_REFRESH_INTERVAL = int(os.getenv('POOL_INDEX_REFRESH_INTERVAL', '300'))
POOL_FETCH_LIMIT = int(os.getenv('POOL_FETCH_LIMIT', '10000'))
METRICS_PORT = int(os.getenv('METRICS_PORT', '9100'))
HEARTBEAT_FILE = os.getenv('HEARTBEAT_FILE', '/tmp/worker-heartbeat')
MEMPOOL_RETENTION_DAYS = int(os.getenv('MEMPOOL_RETENTION_DAYS', '90'))
MEMPOOL_PRUNE_INTERVAL = int(os.getenv('MEMPOOL_PRUNE_INTERVAL', '3600'))
PRICE_INTERVAL = int(os.getenv('PRICE_INTERVAL', '600'))
PRICE_RETENTION_DAYS = int(os.getenv('PRICE_RETENTION_DAYS', '400'))
ATOMIC_UNITS = Decimal(10) ** 12
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s', stream=sys.stdout)
log = logging.getLogger('monerometrics-worker')
M_LAST_INDEXED = Gauge('monerometrics_last_indexed_height', 'Derniere hauteur canonique indexee')
M_NODE_TIP = Gauge('monerometrics_node_tip_height', 'Hauteur de la tete du node monerod')
M_LAG = Gauge('monerometrics_indexing_lag_blocks', "Retard d'indexation (tip - derniere hauteur indexee)")
M_SYNCED = Gauge('monerometrics_node_synced', '1 si monerod est synchronise, sinon 0')
M_LAST_LOOP = Gauge('monerometrics_last_loop_unixtime', 'Timestamp Unix du dernier passage de boucle')
M_POOL_INDEX = Gauge('monerometrics_pool_index_size', "Nombre de hash dans l'index pools")
M_MEMPOOL = Gauge('monerometrics_mempool_tx_count', 'Nombre de transactions dans le mempool')
M_BLOCKS = Counter('monerometrics_blocks_indexed_total', 'Total de blocs indexes depuis le demarrage')
M_REORGS = Counter('monerometrics_reorgs_detected_total', 'Total de reorgs detectees depuis le demarrage')
M_CONFLICTS = Counter('monerometrics_attribution_conflicts_total', 'Blocs ou une API de pool contredit la preuve cryptographique')
M_PROVEN = Counter('monerometrics_blocks_proven_total', 'Blocs attribues par preuve viewkey')
M_UNPROVEN = Counter('monerometrics_unproven_claims_total', "Blocs revendiques par un pool dont la cle de vue publiee ne les prouve pas")

def load_secrets_from_openbao():
    secret_file = '/vault/secrets/postgres-credentials'
    if not os.path.exists(secret_file):
        return None
    secrets = {}
    with open(secret_file) as f:
        for line in f:
            line = line.strip()
            if line.startswith('export ') and '=' in line:
                key, value = line[len('export '):].split('=', 1)
                secrets[key.strip()] = value.strip().strip('"')
    return secrets
_openbao_secrets = load_secrets_from_openbao()
if _openbao_secrets:
    PG_USER = _openbao_secrets.get('POSTGRES_USER')
    PG_PASSWORD = _openbao_secrets.get('POSTGRES_PASSWORD')
    PG_DB = _openbao_secrets.get('POSTGRES_DB')
    _source = 'OpenBao /vault/secrets/postgres-credentials'
else:
    PG_USER = os.getenv('POSTGRES_USER') or os.getenv('PG_USER', 'monerometrics')
    PG_PASSWORD = os.getenv('POSTGRES_PASSWORD') or os.getenv('PG_PASSWORD', '')
    PG_DB = os.getenv('POSTGRES_DB') or os.getenv('PG_DB', 'monerometrics')
    _source = 'env vars (fallback)'
DATABASE_URL = os.getenv('DATABASE_URL', f'postgresql://{PG_USER}:{PG_PASSWORD}@postgres:5432/{PG_DB}')
_pool_index: dict[str, str] = {}
_pool_index_last_refresh = 0.0

def _miner_tx(block: dict):
    try:
        block_json = block.get('json')
        if isinstance(block_json, str):
            import json as _json
            block_json = _json.loads(block_json)
        return block_json['miner_tx']
    except (KeyError, TypeError, ValueError):
        return None


def detect_pool(block: dict) -> tuple[str, str | None]:
    """Return (pool, source). Source records how the pool was established."""
    mt = _miner_tx(block)
    block_hash = ((block.get('block_header') or {}).get('hash') or '').lower()
    claimed = _pool_index.get(block_hash) if block_hash else None

    if mt:
        proven = pool_proofs.identify(mt)
        if proven:
            if claimed and claimed != proven:
                M_CONFLICTS.inc()
                log.warning(f'attribution conflict at {block_hash[:12]}: '
                            f'proof says {proven}, {claimed} API claims it')
            return proven, 'viewkey_proof'

    if claimed:
        if mt and claimed in pool_proofs.provable_pools():
            M_UNPROVEN.inc()
            log.warning(f'unproven claim at {block_hash[:12]}: {claimed} lists it '
                        f'but its published view key does not prove it')
            return claimed, 'pool_api_unproven'
        return claimed, 'pool_api'

    if mt and len(mt.get('vout') or []) > 1:
        return 'p2pool', 'coinbase_heuristic'

    return 'unknown', None

def maybe_refresh_pool_index(client: httpx.Client) -> None:
    global _pool_index, _pool_index_last_refresh
    if time.time() - _pool_index_last_refresh >= POOL_INDEX_REFRESH_INTERVAL:
        _pool_index = pools.build_pool_index(client, POOL_FETCH_LIMIT)
        _pool_index_last_refresh = time.time()
        M_POOL_INDEX.set(len(_pool_index))
_pool_sources_table_ready = False

def persist_pool_sources(conn: psycopg.Connection) -> None:
    global _pool_sources_table_ready
    if not pools.LAST_STATUS:
        return
    with conn.cursor() as cur:
        if not _pool_sources_table_ready:
            cur.execute('ALTER TABLE blocks ADD COLUMN IF NOT EXISTS pool_source TEXT')
            cur.execute('ALTER TABLE blocks ADD COLUMN IF NOT EXISTS merge_mining SMALLINT')
            cur.execute('\n                CREATE TABLE IF NOT EXISTS pool_sources (\n                    pool        TEXT PRIMARY KEY,\n                    url         TEXT NOT NULL,\n                    ok          BOOLEAN NOT NULL,\n                    blocks      INTEGER NOT NULL,\n                    checked_at  TIMESTAMPTZ NOT NULL\n                )\n            ')
            _pool_sources_table_ready = True
        for name, st in pools.LAST_STATUS.items():
            cur.execute('\n                INSERT INTO pool_sources (pool, url, ok, blocks, checked_at)\n                VALUES (%s, %s, %s, %s, to_timestamp(%s))\n                ON CONFLICT (pool) DO UPDATE\n                SET url = EXCLUDED.url, ok = EXCLUDED.ok,\n                    blocks = EXCLUDED.blocks, checked_at = EXCLUDED.checked_at\n                ', (name, st['url'], st['ok'], st['blocks'], st['checked_at']))
    conn.commit()

PROOF_BATCH = int(os.getenv('PROOF_BATCH', '60'))


def verify_proof_keys(client: httpx.Client) -> None:
    """Check each view key against a block the pool's own API claims.

    A key that cannot prove such a block is stale or wrong; pool_proofs drops it
    so it can never mislabel a block. Runs once at startup.
    """
    samples = {}
    for block_hash, pool in _pool_index.items():
        if pool in samples or pool not in pool_proofs.load_pools():
            continue
        samples[pool] = block_hash
    if not samples:
        return

    txs = {}
    for pool, block_hash in samples.items():
        try:
            payload = {'jsonrpc': '2.0', 'id': '0', 'method': 'get_block',
                       'params': {'hash': block_hash}}
            r = client.post(f'{MONEROD_URL}/json_rpc', json=payload, timeout=10)
            r.raise_for_status()
            mt = _miner_tx(r.json().get('result') or {})
            if mt:
                txs[pool] = mt
        except Exception:
            continue

    if txs:
        results = pool_proofs.self_check(txs)
        good = [k for k, v in results.items() if v]
        bad = [k for k, v in results.items() if not v]
        log.info(f'View-key self-check: {len(good)} verified {good}'
                 + (f', {len(bad)} REJECTED {bad}' if bad else ''))


def reattribute_recent_unknown(client: httpx.Client, conn: psycopg.Connection,
                               tip: int, depth: int=1000) -> None:
    """Re-check recent unknown blocks: pool APIs catch up over time, and blocks
    indexed before view-key proofs existed have never been proven."""
    with conn.cursor() as cur:
        cur.execute("\n            SELECT height, hash FROM blocks\n            WHERE is_canonical = true\n              AND (miner_pool IS NULL OR miner_pool = 'unknown' OR pool_source IS NULL)\n              AND height >= %s\n            ORDER BY height DESC\n            ", (tip - depth,))
        rows = cur.fetchall()

        todo = [(height, h) for height, h in rows]

    by_proof = 0
    proven = set()
    for height, h in todo[:PROOF_BATCH]:
        try:
            mt = _miner_tx(get_block_by_height(client, height))
            pool = pool_proofs.identify(mt) if mt else None
        except Exception:
            continue
        if pool:
            with conn.cursor() as cur:
                cur.execute('UPDATE blocks SET miner_pool = %s, pool_source = %s WHERE hash = %s', (pool, 'viewkey_proof', h))
            proven.add(h)
            by_proof += 1
    if by_proof:
        conn.commit()

    by_api = 0
    with conn.cursor() as cur:
        for height, h in todo:
            if h in proven:
                continue
            pool = _pool_index.get((h or '').lower()) if _pool_index else None
            if pool:
                cur.execute('UPDATE blocks SET miner_pool = %s, pool_source = %s WHERE hash = %s', (pool, 'pool_api', h))
                by_api += 1
    conn.commit()

    if by_api or by_proof:
        log.info(f'Re-attributed {by_api} block(s) via pool API, {by_proof} via view-key proof')

def get_info(client: httpx.Client) -> dict:
    r = client.get(f'{MONEROD_URL}/get_info', timeout=10)
    r.raise_for_status()
    return r.json()

def get_block_by_height(client: httpx.Client, height: int) -> dict:
    payload = {'jsonrpc': '2.0', 'id': '0', 'method': 'get_block', 'params': {'height': height}}
    r = client.post(f'{MONEROD_URL}/json_rpc', json=payload, timeout=10)
    r.raise_for_status()
    data = r.json()
    if 'error' in data:
        raise RuntimeError(f"monerod error: {data['error']}")
    return data['result']

def get_block_headers_range(client: httpx.Client, start: int, end: int) -> list[dict]:
    payload = {'jsonrpc': '2.0', 'id': '0', 'method': 'get_block_headers_range', 'params': {'start_height': start, 'end_height': end}}
    r = client.post(f'{MONEROD_URL}/json_rpc', json=payload, timeout=15)
    r.raise_for_status()
    data = r.json()
    if 'error' in data:
        raise RuntimeError(f"monerod error: {data['error']}")
    return data['result'].get('headers', [])

def get_last_indexed_height(conn: psycopg.Connection) -> int:
    with conn.cursor() as cur:
        cur.execute('SELECT COALESCE(MAX(height), -1) FROM blocks WHERE is_canonical = TRUE')
        return cur.fetchone()[0]

def record_mempool(conn: psycopg.Connection, info: dict) -> None:
    tx_count = int(info.get('tx_pool_size', 0) or 0)
    M_MEMPOOL.set(tx_count)
    with conn.cursor() as cur:
        cur.execute('INSERT INTO mempool_snapshots (tx_count) VALUES (%s)', (tx_count,))
_mempool_last_prune = 0.0

def maybe_prune_mempool(conn: psycopg.Connection) -> None:
    global _mempool_last_prune
    if time.time() - _mempool_last_prune < MEMPOOL_PRUNE_INTERVAL:
        return
    with conn.cursor() as cur:
        cur.execute('DELETE FROM mempool_snapshots WHERE observed_at < NOW() - make_interval(days => %s)', (MEMPOOL_RETENTION_DAYS,))
        if cur.rowcount:
            log.info(f'Pruned {cur.rowcount} mempool snapshots (> {MEMPOOL_RETENTION_DAYS}d)')
    _mempool_last_prune = time.time()

def _difficulty_of(header: dict) -> int:
    wide = header.get('wide_difficulty')
    if wide:
        try:
            return int(str(wide), 16)
        except (ValueError, TypeError):
            pass
    return int(header.get('difficulty', 0) or 0)

def _insert_canonical(conn: psycopg.Connection, header: dict, pool: str,
                      source: str | None = None, mm: int | None = None) -> None:
    reward = Decimal(int(header.get('reward', 0))) / ATOMIC_UNITS
    with conn.cursor() as cur:
        cur.execute('\n            INSERT INTO blocks (\n                hash, height, prev_hash, timestamp_unix, timestamp_human,\n                difficulty, tx_count, size_bytes, miner_address, miner_pool,\n                pool_source, merge_mining, reward_xmr, is_canonical\n            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)\n            ON CONFLICT (hash) DO UPDATE SET\n                is_canonical = TRUE,\n                miner_pool = COALESCE(EXCLUDED.miner_pool, blocks.miner_pool),\n                pool_source = COALESCE(EXCLUDED.pool_source, blocks.pool_source),\n                merge_mining = COALESCE(EXCLUDED.merge_mining, blocks.merge_mining)\n            ', (header['hash'], header['height'], header.get('prev_hash', ''), header['timestamp'], datetime.fromtimestamp(header['timestamp'], tz=timezone.utc), _difficulty_of(header), header.get('num_txes', 0), header.get('block_size', 0), None, pool, source, mm, reward))

def upsert_canonical_block(conn: psycopg.Connection, block: dict) -> None:
    pool, source = detect_pool(block)
    mt = _miner_tx(block)
    mm = pool_proofs.merge_mining_chains(mt.get('extra')) if mt else None
    _insert_canonical(conn, block['block_header'], pool, source, mm)

def upsert_canonical_header(conn: psycopg.Connection, header: dict) -> None:
    pool = _pool_index.get((header.get('hash') or '').lower())
    _insert_canonical(conn, header, pool or 'unknown', 'pool_api' if pool else None)

def index_forward(client: httpx.Client, conn: psycopg.Connection, top: int) -> int:
    last = get_last_indexed_height(conn)
    next_height = last + 1
    if next_height > top:
        return 0
    if top - last > LIVE_BLOCKS:
        return _backfill_headers(client, conn, next_height, top)
    return _index_live(client, conn, next_height, top)

def _index_live(client: httpx.Client, conn: psycopg.Connection, next_height: int, top: int) -> int:
    end = min(next_height + MAX_BLOCKS_PER_BATCH, top + 1)
    log.info(f'Indexing blocks {next_height:,} to {end - 1:,} (live)')
    for h in range(next_height, end):
        upsert_canonical_block(conn, get_block_by_height(client, h))
    conn.commit()
    count = end - next_height
    M_BLOCKS.inc(count)
    log.info(f'Committed {count} blocks (now at height {end - 1:,})')
    return count

def _backfill_headers(client: httpx.Client, conn: psycopg.Connection, next_height: int, top: int) -> int:
    target = top - LIVE_BLOCKS
    total = 0
    chunks = 0
    h = next_height
    while h <= target and chunks < BACKFILL_CHUNKS_PER_POLL:
        end = min(h + BACKFILL_CHUNK - 1, target)
        headers = get_block_headers_range(client, h, end)
        if not headers:
            break
        for hdr in headers:
            upsert_canonical_header(conn, hdr)
        conn.commit()
        total += len(headers)
        chunks += 1
        h = end + 1
    M_BLOCKS.inc(total)
    log.info(f'Backfilled {total:,} block headers up to {h - 1:,} (node tip {top:,})')
    return total

def rescan_confirmation_window(client: httpx.Client, conn: psycopg.Connection, top: int) -> int:
    start = max(0, top - CONFIRMATION_WINDOW + 1)
    with conn.cursor() as cur:
        cur.execute('SELECT height, hash, tx_count FROM blocks WHERE is_canonical = TRUE AND height BETWEEN %s AND %s', (start, top))
        stored = {row[0]: (row[1], row[2]) for row in cur.fetchall()}
    if not stored:
        return 0
    headers = get_block_headers_range(client, start, min(top, max(stored)))
    node_hashes = {h['height']: h['hash'] for h in headers}
    changed: list[tuple[int, str, int, str]] = []
    for height, (old_hash, old_tx) in stored.items():
        node_hash = node_hashes.get(height)
        if node_hash and node_hash != old_hash:
            changed.append((height, old_hash, old_tx, node_hash))
    if not changed:
        return 0
    changed.sort(key=lambda c: c[0])
    log.warning(f'REORG detected on {len(changed)} height(s): {[c[0] for c in changed]}')
    with conn.cursor() as cur:
        for height, old_hash, _old_tx, _new_hash in changed:
            cur.execute('UPDATE blocks SET is_canonical = FALSE WHERE hash = %s', (old_hash,))
    for height, _old_hash, _old_tx, _new_hash in changed:
        upsert_canonical_block(conn, get_block_by_height(client, height))
    _record_reorg_events(conn, changed)
    conn.commit()
    M_REORGS.inc(_count_groups(changed))
    return len(changed)

def _count_groups(changed: list[tuple[int, str, int, str]]) -> int:
    groups = 0
    prev = None
    for height, *_ in changed:
        if prev is None or height != prev + 1:
            groups += 1
        prev = height
    return groups

def _record_reorg_events(conn: psycopg.Connection, changed: list[tuple[int, str, int, str]]) -> None:
    runs: list[list[tuple[int, str, int, str]]] = []
    for item in changed:
        if runs and item[0] == runs[-1][-1][0] + 1:
            runs[-1].append(item)
        else:
            runs.append([item])
    with conn.cursor() as cur:
        for run in runs:
            fork_point = run[0][0]
            depth = len(run)
            tip = run[-1]
            old_tip_hash = tip[1]
            new_tip_hash = tip[3]
            affected_tx = sum((item[2] for item in run))
            cur.execute('\n                INSERT INTO reorgs_detected\n                    (fork_point_height, depth, old_chain_tip_hash,\n                     new_chain_tip_hash, affected_tx_count, notes)\n                VALUES (%s, %s, %s, %s, %s, %s)\n                ', (fork_point, depth, old_tip_hash, new_tip_hash, affected_tx, 'Detected during confirmation-window rescan'))

def _heartbeat() -> None:
    try:
        with open(HEARTBEAT_FILE, 'w') as f:
            f.write(str(int(time.time())))
    except OSError:
        pass


_price_last_record = 0.0

def ensure_price_table(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS price_snapshots (
                observed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                official_usd    NUMERIC(12,2),
                official_source TEXT,
                haveno_last     NUMERIC(12,2),
                haveno_bid      NUMERIC(12,2),
                haveno_ask      NUMERIC(12,2),
                haveno_vol_24h  NUMERIC(16,2),
                PRIMARY KEY (observed_at)
            )
        """)
        cur.execute('CREATE INDEX IF NOT EXISTS price_snapshots_time_idx ON price_snapshots (observed_at DESC)')

def _fetch_official(http_client: httpx.Client):
    try:
        r = http_client.get('https://api.coingecko.com/api/v3/simple/price',
                            params={'ids': 'monero', 'vs_currencies': 'usd'}, timeout=8)
        r.raise_for_status()
        return float(r.json()['monero']['usd']), 'coingecko'
    except Exception as e:
        log.warning(f'coingecko price failed: {e}')
    try:
        r = http_client.get('https://api.kraken.com/0/public/Ticker',
                            params={'pair': 'XMRUSD'}, timeout=8)
        r.raise_for_status()
        res = r.json()['result']
        return float(res[next(iter(res))]['c'][0]), 'kraken'
    except Exception as e:
        log.warning(f'kraken price failed: {e}')
    return None, None

def _fetch_haveno(http_client: httpx.Client):
    try:
        r = http_client.get('https://haveno.markets/api/v1/tickers',
                            params={'network': 'reto', 'time_period': '24h'}, timeout=8)
        r.raise_for_status()
        usd = r.json().get('USD') or {}
        def f(v):
            try:
                return float(v)
            except (TypeError, ValueError):
                return None
        return f(usd.get('last_price')), f(usd.get('highest_bid')), f(usd.get('lowest_ask')), f(usd.get('base_vol'))
    except Exception as e:
        log.warning(f'haveno price failed: {e}')
    return None, None, None, None

def maybe_record_price(conn: psycopg.Connection, http_client: httpx.Client) -> None:
    global _price_last_record
    if time.time() - _price_last_record < PRICE_INTERVAL:
        return
    official, source = _fetch_official(http_client)
    last, bid, ask, vol = _fetch_haveno(http_client)
    if official is None and last is None:
        return
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO price_snapshots
                (official_usd, official_source, haveno_last, haveno_bid, haveno_ask, haveno_vol_24h)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (official, source, last, bid, ask, vol))
        cur.execute('DELETE FROM price_snapshots WHERE observed_at < NOW() - make_interval(days => %s)',
                    (PRICE_RETENTION_DAYS,))
    _price_last_record = time.time()
    if official and ask:
        log.info(f'Price recorded · official={official} · haveno ask={ask} · spread={round((ask/official-1)*100,2)}%')

def index_loop() -> None:
    log.info(f'Starting worker · monerod={MONEROD_URL} · poll={POLL_INTERVAL}s · batch={MAX_BLOCKS_PER_BATCH} · window={CONFIRMATION_WINDOW}')
    log.info(f'Postgres credentials source: {_source}')
    with httpx.Client() as http_client:
        maybe_refresh_pool_index(http_client)
        verify_proof_keys(http_client)
        while True:
            _heartbeat()
            M_LAST_LOOP.set(time.time())
            try:
                maybe_refresh_pool_index(http_client)
                info = get_info(http_client)
                synced = info.get('synchronized', False)
                node_height = info.get('height', 0)
                target_height = info.get('target_height', 0) or node_height
                top = node_height - 1
                M_SYNCED.set(1 if synced else 0)
                M_NODE_TIP.set(top)
                if not synced:
                    pct = node_height / target_height * 100 if target_height else 0
                    log.info(f'Waiting for monerod sync · {node_height:,}/{target_height:,} ({pct:.2f}%)')
                    time.sleep(POLL_INTERVAL)
                    continue
                with psycopg.connect(DATABASE_URL, autocommit=False) as conn:
                    persist_pool_sources(conn)
                    ensure_price_table(conn)
                    record_mempool(conn, info)
                    maybe_record_price(conn, http_client)
                    maybe_prune_mempool(conn)
                    rescan_confirmation_window(http_client, conn, top)
                    index_forward(http_client, conn, top)
                    reattribute_recent_unknown(http_client, conn, top)
                    last = get_last_indexed_height(conn)
                    M_LAST_INDEXED.set(last)
                    M_LAG.set(max(0, top - last))
                    if last >= top:
                        log.info(f'Up to date · last indexed = {last:,} · node tip = {top:,}')
            except httpx.RequestError as e:
                log.error(f'HTTP error talking to monerod: {e}')
            except psycopg.OperationalError as e:
                log.error(f'Database error: {e}')
            except Exception as e:
                log.exception(f'Unexpected error: {e}')
            time.sleep(POLL_INTERVAL)
if __name__ == '__main__':
    start_http_server(METRICS_PORT)
    log.info(f'Prometheus metrics exposed on :{METRICS_PORT}/metrics')
    try:
        index_loop()
    except KeyboardInterrupt:
        log.info('Worker stopped by user')
        sys.exit(0)
