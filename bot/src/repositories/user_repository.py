from typing import Any

from src.db import db


async def get_all_users() -> list[dict[str, Any]]:
    rows = await db.fetch('SELECT * FROM "User"')
    return [dict(row) for row in rows]


async def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    row = await db.fetchrow('SELECT * FROM "User" WHERE id = $1', user_id)
    if row is None:
        return None
    return dict(row)