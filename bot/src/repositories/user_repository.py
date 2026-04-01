from typing import Any

from src.db import db
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)


@log_async_execution
async def get_all_users() -> list[dict[str, Any]]:
    logger.info("Lấy danh sách tất cả users từ database")
    rows = await db.fetch('SELECT * FROM "User"')
    logger.info(f"Tìm thấy {len(rows)} users")
    return [dict(row) for row in rows]


@log_async_execution
async def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    logger.info(f"Tìm user với ID: {user_id}")
    row = await db.fetchrow('SELECT * FROM "User" WHERE id = $1', user_id)
    if row is None:
        logger.warning(f"Không tìm thấy user với ID: {user_id}")
        return None
    logger.info(f"Tìm thấy user: {dict(row).get('name', 'Unknown')}")
    return dict(row)
