"""Duree de validite publiable de chaque reponse, sans acces reseau ni base.

L'API calcule deja ses agregats une fois par periode et sert le resultat depuis
un cache en memoire. Ce module reprend ces memes durees pour les annoncer dans
l'en-tete `Cache-Control` : un visiteur qui sonde toutes les minutes n'a aucune
raison de refaire un aller-retour complet pour une donnee dont on sait qu'elle
ne changera pas avant trente secondes.

Une duree annoncee plus longue que celle du cache serveur ferait afficher des
chiffres perimes ; plus courte, elle ne servirait a rien. Les deux tables
doivent donc rester alignees.
"""
import hashlib

# Duree de validite des series, par fenetre. Une fenetre longue est agregee sur
# des tranches larges : son dernier point ne bouge pas avant longtemps.
SERIES_TTL = {'1h': 45, '24h': 60, '7d': 180, '30d': 600, '90d': 1200, '1y': 1800, '5y': 3600}

# Endpoints dont la reponse depend de la fenetre demandee.
SERIES_PATHS = {
    '/network/hashrate', '/network/blocktime', '/network/mempool',
    '/network/fees/history', '/network/emission', '/price/spread',
}

# Duree fixe, alignee sur le cache serveur de chaque endpoint.
FIXED_TTL = {
    '/price': 5,
    '/status': 30,
    '/haveno/book': 30,
    '/network/info': 60,
    '/network/fees': 60,
    '/pools/distribution': 60,
    '/pools/sources': 60,
    '/pools/latency': 300,
    '/chain/provenance': 60,
    '/chain/window': 30,
    '/chain/fork-window': 30,
    '/orphans/recent': 60,
    '/reorgs': 60,
    '/reorgs/stats': 60,
    '/haveno/trades': 300,
    '/haveno/liquidity': 600,
    '/haveno/methods': 900,
    '/news': 1800,
    '/info': 300,
}

# Ce qui ne doit jamais etre garde : l'etat de sante, le compteur d'usage, et
# toute recherche, dont l'URL ne doit laisser aucune trace dans un cache.
NO_STORE = {'/health', '/usage/external', '/chain/search'}

# Le contenu d'un bloc identifie par son empreinte ne change pas.
BLOCK_PREFIX = '/chain/block/'
BLOCK_TTL = 300


def ttl_for(path: str, window: str | None = None) -> int | None:
    """Duree de validite en secondes, ou None si la reponse ne se cache pas."""
    if path in NO_STORE:
        return None
    if path in SERIES_PATHS:
        return SERIES_TTL.get(window or '24h', 60)
    if path in FIXED_TTL:
        return FIXED_TTL[path]
    if path.startswith(BLOCK_PREFIX):
        return BLOCK_TTL
    return None


def cache_control(ttl: int) -> str:
    """Duree de validite pour le navigateur du visiteur, et pour lui seul.

    `private` et non `public` : la reponse porte un en-tete CORS qui depend de
    l'origine appelante. Un cache partage qui en garderait une seule version la
    resservirait a tout le monde, et les appels depuis le tableau de bord
    seraient rejetes par le navigateur faute d'`Access-Control-Allow-Origin`.
    Un `Vary: Origin` reglerait le probleme en theorie, mais Cloudflare ne
    distingue les variantes que sur `Accept-Encoding` et l'ignorerait.

    `stale-while-revalidate` laisse resservir la reponse un peu au-dela de sa
    validite pendant qu'on en cherche une fraiche : la page reste rapide sans
    jamais afficher de chiffre plus vieux que la fenetre annoncee.
    """
    return f'private, max-age={ttl}, stale-while-revalidate={max(ttl // 2, 5)}'


def etag_for(body: bytes) -> str:
    return '"' + hashlib.sha256(body).hexdigest()[:32] + '"'


def matches(if_none_match: str | None, etag: str) -> bool:
    """Vrai si le client detient deja cette version. Un intermediaire peut
    renvoyer plusieurs empreintes, ou les prefixer d'un `W/` pour une
    correspondance faible."""
    if not if_none_match:
        return False
    for candidate in if_none_match.split(','):
        c = candidate.strip()
        if c.startswith('W/'):
            c = c[2:]
        if c == etag or c == '*':
            return True
    return False
