from typing import Any

import asyncpg

from src.config import load_database_config
from src.utilities import auto_log_class, get_logger

logger = get_logger(__name__)


@auto_log_class
class Database:
    def __init__(self) -> None:
        logger.info("Khởi tạo Database client")
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        if self._pool is not None:
            logger.info("Database đã được kết nối trước đó, bỏ qua")
            return

        logger.info("Đang kết nối đến database...")
        config = load_database_config()
        self._pool = await asyncpg.create_pool(
            dsn=config.dsn,
            min_size=1,
            max_size=10,
            server_settings={"search_path": config.schema},
        )
        logger.info(f"✅ Kết nối database thành công - Schema: {config.schema}")

    async def close(self) -> None:
        if self._pool is None:
            logger.info("Database pool chưa được khởi tạo, bỏ qua close")
            return
        logger.info("Đang đóng kết nối database...")
        await self._pool.close()
        self._pool = None
        logger.info("✅ Đã đóng kết nối database")

    async def execute(self, query: str, *args: Any) -> str:
        if self._pool is None:
            logger.error("Không thể execute - Database chưa được kết nối")
            raise RuntimeError("Database is not connected")
        logger.debug(f"Executing query: {query[:100]}... | Args: {args}")
        async with self._pool.acquire() as conn:
            result = await conn.execute(query, *args)
            logger.debug(f"Query executed successfully: {result}")
            return result

    async def fetch(self, query: str, *args: Any) -> list[asyncpg.Record]:
        if self._pool is None:
            logger.error("Không thể fetch - Database chưa được kết nối")
            raise RuntimeError("Database is not connected")
        logger.debug(f"Fetching query: {query[:100]}... | Args: {args}")
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *args)
            logger.debug(f"Fetched {len(rows)} rows")
            return rows

    async def fetchrow(self, query: str, *args: Any) -> asyncpg.Record | None:
        if self._pool is None:
            logger.error("Không thể fetchrow - Database chưa được kết nối")
            raise RuntimeError("Database is not connected")
        logger.debug(f"Fetching single row: {query[:100]}... | Args: {args}")
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(query, *args)
            logger.debug(f"Fetched row: {row is not None}")
            return row


db = Database()