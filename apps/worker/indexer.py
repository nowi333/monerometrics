"""
Worker monerometrics : indexe les blocs Monero dans Postgres et detecte les reorgs.

Boucle principale (a chaque poll) :
1. /get_info : le node est-il synchronise ? quelle est sa tete (tip) ?
2. Rescan de la fenetre de confirmation : re-verifie les N derniers blocs deja
   indexes en comparant leur hash a celui du node. Tout ecart = reorganisation
   -> l'ancien bloc devient orphelin, le nouveau devient canonique, et un
   evenement reorgs_detected est enregistre (profondeur + tx affectees reelles).
3. Indexation en avant : recupere les blocs nouveaux (tip non encore indexe).

Cette double passe est le point cle : sans le rescan de la fenetre de
confirmation, une reorg qui reecrit des hauteurs DEJA indexees ne serait jamais
detectee (l'indexation en avant ne revisite jamais le passe).

Variables d'environnement :
- MONEROD_URL              : URL JSON-RPC de monerod (defaut http://monerod:18081)
- DATABASE_URL             : connection string Postgres (sinon construite via secrets)
- POLL_INTERVAL            : secondes entre 2 polls (defaut 30)
- MAX_BLOCKS_PER_BATCH     : blocs indexes par poll en rattrapage (defaut 100)
- CONFIRMATION_WINDOW      : nb de blocs recents re-verifies a chaque poll (defaut 60)
- POOL_INDEX_REFRESH_INTERVAL : rafraichissement de l'index pools (defaut 300s)
- POOL_FETCH_LIMIT         : profondeur demandee aux API pools (defaut 10000)
- METRICS_PORT             : port d'exposition des metriques Prometheus (defaut 9100)
- HEARTBEAT_FILE           : fichier touche a chaque poll, pour la liveness probe
"""

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

# === Configuration via env ===
MONEROD_URL = os.getenv("MONEROD_URL", "http://monerod:18081")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "30"))
MAX_BLOCKS_PER_BATCH = int(os.getenv("MAX_BLOCKS_PER_BATCH", "100"))
CONFIRMATION_WINDOW = int(os.getenv("CONFIRMATION_WINDOW", "60"))

# Backfill historique rapide : tant que le retard depasse LIVE_BLOCKS, on
# rattrape par en-tetes (get_block_headers_range, ~1000 blocs/appel) au lieu de
# bloc complet par bloc complet. Les en-tetes suffisent aux series reseau
# (hashrate, temps de bloc, difficulte, tx) ; l'attribution pool fine est
# reservee au mode live (les API pools ne couvrent que le recent de toute facon).
LIVE_BLOCKS = int(os.getenv("LIVE_BLOCKS", "1000"))
BACKFILL_CHUNK = int(os.getenv("BACKFILL_CHUNK", "1000"))            # max monerod par appel
BACKFILL_CHUNKS_PER_POLL = int(os.getenv("BACKFILL_CHUNKS_PER_POLL", "20"))

POOL_INDEX_REFRESH_INTERVAL = int(os.getenv("POOL_INDEX_REFRESH_INTERVAL", "300"))
POOL_FETCH_LIMIT = int(os.getenv("POOL_FETCH_LIMIT", "10000"))
METRICS_PORT = int(os.getenv("METRICS_PORT", "9100"))
HEARTBEAT_FILE = os.getenv("HEARTBEAT_FILE", "/tmp/worker-heartbeat")

# Retention des instantanes mempool (un par poll). Purge periodique pour borner
# la croissance de la table.
MEMPOOL_RETENTION_DAYS = int(os.getenv("MEMPOOL_RETENTION_DAYS", "90"))
MEMPOOL_PRUNE_INTERVAL = int(os.getenv("MEMPOOL_PRUNE_INTERVAL", "3600"))  # 1h

ATOMIC_UNITS = Decimal(10) ** 12  # 1 XMR = 1e12 unites atomiques

# === Logging stdout pour kubectl logs ===
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("monerometrics-worker")

# === Metriques Prometheus ===
M_LAST_INDEXED = Gauge("monerometrics_last_indexed_height", "Derniere hauteur canonique indexee")
M_NODE_TIP = Gauge("monerometrics_node_tip_height", "Hauteur de la tete du node monerod")
M_LAG = Gauge("monerometrics_indexing_lag_blocks", "Retard d'indexation (tip - derniere hauteur indexee)")
M_SYNCED = Gauge("monerometrics_node_synced", "1 si monerod est synchronise, sinon 0")
M_LAST_LOOP = Gauge("monerometrics_last_loop_unixtime", "Timestamp Unix du dernier passage de boucle")
M_POOL_INDEX = Gauge("monerometrics_pool_index_size", "Nombre de hash dans l'index pools")
M_MEMPOOL = Gauge("monerometrics_mempool_tx_count", "Nombre de transactions dans le mempool")
M_BLOCKS = Counter("monerometrics_blocks_indexed_total", "Total de blocs indexes depuis le demarrage")
M_REORGS = Counter("monerometrics_reorgs_detected_total", "Total de reorgs detectees depuis le demarrage")


# === Chargement des credentials Postgres : OpenBao en priorite, env en fallback ===
def load_secrets_from_openbao():
    """Lit /vault/secrets/postgres-credentials (format: export KEY="value")."""
    secret_file = "/vault/secrets/postgres-credentials"
    if not os.path.exists(secret_file):
        return None
    secrets = {}
    with open(secret_file) as f:
        for line in f:
            line = line.strip()
            if line.startswith("export ") and "=" in line:
                key, value = line[len("export "):].split("=", 1)
                secrets[key.strip()] = value.strip().strip('"')
    return secrets


_openbao_secrets = load_secrets_from_openbao()
if _openbao_secrets:
    PG_USER = _openbao_secrets.get("POSTGRES_USER")
    PG_PASSWORD = _openbao_secrets.get("POSTGRES_PASSWORD")
    PG_DB = _openbao_secrets.get("POSTGRES_DB")
    _source = "OpenBao /vault/secrets/postgres-credentials"
else:
    PG_USER = os.getenv("POSTGRES_USER") or os.getenv("PG_USER", "monerometrics")
    PG_PASSWORD = os.getenv("POSTGRES_PASSWORD") or os.getenv("PG_PASSWORD", "")
    PG_DB = os.getenv("POSTGRES_DB") or os.getenv("PG_DB", "monerometrics")
    _source = "env vars (fallback)"

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{PG_USER}:{PG_PASSWORD}@postgres:5432/{PG_DB}",
)

# Index pools {block_hash: pool_name}, rafraichi periodiquement
_pool_index: dict[str, str] = {}
_pool_index_last_refresh = 0.0


# === Attribution pool ===
def detect_pool(block: dict) -> str:
    """
    Identifie le pool ayant mine un bloc (methode hybride) :
    1. Croisement avec l'index API {block_hash: pool_name}.
    2. Fallback on-chain P2Pool : coinbase a outputs multiples.
    3. Sinon 'unknown' (mineur solo ou pool non suivi).
    """
    header = block.get("block_header", {})
    block_hash = (header.get("hash") or "").lower()

    if block_hash and block_hash in _pool_index:
        return _pool_index[block_hash]

    try:
        block_json = block.get("json")
        if isinstance(block_json, str):
            import json as _json
            block_json = _json.loads(block_json)
        vout = block_json["miner_tx"].get("vout", [])
        if len(vout) > 1:
            return "p2pool"
    except (KeyError, TypeError, ValueError):
        pass

    return "unknown"


def maybe_refresh_pool_index(client: httpx.Client) -> None:
    """Rafraichit l'index pools si l'intervalle est ecoule."""
    global _pool_index, _pool_index_last_refresh
    if time.time() - _pool_index_last_refresh >= POOL_INDEX_REFRESH_INTERVAL:
        _pool_index = pools.build_pool_index(client, POOL_FETCH_LIMIT)
        _pool_index_last_refresh = time.time()
        M_POOL_INDEX.set(len(_pool_index))


# === RPC monerod ===
def get_info(client: httpx.Client) -> dict:
    r = client.get(f"{MONEROD_URL}/get_info", timeout=10)
    r.raise_for_status()
    return r.json()


def get_block_by_height(client: httpx.Client, height: int) -> dict:
    """Bloc complet par hauteur (inclut block_header + json pour le fallback pool)."""
    payload = {"jsonrpc": "2.0", "id": "0", "method": "get_block", "params": {"height": height}}
    r = client.post(f"{MONEROD_URL}/json_rpc", json=payload, timeout=10)
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        raise RuntimeError(f"monerod error: {data['error']}")
    return data["result"]


def get_block_headers_range(client: httpx.Client, start: int, end: int) -> list[dict]:
    """En-tetes [start, end] inclus en un seul appel (max ~1000). Sert au rescan reorg."""
    payload = {
        "jsonrpc": "2.0", "id": "0", "method": "get_block_headers_range",
        "params": {"start_height": start, "end_height": end},
    }
    r = client.post(f"{MONEROD_URL}/json_rpc", json=payload, timeout=15)
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        raise RuntimeError(f"monerod error: {data['error']}")
    return data["result"].get("headers", [])


# === Acces base ===
def get_last_indexed_height(conn: psycopg.Connection) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COALESCE(MAX(height), -1) FROM blocks WHERE is_canonical = TRUE")
        return cur.fetchone()[0]


def record_mempool(conn: psycopg.Connection, info: dict) -> None:
    """
    Historise un instantane du mempool (nb de transactions en attente), a partir
    de tx_pool_size de /get_info. Alimente la serie temporelle /network/mempool.
    """
    tx_count = int(info.get("tx_pool_size", 0) or 0)
    M_MEMPOOL.set(tx_count)
    with conn.cursor() as cur:
        cur.execute("INSERT INTO mempool_snapshots (tx_count) VALUES (%s)", (tx_count,))


_mempool_last_prune = 0.0


def maybe_prune_mempool(conn: psycopg.Connection) -> None:
    """Purge les instantanes mempool plus vieux que la retention (au plus 1x/heure)."""
    global _mempool_last_prune
    if time.time() - _mempool_last_prune < MEMPOOL_PRUNE_INTERVAL:
        return
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM mempool_snapshots "
            "WHERE observed_at < NOW() - make_interval(days => %s)",
            (MEMPOOL_RETENTION_DAYS,),
        )
        if cur.rowcount:
            log.info(f"Pruned {cur.rowcount} mempool snapshots (> {MEMPOOL_RETENTION_DAYS}d)")
    _mempool_last_prune = time.time()


def _difficulty_of(header: dict) -> int:
    """
    Difficulte exacte : Monero expose `wide_difficulty` (hexadecimal, precision
    complete) en plus de `difficulty` (entier JSON, qui perd en precision au-dela
    de 2^53). On privilegie wide_difficulty et on retombe sur difficulty sinon.
    """
    wide = header.get("wide_difficulty")
    if wide:
        try:
            return int(str(wide), 16)
        except (ValueError, TypeError):
            pass
    return int(header.get("difficulty", 0) or 0)


def _insert_canonical(conn: psycopg.Connection, header: dict, pool: str) -> None:
    """
    Insere/maj un bloc comme canonique a partir de son en-tete + son pool.
    La cle primaire est le hash, donc plusieurs blocs peuvent coexister a une
    meme hauteur (canonique + orphelins). L'index unique partiel 'un seul
    canonique par hauteur' impose d'avoir prealablement bascule l'eventuel
    ancien canonique en orphelin (cf. reorg).
    """
    reward = Decimal(int(header.get("reward", 0))) / ATOMIC_UNITS
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO blocks (
                hash, height, prev_hash, timestamp_unix, timestamp_human,
                difficulty, tx_count, size_bytes, miner_address, miner_pool,
                reward_xmr, is_canonical
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
            ON CONFLICT (hash) DO UPDATE SET
                is_canonical = TRUE,
                miner_pool = COALESCE(EXCLUDED.miner_pool, blocks.miner_pool)
            """,
            (
                header["hash"],
                header["height"],
                header.get("prev_hash", ""),
                header["timestamp"],
                datetime.fromtimestamp(header["timestamp"], tz=timezone.utc),
                _difficulty_of(header),
                header.get("num_txes", 0),
                header.get("block_size", 0),
                None,  # miner_address : masque par privacy Monero (stealth address)
                pool,
                reward,
            ),
        )


def upsert_canonical_block(conn: psycopg.Connection, block: dict) -> None:
    """Mode live : bloc complet, attribution pool fine (index + fallback P2Pool)."""
    _insert_canonical(conn, block["block_header"], detect_pool(block))


def upsert_canonical_header(conn: psycopg.Connection, header: dict) -> None:
    """Mode backfill : en-tete seul, pool depuis l'index s'il y figure, sinon 'unknown'."""
    pool = _pool_index.get((header.get("hash") or "").lower(), "unknown")
    _insert_canonical(conn, header, pool)


def index_forward(client: httpx.Client, conn: psycopg.Connection, top: int) -> int:
    """
    Indexe les blocs nouveaux. Deux strategies selon le retard :
    - retard > LIVE_BLOCKS  : backfill rapide par en-tetes (series historiques).
    - retard <= LIVE_BLOCKS : mode live, bloc complet (attribution pool precise).
    """
    last = get_last_indexed_height(conn)
    next_height = last + 1
    if next_height > top:
        return 0

    if top - last > LIVE_BLOCKS:
        return _backfill_headers(client, conn, next_height, top)
    return _index_live(client, conn, next_height, top)


def _index_live(client: httpx.Client, conn: psycopg.Connection, next_height: int, top: int) -> int:
    """Indexe les derniers blocs un par un (bloc complet) pour une attribution pool fiable."""
    end = min(next_height + MAX_BLOCKS_PER_BATCH, top + 1)  # borne exclusive
    log.info(f"Indexing blocks {next_height:,} to {end - 1:,} (live)")
    for h in range(next_height, end):
        upsert_canonical_block(conn, get_block_by_height(client, h))
    conn.commit()
    count = end - next_height
    M_BLOCKS.inc(count)
    log.info(f"Committed {count} blocks (now at height {end - 1:,})")
    return count


def _backfill_headers(client: httpx.Client, conn: psycopg.Connection, next_height: int, top: int) -> int:
    """
    Rattrape l'historique par en-tetes (get_block_headers_range), en s'arretant
    LIVE_BLOCKS avant la tete pour laisser le mode live finir le recent.
    Commit par chunk pour la progression et eviter une transaction geante.
    """
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
    log.info(f"Backfilled {total:,} block headers up to {h - 1:,} (node tip {top:,})")
    return total


def rescan_confirmation_window(client: httpx.Client, conn: psycopg.Connection, top: int) -> int:
    """
    Re-verifie les CONFIRMATION_WINDOW derniers blocs indexes : compare le hash
    canonique stocke a celui du node. Tout ecart est une reorganisation, traitee
    et historisee (profondeur + tx affectees reelles). Retourne le nb de hauteurs reorga.
    """
    start = max(0, top - CONFIRMATION_WINDOW + 1)

    with conn.cursor() as cur:
        cur.execute(
            "SELECT height, hash, tx_count FROM blocks "
            "WHERE is_canonical = TRUE AND height BETWEEN %s AND %s",
            (start, top),
        )
        stored = {row[0]: (row[1], row[2]) for row in cur.fetchall()}

    if not stored:
        return 0

    headers = get_block_headers_range(client, start, min(top, max(stored)))
    node_hashes = {h["height"]: h["hash"] for h in headers}

    # Hauteurs dont le hash canonique stocke differe de celui du node
    changed: list[tuple[int, str, int, str]] = []  # (height, old_hash, old_tx, new_hash)
    for height, (old_hash, old_tx) in stored.items():
        node_hash = node_hashes.get(height)
        if node_hash and node_hash != old_hash:
            changed.append((height, old_hash, old_tx, node_hash))

    if not changed:
        return 0

    changed.sort(key=lambda c: c[0])
    log.warning(f"REORG detected on {len(changed)} height(s): {[c[0] for c in changed]}")

    # Applique le remplacement : ancien -> orphelin, nouveau -> canonique
    with conn.cursor() as cur:
        for height, old_hash, _old_tx, _new_hash in changed:
            cur.execute(
                "UPDATE blocks SET is_canonical = FALSE WHERE hash = %s", (old_hash,)
            )
    for height, _old_hash, _old_tx, _new_hash in changed:
        upsert_canonical_block(conn, get_block_by_height(client, height))

    # Regroupe les hauteurs contigues en evenements de reorg distincts
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
    """Insere un evenement reorgs_detected par run de hauteurs contigues."""
    runs: list[list[tuple[int, str, int, str]]] = []
    for item in changed:  # changed est deja trie par hauteur
        if runs and item[0] == runs[-1][-1][0] + 1:
            runs[-1].append(item)
        else:
            runs.append([item])

    with conn.cursor() as cur:
        for run in runs:
            fork_point = run[0][0]
            depth = len(run)
            tip = run[-1]  # plus haute hauteur du run
            old_tip_hash = tip[1]
            new_tip_hash = tip[3]
            affected_tx = sum(item[2] for item in run)
            cur.execute(
                """
                INSERT INTO reorgs_detected
                    (fork_point_height, depth, old_chain_tip_hash,
                     new_chain_tip_hash, affected_tx_count, notes)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (fork_point, depth, old_tip_hash, new_tip_hash, affected_tx,
                 "Detected during confirmation-window rescan"),
            )


def _heartbeat() -> None:
    """Touche le fichier de heartbeat (consomme par la liveness probe k8s)."""
    try:
        with open(HEARTBEAT_FILE, "w") as f:
            f.write(str(int(time.time())))
    except OSError:
        pass


def index_loop() -> None:
    log.info(
        f"Starting worker · monerod={MONEROD_URL} · poll={POLL_INTERVAL}s "
        f"· batch={MAX_BLOCKS_PER_BATCH} · window={CONFIRMATION_WINDOW}"
    )
    log.info(f"Postgres credentials source: {_source}")

    with httpx.Client() as http_client:
        maybe_refresh_pool_index(http_client)

        while True:
            _heartbeat()
            M_LAST_LOOP.set(time.time())
            try:
                maybe_refresh_pool_index(http_client)

                info = get_info(http_client)
                synced = info.get("synchronized", False)
                node_height = info.get("height", 0)
                target_height = info.get("target_height", 0) or node_height
                top = node_height - 1  # hauteur du bloc de tete
                M_SYNCED.set(1 if synced else 0)
                M_NODE_TIP.set(top)

                if not synced:
                    pct = (node_height / target_height * 100) if target_height else 0
                    log.info(f"Waiting for monerod sync · {node_height:,}/{target_height:,} ({pct:.2f}%)")
                    time.sleep(POLL_INTERVAL)
                    continue

                with psycopg.connect(DATABASE_URL, autocommit=False) as conn:
                    # 1. Instantane du mempool (serie temporelle) + purge periodique
                    record_mempool(conn, info)
                    maybe_prune_mempool(conn)
                    # 2. Detecter d'abord les reorgs sur les blocs deja indexes
                    rescan_confirmation_window(http_client, conn, top)
                    # 3. Puis indexer les blocs nouveaux
                    index_forward(http_client, conn, top)

                    last = get_last_indexed_height(conn)
                    M_LAST_INDEXED.set(last)
                    M_LAG.set(max(0, top - last))
                    if last >= top:
                        log.info(f"Up to date · last indexed = {last:,} · node tip = {top:,}")

            except httpx.RequestError as e:
                log.error(f"HTTP error talking to monerod: {e}")
            except psycopg.OperationalError as e:
                log.error(f"Database error: {e}")
            except Exception as e:
                log.exception(f"Unexpected error: {e}")

            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    start_http_server(METRICS_PORT)
    log.info(f"Prometheus metrics exposed on :{METRICS_PORT}/metrics")
    try:
        index_loop()
    except KeyboardInterrupt:
        log.info("Worker stopped by user")
        sys.exit(0)
