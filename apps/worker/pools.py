"""
Attribution des pools de minage — logique partagee entre l'indexeur (indexer.py)
et la retro-attribution one-shot (retro_pools.py).

Methode (identique aux agregateurs type miningpoolstats) : chaque pool expose
publiquement les blocs qu'il a trouves. On agrege ces listes en un index
{block_hash: pool_name} consulte lors de l'indexation. Couverture ~95% ; le
reste (mineurs solo, pools non suivis) reste 'unknown'.
"""
import logging

import httpx

log = logging.getLogger("monerometrics-worker")

# Config des pools : {name: (url_template, parser_type)}
# parser_type : 'standard' | 'nanopool' | 'kryptex' | 'herominers'
POOL_APIS = {
    "supportxmr.com": ("https://www.supportxmr.com/api/pool/blocks?limit={limit}", "standard"),
    "p2pool": ("https://p2pool.observer/api/pool/blocks?limit={limit}", "standard"),
    "hashvault.pro": ("https://api.hashvault.pro/v3/monero/pool/blocks?limit={limit}&page=0", "standard"),
    "moneroocean.stream": ("https://api.moneroocean.stream/pool/blocks?limit={limit}", "standard"),
    "c3pool.com": ("https://api.c3pool.org/pool/blocks?limit={limit}", "standard"),
    "nanopool.org": ("https://xmr.nanopool.org/api/v1/pool/blocks/0/{limit}", "nanopool"),
    "kryptex.com": ("https://pool.kryptex.com/xmr/api/v1/pool/blocks?limit={limit}", "kryptex"),
    "herominers.com": ("https://monero.herominers.com/api/stats", "herominers"),
}


def parse_pool_response(parser_type: str, data) -> list[tuple[int, str]]:
    """Normalise la reponse d'un pool en liste de (height, hash)."""
    blocks: list[tuple[int, str]] = []

    if parser_type == "herominers":
        # cryptonote-nodejs-pool : {pool: {blocks: ["hash:ts:diff:...", height, ...]}}
        # liste plate alternee : index pair = chaine, index impair = hauteur.
        raw = data.get("pool", {}).get("blocks", [])
        i = 0
        while i < len(raw) - 1:
            try:
                hh = str(raw[i]).split(":")[0]
                h = int(raw[i + 1])
                if hh and len(hh) == 64:
                    blocks.append((h, hh.lower()))
            except (ValueError, IndexError):
                pass
            i += 2
        return blocks

    # Selection de la liste de lignes selon le format
    if parser_type == "standard":
        rows = data if isinstance(data, list) else []
    elif parser_type == "nanopool":
        rows = data.get("data", []) if isinstance(data, dict) else []
    elif parser_type == "kryptex":
        rows = data.get("results", []) if isinstance(data, dict) else []
    else:
        rows = []

    for b in rows:
        if not isinstance(b, dict):
            continue
        h = b.get("height") or b.get("block_number")
        hh = b.get("hash")
        if h and hh:
            blocks.append((int(h), str(hh).lower()))
    return blocks


def fetch_pool_blocks(client: httpx.Client, name: str, url_template: str,
                      parser_type: str, limit: int) -> list[tuple[int, str]]:
    """Recupere les derniers blocs trouves par un pool. Retourne [(height, hash)]."""
    url = url_template.format(limit=limit)
    try:
        r = client.get(url, timeout=12, follow_redirects=True,
                       headers={"User-Agent": "monerometrics/1.0"})
        r.raise_for_status()
        return parse_pool_response(parser_type, r.json())
    except Exception as e:
        log.warning(f"Pool API {name} failed: {e}")
        return []


def build_pool_index(client: httpx.Client, limit: int,
                     per_pool_limits: dict[str, int] | None = None) -> dict[str, str]:
    """
    Agrege tous les pools en un index {block_hash: pool_name}.

    limit            : profondeur demandee par defaut a chaque API.
    per_pool_limits  : surcharges optionnelles {pool_name: limit}.
    """
    index: dict[str, str] = {}
    total = 0
    for name, (url_template, parser_type) in POOL_APIS.items():
        pool_limit = (per_pool_limits or {}).get(name, limit)
        blocks = fetch_pool_blocks(client, name, url_template, parser_type, pool_limit)
        for _height, block_hash in blocks:
            index[block_hash] = name
            total += 1
    log.info(
        f"Pool index built: {len(index)} unique block hashes "
        f"from {total} entries across {len(POOL_APIS)} pools"
    )
    return index
