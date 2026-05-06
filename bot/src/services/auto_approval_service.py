import json
from datetime import datetime, timezone
from typing import Any, Dict, List

import asyncpg

from src.repositories.auto_approval_repository import (
    fetch_projects_for_approval,
    update_job_status,
)
from src.services.auto_approval_ocr_service import maybe_index_project_documents
from src.services.llm_service import get_llm_service
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)


@log_async_execution
async def evaluate_project_with_llm(
    project: Dict[str, Any], criteria: Dict[str, Any]
) -> Dict[str, Any]:
    llm_service = get_llm_service()

    try:
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
    except Exception as exc:
        logger.error(f"Error evaluating project {project['id']}: {exc}")
        return {
            "projectId": project["id"],
            "registrationId": project["id"],
            "projectTitle": project["title"],
            "score": 0,
            "decision": "ERROR",
            "reason": f"Loi khi danh gia: {str(exc)}",
            "evaluatedAt": datetime.now(timezone.utc).isoformat(),
        }


@log_async_execution
async def process_job(pool: asyncpg.Pool, job: Dict[str, Any]) -> None:
    job_id = job["id"]
    logger.info(f"Processing job {job_id}...")

    try:
        await update_job_status(pool, job_id, "PROCESSING", progress=0)

        filters = job["filters"]
        if isinstance(filters, str):
            filters = json.loads(filters)

        criteria = job["criteria"]
        if isinstance(criteria, str):
            criteria = json.loads(criteria)

        logger.info(f"DEBUG - filters type: {type(filters)}, value: {filters}")
        logger.info(f"DEBUG - criteria type: {type(criteria)}, value: {criteria}")

        projects = await fetch_projects_for_approval(pool, filters)
        logger.info(f"Found {len(projects)} projects to evaluate")

        if not projects:
            await update_job_status(
                pool,
                job_id,
                "COMPLETED",
                progress=100,
                results={"evaluations": [], "summary": "Khong co de tai nao can phe duyet"},
            )
            return

        evaluations: List[Dict[str, Any]] = []
        total = len(projects)

        for idx, project in enumerate(projects):
            await maybe_index_project_documents(project)
            evaluation = await evaluate_project_with_llm(project, criteria)
            evaluations.append(evaluation)

            progress = int(((idx + 1) / total) * 100)
            await update_job_status(pool, job_id, "PROCESSING", progress=progress)

            logger.info(
                f"Evaluated {idx + 1}/{total}: {project['title']} -> {evaluation['decision']}"
            )

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

        await update_job_status(pool, job_id, "COMPLETED", progress=100, results=results)
        logger.info(f"Job {job_id} completed successfully")

    except Exception as exc:
        logger.error(f"Error processing job {job_id}: {exc}")
        await update_job_status(pool, job_id, "FAILED", progress=0, error=str(exc))
