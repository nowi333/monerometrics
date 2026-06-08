"""
Retro-attribution one-shot des pools sur les blocs deja indexes.
Recupere le max de chaque API pool, puis UPDATE blocks.miner_pool.
A lancer dans le pod worker (acces OpenBao + Postgres).
"""
import os, time, json, httpx, psycopg2

# Reutilise la logique de l'indexeur
POOL_APIS = {
    "supportxmr.com": ("https://www.supportxmr.com/api/pool/blocks?limit={limit}", "standard"),
    "p2pool": ("https://p2pool.observer/api/pool/blocks?limit={limit}", "standard"),
    "hashvault.pro": ("https://api.hashvault.pro/v3/monero/pool/blocks?limit={limit}&page=0", "standard"),
    "moneroocean.stream": ("https://api.moneroocean.stream/pool/blocks?limit={limit}", "standard"),
    "c3pool.com": ("https://api.c3pool.org/pool/blocks?limit={limit}", "standard"),
    "nanopool.org": ("https://xmr.nanopool.org/api/v1/pool/blocks/0/{limit}", "nanopool"),
    "kryptex.com": ("https://pool.kryptex.com/xmr/api/v1/pool/blocks?limit={limit}", "kryptex"),
}
# Profondeur demandee par pool (selon plafond reel constate)
LIMITS = {
    "supportxmr.com": 10000, "p2pool": 1000, "hashvault.pro": 10000,
    "moneroocean.stream": 10000, "c3pool.com": 10000,
    "nanopool.org": 10000, "kryptex.com": 10000,
}

def parse(parser_type, data):
    blocks = []
    if parser_type == "standard":
        rows = data if isinstance(data, list) else []
    elif parser_type == "nanopool":
        rows = data.get("data", [])
    elif parser_type == "kryptex":
        rows = data.get("results", [])
    else:
        rows = []
    for b in rows:
        h = b.get("height") or b.get("block_number")
        hh = b.get("hash")
        if h and hh:
            blocks.append((int(h), hh.lower()))
    return blocks

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

sec = load_secrets()
PG_USER = sec.get("POSTGRES_USER", "monerometrics")
PG_PASSWORD = sec.get("POSTGRES_PASSWORD", "")
PG_DB = sec.get("POSTGRES_DB", "monerometrics")
PG_HOST = os.getenv("PG_HOST", "postgres")

# 1. Construire l'index global
index = {}
with httpx.Client(timeout=30, follow_redirects=True, headers={"User-Agent": "mm-retro/1.0"}) as c:
    for name, (tpl, ptype) in POOL_APIS.items():
        url = tpl.format(limit=LIMITS.get(name, 1000))
        try:
            r = c.get(url)
            r.raise_for_status()
            bl = parse(ptype, r.json())
            for _, hh in bl:
                index[hh] = name
            print(f"{name}: {len(bl)} blocs recuperes")
        except Exception as e:
            print(f"{name}: ERREUR {str(e)[:70]}")
print(f"Index total: {len(index)} hash uniques")

# 2. UPDATE en base
conn = psycopg2.connect(host=PG_HOST, dbname=PG_DB, user=PG_USER, password=PG_PASSWORD)
conn.autocommit = False
cur = conn.cursor()
updated = 0
for hh, pool in index.items():
    cur.execute(
        "UPDATE blocks SET miner_pool = %s WHERE hash = %s AND (miner_pool IS NULL OR miner_pool = 'unknown' OR miner_pool <> %s)",
        (pool, hh, pool),
    )
    updated += cur.rowcount
conn.commit()
print(f"Blocs mis a jour: {updated}")

# 3. Stats apres
cur.execute("SELECT COALESCE(miner_pool,'unknown'), COUNT(*) FROM blocks WHERE timestamp_human >= NOW() - INTERVAL '24 hours' GROUP BY 1 ORDER BY 2 DESC")
print("=== Distribution 24h apres retro-attribution ===")
for pool, n in cur.fetchall():
    print(f"  {pool}: {n}")
cur.close()
conn.close()
