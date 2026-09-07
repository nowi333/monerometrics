import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pricing import round_trip_cost as _round_trip_cost


def test_cost_is_the_loss_on_the_principal():
    # Vente moyenne +6,91 %, achat moyen -15,00 % : 1 000 $ engages en ressortent 795 $.
    ask, bid = 100 + 6.91, 100 - 15.00
    cost = _round_trip_cost(ask, bid)
    back = 1000 * bid / ask
    assert abs(cost - (1000 - back) / 1000 * 100) < 0.01
    assert abs(cost - 20.49) < 0.01


def test_cost_never_exceeds_the_principal():
    # Un aller-retour ne peut pas coûter plus que ce qu'on a mis.
    for ask, bid in [(200, 1), (1000, 0.01), (100, 99.99)]:
        assert 0 <= _round_trip_cost(ask, bid) <= 100


def test_a_flat_book_costs_nothing():
    assert _round_trip_cost(100, 100) == 0.0


def test_a_bid_above_the_ask_is_negative():
    # Les offres sont des annonces, pas un carnet apparie : l'achat peut passer
    # au-dessus de la vente. Le cout devient negatif, il ne doit pas etre masque.
    assert _round_trip_cost(100, 105) < 0


def test_missing_side_returns_nothing():
    assert _round_trip_cost(None, 100) is None
    assert _round_trip_cost(100, None) is None
    assert _round_trip_cost(0, 100) is None
