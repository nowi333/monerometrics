"""Lecture des flux d'actualite Monero, sans acces reseau.

Chaque source a son format : Atom pour le site du projet et pour GitHub, RSS
pour Monero Observer. Les fonctions ici prennent le contenu brut et rendent des
entrees normalisees, en n'acceptant que les liens du domaine attendu : un flux
detourne ne doit pas pouvoir envoyer nos visiteurs ailleurs.

Le flux de l'Observer pese plusieurs dizaines de megaoctets, on n'en telecharge
que le debut. Le fragment recu se termine donc au milieu d'une balise, d'ou une
lecture par blocs <item> complets plutot qu'un parseur XML strict.
"""
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

ATOM = '{http://www.w3.org/2005/Atom}'

MONTHS = {m: i for i, m in enumerate(
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], 1)}


def parse_date(value: str):
    """Rend un horodatage Unix, ou None. Accepte l'ISO 8601, le format RFC 822
    des flux RSS, et la variante sans heure de l'Observer (« Sun, 20 Sep 2026 UTC »)."""
    if not value:
        return None
    v = value.strip()
    try:
        return int(datetime.fromisoformat(v.replace('Z', '+00:00')).timestamp())
    except ValueError:
        pass
    try:
        d = parsedate_to_datetime(v)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return int(d.timestamp())
    except (TypeError, ValueError):
        pass
    m = re.search(r'(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{4})', v)
    if m and m.group(2) in MONTHS:
        day, mon, year = int(m.group(1)), MONTHS[m.group(2)], int(m.group(3))
        try:
            return int(datetime(year, mon, day, tzinfo=timezone.utc).timestamp())
        except ValueError:
            return None
    return None


def _clean(text: str) -> str:
    if not text:
        return ''
    text = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', text, flags=re.S)
    text = re.sub(r'<[^>]+>', '', text)
    for a, b in (('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'), ('&quot;', '"'), ('&#39;', "'"), ('&apos;', "'")):
        text = text.replace(a, b)
    return ' '.join(text.split())


def parse_atom(root, prefix: str, categories=None):
    """Entrees d'un flux Atom deja analyse par ElementTree."""
    out = []
    for entry in root.findall(f'{ATOM}entry'):
        cats = {c.get('term') for c in entry.findall(f'{ATOM}category') if c.get('term')}
        if categories and not (cats & categories):
            continue
        link = ''
        for lk in entry.findall(f'{ATOM}link'):
            if lk.get('rel') in (None, 'alternate') and lk.get('href'):
                link = lk.get('href')
                break
        title = _clean(entry.findtext(f'{ATOM}title') or '')
        if not title or not link.startswith(prefix):
            continue
        published = parse_date(entry.findtext(f'{ATOM}updated') or entry.findtext(f'{ATOM}published') or '')
        if published is None:
            continue
        out.append({
            'id': (entry.findtext(f'{ATOM}id') or link)[:200],
            'title': title[:200],
            'url': link,
            'published_unix': published,
            'categories': sorted(cats & categories) if categories else [],
        })
    return out


def parse_rss(raw: str, prefix: str):
    """Entrees d'un flux RSS, y compris tronque en cours de route."""
    out = []
    for block in re.findall(r'<item[ >](.*?)</item>', raw, re.S):
        get = lambda tag: (re.search(rf'<{tag}[^>]*>(.*?)</{tag}>', block, re.S) or (None, ''))[1]
        link = _clean(get('link'))
        title = _clean(get('title'))
        if not title or not link.startswith(prefix):
            continue
        published = parse_date(_clean(get('pubDate')) or _clean(get('date')))
        if published is None:
            continue
        out.append({
            'id': (_clean(get('guid')) or link)[:200],
            'title': title[:200],
            'url': link,
            'published_unix': published,
            'categories': [],
        })
    return out


def within(items, now: int, max_age: int):
    """Ne garde que ce qui est assez recent. Un bandeau qui defile donne
    l'impression du direct : une annonce d'il y a deux mois n'y a pas sa place."""
    return [it for it in items if now - it['published_unix'] <= max_age]


def merge(groups, limit: int, per_source: dict | None = None):
    """Fusionne les sources, retire les doublons et garde les plus recentes.

    Une meme publication peut sortir sur deux sources : on garde la premiere
    dans l'ordre donne, qui est l'ordre de confiance.

    `per_source` plafonne chaque source. Sans quota, l'Observer, qui publie
    plusieurs fois par jour, occuperait seul tout le bandeau et les annonces
    du projet n'y paraitraient jamais.
    """
    seen_urls, seen_titles, out = set(), set(), []
    for source, items in groups:
        kept = 0
        cap = (per_source or {}).get(source)
        for it in sorted(items, key=lambda x: x['published_unix'], reverse=True):
            if cap is not None and kept >= cap:
                break
            key = it['title'].lower()
            if it['url'] in seen_urls or key in seen_titles:
                continue
            seen_urls.add(it['url'])
            seen_titles.add(key)
            out.append({**it, 'source': source})
            kept += 1
    # Les quotas repartissent les places tant qu'il y a de la concurrence. S'il
    # reste des trous, par exemple quand une fenetre de sept jours ne laisse
    # qu'une seule source active, on les comble avec ce qui a ete ecarte plutot
    # que de servir un bandeau a moitie vide.
    if len(out) < limit:
        for source, items in groups:
            for it in sorted(items, key=lambda x: x['published_unix'], reverse=True):
                if len(out) >= limit:
                    break
                key = it['title'].lower()
                if it['url'] in seen_urls or key in seen_titles:
                    continue
                seen_urls.add(it['url'])
                seen_titles.add(key)
                out.append({**it, 'source': source})

    out.sort(key=lambda x: x['published_unix'], reverse=True)
    return out[:limit]
