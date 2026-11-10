import cards


def test_a_table_never_grows_past_its_limit():
    table = {}
    for i in range(50):
        cards._put(table, f'k{i}', i, 10)
    assert len(table) == 10
    assert list(table)[0] == 'k40' and table['k49'] == 49


def test_rewriting_a_key_keeps_it_as_the_newest():
    table = {}
    for k in ('a', 'b', 'c'):
        cards._put(table, k, 1, 3)
    cards._put(table, 'a', 2, 3)
    cards._put(table, 'd', 1, 3)
    assert list(table) == ['c', 'a', 'd']


def test_registering_cards_is_bounded():
    for i in range(cards.CARDS_MAX + 20):
        cards.register(f'block-{i}', 't', [])
    assert len(cards._cards) == cards.CARDS_MAX
