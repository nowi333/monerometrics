import os
import sys
import xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from newsfeed import parse_atom, parse_rss, parse_date, merge

ATOM_NS = 'http://www.w3.org/2005/Atom'


def atom(entries):
    body = ''.join(entries)
    return ET.fromstring(f'<feed xmlns="{ATOM_NS}">{body}</feed>')


ENTRY = '''<entry>
  <title>Monero 0.18.5.1 released</title>
  <link rel="alternate" href="https://www.getmonero.org/2026/07/08/x.html"/>
  <id>tag:x</id><updated>2026-07-08T00:00:00Z</updated>
  <category term="releases"/>
</entry>'''


def test_the_official_feed_keeps_only_the_wanted_categories():
    other = ENTRY.replace('releases', 'community').replace('/x.html', '/y.html')
    got = parse_atom(atom([ENTRY, other]), 'https://www.getmonero.org/', {'releases', 'announcements'})
    assert len(got) == 1
    assert got[0]['categories'] == ['releases']


def test_a_link_off_the_expected_domain_is_dropped():
    # Un flux compromis ne doit pas pouvoir envoyer les visiteurs ailleurs.
    evil = ENTRY.replace('https://www.getmonero.org/2026/07/08/x.html', 'https://evil.example/x')
    assert parse_atom(atom([evil]), 'https://www.getmonero.org/', {'releases'}) == []


def test_rss_reads_a_truncated_feed():
    # Le flux de l'Observer est telecharge partiellement : il se coupe en plein vol.
    raw = '''<rss><channel>
    <item><title>Cake Wallet v6.4.5 released</title>
      <link>https://monero.observer/cake-wallet/</link>
      <pubDate>Sun, 20 Sep 2026 UTC</pubDate></item>
    <item><title>Dev report week 38</title>
      <link>https://monero.observer/dev-week-38/</link>
      <pubDate>Sat, 19 Sep 2026 UTC</pubDate></item>
    <item><title>Coupe au milieu</title><link>https://monero.observer/cou'''
    got = parse_rss(raw, 'https://monero.observer/')
    assert [g['title'] for g in got] == ['Cake Wallet v6.4.5 released', 'Dev report week 38']


def test_rss_strips_cdata_and_entities():
    raw = ('<item><title><![CDATA[A &amp; B <b>bold</b>]]></title>'
           '<link>https://monero.observer/a/</link><pubDate>Sun, 20 Sep 2026 UTC</pubDate></item>')
    assert parse_rss(raw, 'https://monero.observer/')[0]['title'] == 'A & B bold'


def test_dates_in_every_format_the_sources_use():
    assert parse_date('2026-07-08T20:25:48Z') == 1783542348
    assert parse_date('Sun, 20 Sep 2026 UTC') == parse_date('2026-09-20T00:00:00Z')
    assert parse_date('Tue, 08 Jul 2026 20:25:48 +0000') == 1783542348
    assert parse_date('pas une date') is None
    assert parse_date('') is None


def test_an_entry_without_a_usable_date_is_dropped():
    bad = ENTRY.replace('<updated>2026-07-08T00:00:00Z</updated>', '<updated>jamais</updated>')
    assert parse_atom(atom([bad]), 'https://www.getmonero.org/', {'releases'}) == []


def test_merge_sorts_by_date_and_keeps_the_limit():
    a = [{'id': '1', 'title': 'vieux', 'url': 'https://a/1', 'published_unix': 100, 'categories': []}]
    b = [{'id': '2', 'title': 'recent', 'url': 'https://b/2', 'published_unix': 900, 'categories': []}]
    got = merge([('getmonero', a), ('observer', b)], 10)
    assert [g['title'] for g in got] == ['recent', 'vieux']
    assert got[0]['source'] == 'observer'
    assert len(merge([('getmonero', a), ('observer', b)], 1)) == 1


def test_the_same_release_announced_twice_appears_once():
    # GitHub et le site du projet annoncent la meme version : la source la plus
    # fiable, donnee en premier, l'emporte.
    off = [{'id': 'o', 'title': 'Monero 0.18.5.1 released', 'url': 'https://www.getmonero.org/a',
            'published_unix': 500, 'categories': ['releases']}]
    gh = [{'id': 'g', 'title': 'Monero 0.18.5.1 Released', 'url': 'https://github.com/x',
           'published_unix': 501, 'categories': []}]
    got = merge([('getmonero', off), ('github', gh)], 10)
    assert len(got) == 1
    assert got[0]['source'] == 'getmonero'


def test_a_chatty_source_cannot_take_every_slot():
    # L'Observer publie plusieurs fois par jour : sans quota, il occuperait
    # seul le bandeau et les annonces du projet n'y paraitraient jamais.
    chatty = [{'id': str(i), 'title': f'obs {i}', 'url': f'https://monero.observer/{i}',
               'published_unix': 1000 + i, 'categories': []} for i in range(20)]
    official = [{'id': 'o', 'title': 'release', 'url': 'https://www.getmonero.org/a',
                 'published_unix': 500, 'categories': ['releases']}]
    got = merge([('getmonero', official), ('observer', chatty)], 10, {'observer': 5})
    sources = [g['source'] for g in got]
    assert sources.count('observer') == 5
    assert 'getmonero' in sources
    # Le quota garde bien les plus recentes de la source bavarde.
    assert [g['title'] for g in got if g['source'] == 'observer'][0] == 'obs 19'
