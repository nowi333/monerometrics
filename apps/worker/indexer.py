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
                None,  # miner_address : pas dispo via get_block, on enrichira plus tard
                None,  # miner_pool : a calculer via heuristique sur miner_tx
                header.get("reward", 0) / 1e12,  # atomic units -> XMR
                # is_canonical hardcoded TRUE via le query
            ),
        )


def index_loop():
    """Boucle principale du worker."""
    log.info(f"Starting worker · monerod={MONEROD_URL} · poll_interval={POLL_INTERVAL}s")

    with httpx.Client() as http_client:
        while True:
            try:
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
