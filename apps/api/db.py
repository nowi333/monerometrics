import os
from urllib.parse import quote
import asyncpg
from typing import Optional

def load_secrets_from_openbao() -> Optional[dict]:
    secret_file = '/vault/secrets/postgres-credentials'
    if not os.path.exists(secret_file):
        return None
    secrets = {}
    with open(secret_file) as f:
        for line in f:
            line = line.strip()
            if line.startswith('export '):
                key_value = line[len('export '):]
                if '=' in key_value:
                    key, value = key_value.split('=', 1)
                    secrets[key.strip()] = value.strip().strip('"')
    return secrets

def get_database_url() -> tuple[str, str]:
    secrets = load_secrets_from_openbao()
    if secrets:
        user = secrets.get('POSTGRES_USER')
        password = secrets.get('POSTGRES_PASSWORD')
        db = secrets.get('POSTGRES_DB')
        source = 'OpenBao /vault/secrets/postgres-credentials'
    else:
        user = os.getenv('POSTGRES_USER', 'monerometrics')
        password = os.getenv('POSTGRES_PASSWORD', '')
        db = os.getenv('POSTGRES_DB', 'monerometrics')
        source = 'env vars (fallback)'
    host = os.getenv('POSTGRES_HOST', 'postgres')
    port = os.getenv('POSTGRES_PORT', '5432')
    # Un caractere comme @ ou / dans le mot de passe casserait l'URL.
    return (f'postgresql://{quote(user or "", safe="")}:{quote(password or "", safe="")}@{host}:{port}/{db}', source)
_pool: Optional[asyncpg.Pool] = None

async def init_pool(database_url: str) -> asyncpg.Pool:
    global _pool
    _pool = await asyncpg.create_pool(database_url, min_size=2, max_size=10, command_timeout=10)
    return _pool

async def close_pool():
    global _pool
    if _pool:
        await _pool.close()

def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Pool non initialise. Appeler init_pool() d'abord.")
    return _pool
