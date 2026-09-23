import asyncio
import os
import sys

import httpx
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import server  # noqa: E402


def test_one_of_accepts_listed_values():
    assert server._one_of('24h', server.AGG_WINDOWS, 'window') == '24h'


def test_one_of_rejects_other_values():
    with pytest.raises(ValueError):
        server._one_of('2d', server.AGG_WINDOWS, 'window')


def test_api_errors_do_not_leak_the_internal_url():
    request = httpx.Request('GET', 'http://api.monerometrics.svc.cluster.local/orphans/recent')
    response = httpx.Response(404, json={'detail': 'nope'}, request=request)
    with pytest.raises(server.ApiError) as err:
        server._check(response, '/orphans/recent')
    assert 'svc.cluster.local' not in str(err.value)
    assert '404' in str(err.value) and 'nope' in str(err.value)


def test_client_ip_is_forwarded_to_the_api():
    seen = {}

    async def app(scope, receive, send):
        request = httpx.Request('GET', 'http://api/network/info')
        await server._forward_client_ip(request)
        seen['header'] = request.headers.get('CF-Connecting-IP')

    wrapped = server.ClientIPMiddleware(app)
    scope = {'type': 'http', 'headers': [(b'cf-connecting-ip', b'203.0.113.7')]}
    asyncio.run(wrapped(scope, None, None))
    assert seen['header'] == '203.0.113.7'
    # Hors requete, rien n'est transmis.
    assert server._client_ip.get() is None


def test_expected_tools_are_registered():
    names = {t.name for t in asyncio.run(server.mcp.list_tools())}
    for tool in ('network_info', 'price', 'recent_orphans', 'lookup_transaction', 'search_block', 'chain_fork_window'):
        assert tool in names
