"""Etat de l'integration de XMR sur THORChain, lu sur un thornode public.

Tant que la chaine n'est pas active, le tableau de bord affiche une liste de
verification : pool cree, adresse de depot publiee, echanges ouverts. Le serveur
interroge le noeud lui-meme pour que le navigateur du visiteur ne contacte
aucun tiers.
"""
import time

import httpx
from fastapi import APIRouter

router = APIRouter()

THORNODE = 'https://gateway.liquify.com/chain/thorchain_api/thorchain'
TTL = 600
_cache: dict = {'at': 0.0, 'data': None}


def summarize(pools: list, inbound: list, mimir: dict) -> dict:
    pool = next((p for p in pools if p.get('asset') == 'XMR.XMR'), None)
    vault = next((v for v in inbound if v.get('chain') == 'XMR'), None)
    halts = {k: v for k, v in mimir.items() if 'XMR' in k.upper()}
    halted = bool(vault and vault.get('halted')) or any(
        k.upper().startswith('HALT') and v not in (0, '0') for k, v in halts.items())
    live = bool(pool and pool.get('status') == 'Available' and vault and not halted)
    return {
        'live': live,
        'pool': None if not pool else {
            'status': pool.get('status'),
            'xmr_depth': int(pool.get('balance_asset', 0)) / 1e8,
            'rune_depth': int(pool.get('balance_rune', 0)) / 1e8,
        },
        'inbound_address': bool(vault),
        'halted': halted,
        'mimir': halts,
        'chains_live': sorted({v.get('chain') for v in inbound if v.get('chain')}),
    }


@router.get('/thorchain/status')
async def thorchain_status():
    """Whether native XMR is live on THORChain: pool, inbound vault, halts."""
    now = time.time()
    if _cache['data'] and now - _cache['at'] < TTL:
        return _cache['data']
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            pools = (await client.get(f'{THORNODE}/pools')).json()
            inbound = (await client.get(f'{THORNODE}/inbound_addresses')).json()
            mimir = (await client.get(f'{THORNODE}/mimir')).json()
        data = {**summarize(pools, inbound, mimir), 'checked_at': int(now), 'source': 'thornode'}
    except (httpx.HTTPError, ValueError):
        if _cache['data']:
            return _cache['data']
        data = {'live': False, 'pool': None, 'inbound_address': False, 'halted': False,
                'mimir': {}, 'chains_live': [], 'checked_at': int(now), 'source': 'unavailable'}
        return data
    _cache.update(at=now, data=data)
    return data
