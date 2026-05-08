"""
Council Repository - Xử lý CRUD hội đồng trong database
"""

from typing import Any

from src.db import db
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)


@log_async_execution
async def get_lecturers_for_council(call_round_id: str) -> list[dict[str, Any]]:
    """
    Lấy danh sách giảng viên hội đồng đã accept
    """

    query = """
        SELECT 
            u.id,
            u.name,
            u.email,
            u.role,
            d.id as department_id,
            d.name as department_name,
            m.id as major_id,
            m.name as major_name,
            'COUNCIL_MEMBER' as source
        FROM "CallRoundCouncilMember" crm
        JOIN "User" u 
            ON u.id = crm."councilMemberId"
        LEFT JOIN "Department" d 
            ON d.id = u."departmentId"
        LEFT JOIN "Major" m 
            ON m.id = u."majorId"
        WHERE crm."callRoundId" = $1
        AND crm."invitationStatus" = 'ACCEPTED'
    """

    try:
        rows = await db.fetch(query, call_round_id)

        lecturers = [dict(row) for row in rows]

        logger.info(
            f"Tìm thấy {len(lecturers)} giảng viên "
            f"cho call_round: {call_round_id}"
        )

        # Loại bỏ trùng lặp theo id
        seen_ids = set()
        unique_lecturers = []

        for lecturer in lecturers:
            lecturer_id = lecturer.get("id")

            if lecturer_id not in seen_ids:
                seen_ids.add(lecturer_id)
                unique_lecturers.append(lecturer)

        return unique_lecturers

    except Exception as e:
        logger.exception(
            f"Lỗi khi lấy danh sách giảng viên hội đồng: {str(e)}"
        )
        return []
