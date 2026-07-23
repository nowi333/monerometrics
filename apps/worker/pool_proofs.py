import json
import logging
import os
from hashlib import sha3_256

log = logging.getLogger("monerometrics-worker")

try:
    from Crypto.Hash import keccak as _keccak

    def keccak256(data: bytes) -> bytes:
        h = _keccak.new(digest_bits=256)
        h.update(data)
        return h.digest()
except ImportError:
    def keccak256(data: bytes) -> bytes:
        raise RuntimeError("pycryptodome required for keccak256")

Q = 2 ** 255 - 19
L = 2 ** 252 + 27742317777372353535851937790883648493
D = -121665 * pow(121666, Q - 2, Q) % Q
I = pow(2, (Q - 1) // 4, Q)


def _xrecover(y):
    xx = (y * y - 1) * pow(D * y * y + 1, Q - 2, Q)
    x = pow(xx, (Q + 3) // 8, Q)
    if (x * x - xx) % Q != 0:
        x = (x * I) % Q
    if x % 2 != 0:
        x = Q - x
    return x


_By = 4 * pow(5, Q - 2, Q) % Q
G = (_xrecover(_By), _By, 1, _xrecover(_By) * _By % Q)


def _add(P, Q_):
    x1, y1, z1, t1 = P
    x2, y2, z2, t2 = Q_
    a = (y1 - x1) * (y2 - x2) % Q
    b = (y1 + x1) * (y2 + x2) % Q
    c = t1 * 2 * D * t2 % Q
    dd = z1 * 2 * z2 % Q
    e, f, g, h = b - a, dd - c, dd + c, b + a
    return (e * f % Q, g * h % Q, f * g % Q, e * h % Q)


def _double(P):
    return _add(P, P)


def _scalarmult(P, e):
    e %= L
    result = (0, 1, 1, 0)
    while e > 0:
        if e & 1:
            result = _add(result, P)
        P = _double(P)
        e >>= 1
    return result


def _compress(P):
    x, y, z, _ = P
    zi = pow(z, Q - 2, Q)
    x, y = x * zi % Q, y * zi % Q
    return (y | ((x & 1) << 255)).to_bytes(32, "little")


def _decompress(s: bytes):
    y = int.from_bytes(s, "little")
    sign = y >> 255
    y &= (1 << 255) - 1
    x = _xrecover(y)
    if x & 1 != sign:
        x = Q - x
    return (x, y, 1, x * y % Q)


_B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
_B58_SIZES = {0: 0, 2: 1, 3: 2, 5: 3, 6: 4, 7: 5, 9: 6, 10: 7, 11: 8}


def _b58_decode(addr: str) -> bytes:
    out = b""
    for i in range(0, len(addr), 11):
        chunk = addr[i:i + 11]
        n = 0
        for c in chunk:
            n = n * 58 + _B58.index(c)
        out += n.to_bytes(_B58_SIZES[len(chunk)], "big")
    return out


def address_keys(address: str):
    """Monero address -> (public spend key, public view key) as 32-byte each."""
    raw = _b58_decode(address)
    return raw[1:33], raw[33:65]


def tx_pubkey(extra) -> bytes | None:
    """Extract the transaction public key (tag 0x01) from tx_extra bytes."""
    b = bytes(extra)
    i = 0
    while i < len(b):
        tag = b[i]
        if tag == 0x01:
            return b[i + 1:i + 33]
        if tag == 0x00:
            i += 1
            continue
        if tag in (0x02, 0x03):
            if i + 1 >= len(b):
                return None
            size = b[i + 1]
            i += 2 + size
            continue
        if tag == 0x04:
            if i + 1 >= len(b):
                return None
            count = b[i + 1]
            i += 2 + count * 32
            continue
        return None
    return None


def merge_mining_chains(extra) -> int:
    """Count merge-mining tags (0x03) in tx_extra.

    Merge mining lets one proof-of-work claim a Monero block and a block on an
    auxiliary chain at once. It is economically significant: an auxiliary chain
    can subsidise miners and pull hashrate toward a single pool, which is how
    the August 2025 Qubic episode built up.
    """
    b = bytes(extra or [])
    i = 0
    count = 0
    while i < len(b):
        tag = b[i]
        if tag == 0x00:
            i += 1
            continue
        if tag == 0x01:
            i += 33
            continue
        if tag == 0x03:
            if i + 1 >= len(b):
                break
            count += 1
            i += 2 + b[i + 1]
            continue
        if tag == 0x02:
            if i + 1 >= len(b):
                break
            i += 2 + b[i + 1]
            continue
        if tag == 0x04:
            if i + 1 >= len(b):
                break
            i += 2 + b[i + 1] * 32
            continue
        break
    return count


def _varint(n: int) -> bytes:
    out = b""
    while True:
        b = n & 0x7F
        n >>= 7
        out += bytes([b | 0x80]) if n else bytes([b])
        if not n:
            return out


def _hash_to_scalar(data: bytes) -> int:
    return int.from_bytes(keccak256(data), "little") % L


def output_belongs_to(out_key: bytes, tx_pub: bytes, secret_view: bytes,
                      spend_pub: bytes, index: int) -> bool:
    """True if a coinbase output pays to (spend_pub) under this view key.

    derivation = 8 * viewkey * R ; P = Hs(derivation || varint(i)) * G + B
    """
    a = int.from_bytes(secret_view, "little") % L
    R = _decompress(tx_pub)
    deriv = _scalarmult(_scalarmult(R, a), 8)
    scalar = _hash_to_scalar(_compress(deriv) + _varint(index))
    P = _add(_scalarmult(G, scalar), _decompress(spend_pub))
    return _compress(P) == out_key


def load_pools(path: str | None = None) -> dict:
    """Pools that publish a view key, as {name: {address, viewkey}}."""
    path = path or os.getenv("POOL_PROOFS_FILE", os.path.join(os.path.dirname(__file__), "pool_proofs.json"))
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError) as e:
        log.warning(f"pool proofs unavailable: {e}")
        return {}


_POOLS = None
_KEYS = {}
VERIFIED = set()


def _ensure_loaded():
    global _POOLS
    if _POOLS is None:
        _POOLS = load_pools()
        for name, p in _POOLS.items():
            try:
                spend, _ = address_keys(p["address"])
                _KEYS[name] = (bytes.fromhex(p["viewkey"]), spend)
            except Exception as e:
                log.warning(f"bad proof entry {name}: {e}")


def _match(miner_tx: dict, vk: bytes, spend: bytes) -> bool:
    R = tx_pubkey(miner_tx.get("extra") or [])
    if not R or len(R) != 32:
        return False
    for i, vo in enumerate(miner_tx.get("vout") or []):
        t = vo.get("target") or {}
        k = (t.get("tagged_key") or {}).get("key") or t.get("key")
        if not k:
            continue
        try:
            if output_belongs_to(bytes.fromhex(k), R, vk, spend, i):
                return True
        except Exception:
            continue
    return False


def self_check(samples: dict) -> dict:
    """Prove one known block per pool before trusting its key.

    samples: {pool: miner_tx} for blocks already known to be that pool's. A key
    that cannot prove one is stale or wrong, and gets dropped instead of being
    used to mislabel blocks.
    """
    _ensure_loaded()
    results = {}
    for name, mt in samples.items():
        if name not in _KEYS:
            continue
        vk, spend = _KEYS[name]
        ok = _match(mt, vk, spend)
        results[name] = ok
        if ok:
            VERIFIED.add(name)
        else:
            log.warning(f"view key for {name} failed self-check, dropping it")
            _KEYS.pop(name, None)
    return results


def provable_pools() -> set:
    """Pools whose published view key we hold, and can therefore verify."""
    _ensure_loaded()
    return set(_KEYS)


def identify(miner_tx: dict) -> str | None:
    """Identify the pool that mined a coinbase, by view-key proof. None if no match."""
    _ensure_loaded()
    if not _KEYS:
        return None

    R = tx_pubkey(miner_tx.get("extra") or [])
    if not R or len(R) != 32:
        return None

    outs = []
    for i, vo in enumerate(miner_tx.get("vout") or []):
        t = vo.get("target") or {}
        k = (t.get("tagged_key") or {}).get("key") or t.get("key")
        if k:
            outs.append((i, bytes.fromhex(k)))
    if not outs:
        return None

    for name, (vk, spend) in _KEYS.items():
        for i, out_key in outs:
            try:
                if output_belongs_to(out_key, R, vk, spend, i):
                    return name
            except Exception:
                continue
    return None
