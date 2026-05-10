from typing import Any

from src.db import db
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)


@log_async_execution
async def get_callround_by_id(call_round_id: str) -> list[dict[str, Any]]:
    """
    Lấy thông tin call round
    """

    query = """
        SELECT 
            cr."id",
            cr."name",
            cr."description"
        FROM "CallRound" cr
        WHERE cr."id" = $1
    """

    try:
        rows = await db.fetch(query, call_round_id)

        logger.info(
            f"Tìm thấy {len(rows)} call round "
            f"cho call_round: {call_round_id}"
        )
        
        return [dict(row) for row in rows]

    except Exception as e:
        logger.exception(
            f"Lỗi khi lấy thông tin call round: {str(e)}"
        )
        return []
