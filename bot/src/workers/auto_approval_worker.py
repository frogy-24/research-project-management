"""
Auto Approval Worker - Xử lý phê duyệt tự động với LLM
Worker này poll database để tìm jobs QUEUED, xử lý và cập nhật kết quả
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import asyncpg
from dotenv import load_dotenv

# Add parent directory to path for imports
if str(Path(__file__).resolve().parents[2]) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.services.llm_service import get_llm_service

load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/research_db")

# LLM Service
llm_service = get_llm_service()


async def get_db_pool():
    """Tạo connection pool tới PostgreSQL"""
    return await asyncpg.create_pool(DATABASE_URL)


async def fetch_pending_jobs(pool: asyncpg.Pool) -> List[Dict[str, Any]]:
    """Lấy danh sách jobs đang chờ xử lý"""
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


async def fetch_projects_for_approval(
    pool: asyncpg.Pool, filters: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Lấy danh sách đề tài cần phê duyệt dựa trên filters"""
    async with pool.acquire() as conn:
        # Build query dynamically based on filters
        query = """
            SELECT 
                pr.id,
                pr.title,
                pr.objective,
                pr."expectedOutput",
                pr."createdAt",
                u.name as "leaderName",
                u.email as "leaderEmail",
                u.code as "leaderCode"
            FROM "ProjectRegistration" pr
            JOIN "User" u ON pr."userId" = u.id
            WHERE pr."facultyStatus" = 'PENDING'
        """
        
        params = []
        param_count = 1
        
        # Add filters
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


async def evaluate_project_with_llm(
    project: Dict[str, Any], criteria: Dict[str, Any]
) -> Dict[str, Any]:
    """Đánh giá đề tài bằng LLM sử dụng LLM Service"""
    
    try:
        # Sử dụng LLM Service để đánh giá
        result = await llm_service.evaluate_project(project, criteria)
        
        return {
            "projectId": project["id"],
            "registrationId": project["id"],
            "projectTitle": project["title"],
            "score": result.get("score", 0),
            "decision": result.get("decision", "REVISION"),
            "reason": result.get("reason", ""),
            "evaluatedAt": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        print(f"Error evaluating project {project['id']}: {e}")
        return {
            "projectId": project["id"],
            "registrationId": project["id"],
            "projectTitle": project["title"],
            "score": 0,
            "decision": "ERROR",
            "reason": f"Lỗi khi đánh giá: {str(e)}",
            "evaluatedAt": datetime.now(timezone.utc).isoformat(),
        }


async def update_job_status(
    pool: asyncpg.Pool,
    job_id: str,
    status: str,
    progress: int = 0,
    results: Dict[str, Any] = None,
    error: str = None,
):
    """Cập nhật trạng thái job"""
    async with pool.acquire() as conn:
        # Use timezone-naive datetime for PostgreSQL compatibility
        now = datetime.utcnow()
        
        # Build SET clauses dynamically
        set_parts = ['"status" = $1', '"progress" = $2', '"updatedAt" = $3']
        params = [status, progress, now]
        param_idx = 4
        
        if results:
            set_parts.append(f'"results" = ${param_idx}::jsonb')
            params.append(json.dumps(results))
            param_idx += 1
        
        if error:
            set_parts.append(f'"error" = ${param_idx}')
            params.append(error)
            param_idx += 1
        
        if status == "COMPLETED" or status == "FAILED":
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


async def process_job(pool: asyncpg.Pool, job: Dict[str, Any]):
    """Xử lý một job"""
    job_id = job["id"]
    print(f"Processing job {job_id}...")
    
    try:
        # Update status to PROCESSING
        await update_job_status(pool, job_id, "PROCESSING", progress=0)
        
        # Parse filters and criteria if they are strings
        filters = job["filters"]
        if isinstance(filters, str):
            filters = json.loads(filters)
        
        criteria = job["criteria"]
        if isinstance(criteria, str):
            criteria = json.loads(criteria)
        
        # Debug logging
        print(f"DEBUG - filters type: {type(filters)}, value: {filters}")
        print(f"DEBUG - criteria type: {type(criteria)}, value: {criteria}")
        
        # Fetch projects
        projects = await fetch_projects_for_approval(pool, filters)
        print(f"Found {len(projects)} projects to evaluate")
        
        if not projects:
            await update_job_status(
                pool,
                job_id,
                "COMPLETED",
                progress=100,
                results={"evaluations": [], "summary": "Không có đề tài nào cần phê duyệt"},
            )
            return
        
        # Evaluate each project
        evaluations = []
        total = len(projects)
        
        for idx, project in enumerate(projects):
            evaluation = await evaluate_project_with_llm(project, criteria)
            evaluations.append(evaluation)
            
            # Update progress
            progress = int(((idx + 1) / total) * 100)
            await update_job_status(pool, job_id, "PROCESSING", progress=progress)
            
            print(f"Evaluated {idx + 1}/{total}: {project['title']} -> {evaluation['decision']}")
        
        # Prepare results
        summary = {
            "total": total,
            "approved": sum(1 for e in evaluations if e["decision"] == "APPROVE"),
            "revision": sum(1 for e in evaluations if e["decision"] == "REVISION"),
            "rejected": sum(1 for e in evaluations if e["decision"] == "REJECT"),
            "errors": sum(1 for e in evaluations if e["decision"] == "ERROR"),
        }
        
        results = {
            "evaluations": evaluations,
            "summary": summary,
        }
        
        # Update to COMPLETED
        await update_job_status(pool, job_id, "COMPLETED", progress=100, results=results)
        print(f"Job {job_id} completed successfully")
        
    except Exception as e:
        print(f"Error processing job {job_id}: {e}")
        await update_job_status(
            pool, job_id, "FAILED", progress=0, error=str(e)
        )


async def worker_loop():
    """Main worker loop"""
    print("=" * 80)
    print("🚀 Starting Auto Approval Worker...")
    print("=" * 80)
    print(f"📅 Started at: {datetime.now(timezone.utc).isoformat()}")
    print(f"🔗 Database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'localhost'}")
    print(f"⏱️  Polling interval: 5 seconds")
    print("=" * 80)
    
    pool = await get_db_pool()
    print("✅ Database connection pool created")
    
    iteration = 0
    try:
        while True:
            iteration += 1
            try:
                print(f"\n[Iteration #{iteration}] 🔍 Checking for pending jobs...")
                
                # Fetch pending jobs
                jobs = await fetch_pending_jobs(pool)
                
                if jobs:
                    print(f"✨ Found {len(jobs)} pending job(s)")
                    for idx, job in enumerate(jobs, 1):
                        print(f"\n{'='*60}")
                        print(f"📋 Processing job {idx}/{len(jobs)}")
                        print(f"{'='*60}")
                        await process_job(pool, job)
                else:
                    print("💤 No pending jobs. Waiting 5 seconds...")
                    await asyncio.sleep(5)
                    
            except Exception as e:
                print(f"\n❌ Error in worker loop: {e}")
                import traceback
                traceback.print_exc()
                print("⏳ Waiting 10 seconds before retry...")
                await asyncio.sleep(10)
                
    finally:
        print("\n" + "=" * 80)
        print("🛑 Shutting down worker...")
        await pool.close()
        print("✅ Database connection pool closed")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(worker_loop())
