from fastapi import APIRouter
from fastapi.responses import JSONResponse, PlainTextResponse, Response

BASE = 'https://api.monerometrics.net'
SITE = 'https://monerometrics.net'
ONION = 'http://6wbhchvavey26lbtscl6w6qg76balycixtsklcggrsslyk4xah6sbbad.onion'
REPO = 'https://github.com/nowi333/monerometrics'
XMR_DONATION = '41mkUSrcAvdGw9E19a83rsh9zdSNC7m8PP34NvmRCCPLZVot61kJHc9i8KGge5JmxkDTuiz7a2nUtE7C4rcQJn4xKjfFyU2'
ANONPAY = (
    'https://trocador.app/anonpay/?ticker_to=xmr&network_to=Mainnet&donation=True'
    '&name=monerometrics&description=Support%20monerometrics&buttonbgcolor=ff6600'
    f'&address={XMR_DONATION}'
)
SUMMARY = 'Reorg-aware Monero (XMR) network observatory: chain reorganizations, orphan blocks, mining-pool centralization with cryptographically verified attribution.'

router = APIRouter(include_in_schema=False)

SKILLS = [
    ('network_info', 'Network info', 'Current chain tip, difficulty, hashrate estimate and sync status.'),
    ('reorgs', 'Chain reorganizations', 'Detected reorganizations with depth, fork point and displaced transactions.'),
    ('orphan_blocks', 'Orphan blocks', 'Recent orphaned blocks with their canonical replacements.'),
    ('pool_distribution', 'Mining pool centralization', 'Pool share of recent blocks and the Nakamoto coefficient.'),
    ('pool_attribution', 'Block attribution provenance', 'How each block was attributed to a pool: view-key proof, pool API claim, coinbase heuristic or unattributed.'),
    ('block_lookup', 'Block lookup', 'Look up any block by height or hash, down to the genesis block.'),
    ('price', 'XMR price', 'Centralized exchange price alongside the Haveno street price.'),
]

def _agent_card() -> dict:
    return {
        'protocolVersion': '0.3.0',
        'name': 'monerometrics',
        'description': SUMMARY,
        'url': BASE,
        'preferredTransport': 'JSONRPC',
        'additionalInterfaces': [
            {'url': f'{BASE}/mcp', 'transport': 'JSONRPC'},
            {'url': BASE, 'transport': 'HTTP+JSON'},
        ],
        'provider': {'organization': 'monerometrics', 'url': SITE},
        'version': '0.9.0',
        'documentationUrl': f'{BASE}/docs',
        'capabilities': {'streaming': False, 'pushNotifications': False, 'stateTransitionHistory': False},
        'defaultInputModes': ['text/plain', 'application/json'],
        'defaultOutputModes': ['application/json'],
        'securitySchemes': {},
        'security': [],
        'skills': [
            {
                'id': skill_id,
                'name': name,
                'description': description,
                'tags': ['monero', 'blockchain', 'metrics'],
                'inputModes': ['text/plain'],
                'outputModes': ['application/json'],
            }
            for skill_id, name, description in SKILLS
        ],
    }

def _agents_json() -> dict:
    return {
        'name': 'monerometrics',
        'description': SUMMARY,
        'documentation': f'{BASE}/docs',
        'openapi': f'{BASE}/openapi.json',
        'mcp': f'{BASE}/mcp',
        'authentication': {'type': 'none'},
        'pricing': {'model': 'free', 'rateLimit': '120 requests/minute per IP'},
        'agents': [_agent_card()],
    }

def _mcp_manifest() -> dict:
    return {
        'schemaVersion': '2025-12-11',
        'servers': [
            {
                'name': 'io.github.nowi333/monerometrics',
                'description': SUMMARY,
                'version': '0.1.1',
                'transport': {'type': 'streamable-http', 'url': f'{BASE}/mcp'},
                'authentication': {'type': 'none'},
                'repository': REPO,
                'registry': 'https://registry.modelcontextprotocol.io',
            }
        ],
    }

def _openrpc() -> dict:
    return {
        'openrpc': '1.3.2',
        'info': {
            'title': 'monerometrics MCP',
            'version': '0.1.1',
            'description': f'JSON-RPC 2.0 endpoint implementing the Model Context Protocol. {SUMMARY}',
            'license': {'name': 'MIT'},
        },
        'servers': [{'name': 'streamable-http', 'url': f'{BASE}/mcp'}],
        'methods': [
            {'name': 'initialize', 'summary': 'MCP session initialization.', 'params': [], 'result': {'name': 'result', 'schema': {'type': 'object'}}},
            {'name': 'tools/list', 'summary': 'List the available tools.', 'params': [], 'result': {'name': 'tools', 'schema': {'type': 'object'}}},
            {'name': 'tools/call', 'summary': 'Invoke a tool by name.', 'params': [], 'result': {'name': 'content', 'schema': {'type': 'object'}}},
            {'name': 'resources/list', 'summary': 'List the available resources.', 'params': [], 'result': {'name': 'resources', 'schema': {'type': 'object'}}},
        ],
    }

def _oauth_protected() -> dict:
    return {
        'resource': BASE,
        'authorization_servers': [],
        'scopes_supported': [],
        'bearer_methods_supported': [],
        'resource_documentation': f'{BASE}/docs',
        'authentication_required': False,
        'note': 'This resource is public and read-only. No authorization server is involved and no token is accepted. Connect anonymously.',
    }

def _oauth_server() -> dict:
    return {
        'authentication_required': False,
        'note': 'No authorization server. This API and its MCP endpoint are public, read-only and unauthenticated.',
        'resource': BASE,
        'resource_documentation': f'{BASE}/docs',
    }

def _server_card() -> dict:
    card = _mcp_manifest()['servers'][0]
    card['websiteUrl'] = SITE
    card['documentationUrl'] = f'{BASE}/docs'
    card['tools'] = [{'name': skill_id, 'description': description} for skill_id, _, description in SKILLS]
    return card

def _payment() -> dict:
    return {
        'x402Version': 1,
        'paymentRequired': False,
        'pricing': 'free',
        'description': 'This API is free and unmetered within its rate limit. No payment is required and no credentials are accepted.',
        'rateLimit': {'requests': 120, 'window': '1m', 'scope': 'ip'},
        'donation': {
            'optional': True,
            'note': 'Voluntary. Nothing is unlocked, rate-limited or degraded by donating.',
            'settlement': 'XMR',
            'methods': [
                {'type': 'direct', 'currency': 'XMR', 'address': XMR_DONATION},
                {
                    'type': 'swap',
                    'currency': 'any',
                    'url': ANONPAY,
                    'provider': 'trocador.app',
                    'note': 'Pay in any supported cryptocurrency, settled to the XMR address above. No account, no KYC.',
                },
            ],
        },
        'accepts': [],
    }

@router.get('/')
async def api_root():
    return {
        'name': 'monerometrics API',
        'description': SUMMARY,
        'website': SITE,
        'onion': ONION,
        'documentation': f'{BASE}/docs',
        'openapi': f'{BASE}/openapi.json',
        'mcp': f'{BASE}/mcp',
        'repository': REPO,
        'license': 'MIT',
        'authentication': 'none',
        'pricing': 'free',
        'donation_xmr': XMR_DONATION,
        'donation_any_currency': ANONPAY,
    }

@router.get('/robots.txt', response_class=PlainTextResponse)
async def robots():
    return (
        'User-agent: *\n'
        'Allow: /\n'
        'Disallow: /usage/\n'
        f'Sitemap: {SITE}/sitemap.xml\n'
    )

@router.get('/agents.txt', response_class=PlainTextResponse)
async def agents_txt():
    return await llms()

@router.get('/sitemap.xml')
@router.get('/sitemap-index.xml')
@router.get('/sitemap_index.xml')
async def sitemap():
    urls = ['/', '/docs', '/openapi.json', '/mcp', '/llms.txt']
    body = ['<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    body += [f'  <url><loc>{BASE}{u}</loc></url>' for u in urls]
    body.append('</urlset>')
    return Response('\n'.join(body) + '\n', media_type='application/xml')

@router.get('/llms.txt', response_class=PlainTextResponse)
async def llms():
    lines = [
        '# monerometrics API',
        '',
        f'> {SUMMARY}',
        '',
        'Free, no API key, no account, no tracking. Rate limit 120 requests/minute per IP.',
        '',
        '## Interfaces',
        f'- OpenAPI: {BASE}/openapi.json',
        f'- Interactive docs: {BASE}/docs',
        f'- Model Context Protocol (streamable HTTP): {BASE}/mcp',
        f'- Tor: {ONION}',
        '',
        '## What it answers',
    ]
    lines += [f'- {name}: {description}' for _, name, description in SKILLS]
    lines += [
        '',
        '## Notes for agents',
        '- Attribution of a block to a mining pool is labelled by evidence: viewkey_proof, pool_api, coinbase_heuristic or none. Do not present a claimed attribution as proven.',
        '- Full indexing coverage starts at height 3490000. Below it, only the canonical chain is known and pool attribution is mostly absent.',
        '- Reorg and orphan data only covers what this node observed live.',
        '',
        f'Source code: {REPO}',
        f'Optional donation in XMR: {XMR_DONATION}',
        f'Optional donation in any cryptocurrency (settled to XMR, no account): {ANONPAY}',
    ]
    return '\n'.join(lines) + '\n'

_JSON_ROUTES = {
    '/.well-known/agent-card.json': _agent_card,
    '/.well-known/agent.json': _agent_card,
    '/.well-known/a2a.json': _agent_card,
    '/agent-card.json': _agent_card,
    '/agent.json': _agent_card,
    '/a2a.json': _agent_card,
    '/a2a/agent-card.json': _agent_card,
    '/a2a/.well-known/agent.json': _agent_card,
    '/agents/agent-card.json': _agent_card,
    '/agents/.well-known/agent-card.json': _agent_card,
    '/api/agent-card.json': _agent_card,
    '/api/agent.json': _agent_card,
    '/v1/agent.json': _agent_card,
    '/v2/agent-card.json': _agent_card,
    '/agent/authenticatedExtendedCard': _agent_card,
    '/.well-known/agents.json': _agents_json,
    '/agents.json': _agents_json,
    '/.well-known/mcp.json': _mcp_manifest,
    '/.well-known/mcp': _mcp_manifest,
    '/.well-known/openrpc.json': _openrpc,
    '/openrpc.json': _openrpc,
    '/.well-known/x402': _payment,
    '/.well-known/x402.json': _payment,
    '/.well-known/payment-manifest': _payment,
    '/.well-known/oauth-protected-resource': _oauth_protected,
    '/.well-known/oauth-authorization-server': _oauth_server,
    '/.well-known/mcp/server-card.json': _server_card,
    '/.well-known/glama.json': _server_card,
    '/.well-known/mpp': _mcp_manifest,
    '/agent-directory.json': _agents_json,
    '/.well-known/agent-directory.json': _agents_json,
    '/.well-known/ai-plugin.json': lambda: {
        'schema_version': 'v1',
        'name_for_human': 'monerometrics',
        'name_for_model': 'monerometrics',
        'description_for_human': 'Live Monero network metrics: reorgs, orphan blocks and mining-pool centralization.',
        'description_for_model': SUMMARY + ' Use it to answer questions about Monero chain reorganizations, orphan blocks, mining pool shares, the Nakamoto coefficient, hashrate, block time, mempool, emission and XMR price.',
        'auth': {'type': 'none'},
        'api': {'type': 'openapi', 'url': f'{BASE}/openapi.json'},
        'logo_url': f'{SITE}/favicon.svg',
        'legal_info_url': f'{SITE}/',
        'contact_email': None,
    },
}

def _register(path: str, builder):
    async def handler():
        return JSONResponse(builder())
    router.add_api_route(path, handler, methods=['GET'], include_in_schema=False)

for _path, _builder in _JSON_ROUTES.items():
    _register(_path, _builder)
