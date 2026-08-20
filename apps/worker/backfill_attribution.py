import os
import time
import logging
import httpx
import psycopg
import pools
import pool_proofs
import indexer
from concurrent.futures import ThreadPoolExecutor

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
log = logging.getLogger('backfill')

P2POOL_LAUNCH = 2688888
SOURCE_RANK = {None: 0, 'coinbase_heuristic': 1, 'pool_api_unproven': 2, 'pool_api': 3, 'viewkey_proof': 4}

API_LIMIT = int(os.getenv('API_LIMIT', '200000'))
PER_POOL = {'p2pool': int(os.getenv('P2POOL_API_LIMIT', '5000'))}
FROM_HEIGHT = int(os.getenv('FROM_HEIGHT', '0'))
TO_HEIGHT = os.getenv('TO_HEIGHT')
MAX_BLOCKS = int(os.getenv('MAX_BLOCKS', '0'))
SLEEP_MS = int(os.getenv('SLEEP_MS', '5'))
RUN_API = os.getenv('RUN_API', '1') == '1'
RUN_PROOF = os.getenv('RUN_PROOF', '1') == '1'
COMMIT_EVERY = int(os.getenv('COMMIT_EVERY', '2000'))
CONCURRENCY = int(os.getenv('CONCURRENCY', '16'))
CHUNK_ROWS = int(os.getenv('CHUNK_ROWS', '4000'))


def db_dsn():
    user = os.getenv('POSTGRES_USER', 'monerometrics')
    pw = os.getenv('POSTGRES_PASSWORD', '')
    db = os.getenv('POSTGRES_DB', 'monerometrics')
    host = os.getenv('POSTGRES_HOST') or os.getenv('POSTGRES_SERVICE_HOST') or os.getenv('PG_HOST') or 'postgres'
    port = os.getenv('POSTGRES_SERVICE_PORT') or '5432'
    if not str(port).isdigit():
        port = '5432'
    return f'host={host} port={port} dbname={db} user={user} password={pw}'


def phase_api(conn):
    with httpx.Client(timeout=30, follow_redirects=True, headers={'User-Agent': 'mm-backfill/1.0'}) as client:
        index = pools.build_pool_index(client, API_LIMIT, PER_POOL)
    log.info(f'pool API index: {len(index)} hashes')
    indexer._pool_index = index
    updated = 0
    with conn.cursor() as cur:
        items = list(index.items())
        for i in range(0, len(items), 5000):
            for hh, pool in items[i:i + 5000]:
                cur.execute(
                    "UPDATE blocks SET miner_pool = %s, pool_source = 'pool_api' "
                    "WHERE hash = %s AND is_canonical = true "
                    "AND (pool_source IS NULL OR pool_source IN ('coinbase_heuristic','pool_api_unproven') "
                    "     OR miner_pool IS NULL OR miner_pool = 'unknown')",
                    (pool, hh))
                updated += cur.rowcount
            conn.commit()
    log.info(f'phase API: {updated} blocs attribués')
    return index


def phase_proof(conn):
    with httpx.Client(timeout=15, follow_redirects=True, headers={'User-Agent': 'mm-backfill/1.0'}) as client:
        try:
            indexer.bootstrap_view_keys(client)
        except Exception as e:
            log.warning(f'view-key self-check skipped: {e}')
        provable = pool_proofs.provable_pools()
        log.info(f'viewkeys prouvables: {sorted(provable)}')

        top = int(TO_HEIGHT) if TO_HEIGHT else None
        with conn.cursor() as cur:
            if top is None:
                cur.execute('SELECT MAX(height) FROM blocks WHERE is_canonical = true')
                top = cur.fetchone()[0] or 0
            cur.execute(
                "SELECT height, hash, miner_pool, pool_source, merge_mining FROM blocks "
                "WHERE is_canonical = true AND height BETWEEN %s AND %s "
                "AND (pool_source IS NULL OR pool_source = 'coinbase_heuristic' "
                "     OR miner_pool IS NULL OR miner_pool = 'unknown' OR merge_mining IS NULL) "
                "ORDER BY height DESC",
                (FROM_HEIGHT, top))
            rows = cur.fetchall()
        log.info(f'phase proof: {len(rows)} blocs à examiner ({FROM_HEIGHT}..{top})')

        if MAX_BLOCKS:
            rows = rows[:MAX_BLOCKS]
        done = 0
        upd_proof = upd_p2p = upd_mm = 0
        pending = 0

        def fetch(row):
            height = row[0]
            try:
                return row, indexer._miner_tx(indexer.get_block_by_height(client, height))
            except Exception:
                return row, None

        with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool_ex:
            for i in range(0, len(rows), CHUNK_ROWS):
                batch = rows[i:i + CHUNK_ROWS]
                for (height, h, cur_pool, cur_src, cur_mm), mt in pool_ex.map(fetch, batch):
                    done += 1
                    if not mt:
                        continue
                    new_pool, new_src = None, None
                    proven = pool_proofs.identify(mt)
                    if proven:
                        new_pool, new_src = proven, 'viewkey_proof'
                    elif height >= P2POOL_LAUNCH and len(mt.get('vout') or []) > 1:
                        new_pool, new_src = 'p2pool', 'coinbase_heuristic'

                    sets, args = [], []
                    if new_pool and SOURCE_RANK[new_src] > SOURCE_RANK.get(cur_src, 0):
                        sets.append('miner_pool = %s'); args.append(new_pool)
                        sets.append('pool_source = %s'); args.append(new_src)
                        if new_src == 'viewkey_proof':
                            upd_proof += 1
                        else:
                            upd_p2p += 1
                    if cur_mm is None:
                        mm = pool_proofs.merge_mining_chains(mt.get('extra'))
                        if mm is not None:
                            sets.append('merge_mining = %s'); args.append(mm)
                            upd_mm += 1
                    if sets:
                        args.append(h)
                        with conn.cursor() as cur:
                            cur.execute(f'UPDATE blocks SET {", ".join(sets)} WHERE hash = %s', args)
                        pending += 1
                    if pending >= COMMIT_EVERY:
                        conn.commit(); pending = 0
                conn.commit()
                log.info(f'  ...{done}/{len(rows)} (proof={upd_proof} p2pool={upd_p2p} mm={upd_mm})')
        conn.commit()
        log.info(f'phase proof terminée: examinés={done} viewkey={upd_proof} p2pool={upd_p2p} merge_mining={upd_mm}')


def connect_with_retry(attempts=15, delay=4):
    last = None
    for i in range(attempts):
        try:
            return psycopg.connect(db_dsn(), autocommit=False)
        except psycopg.OperationalError as e:
            last = e
            log.warning(f'DB connect attempt {i + 1}/{attempts} failed: {e}')
            time.sleep(delay)
    raise last


def main():
    with connect_with_retry() as conn:
        if RUN_API:
            phase_api(conn)
        if RUN_PROOF:
            phase_proof(conn)
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM blocks WHERE is_canonical=true AND miner_pool IS NOT NULL AND miner_pool<>'unknown'")
            att = cur.fetchone()[0]
            cur.execute('SELECT count(*) FROM blocks WHERE is_canonical=true')
            total = cur.fetchone()[0]
        log.info(f'attributed: {att}/{total} ({100.0*att/max(total,1):.2f}%)')


if __name__ == '__main__':
    main()
