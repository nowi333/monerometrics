"""
Module db : pool de connexions asyncpg vers Postgres.
Lit les credentials depuis /vault/secrets/postgres-credentials (OpenBao injector)
avec fallback sur env vars pour dev local.
"""
import os
import asyncpg
from typing import Optional


def load_secrets_from_openbao() -> Optional[dict]:
    """Lit /vault/secrets/postgres-credentials (format shell exports)."""
    secret_file = "/vault/secrets/postgres-credentials"
    if not os.path.exists(secret_file):
        return None
    secrets = {}
    with open(secret_file) as f:
        for line in f:
            line = line.strip()
            if line.startswith("export "):
                key_value = line[len("export "):]
                if "=" in key_value:
                    key, value = key_value.split("=", 1)
                    secrets[key.strip()] = value.strip().strip('"')
    return secrets


def get_database_url() -> str:
    """Construit DATABASE_URL depuis OpenBao en priorite, env vars en fallback."""
    secrets = load_secrets_from_openbao()
    if secrets:
        user = secrets.get("POSTGRES_USER")
        password = secrets.get("POSTGRES_PASSWORD")
        db = secrets.get("POSTGRES_DB")
        source = "OpenBao /vault/secrets/postgres-credentials"
    else:
        user = os.getenv("POSTGRES_USER", "monerometrics")
        password = os.getenv("POSTGRES_PASSWORD", "")
        db = os.getenv("POSTGRES_DB", "monerometrics")
        source = "env vars (fallback)"

    host = os.getenv("POSTGRES_HOST", "postgres")
    port = os.getenv("POSTGRES_PORT", "5432")

    return f"postgresql://{user}:{password}@{host}:{port}/{db}", source


# Pool global (initialise au demarrage de l'app FastAPI)
_pool: Optional[asyncpg.Pool] = None


async def init_pool(database_url: str) -> asyncpg.Pool:
    """Cree le pool asyncpg (5 connexions min, 20 max)."""
    global _pool
    _pool = await asyncpg.create_pool(
        database_url,
        min_size=2,
        max_size=10,
        command_timeout=10,
    )
    return _pool


async def close_pool():
    """Ferme le pool proprement au shutdown."""
    global _pool
    if _pool:
        await _pool.close()


def get_pool() -> asyncpg.Pool:
    """Retourne le pool initialise."""
    if _pool is None:
        raise RuntimeError("Pool non initialise. Appeler init_pool() d'abord.")
    return _pool
