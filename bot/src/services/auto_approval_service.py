import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List

import asyncpg

from src.clients.embedding_client import embed_text
from src.clients.qdrant_client import query_similar_points
from src.repositories.auto_approval_repository import (
    fetch_projects_for_approval,
    update_job_status,
)
from src.services.auto_approval_ocr_service import maybe_index_project_documents
from src.services.llm_service import get_llm_service
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)

# Qdrant similarity threshold for duplicate detection
DUPLICATE_SCORE_THRESHOLD = float(os.getenv("QDRANT_DUPLICATE_THRESHOLD", "0.85"))


async def _get_similar_projects(
    project: Dict[str, Any],
    collection: str,
    limit: int = 3,
) -> List[Dict[str, Any]]:
    """
    Query Qdrant for similar projects using the project's OCR text.
    
    Args:
        project: Project dict with fullText from OCR
        collection: Qdrant collection name
        limit: Max similar projects to return
    
    Returns:
        List of similar projects with scores
    """
    full_text = project.get("ocrFullText", "")
    if not full_text or not full_text.strip():
        return []
    
    try:
        # Generate embedding for the project text
        embedding = await embed_text(full_text)
        if not embedding:
            logger.warning(f"No embedding for project {project['id']}")
            return []
        
        # Query Qdrant for similar projects
        similar = query_similar_points(
            collection=collection,
            query_vector=embedding,
            limit=limit,
            score_threshold=DUPLICATE_SCORE_THRESHOLD,
            exclude_project_id=str(project["id"]),
        )
        
        return similar
        
    except Exception as exc:
        logger.error(f"Error querying similar projects: {exc}")
        return []


def _build_similar_projects_context(similar: List[Dict[str, Any]]) -> str:
    """
    Build context string from similar projects for LLM.
    
    Args:
        similar: List of similar project results from Qdrant
    
    Returns:
        Formatted context string
    """
    if not similar:
        return ""
    
    lines = ["\n=== CAC DE TAI TUONG TU (truy van Qdrant) ==="]
    for idx, item in enumerate(similar, 1):
        payload = item.get("payload", {})
        score = item.get("score", 0)
        title = payload.get("projectTitle", "N/A")
        leader = payload.get("leaderName", "N/A")
        collection = payload.get("collection", "N/A")
        
        lines.append(
            f"{idx}. [{score:.2f}] {title}\n"
            f"   - Chu nhiem: {leader}\n"
            f"   - Tap hop: {collection}"
        )
    
    lines.append("===========================================\n")
    return "\n".join(lines)


@log_async_execution
async def evaluate_project_with_llm(
    project: Dict[str, Any], 
    criteria: Dict[str, Any],
    collection: str | None = None,
) -> Dict[str, Any]:
    """
    Evaluate a project using LLM with Qdrant similarity context.
    
    Args:
        project: Project data
        criteria: Evaluation criteria
        collection: Qdrant collection for similarity search
    
    Returns:
        Evaluation result
    """
    # Get similar projects from Qdrant for context and duplicate detection
    collection_name = collection or os.getenv("QDRANT_COLLECTION", "project_ocr")
    similar = []
    similar_context = ""
    
    if collection_name:
        try:
            similar = await _get_similar_projects(project, collection_name)
            similar_context = _build_similar_projects_context(similar)
        except Exception as exc:
            logger.warning(f"Qdrant query failed: {exc}")
    
    # Check for potential duplicates
    is_duplicate = False
    duplicate_info = None
    if similar:
        top_match = similar[0]
        if top_match.get("score", 0) >= DUPLICATE_SCORE_THRESHOLD:
            is_duplicate = True
            duplicate_info = {
                "score": top_match["score"],
                "projectTitle": top_match["payload"].get("projectTitle"),
                "leaderName": top_match["payload"].get("leaderName"),
            }
    
    llm_service = get_llm_service()
    
    try:
        # Pass similar projects context to LLM evaluation
        result = await llm_service.evaluate_project(
            project, 
            criteria,
            similar_context=similar_context,
            is_duplicate=is_duplicate,
            duplicate_info=duplicate_info,
        )
        
        # Log duplicate detection
        if is_duplicate:
            logger.warning(
                f"Potential duplicate detected for project {project['id']}: "
                f"similarity={duplicate_info['score']:.2f} with "
                f"{duplicate_info['projectTitle']}"
            )
        
        return {
            "projectId": project["id"],
            "registrationId": project["id"],
            "projectTitle": project["title"],
            "score": result.get("score", 0),
            "decision": result.get("decision", "REVISION"),
            "reason": result.get("reason", ""),
            "similarProjects": similar,
            "isDuplicate": is_duplicate,
            "duplicateScore": duplicate_info["score"] if duplicate_info else None,
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
            "similarProjects": [],
            "isDuplicate": False,
            "duplicateScore": None,
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
