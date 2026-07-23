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
