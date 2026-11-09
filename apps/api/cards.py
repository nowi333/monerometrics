"""Images de partage (Open Graph) et badges SVG a integrer.

Les pages de seo.py declarent leurs chiffres cles avec `register()` ; l'image
1200x630 est dessinee a la demande. Un lien partage sur X, Reddit ou Matrix
montre alors les chiffres de la page, et non l'image generique du site.
"""
import io
import time
from html import escape as e

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from PIL import Image, ImageDraw, ImageFont

API = 'https://api.monerometrics.net'
router = APIRouter(include_in_schema=False)

FONT_DIR = '/usr/share/fonts/dejavu/'
_fonts: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}

# Meme palette que le theme sombre du dashboard.
BG, CARD, BORDER = (10, 12, 18), (21, 25, 34), (40, 46, 58)
TEXT, DIM, ACCENT = (230, 232, 235), (139, 144, 153), (255, 102, 0)

_cards: dict[str, tuple[str, list[tuple[str, str]], str]] = {}
_png: dict[str, tuple[float, bytes]] = {}


def register(name: str, title: str, kpis: list[tuple[str, str]], summary: str = '') -> str:
    """Memorise le contenu de la carte et renvoie l'URL de son image."""
    _cards[name] = (title, kpis[:3], summary)
    return f'{API}/seo/og/{name}.png?v={int(time.time() // 3600)}'


def _font(bold: bool, size: int):
    key = ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf', size)
    if key not in _fonts:
        try:
            _fonts[key] = ImageFont.truetype(FONT_DIR + key[0], size)
        except OSError:
            _fonts[key] = ImageFont.load_default(size)
    return _fonts[key]


def _fit(draw, text: str, bold: bool, size: int, width: int):
    while size > 18 and draw.textlength(text, font=_font(bold, size)) > width:
        size -= 2
    return _font(bold, size)


def _wrap(draw, text: str, font, width: int) -> list[str]:
    lines, line = [], ''
    for word in text.split():
        if line and draw.textlength(f'{line} {word}', font=font) > width:
            lines.append(line)
            line = word
        else:
            line = f'{line} {word}'.strip()
    return lines + [line] if line else lines


def render(title: str, kpis: list[tuple[str, str]], summary: str = '') -> bytes:
    img = Image.new('RGB', (1200, 630), BG)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 1200, 8), fill=ACCENT)
    d.text((64, 56), 'monerometrics.net', font=_font(True, 30), fill=ACCENT)
    d.text((64, 104), title, font=_fit(d, title, True, 56, 1072), fill=TEXT)
    if summary and not kpis:
        font = _font(False, 38)
        for i, line in enumerate(_wrap(d, summary, font, 1072)[:4]):
            d.text((64, 230 + i * 56), line, font=font, fill=TEXT)
    if kpis:
        gap, w = 24, (1072 - 24 * (len(kpis) - 1)) // len(kpis)
        for i, (label, value) in enumerate(kpis):
            x = 64 + i * (w + gap)
            d.rounded_rectangle((x, 250, x + w, 470), radius=16, fill=CARD, outline=BORDER, width=2)
            d.text((x + 28, 280), label.upper(), font=_fit(d, label.upper(), False, 24, w - 56), fill=DIM)
            d.text((x + 28, 340), value, font=_fit(d, value, True, 76, w - 56), fill=TEXT)
    d.text((64, 540), 'Live Monero network data from our own node. Free API and MCP server.',
           font=_font(False, 26), fill=DIM)
    buf = io.BytesIO()
    img.save(buf, 'PNG', optimize=True)
    return buf.getvalue()


@router.get('/seo/og/{name}.png')
async def og_image(name: str):
    hit = _png.get(name)
    if not hit or time.time() - hit[0] > 600:
        if name not in _cards:
            # Image demandee avant la page (cache froid) : on genere la page.
            import seo
            await seo.render_for_card(name)
        if name not in _cards:
            raise HTTPException(404)
        hit = _png[name] = (time.time(), render(*_cards[name]))
    return Response(hit[1], media_type='image/png', headers={'Cache-Control': 'public, max-age=3600'})


# Badges au format shields.io : libelle gris a gauche, valeur coloree a droite.
COLORS = {'ok': '#22a55e', 'watch': '#d98a04', 'alert': '#dc2626', 'info': '#ff6600'}


def badge(label: str, value: str, tone: str = 'info') -> str:
    # Largeur approximee pour Verdana 11 px, comme les badges shields.io.
    lw, vw = 10 + int(6.5 * len(label)), 10 + int(6.8 * len(value))
    w, color = lw + vw, COLORS.get(tone, COLORS['info'])
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="20" role="img" aria-label="{e(label)}: {e(value)}">'
            f'<title>{e(label)}: {e(value)}</title>'
            f'<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/>'
            f'<stop offset="1" stop-opacity=".1"/></linearGradient>'
            f'<clipPath id="r"><rect width="{w}" height="20" rx="3" fill="#fff"/></clipPath>'
            f'<g clip-path="url(#r)"><rect width="{lw}" height="20" fill="#555"/>'
            f'<rect x="{lw}" width="{vw}" height="20" fill="{color}"/><rect width="{w}" height="20" fill="url(#s)"/></g>'
            f'<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">'
            f'<text x="{lw / 2:.1f}" y="15" fill="#010101" fill-opacity=".3">{e(label)}</text>'
            f'<text x="{lw / 2:.1f}" y="14">{e(label)}</text>'
            f'<text x="{lw + vw / 2:.1f}" y="15" fill="#010101" fill-opacity=".3">{e(value)}</text>'
            f'<text x="{lw + vw / 2:.1f}" y="14">{e(value)}</text></g></svg>')


def _hashrate(h: float) -> str:
    for unit, div in (('GH/s', 1e9), ('MH/s', 1e6), ('kH/s', 1e3)):
        if h >= div:
            return f'{h / div:.2f} {unit}'
    return f'{h:.0f} H/s'


async def _badge_value(metric: str) -> tuple[str, str, str]:
    import main
    import seo
    if metric == 'status':
        s = await main.status()
        return 'monero network', {'ok': 'healthy', 'watch': 'watch', 'alert': 'alert'}.get(s.level, s.level), s.level
    if metric in ('nakamoto', 'top-pool'):
        top, top2, nak, _ = await seo.pool_kpis()
        if metric == 'nakamoto':
            return 'nakamoto coefficient', str(nak), 'alert' if nak <= 1 else 'watch' if nak <= 2 else 'ok'
        return 'largest pool 24h', f'{top:.1f}%', 'alert' if top >= 50 else 'watch' if top >= 33 else 'ok'
    if metric == 'hashrate':
        info = await main.network_info()
        return 'monero hashrate', _hashrate(info.network_hashrate_h_s or 0), 'info'
    if metric == 'last-reorg':
        days = await seo.days_since_last_reorg()
        value = 'never' if days is None else 'today' if days < 1 else f'{days:.0f} d ago'
        return 'last monero reorg', value, 'watch' if days is not None and days < 1 else 'ok'
    raise HTTPException(404)


BADGES = ('status', 'nakamoto', 'top-pool', 'hashrate', 'last-reorg')
_svg: dict[str, tuple[float, str]] = {}


@router.get('/badge/{metric}.svg')
async def badge_svg(metric: str):
    if metric not in BADGES:
        raise HTTPException(404)
    hit = _svg.get(metric)
    if not hit or time.time() - hit[0] > 300:
        hit = _svg[metric] = (time.time(), badge(*await _badge_value(metric)))
    # Les CDN d'images (camo de GitHub) respectent max-age : cinq minutes suffisent.
    return Response(hit[1], media_type='image/svg+xml',
                    headers={'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*'})
