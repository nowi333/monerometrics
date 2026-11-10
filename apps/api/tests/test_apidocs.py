import json
import re
from pathlib import Path

import apidocs

API = Path(__file__).resolve().parents[1]


def _schema():
    paths = {}
    for (method, path) in apidocs.ROUTES:
        paths.setdefault(path, {})[method] = {'responses': {'200': {'description': 'ok'}}}
    paths['/health']['get']['description'] = 'From the docstring.'
    return {'paths': paths}


def test_every_route_gets_tag_summary_example_and_429():
    schema = apidocs.enrich(_schema())
    tags = {t['name'] for t in apidocs.TAGS}
    for path, ops in schema['paths'].items():
        for op in ops.values():
            assert op['tags'][0] in tags
            assert op['summary']
            assert 'curl -s' in op['description'], path
            assert not op['description'].startswith('\n'), path
            assert op['responses']['429']['$ref'].endswith('/RateLimited')
            assert 'RateLimit-Remaining' in op['responses']['200']['headers']


def test_docstring_wins_over_fallback():
    schema = apidocs.enrich(_schema())
    assert schema['paths']['/health']['get']['description'].startswith('From the docstring.')


def test_unknown_route_is_left_alone():
    schema = apidocs.enrich({'paths': {'/x': {'get': {'responses': {}}}}})
    assert 'tags' not in schema['paths']['/x']['get']


def test_documented_routes_match_the_app():
    source = (API / 'main.py').read_text()
    declared = {(m, p) for m, p in re.findall(r"@app\.(get|post)\('([^']+)', response_model", source)}
    assert declared == set(apidocs.ROUTES)


def test_versions_are_in_step():
    discovery = (API / 'discovery.py').read_text()
    api_version = re.search(r"API_VERSION = '([^']+)'", discovery).group(1)
    mcp_version = re.search(r"MCP_VERSION = '([^']+)'", discovery).group(1)
    assert f'## {api_version} ' in (API / 'CHANGELOG.md').read_text()
    assert json.loads((API.parent / 'mcp' / 'server.json').read_text())['version'] == mcp_version
