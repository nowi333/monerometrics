"""Ce qu'une transaction Monero rend public, lu dans la reponse de monerod.

Aucun acces reseau ni base ici : la fonction prend une entree de
/get_transactions et en extrait ce qui est visible par construction.
Montants, expediteur et destinataire n'y figurent pas, et ce n'est pas un
oubli : le protocole les chiffre.
"""
import json
from collections import Counter

ATOMIC_PER_XMR = 10 ** 12

# Nombre de blocs avant qu'une sortie recue soit depensable, regle par defaut
# du protocole.
LOCK_BLOCKS = 10

# Numerotation de rct_signatures.type dans monerod.
RCT_TYPES = {
    0: 'null', 1: 'full', 2: 'simple', 3: 'bulletproof',
    4: 'bulletproof2', 5: 'clsag', 6: 'bulletproof_plus',
}


def _xmr(atomic):
    if atomic is None:
        return None
    return f'{atomic / ATOMIC_PER_XMR:.12f}'


def parse_transaction(entry: dict) -> dict:
    try:
        tx = json.loads(entry.get('as_json') or '{}')
    except (TypeError, ValueError):
        tx = {}

    vin = tx.get('vin') or []
    vout = tx.get('vout') or []
    coinbase = any('gen' in i for i in vin)

    # Les anneaux ont tous la meme taille depuis les derniers forks, mais une
    # vieille transaction peut les melanger : on retient la taille dominante.
    rings = [len((i.get('key') or {}).get('key_offsets') or []) for i in vin if 'key' in i]
    ring_size = Counter(rings).most_common(1)[0][0] if rings else None

    rct = tx.get('rct_signatures') or {}
    fee_atomic = None if coinbase else rct.get('txnFee')
    rct_type = rct.get('type')

    as_hex = entry.get('as_hex') or ''
    size = len(as_hex) // 2 if as_hex else None

    in_pool = bool(entry.get('in_pool'))
    height = None if in_pool else (entry.get('block_height') or None)
    timestamp = None if in_pool else (entry.get('block_timestamp') or None)

    return {
        'tx_hash': entry.get('tx_hash'),
        'in_pool': in_pool,
        'block_height': height,
        'block_timestamp': timestamp,
        'confirmations': entry.get('confirmations'),
        'double_spend_seen': bool(entry.get('double_spend_seen')),
        'version': tx.get('version'),
        'unlock_time': tx.get('unlock_time'),
        'coinbase': coinbase,
        'input_count': len(vin),
        'output_count': len(vout),
        'ring_size': ring_size,
        'rct_type': RCT_TYPES.get(rct_type) if rct_type is not None else None,
        'fee_xmr': _xmr(fee_atomic),
        'fee_per_byte': round(fee_atomic / size) if fee_atomic and size else None,
        'size_bytes': size,
    }


def spendable(confirmations, unlock_time, current_height) -> bool:
    """Une sortie recue n'est depensable qu'apres LOCK_BLOCKS confirmations,
    et jamais avant une eventuelle hauteur de deverrouillage explicite."""
    if confirmations is None or confirmations < LOCK_BLOCKS:
        return False
    # En dessous de 500 000 000, unlock_time est une hauteur de bloc ; au-dela
    # c'est un horodatage, rarissime et qu'on ne tranche pas ici.
    if unlock_time and unlock_time < 500_000_000 and current_height is not None:
        return current_height >= unlock_time
    return True
