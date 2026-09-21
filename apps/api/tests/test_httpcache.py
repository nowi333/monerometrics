import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from httpcache import ttl_for, cache_control, etag_for, matches, SERIES_TTL, FIXED_TTL


def test_a_series_follows_its_window():
    assert ttl_for('/network/hashrate', '1h') == 45
    assert ttl_for('/network/hashrate', '5y') == 3600
    # Fenetre absente ou inconnue : on retombe sur la plus prudente.
    assert ttl_for('/network/hashrate', None) == 60
    assert ttl_for('/network/hashrate', 'n_importe_quoi') == 60


def test_the_prices_expire_fast_and_the_news_slowly():
    assert ttl_for('/price') == 5
    assert ttl_for('/news') == 1800


def test_nothing_that_must_stay_fresh_is_cached():
    # Une recherche de transaction ne doit laisser aucune trace dans un cache,
    # et l'etat de sante perdrait tout son sens s'il etait conserve.
    for path in ('/health', '/usage/external', '/chain/search'):
        assert ttl_for(path) is None


def test_an_unknown_endpoint_is_never_cached_by_default():
    assert ttl_for('/quelque/chose') is None


def test_a_block_is_cached_by_its_hash():
    assert ttl_for('/chain/block/' + 'ab' * 32) == 300


def test_the_announced_duration_never_exceeds_the_server_cache():
    # Les deux tables doivent rester alignees : annoncer plus long que le cache
    # serveur ferait afficher des chiffres perimes.
    from httpcache import SERIES_PATHS
    server = {'/price': 5, '/status': 30, '/haveno/book': 30, '/news': 1800,
              '/pools/distribution': 60, '/haveno/liquidity': 600, '/haveno/methods': 900}
    for path, ttl in server.items():
        assert ttl_for(path) <= ttl, path
    for path in SERIES_PATHS:
        for window, ttl in SERIES_TTL.items():
            assert ttl_for(path, window) <= ttl


def test_cache_control_allows_a_short_stale_window():
    assert cache_control(60) == 'private, max-age=60, stale-while-revalidate=30'
    # Une duree tres courte garde quand meme un filet minimal.
    assert cache_control(5) == 'private, max-age=5, stale-while-revalidate=5'


def test_a_response_is_never_stored_by_a_shared_cache():
    # La reponse porte un en-tete CORS propre a l'origine appelante. Un cache
    # partage qui n'en garderait qu'une version casserait le tableau de bord.
    for ttl in (5, 60, 1800):
        assert cache_control(ttl).startswith('private,')
        assert 'public' not in cache_control(ttl)


def test_the_etag_changes_with_the_body():
    assert etag_for(b'{"a":1}') == etag_for(b'{"a":1}')
    assert etag_for(b'{"a":1}') != etag_for(b'{"a":2}')
    assert etag_for(b'x').startswith('"') and etag_for(b'x').endswith('"')


def test_a_client_that_already_holds_the_version_is_recognised():
    tag = etag_for(b'{"a":1}')
    assert matches(tag, tag)
    assert matches(f'W/{tag}', tag)
    assert matches(f'"autre", {tag}', tag)
    assert matches('*', tag)
    assert not matches('"autre"', tag)
    assert not matches(None, tag)
    assert not matches('', tag)


def test_every_fixed_endpoint_has_a_positive_duration():
    assert all(v > 0 for v in FIXED_TTL.values())
