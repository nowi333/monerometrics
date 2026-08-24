import os
import json
import hashlib
import logging
from datetime import datetime, timezone

import httpx
import psycopg

log = logging.getLogger('haveno')

BASE = 'https://haveno.markets/api/v1'
NETWORK = os.getenv('HAVENO_NETWORK', 'reto')
MARKETS = [m.strip() for m in os.getenv('HAVENO_MARKETS', 'USD,EUR,AUD,GBP').split(',') if m.strip()]
PREMIUM_MARKETS = {'USD': 'usd', 'EUR': 'eur'}
TRADE_LIMIT = int(os.getenv('HAVENO_TRADE_LIMIT', '5000'))
OFFER_MARKETS = [m.strip() for m in os.getenv('HAVENO_OFFER_MARKETS', 'USD,EUR').split(',') if m.strip()]

DDL = [
    """
    CREATE TABLE IF NOT EXISTS haveno_trades (
        trade_key      TEXT PRIMARY KEY,
        currency       TEXT NOT NULL,
        traded_at      TIMESTAMPTZ NOT NULL,
        price          NUMERIC(18,8) NOT NULL,
        payment_method TEXT,
        base_vol       NUMERIC(18,6),
        rel_vol        NUMERIC(18,8)
    )
    """,
    'CREATE INDEX IF NOT EXISTS haveno_trades_cur_time_idx ON haveno_trades (currency, traded_at DESC)',
    'CREATE INDEX IF NOT EXISTS haveno_trades_method_idx ON haveno_trades (payment_method)',
    """
    CREATE TABLE IF NOT EXISTS haveno_liquidity (
        currency       TEXT NOT NULL,
        period_start   TIMESTAMPTZ NOT NULL,
        max_liquidity  NUMERIC(18,4),
        max_offers     INTEGER,
        PRIMARY KEY (currency, period_start)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS haveno_offers (
        observed_at    TIMESTAMPTZ NOT NULL,
        currency       TEXT NOT NULL,
        side           TEXT NOT NULL,
        offer_id       TEXT NOT NULL,
        offer_date     TIMESTAMPTZ,
        amount         NUMERIC(18,6),
        min_amount     NUMERIC(18,6),
        price          NUMERIC(18,8),
        payment_method TEXT,
        PRIMARY KEY (observed_at, currency, side, offer_id)
    )
    """,
    'CREATE INDEX IF NOT EXISTS haveno_offers_time_idx ON haveno_offers (observed_at DESC)',
    """
    CREATE TABLE IF NOT EXISTS spot_daily (
        day      DATE NOT NULL,
        currency TEXT NOT NULL,
        price    NUMERIC(18,8) NOT NULL,
        source   TEXT,
        PRIMARY KEY (day, currency)
    )
    """,
]


def ensure_schema(dsn: str) -> None:
    with psycopg.connect(dsn, autocommit=True) as conn, conn.cursor() as cur:
        for stmt in DDL:
            cur.execute(stmt)


def _get(client: httpx.Client, path: str, **params):
    params.setdefault('network', NETWORK)
    r = client.get(f'{BASE}/{path}', params=params, timeout=25)
    r.raise_for_status()
    return r.json()


def _ts(value) -> datetime:
    seconds = value / 1000 if value > 1e11 else value
    return datetime.fromtimestamp(seconds, timezone.utc)


def _trade_key(currency: str, row: dict) -> str:
    raw = f"{currency}|{row['date']}|{row['price']}|{row.get('base_vol')}|{row.get('paymentMethod')}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def sync_trades(dsn: str, client: httpx.Client, limit: int = TRADE_LIMIT) -> int:
    written = 0
    with psycopg.connect(dsn, autocommit=True) as conn, conn.cursor() as cur:
        for currency in MARKETS:
            try:
                rows = _get(client, f'trades/XMR_{currency}', limit=limit)
            except Exception as e:
                log.warning(f'haveno trades {currency} failed: {e}')
                continue
            payload = [(_trade_key(currency, row), currency, _ts(row['date']), row['price'],
                        row.get('paymentMethod'), row.get('base_vol'), row.get('rel_vol')) for row in rows]
            cur.executemany(
                """
                INSERT INTO haveno_trades (trade_key, currency, traded_at, price, payment_method, base_vol, rel_vol)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (trade_key) DO NOTHING
                """, payload)
            written += len(payload)
    return written


def sync_liquidity(dsn: str, client: httpx.Client, interval: str = 'hourly') -> int:
    written = 0
    with psycopg.connect(dsn, autocommit=True) as conn, conn.cursor() as cur:
        for currency in MARKETS:
            try:
                rows = _get(client, f'liquidity/XMR_{currency}', interval=interval)
            except Exception as e:
                log.warning(f'haveno liquidity {currency} failed: {e}')
                continue
            payload = [(currency, _ts(row['period_start']), row.get('max_liquidity'), row.get('max_offers'))
                       for row in rows]
            cur.executemany(
                """
                INSERT INTO haveno_liquidity (currency, period_start, max_liquidity, max_offers)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (currency, period_start) DO UPDATE
                    SET max_liquidity = EXCLUDED.max_liquidity, max_offers = EXCLUDED.max_offers
                """, payload)
            written += len(payload)
    return written


def snapshot_offers(dsn: str, client: httpx.Client) -> int:
    now = datetime.now(timezone.utc)
    written = 0
    with psycopg.connect(dsn, autocommit=True) as conn, conn.cursor() as cur:
        for currency in OFFER_MARKETS:
            try:
                book = _get(client, f'depth/XMR_{currency}', level=2)
            except Exception as e:
                log.warning(f'haveno depth {currency} failed: {e}')
                continue
            for side in ('asks', 'bids'):
                for offer in book.get(side) or []:
                    cur.execute(
                        """
                        INSERT INTO haveno_offers
                            (observed_at, currency, side, offer_id, offer_date, amount, min_amount, price, payment_method)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (observed_at, currency, side, offer_id) DO NOTHING
                        """,
                        (now, currency, side[:-1], offer.get('offer_id'),
                         _ts(offer['offer_date']) if offer.get('offer_date') else None,
                         offer.get('amount'), offer.get('min_amount'), offer.get('price'),
                         offer.get('payment_method')),
                    )
                    written += cur.rowcount
    return written


def sync_spot(dsn: str, client: httpx.Client) -> int:
    written = 0
    series = []
    try:
        r = client.get('https://api.kraken.com/0/public/OHLC',
                       params={'pair': 'XMRUSD', 'interval': 1440}, timeout=25)
        r.raise_for_status()
        result = r.json()['result']
        key = next(k for k in result if k != 'last')
        series = [(_ts(row[0]).date(), float(row[4]), 'kraken') for row in result[key]]
    except Exception as e:
        log.warning(f'kraken ohlc failed: {e}')
    for currency, vs in PREMIUM_MARKETS.items():
        if currency == 'USD':
            continue
        try:
            r = client.get('https://api.coingecko.com/api/v3/coins/monero/market_chart',
                           params={'vs_currency': vs, 'days': 365, 'interval': 'daily'}, timeout=25)
            r.raise_for_status()
            for point in r.json().get('prices', []):
                series.append((_ts(point[0]).date(), float(point[1]), f'coingecko:{vs}'))
        except Exception as e:
            log.warning(f'coingecko {vs} failed: {e}')
    with psycopg.connect(dsn, autocommit=True) as conn, conn.cursor() as cur:
        payload = [(day, 'EUR' if source.endswith(':eur') else 'USD', price, source)
                   for day, price, source in series]
        cur.executemany(
            """
            INSERT INTO spot_daily (day, currency, price, source)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (day, currency) DO UPDATE SET price = EXCLUDED.price, source = EXCLUDED.source
            """, payload)
        written += len(payload)
    return written
