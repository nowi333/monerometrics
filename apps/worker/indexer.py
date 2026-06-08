"""
Worker monerometrics : indexe les blocs Monero dans Postgres et detecte les reorgs.

Boucle principale :
1. Poll monerod /get_info pour savoir si le node est sync
2. Si sync, lit la derniere hauteur indexee dans Postgres
3. Recupere les nouveaux blocs via /json_rpc getblock
4. Insert dans blocks + transactions
5. Detecte les reorgs : si un bloc deja indexe a change de hash -> insert dans reorgs_detected

Variables d environnement :
- MONEROD_URL : URL JSON-RPC de monerod (defaut http://monerod:18081)
- DATABASE_URL : connection string Postgres (defaut depuis env Pod)
- POLL_INTERVAL : secondes entre 2 polls (defaut 30)
"""

import os
import sys
import time
import logging
from datetime import datetime, timezone

import httpx
import psycopg
from psycopg.rows import dict_row

# === Configuration via env + secrets OpenBao ===
MONEROD_URL = os.getenv("MONEROD_URL", "http://monerod:18081")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "30"))
MAX_BLOCKS_PER_BATCH = int(os.getenv("MAX_BLOCKS_PER_BATCH", "100"))

# === Pool detection via API declaratives (methode miningpoolstats) ===
# Chaque pool expose ses blocs trouves. On agrege pour construire un index
# {block_hash: pool_name} qu'on consulte lors de l'indexation.
# Couverture ~95% (le reste = solo miners ou pools non suivis -> 'unknown').

POOL_INDEX_REFRESH_INTERVAL = int(os.getenv("POOL_INDEX_REFRESH_INTERVAL", "300"))  # 5 min
POOL_FETCH_LIMIT = int(os.getenv("POOL_FETCH_LIMIT", "2000"))

# Config des pools : {name: (url_template, parser_type)}
# parser_type : 'standard' | 'nanopool' | 'kryptex'
POOL_APIS = {
    "supportxmr.com": ("https://www.supportxmr.com/api/pool/blocks?limit={limit}", "standard"),
    "p2pool": ("https://p2pool.observer/api/pool/blocks?limit={limit}", "standard"),
    "hashvault.pro": ("https://api.hashvault.pro/v3/monero/pool/blocks?limit={limit}&page=0", "standard"),
    "moneroocean.stream": ("https://api.moneroocean.stream/pool/blocks?limit={limit}", "standard"),
    "c3pool.com": ("https://api.c3pool.org/pool/blocks?limit={limit}", "standard"),
    "nanopool.org": ("https://xmr.nanopool.org/api/v1/pool/blocks/0/{limit}", "nanopool"),
    "kryptex.com": ("https://pool.kryptex.com/xmr/api/v1/pool/blocks?limit={limit}", "kryptex"),
}

# Index global {block_hash: pool_name}, rafraichi periodiquement
_pool_index = {}
_pool_index_last_refresh = 0


def _parse_pool_response(parser_type: str, data) -> list:
    """
    Normalise la reponse d'un pool en liste de (height, hash).
    Gere les 3 formats : standard, nanopool (wrapper data), kryptex (wrapper results).
    """
    blocks = []
    if parser_type == "standard":
        # [{height, hash, ts}, ...]
        for b in data:
            h = b.get("height")
            hh = b.get("hash")
            if h and hh:
                blocks.append((int(h), hh.lower()))
    elif parser_type == "nanopool":
        # {status, data: [{block_number, hash, date}]}
        for b in data.get("data", []):
            h = b.get("block_number")
            hh = b.get("hash")
            if h and hh:
                blocks.append((int(h), hh.lower()))
    elif parser_type == "kryptex":
        # {count, results: [{height, hash, date}]}
        for b in data.get("results", []):
            h = b.get("height")
            hh = b.get("hash")
            if h and hh:
                blocks.append((int(h), hh.lower()))
    return blocks


def fetch_pool_blocks(client: httpx.Client, name: str, url_template: str, parser_type: str) -> list:
    """Recupere les derniers blocs trouves par un pool. Retourne [(height, hash)]."""
    url = url_template.format(limit=POOL_FETCH_LIMIT)
    try:
        r = client.get(url, timeout=12, follow_redirects=True,
                       headers={"User-Agent": "monerometrics/1.0"})
        r.raise_for_status()
        return _parse_pool_response(parser_type, r.json())
    except Exception as e:
        log.warning(f"Pool API {name} failed: {e}")
        return []


def refresh_pool_index(client: httpx.Client) -> None:
    """Reconstruit l'index {block_hash: pool_name} en agregeant tous les pools."""
    global _pool_index, _pool_index_last_refresh
    new_index = {}
    total = 0
    for name, (url_template, parser_type) in POOL_APIS.items():
        blocks = fetch_pool_blocks(client, name, url_template, parser_type)
        for height, block_hash in blocks:
            new_index[block_hash] = name
            total += 1
    _pool_index = new_index
    _pool_index_last_refresh = time.time()
    log.info(f"Pool index refreshed: {len(_pool_index)} unique block hashes from {total} entries across {len(POOL_APIS)} pools")


def maybe_refresh_pool_index(client: httpx.Client) -> None:
    """Rafraichit l'index si l'intervalle est ecoule."""
    if time.time() - _pool_index_last_refresh >= POOL_INDEX_REFRESH_INTERVAL:
        refresh_pool_index(client)


def detect_pool(block: dict) -> str:
    """
    Identifie le pool ayant mine un bloc, methode hybride :

    1. Croisement API (methode miningpoolstats) : consulte l'index
       {block_hash: pool_name} construit a partir des API declaratives
       des principaux pools. Si le hash du bloc y figure -> pool identifie.

    2. Fallback on-chain P2Pool : si le hash n'est pas dans l'index mais que
       la coinbase a plusieurs outputs (signature structurelle P2Pool), on
       classe en 'p2pool'.

    3. Sinon : 'unknown' (solo miner ou pool non suivi).

    Limitation assumee (privacy-by-design Monero) :
    - Les pools centralises ne signent PAS leur coinbase on-chain
    - Identification = uniquement via donnees declaratives off-chain (API pools)
    - ~95% de couverture, comme les agregateurs publics (miningpoolstats)

    Retourne : nom du pool ('supportxmr.com', 'p2pool', ...) | 'unknown'
    """
    header = block.get("block_header", {})
    block_hash = (header.get("hash") or "").lower()

    # 1. Croisement avec index API
    if block_hash and block_hash in _pool_index:
        return _pool_index[block_hash]

    # 2. Fallback on-chain : detection P2Pool par multi-output coinbase
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

    # 3. Non identifie
    return "unknown"


def load_secrets_from_openbao():
    """
    Lit /vault/secrets/postgres-credentials injecte par OpenBao agent (sidecar).
    Format attendu : export KEY="value" par ligne.
    Retourne dict {KEY: value} ou None si fichier absent.
    """
    secret_file = "/vault/secrets/postgres-credentials"
    if not os.path.exists(secret_file):
        return None
    secrets = {}
    with open(secret_file) as f:
        for line in f:
            line = line.strip()
            if line.startswith("export "):
                # Parse format: export KEY="value"
                key_value = line[len("export "):]
                if "=" in key_value:
                    key, value = key_value.split("=", 1)
                    secrets[key.strip()] = value.strip().strip('"')
    return secrets


# Charger credentials Postgres : OpenBao en priorite, env vars k8s en fallback
_openbao_secrets = load_secrets_from_openbao()
if _openbao_secrets:
    PG_USER = _openbao_secrets.get("POSTGRES_USER")
    PG_PASSWORD = _openbao_secrets.get("POSTGRES_PASSWORD")
    PG_DB = _openbao_secrets.get("POSTGRES_DB")
    _source = "OpenBao /vault/secrets/postgres-credentials"
else:
    # Fallback : env vars (dev local ou bootstrap sans OpenBao)
    PG_USER = os.getenv("POSTGRES_USER") or os.getenv("PG_USER", "monerometrics")
    PG_PASSWORD = os.getenv("POSTGRES_PASSWORD") or os.getenv("PG_PASSWORD", "")
    PG_DB = os.getenv("POSTGRES_DB") or os.getenv("PG_DB", "monerometrics")
    _source = "env vars (fallback)"

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{PG_USER}:{PG_PASSWORD}@postgres:5432/{PG_DB}"
)

# === Logging stdout pour kubectl logs ===
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("monerometrics-worker")
log.info(f"Postgres credentials source: {_source}")


def get_info(client: httpx.Client) -> dict:
    """Appelle /get_info pour avoir le statut du node."""
    r = client.get(f"{MONEROD_URL}/get_info", timeout=10)
    r.raise_for_status()
    return r.json()


def get_block_by_height(client: httpx.Client, height: int) -> dict:
    """Recupere un bloc par sa hauteur via JSON-RPC."""
    payload = {
        "jsonrpc": "2.0",
        "id": "0",
        "method": "get_block",
        "params": {"height": height},
    }
    r = client.post(f"{MONEROD_URL}/json_rpc", json=payload, timeout=10)
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        raise RuntimeError(f"monerod error: {data['error']}")
    return data["result"]


def get_last_indexed_height(conn: psycopg.Connection) -> int:
    """Lit la derniere hauteur indexee dans Postgres. Retourne -1 si vide."""
    with conn.cursor() as cur:
        cur.execute("SELECT COALESCE(MAX(height), -1) FROM blocks WHERE is_canonical = TRUE")
        return cur.fetchone()[0]


def insert_block(conn: psycopg.Connection, block: dict) -> None:
    """Insert un bloc dans la table blocks. ON CONFLICT pour detecter les reorgs."""
    header = block["block_header"]
    height = header["height"]
    new_hash = header["hash"]

    with conn.cursor() as cur:
        # Verifier si on a deja ce bloc avec un hash different (= reorg)
        cur.execute("SELECT hash FROM blocks WHERE height = %s", (height,))
        existing = cur.fetchone()

        if existing and existing[0] != new_hash:
            # REORG detecte !
            log.warning(f"REORG detected at height {height} : old={existing[0][:16]} new={new_hash[:16]}")
            cur.execute(
                """
                INSERT INTO reorgs_detected (fork_point_height, depth, old_chain_tip_hash, new_chain_tip_hash, notes)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (height, 1, existing[0], new_hash, "Detected during indexing"),
            )
            # Marquer l'ancien bloc comme orphan
            cur.execute("UPDATE blocks SET is_canonical = FALSE WHERE height = %s AND hash = %s", (height, existing[0]))

        # Upsert le bloc canonical actuel
        cur.execute(
            """
            INSERT INTO blocks (
                height, hash, prev_hash, timestamp_unix, timestamp_human,
                difficulty, tx_count, size_bytes, miner_address, miner_pool,
                reward_xmr, is_canonical
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
            ON CONFLICT (height) DO UPDATE SET
                hash = EXCLUDED.hash,
                prev_hash = EXCLUDED.prev_hash,
                timestamp_unix = EXCLUDED.timestamp_unix,
                timestamp_human = EXCLUDED.timestamp_human,
                difficulty = EXCLUDED.difficulty,
                tx_count = EXCLUDED.tx_count,
                size_bytes = EXCLUDED.size_bytes,
                reward_xmr = EXCLUDED.reward_xmr,
                is_canonical = TRUE
            """,
            (
                height,
                new_hash,
                header.get("prev_hash", ""),
                header["timestamp"],
                datetime.fromtimestamp(header["timestamp"], tz=timezone.utc),
                header["difficulty"],
                header.get("num_txes", 0),
                header.get("block_size", 0),
                None,  # miner_address : masque par privacy Monero (stealth address)
                detect_pool(block),  # miner_pool : nom pool via API croisees | p2pool | unknown
                header.get("reward", 0) / 1e12,  # atomic units -> XMR
                # is_canonical hardcoded TRUE via le query
            ),
        )


def index_loop():
    """Boucle principale du worker."""
    log.info(f"Starting worker · monerod={MONEROD_URL} · poll_interval={POLL_INTERVAL}s")

    with httpx.Client() as http_client:
        # Premier remplissage de l'index pools au demarrage
        refresh_pool_index(http_client)

        while True:
            try:
                # 0. Rafraichir l'index pools si necessaire (toutes les 5 min)
                maybe_refresh_pool_index(http_client)

                # 1. Status monerod
                info = get_info(http_client)
                synced = info.get("synchronized", False)
                local_height = info.get("height", 0)
                target_height = info.get("target_height", 0) or local_height
                pct = (local_height / target_height * 100) if target_height else 0

                if not synced:
                    log.info(f"Waiting for monerod sync · {local_height:,}/{target_height:,} ({pct:.2f}%)")
                    time.sleep(POLL_INTERVAL)
                    continue

                # 2. Sync OK, on indexe
                with psycopg.connect(DATABASE_URL, autocommit=False) as conn:
                    last = get_last_indexed_height(conn)
                    next_height = last + 1

                    if next_height > local_height - 1:
                        log.info(f"Up to date · last indexed = {last:,} · monerod tip = {local_height:,}")
                        time.sleep(POLL_INTERVAL)
                        continue

                    # On rattrape par batch pour pas spam monerod
                    end_height = min(next_height + MAX_BLOCKS_PER_BATCH, local_height)
                    log.info(f"Indexing blocks {next_height:,} to {end_height - 1:,}")

                    for h in range(next_height, end_height):
                        block = get_block_by_height(http_client, h)
                        insert_block(conn, block)

                    conn.commit()
                    log.info(f"Committed {end_height - next_height} blocks (now at height {end_height - 1:,})")

            except httpx.RequestError as e:
                log.error(f"HTTP error talking to monerod : {e}")
                time.sleep(POLL_INTERVAL)
            except psycopg.OperationalError as e:
                log.error(f"Database error : {e}")
                time.sleep(POLL_INTERVAL)
            except Exception as e:
                log.exception(f"Unexpected error : {e}")
                time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    try:
        index_loop()
    except KeyboardInterrupt:
        log.info("Worker stopped by user")
        sys.exit(0)
