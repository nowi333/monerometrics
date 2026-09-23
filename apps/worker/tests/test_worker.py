import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import indexer
import pools

def test_difficulty_of_prefers_wide():
    assert indexer._difficulty_of({'wide_difficulty': '0x1a', 'difficulty': 1}) == 26

def test_difficulty_of_fallback():
    assert indexer._difficulty_of({'difficulty': 456}) == 456

def test_difficulty_of_missing_is_zero():
    assert indexer._difficulty_of({}) == 0

def test_difficulty_of_bad_wide_falls_back():
    assert indexer._difficulty_of({'wide_difficulty': 'zzz', 'difficulty': 7}) == 7

def test_count_groups_contiguous():
    changed = [(100, 'a', 5, 'A'), (101, 'b', 3, 'B'), (102, 'c', 2, 'C')]
    assert indexer._count_groups(changed) == 1

def test_count_groups_split():
    changed = [(100, 'a', 5, 'A'), (101, 'b', 3, 'B'), (110, 'd', 1, 'D')]
    assert indexer._count_groups(changed) == 2

def test_count_groups_empty():
    assert indexer._count_groups([]) == 0

def test_parse_standard():
    data = [{'height': 100, 'hash': 'AbC'}, {'height': 101, 'hash': 'DeF'}]
    assert pools.parse_pool_response('standard', data) == [(100, 'abc'), (101, 'def')]

def test_parse_nanopool():
    data = {'data': [{'block_number': 200, 'hash': 'FF'}]}
    assert pools.parse_pool_response('nanopool', data) == [(200, 'ff')]

def test_parse_kryptex():
    data = {'results': [{'height': 300, 'hash': 'Ab12'}]}
    assert pools.parse_pool_response('kryptex', data) == [(300, 'ab12')]

def test_parse_herominers_alternating():
    h64 = 'a' * 64
    data = {'pool': {'blocks': [f'{h64}:123:456', 400]}}
    assert pools.parse_pool_response('herominers', data) == [(400, h64)]

def test_parse_ignores_incomplete_rows():
    data = [{'height': 100}, {'hash': 'ab'}, {'height': 101, 'hash': 'Cd'}]
    assert pools.parse_pool_response('standard', data) == [(101, 'cd')]


def test_partial_refresh_keeps_full_count(monkeypatch):
    pools.LAST_STATUS.clear()
    pools.LAST_STATUS['supportxmr.com'] = {'url': 'u', 'ok': True, 'blocks': 9000, 'checked_at': 0}
    monkeypatch.setattr(pools, 'POOL_APIS', {'supportxmr.com': ('u?limit={limit}', 'standard')})
    monkeypatch.setattr(pools, 'fetch_pool_blocks', lambda *a, **k: [(1, 'a' * 64), (2, 'b' * 64)])
    index = pools.build_pool_index(None, 200, max_pages=1)
    assert len(index) == 2
    assert pools.LAST_STATUS['supportxmr.com']['blocks'] == 9000


def test_full_refresh_resets_count(monkeypatch):
    pools.LAST_STATUS.clear()
    pools.LAST_STATUS['supportxmr.com'] = {'url': 'u', 'ok': True, 'blocks': 9000, 'checked_at': 0}
    monkeypatch.setattr(pools, 'POOL_APIS', {'supportxmr.com': ('u?limit={limit}', 'standard')})
    monkeypatch.setattr(pools, 'fetch_pool_blocks', lambda *a, **k: [(1, 'a' * 64)])
    pools.build_pool_index(None, 10000)
    assert pools.LAST_STATUS['supportxmr.com']['blocks'] == 1


def test_few_outputs_are_not_p2pool(monkeypatch):
    monkeypatch.setattr(indexer, '_pool_index', {})
    monkeypatch.setattr(indexer.pool_proofs, 'identify', lambda mt: None)
    block = {'block_header': {'hash': 'c' * 64}, 'json': '{"miner_tx": {"vout": [{}, {}, {}]}}'}
    assert indexer.detect_pool(block) == ('unknown', None)
    block['json'] = '{"miner_tx": {"vout": [' + ','.join(['{}'] * 20) + ']}}'
    assert indexer.detect_pool(block) == ('p2pool', 'coinbase_heuristic')


class _Resp:
    def __init__(self, data):
        self._data = data

    def raise_for_status(self):
        pass

    def json(self):
        return self._data


class _AltClient:
    def post(self, url, json=None, timeout=None):
        if json['method'] == 'get_alternate_chains':
            return _Resp({'result': {'chains': [{'block_hashes': ['a' * 64, 'b' * 64]}]}})
        h = json['params']['hash']
        header = {'hash': h, 'height': 10, 'prev_hash': 'p' * 64, 'timestamp': 1_700_000_000,
                  'difficulty': 5, 'num_txes': 2, 'block_size': 100, 'reward': 600_000_000_000}
        return _Resp({'result': {'block_header': header, 'json': '{"miner_tx": {"vout": [{}], "extra": []}}'}})


class _Cur:
    def __init__(self, log):
        self.log = log

    def __enter__(self):
        return self

    def __exit__(self, *a):
        pass

    def execute(self, sql, params=None):
        self.log.append((sql, params))

    def fetchall(self):
        return [('a' * 64,)]


class _Conn:
    def __init__(self):
        self.log = []
        self.commits = 0

    def cursor(self):
        return _Cur(self.log)

    def commit(self):
        self.commits += 1


def test_alternate_blocks_are_recorded_as_orphans(monkeypatch):
    monkeypatch.setattr(indexer, 'MONEROD_ADMIN_URL', 'http://monerod:18083')
    monkeypatch.setattr(indexer, '_alt_seen', set())
    monkeypatch.setattr(indexer, '_pool_index', {})
    monkeypatch.setattr(indexer.pool_proofs, 'identify', lambda mt: None)
    conn = _Conn()
    assert indexer.record_alternate_blocks(_AltClient(), conn) == 1
    inserts = [p for sql, p in conn.log if 'INSERT INTO blocks' in sql]
    assert len(inserts) == 1 and inserts[0][0] == 'b' * 64
    assert 'FALSE' in [sql for sql, _ in conn.log if 'INSERT INTO blocks' in sql][0]
    # Deja vus : aucun nouvel appel au tour suivant.
    assert indexer.record_alternate_blocks(_AltClient(), conn) == 0


def test_alternate_blocks_skipped_without_admin_port(monkeypatch):
    monkeypatch.setattr(indexer, 'MONEROD_ADMIN_URL', '')
    assert indexer.record_alternate_blocks(None, None) == 0
