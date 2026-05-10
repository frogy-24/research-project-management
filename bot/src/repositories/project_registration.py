from typing import Any

from src.db import db
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)


@log_async_execution
async def get_project_registration_by_call_round_id(call_round_id: str) -> list[dict[str, Any]]:
    """
    Lấy thông tin đăng ký dự án theo call round
    """

    query = f'''
            SELECT 
                pr.id,
                pr."userId",
                pr."callRoundId",
                pr.title,
                pr.objective,
                pr."expectedOutput",
                pr."proposalFiles",
                pr."teamMembers",
                pr.status,
                pr."createdAt",
                pr."updatedAt",
                pr."instructorId",
                instr.name as "instructorName",
                pr."instructorStatus",
                pr."facultyStatus",
                pr."facultyReviewerId",
                u.name as "userName",
                m.name as "majorName",
                m.code as "majorCode",
                c.name as "className",
                c.code as "classCode",
                cr.name as "callRoundName"
            FROM "ProjectRegistration" pr
            LEFT JOIN "User" u ON pr."userId" = u.id
            LEFT JOIN "Major" m ON m.id = u."majorId"
            LEFT JOIN "Class" c ON c.id = u."classId"
            LEFT JOIN "CallRound" cr ON pr."callRoundId" = cr.id
            LEFT JOIN "User" instr ON pr."instructorId" = instr.id

            WHERE pr."callRoundId" = $1     
                AND pr."instructorStatus" = 'ACCEPTED' 
				AND pr."facultyStatus"  = 'PENDING'
            ORDER BY pr."createdAt" DESC
        '''

    try:
        rows = await db.fetch(query, call_round_id)

        logger.info(
            f"Tìm thấy {len(rows)} đăng ký dự án"
            f"cho call_round: {call_round_id}"
        )
        
        return [dict(row) for row in rows]

    except Exception as e:
        logger.exception(
            f"Lỗi khi lấy thông tin đăng ký dự án: {str(e)}"
        )
        return []
