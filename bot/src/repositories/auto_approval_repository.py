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
