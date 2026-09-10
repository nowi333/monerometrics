import json
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from txinfo import parse_transaction, spendable


def _entry(tx, **kw):
    base = {
        'tx_hash': 'ab' * 32,
        'as_json': json.dumps(tx),
        'as_hex': '00' * 1500,
        'in_pool': False,
        'block_height': 3759443,
        'block_timestamp': 1789045337,
        'confirmations': 26,
        'double_spend_seen': False,
    }
    base.update(kw)
    return base


def _ringct(inputs=2, ring=16, outputs=2, fee=44560000, tagged=True):
    target = (lambda: {'tagged_key': {'key': 'cd' * 32, 'view_tag': '1a'}}) if tagged \
        else (lambda: {'key': 'cd' * 32})
    return {
        'version': 2,
        'unlock_time': 0,
        'vin': [{'key': {'amount': 0, 'key_offsets': list(range(ring)), 'k_image': 'ef' * 32}}
                for _ in range(inputs)],
        'vout': [{'amount': 0, 'target': target()} for _ in range(outputs)],
        'extra': [1, 2, 3],
        'rct_signatures': {'type': 6, 'txnFee': fee},
    }


def test_a_regular_transaction():
    # La transaction de la capture : 0,00004456 XMR de frais, bloc 3 759 443.
    t = parse_transaction(_entry(_ringct()))
    assert t['fee_xmr'] == '0.000044560000'
    assert t['block_height'] == 3759443
    assert t['input_count'] == 2 and t['output_count'] == 2
    assert t['ring_size'] == 16
    assert t['rct_type'] == 'bulletproof_plus'
    assert t['coinbase'] is False
    assert t['size_bytes'] == 1500
    assert t['fee_per_byte'] == round(44560000 / 1500)


def test_amounts_and_addresses_never_leak():
    # Le parseur ne doit rien exposer qui ressemble a un montant ou une adresse.
    t = parse_transaction(_entry(_ringct()))
    for forbidden in ('amount', 'address', 'recipient', 'sender', 'k_image', 'key_images'):
        assert forbidden not in t


def test_a_mempool_transaction_has_no_block():
    t = parse_transaction(_entry(_ringct(), in_pool=True, block_height=0,
                                 block_timestamp=0, confirmations=0))
    assert t['in_pool'] is True
    assert t['block_height'] is None
    assert t['block_timestamp'] is None


def test_a_coinbase_has_no_fee():
    tx = {'version': 2, 'unlock_time': 3759503,
          'vin': [{'gen': {'height': 3759443}}],
          'vout': [{'amount': 600000000000, 'target': {'tagged_key': {'key': 'cd' * 32, 'view_tag': '00'}}}],
          'extra': [], 'rct_signatures': {'type': 0}}
    t = parse_transaction(_entry(tx))
    assert t['coinbase'] is True
    assert t['fee_xmr'] is None
    assert t['fee_per_byte'] is None
    assert t['ring_size'] is None


def test_old_output_format_is_counted():
    # Avant les view tags, la cible d'une sortie etait {'key': ...}.
    t = parse_transaction(_entry(_ringct(outputs=3, tagged=False)))
    assert t['output_count'] == 3


def test_mixed_ring_sizes_keep_the_dominant_one():
    tx = _ringct(inputs=3)
    tx['vin'][0]['key']['key_offsets'] = list(range(11))
    assert parse_transaction(_entry(tx))['ring_size'] == 16


def test_malformed_json_does_not_crash():
    t = parse_transaction({'tx_hash': 'ab' * 32, 'as_json': '{not json', 'in_pool': False})
    assert t['input_count'] == 0 and t['output_count'] == 0
    assert t['fee_xmr'] is None and t['size_bytes'] is None


def test_spendable_after_ten_confirmations():
    assert spendable(9, 0, 100) is False
    assert spendable(10, 0, 100) is True
    assert spendable(None, 0, 100) is False


def test_an_explicit_unlock_height_is_respected():
    # 26 confirmations, mais deverrouillage explicite a une hauteur future.
    assert spendable(26, 3759503, 3759468) is False
    assert spendable(26, 3759503, 3759503) is True
