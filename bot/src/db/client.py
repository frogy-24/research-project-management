from typing import Any

import asyncpg

from src.config import load_database_config


class Database:
    def __init__(self) -> None:
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        if self._pool is not None:
            return

        config = load_database_config()
        self._pool = await asyncpg.create_pool(
            dsn=config.dsn,
            min_size=1,
            max_size=10,
            server_settings={"search_path": config.schema},
        )

    async def close(self) -> None:
        if self._pool is None:
            return
        await self._pool.close()
        self._pool = None

    async def execute(self, query: str, *args: Any) -> str:
        if self._pool is None:
            raise RuntimeError("Database is not connected")
        async with self._pool.acquire() as conn:
            return await conn.execute(query, *args)

    async def fetch(self, query: str, *args: Any) -> list[asyncpg.Record]:
        if self._pool is None:
            raise RuntimeError("Database is not connected")
        async with self._pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args: Any) -> asyncpg.Record | None:
        if self._pool is None:
            raise RuntimeError("Database is not connected")
        async with self._pool.acquire() as conn:
            return await conn.fetchrow(query, *args)


db = Database()