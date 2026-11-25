from datetime import date

import insights


def test_attacker_success_matches_whitepaper():
    # Valeurs publiees dans le livre blanc de Bitcoin, section 11.
    assert abs(insights.attacker_success(0.1, 5) - 0.0009137) < 1e-6
    assert abs(insights.attacker_success(0.3, 10) - 0.0416605) < 1e-6
    assert insights.attacker_success(0.5, 50) == 1.0


def test_confirmations_tighten_with_concentration():
    low = insights.confirmations_for(0.1, 1e-3)
    high = insights.confirmations_for(0.3, 1e-3)
    assert low == 5 and high > low
    assert insights.confirmations_for(0.1, 1e-3, floor=8) == 8
    assert insights.confirmations_for(0.5, 1e-3) is None


def test_tiers():
    assert insights._tier_for(None) is None
    assert insights._tier_for(50)[0] == 1e-2
    assert insights._tier_for(100)[0] == 1e-3
    assert insights._tier_for(1e6)[0] == 1e-5


def test_weighted_median():
    assert insights.weighted_median([]) is None
    assert insights.weighted_median([(1, 1), (2, 1), (10, 1)]) == 2
    assert insights.weighted_median([(1, 1), (2, 1), (10, 5)]) == 10
    assert insights.weighted_median([(3, 0), (4, None)]) is None


def test_available_months_are_complete_only():
    assert insights.available_months(date(2026, 8, 20)) == []
    assert insights.available_months(date(2026, 11, 25)) == ['2026-08', '2026-09', '2026-10']
    assert insights.available_months(date(2027, 1, 2))[-2:] == ['2026-11', '2026-12']


def test_previous_month():
    assert insights._prev('2026-01') == '2025-12'
    assert insights._prev('2026-10') == '2026-09'


def test_highlights_compare_months():
    base = {'blocks': 100, 'largest_pool': 'supportxmr', 'largest_share_pct': 30.0, 'nakamoto': 3,
            'proven_pct': 40.0, 'reorgs': 2, 'deepest_reorg': 1, 'reorg_txs': 12,
            'haveno': {'index_pct': 6.5, 'trades': 200}}
    prev = {**base, 'largest_share_pct': 28.0, 'nakamoto': 4, 'proven_pct': 30.0}
    out = insights.highlights(base, prev)
    assert 'up 2.0 points' in out[0]
    assert any('from 4 to 3' in h for h in out)
    assert any('+10 points' in h for h in out)
    assert any('+6.5%' in h for h in out)
