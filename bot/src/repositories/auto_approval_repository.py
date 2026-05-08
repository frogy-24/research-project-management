import json
from datetime import datetime
from typing import Any, Dict, List

import asyncpg

from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)


@log_async_execution
async def fetch_pending_jobs(pool: asyncpg.Pool) -> List[Dict[str, Any]]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, "deanId", filters, criteria, "createdAt"
            FROM "AutoApprovalJob"
            WHERE status = 'QUEUED'
            ORDER BY "createdAt" ASC
            LIMIT 5
            """
        )
        return [dict(row) for row in rows]


@log_async_execution
async def fetch_projects_for_approval(
    pool: asyncpg.Pool, filters: Dict[str, Any]
) -> List[Dict[str, Any]]:
    async with pool.acquire() as conn:
        query = """
            SELECT 
                pr.id,
                pr.title,
                pr.objective,
                pr."expectedOutput",
                pr."createdAt",
                pr."proposalFiles",
                pr."callRoundId",
                cr.name as "callRoundName",
                u.name as "leaderName",
                u.email as "leaderEmail",
                u.code as "leaderCode"
            FROM "ProjectRegistration" pr
            JOIN "User" u ON pr."userId" = u.id
            LEFT JOIN "CallRound" cr ON pr."callRoundId" = cr.id
            WHERE pr."facultyStatus" = 'PENDING'
        """

        params: list[Any] = []
        param_count = 1

        if filters.get("callRoundId"):
            query += f" AND pr.\"callRoundId\" = ${param_count}"
            params.append(filters["callRoundId"])
            param_count += 1

        if filters.get("fromDate"):
            query += f" AND pr.\"createdAt\" >= ${param_count}"
            params.append(filters["fromDate"])
            param_count += 1

        if filters.get("toDate"):
            query += f" AND pr.\"createdAt\" <= ${param_count}"
            params.append(filters["toDate"])
            param_count += 1

        query += " ORDER BY pr.\"createdAt\" DESC LIMIT 100"

        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]


@log_async_execution
async def fetch_registration_files(
    pool: asyncpg.Pool, registration_ids: List[str]
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Lấy thông tin file từ ProjectRegistration dựa trên danh sách IDs.
    Trả về dict với key là registration_id và value là list các file.
    
    OCR patterns để match: mau_dang_ky, maudangky, de_tai, detai, dang_ky
    """
    if not registration_ids:
        return {}
    
    async with pool.acquire() as conn:
        # Convert list to PostgreSQL array format
        placeholders = [f"${i+1}" for i in range(len(registration_ids))]
        query = f"""
            SELECT 
                id,
                title,
                "proposalFiles",
                "teamMembers"
            FROM "ProjectRegistration"
            WHERE id IN ({', '.join(placeholders)})
        """
        
        rows = await conn.fetch(query, *registration_ids)
        result = {}
        
        for row in rows:
            reg_id = row["id"]
            proposal_files = row.get("proposalFiles")
            
            # Parse files từ JSON
            files = []
            if proposal_files:
                if isinstance(proposal_files, list):
                    files = proposal_files
                elif isinstance(proposal_files, str):
                    try:
                        files = json.loads(proposal_files)
                    except json.JSONDecodeError:
                        files = []
            
            result[reg_id] = {
                "id": reg_id,
                "title": row["title"],
                "files": files,
                "teamMembers": row.get("teamMembers")
            }
        
        return result


@log_async_execution
async def fetch_all_pending_registrations(
    pool: asyncpg.Pool
) -> List[Dict[str, Any]]:
    """
    Lấy tất cả ProjectRegistrations đang chờ phê duyệt (facultyStatus = PENDING)
    với thông tin đầy đủ bao gồm files.
    """
    async with pool.acquire() as conn:
        query = """
            SELECT 
                pr.id,
                pr.title,
                pr.objective,
                pr."expectedOutput",
                pr."createdAt",
                pr."proposalFiles",
                pr."teamMembers",
                pr."facultyStatus",
                pr."callRoundId",
                cr.name as "callRoundName",
                u.id as "userId",
                u.name as "leaderName",
                u.email as "leaderEmail",
                u.code as "leaderCode",
                iu.name as "instructorName",
                fu.name as "facultyReviewerName"
            FROM "ProjectRegistration" pr
            JOIN "User" u ON pr."userId" = u.id
            LEFT JOIN "CallRound" cr ON pr."callRoundId" = cr.id
            LEFT JOIN "User" iu ON pr."instructorId" = iu.id
            LEFT JOIN "User" fu ON pr."facultyReviewerId" = fu.id
            WHERE pr."facultyStatus" = 'PENDING'
            ORDER BY pr."createdAt" DESC
        """
        
        rows = await conn.fetch(query)
        results = []
        
        for row in rows:
            record = dict(row)
            
            # Parse proposalFiles
            proposal_files = record.get("proposalFiles")
            files = []
            if proposal_files:
                if isinstance(proposal_files, list):
                    files = proposal_files
                elif isinstance(proposal_files, str):
                    try:
                        files = json.loads(proposal_files)
                    except json.JSONDecodeError:
                        files = []
            
            record["files"] = files
            results.append(record)
        
        return results


@log_async_execution
async def update_job_status(
    pool: asyncpg.Pool,
    job_id: str,
    status: str,
    progress: int = 0,
    results: Dict[str, Any] | None = None,
    error: str | None = None,
) -> None:
    async with pool.acquire() as conn:
        now = datetime.utcnow()

        set_parts = ['"status" = $1', '"progress" = $2', '"updatedAt" = $3']
        params: list[Any] = [status, progress, now]
        param_idx = 4

        if results:
            set_parts.append(f'"results" = ${param_idx}::jsonb')
            params.append(json.dumps(results))
            param_idx += 1

        if error:
            set_parts.append(f'"error" = ${param_idx}')
            params.append(error)
            param_idx += 1

        if status in {"COMPLETED", "FAILED"}:
            set_parts.append(f'"completedAt" = ${param_idx}')
            params.append(now)
            param_idx += 1

        params.append(job_id)
        query = f"""
            UPDATE "AutoApprovalJob"
            SET {', '.join(set_parts)}
            WHERE id = ${param_idx}
        """

        await conn.execute(query, *params)
