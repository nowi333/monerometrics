from thorchain import summarize


def test_not_listed():
    s = summarize([{'asset': 'BTC.BTC'}], [{'chain': 'BTC', 'halted': False}], {})
    assert s['live'] is False and s['pool'] is None and not s['inbound_address']


def test_live():
    s = summarize([{'asset': 'XMR.XMR', 'status': 'Available', 'balance_asset': '150000000', 'balance_rune': '0'}],
                  [{'chain': 'XMR', 'halted': False}], {'HALTXMRCHAIN': 0})
    assert s['live'] and s['pool']['xmr_depth'] == 1.5


def test_halted():
    s = summarize([{'asset': 'XMR.XMR', 'status': 'Available'}], [{'chain': 'XMR', 'halted': False}], {'HALTXMRTRADING': 1})
    assert s['halted'] and not s['live']
