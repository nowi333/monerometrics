import logging
import time
import httpx
log = logging.getLogger('monerometrics-worker')
LAST_STATUS: dict[str, dict] = {}
POOL_APIS = {'supportxmr.com': ('https://www.supportxmr.com/api/pool/blocks?limit={limit}', 'standard'), 'p2pool': ('https://p2pool.observer/api/pool/blocks?limit={limit}', 'standard'), 'hashvault.pro': ('https://api.hashvault.pro/v3/monero/pool/blocks?limit={limit}&page=0', 'standard'), 'moneroocean.stream': ('https://api.moneroocean.stream/pool/blocks?limit=100', 'standard'), 'c3pool.com': ('https://api.c3pool.org/pool/blocks?limit={limit}', 'standard'), 'nanopool.org': ('https://xmr.nanopool.org/api/v1/pool/blocks/0/{limit}', 'nanopool'), 'kryptex.com': ('https://pool.kryptex.com/xmr/api/v1/pool/blocks?limit={limit}', 'kryptex'), 'herominers.com': ('https://monero.herominers.com/api/get_blocks?height={height}', 'cryptonote_paged'), 'xmrpool.eu': ('https://web.xmrpool.eu:8119/get_blocks?height={height}', 'cryptonote_paged'), 'monerohash.com': ('https://monerohash.com/api/get_blocks?height={height}', 'cryptonote_paged')}
CRYPTONOTE_MAX_PAGES = 6

def _parse_cryptonote_flat(raw: list) -> list[tuple[int, str]]:
    blocks: list[tuple[int, str]] = []
    i = 0
    while i < len(raw) - 1:
        try:
            hh = str(raw[i]).split(':')[0]
            h = int(raw[i + 1])
            if hh and len(hh) == 64:
                blocks.append((h, hh.lower()))
        except (ValueError, IndexError):
            pass
        i += 2
    return blocks

def parse_pool_response(parser_type: str, data) -> list[tuple[int, str]]:
    blocks: list[tuple[int, str]] = []
    if parser_type == 'herominers':
        return _parse_cryptonote_flat(data.get('pool', {}).get('blocks', []))
    if parser_type == 'cryptonote_paged':
        return _parse_cryptonote_flat(data if isinstance(data, list) else [])
    if parser_type == 'standard':
        rows = data if isinstance(data, list) else []
    elif parser_type == 'nanopool':
        rows = data.get('data', []) if isinstance(data, dict) else []
    elif parser_type == 'kryptex':
        rows = data.get('results', []) if isinstance(data, dict) else []
    else:
        rows = []
    for b in rows:
        if not isinstance(b, dict):
            continue
        h = b.get('height') or b.get('block_number')
        hh = b.get('hash')
        if h and hh:
            blocks.append((int(h), str(hh).lower()))
    return blocks
KRYPTEX_MAX_PAGES = 15

def fetch_pool_blocks(client: httpx.Client, name: str, url_template: str, parser_type: str, limit: int) -> list[tuple[int, str]]:
    headers = {'User-Agent': 'monerometrics/1.0'}
    try:
        if parser_type == 'kryptex':
            blocks: list[tuple[int, str]] = []
            url = url_template.format(limit=100)
            for _ in range(KRYPTEX_MAX_PAGES):
                r = client.get(url, timeout=12, follow_redirects=True, headers=headers)
                r.raise_for_status()
                payload = r.json()
                blocks.extend(parse_pool_response(parser_type, payload))
                url = payload.get('next') if isinstance(payload, dict) else None
                if not url:
                    break
            return blocks
        if parser_type == 'cryptonote_paged':
            acc: dict[str, int] = {}
            low = 99999999
            for _ in range(CRYPTONOTE_MAX_PAGES):
                r = client.get(url_template.format(height=low), timeout=12, follow_redirects=True, headers=headers)
                r.raise_for_status()
                page = parse_pool_response(parser_type, r.json())
                new = [(h, hh) for h, hh in page if hh not in acc]
                if not new:
                    break
                for h, hh in page:
                    acc[hh] = h
                low = min((h for h, _ in page))
            return [(h, hh) for hh, h in acc.items()]
        r = client.get(url_template.format(limit=limit), timeout=12, follow_redirects=True, headers=headers)
        r.raise_for_status()
        return parse_pool_response(parser_type, r.json())
    except Exception as e:
        log.warning(f'Pool API {name} failed: {e}')
        return []

def build_pool_index(client: httpx.Client, limit: int, per_pool_limits: dict[str, int] | None=None) -> dict[str, str]:
    index: dict[str, str] = {}
    total = 0
    for name, (url_template, parser_type) in POOL_APIS.items():
        pool_limit = (per_pool_limits or {}).get(name, limit)
        blocks = fetch_pool_blocks(client, name, url_template, parser_type, pool_limit)
        LAST_STATUS[name] = {'url': url_template.split('?')[0], 'ok': len(blocks) > 0, 'blocks': len(blocks), 'checked_at': time.time()}
        for _height, block_hash in blocks:
            index[block_hash] = name
            total += 1
    log.info(f'Pool index built: {len(index)} unique block hashes from {total} entries across {len(POOL_APIS)} pools')
    return index
