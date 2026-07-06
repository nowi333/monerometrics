"""
Retro-attribution one-shot des pools sur les blocs deja indexes.
Construit l'index {hash: pool} via le module partage, puis UPDATE blocks.miner_pool.
A lancer dans le pod worker (acces OpenBao + Postgres).
"""
import os
import logging

import httpx
import psycopg

import pools

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Profondeur demandee par pool (p2pool.observer plafonne plus bas)
PER_POOL_LIMITS = {"p2pool": 1000}
DEFAULT_LIMIT = 10000


def load_secrets():
    f = "/vault/secrets/postgres-credentials"
    s = {}
    if os.path.exists(f):
        for line in open(f):
            line = line.strip()
            if line.startswith("export ") and "=" in line:
                k, v = line[7:].split("=", 1)
                s[k.strip()] = v.strip().strip('"')
    return s


def main():
    sec = load_secrets()
    pg_user = sec.get("POSTGRES_USER", "monerometrics")
    pg_password = sec.get("POSTGRES_PASSWORD", "")
    pg_db = sec.get("POSTGRES_DB", "monerometrics")
    pg_host = os.getenv("PG_HOST", "postgres")

    # 1. Construire l'index global {hash: pool}
    with httpx.Client(timeout=30, follow_redirects=True,
                      headers={"User-Agent": "mm-retro/1.0"}) as client:
        index = pools.build_pool_index(client, DEFAULT_LIMIT, PER_POOL_LIMITS)
    print(f"Index total: {len(index)} hash uniques")

    # 2. UPDATE en base
    with psycopg.connect(host=pg_host, dbname=pg_db, user=pg_user,
                         password=pg_password, autocommit=False) as conn:
        updated = 0
        with conn.cursor() as cur:
            for hh, pool in index.items():
                cur.execute(
                    "UPDATE blocks SET miner_pool = %s "
                    "WHERE hash = %s AND (miner_pool IS NULL OR miner_pool = 'unknown' OR miner_pool <> %s)",
                    (pool, hh, pool),
                )
                updated += cur.rowcount
        conn.commit()
        print(f"Blocs mis a jour: {updated}")

        # 3. Stats apres
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COALESCE(miner_pool,'unknown'), COUNT(*) FROM blocks "
                "WHERE is_canonical = TRUE AND timestamp_human >= NOW() - INTERVAL '24 hours' "
                "GROUP BY 1 ORDER BY 2 DESC"
            )
            print("=== Distribution 24h apres retro-attribution ===")
            for pool, n in cur.fetchall():
                print(f"  {pool}: {n}")


# Note : plus de sidecar vault-agent a arreter ici. Le CronJob utilise
# l'annotation agent-pre-populate-only (agent en init-container uniquement).
if __name__ == "__main__":
    main()
