"""
Auto Approval Consumer - Xu ly danh gia tu dong qua RabbitMQ
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import aio_pika

# Add parent directory to path for imports
if str(Path(__file__).resolve().parents[2]) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.db import db
from src.api.routes.project_registrations import (
    _apply_duplicate_rules,
    _compare_fields_to_ocr,
    _evaluate_project_with_ocr,
    _extract_ocr_text,
    _is_in_date_range,
    _parse_datetime,
)
from src.repositories.project_registration import get_project_registration_by_call_round_id
from src.services.llm_service import LLMService
from src.utilities import get_logger

logger = get_logger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://admin:admin123@localhost:5672/")
QUEUE_NAME = os.getenv("AUTO_APPROVAL_QUEUE", "auto_approval_queue")
PREFETCH_COUNT = int(os.getenv("AUTO_APPROVAL_PREFETCH", "1"))


def _build_summary(evaluations: list[dict[str, Any]]) -> dict[str, int]:
    return {
        "total": len(evaluations),
        "approved": sum(1 for e in evaluations if e.get("decision") == "APPROVE"),
        "revision": sum(1 for e in evaluations if e.get("decision") == "REVISION"),
        "rejected": sum(1 for e in evaluations if e.get("decision") == "REJECT"),
        "errors": sum(1 for e in evaluations if e.get("decision") == "ERROR"),
    }


def _normalize_datetime(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    return value


async def _process_payload(payload: dict[str, Any]) -> dict[str, Any]:
    filters = payload.get("filters") or {}
    criteria = payload.get("criteria") or {}
    job_id = payload.get("jobId")

    call_round_id = filters.get("callRoundId")
    if not call_round_id:
        return {"error": "Missing callRoundId"}

    if job_id:
        await _update_job_status(job_id, "PROCESSING", progress=0)

    registrations = await get_project_registration_by_call_round_id(call_round_id)

    from_dt = _parse_datetime(filters.get("fromDate"))
    to_dt = _parse_datetime(filters.get("toDate"))

    if from_dt or to_dt:
        registrations = [
            r for r in registrations
            if _is_in_date_range(r.get("createdAt"), from_dt, to_dt)
        ]

    if not registrations:
        result = {"summary": _build_summary([]), "evaluations": []}
        if job_id:
            await _update_job_status(job_id, "COMPLETED", progress=100, results=result)
        return result

    llm_service = LLMService()
    evaluations: list[dict[str, Any]] = []

    total = len(registrations)
    for index, reg in enumerate(registrations):
        reg["ocrFullText"] = await _extract_ocr_text(reg.get("proposalFiles"))
        ocr_matches = _compare_fields_to_ocr(reg, reg.get("ocrFullText"))

        evaluation = await _evaluate_project_with_ocr(
            reg,
            criteria,
            llm_service,
            ocr_matches,
        )
        evaluations.append(evaluation)

        if job_id:
            progress = int(((index + 1) / total) * 100)
            await _update_job_status(job_id, "PROCESSING", progress=progress)

    await _apply_duplicate_rules(registrations, evaluations)

    # Normalize datetime fields
    for reg in registrations:
        reg["createdAt"] = _normalize_datetime(reg.get("createdAt"))
        reg["updatedAt"] = _normalize_datetime(reg.get("updatedAt"))

    result = {
        "summary": _build_summary(evaluations),
        "evaluations": evaluations,
    }

    if job_id:
        await _update_job_status(job_id, "COMPLETED", progress=100, results=result)

    return result


async def _update_job_status(
    job_id: str,
    status: str,
    progress: int = 0,
    results: dict[str, Any] | None = None,
    error: str | None = None,
) -> None:
    now = datetime.now(timezone.utc)
    set_parts = ['"status" = $1', '"progress" = $2', '"updatedAt" = $3']
    params: list[Any] = [status, progress, now]
    param_idx = 4

    if results is not None:
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
    await db.execute(query, *params)


async def _send_reply(
    channel: aio_pika.Channel,
    reply_to: str,
    correlation_id: str | None,
    payload: dict[str, Any],
) -> None:
    message = aio_pika.Message(
        body=json.dumps(payload).encode("utf-8"),
        content_type="application/json",
        correlation_id=correlation_id,
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
    )
    await channel.default_exchange.publish(message, routing_key=reply_to)


async def _handle_message(message: aio_pika.IncomingMessage) -> None:
    async with message.process(ignore_processed=True):
        try:
            payload = json.loads(message.body.decode("utf-8"))
        except json.JSONDecodeError:
            logger.error("Invalid JSON payload")
            return

        logger.info(f"Processing evaluation payload: {payload}")

        try:
            result = await _process_payload(payload)
        except Exception as exc:
            job_id = payload.get("jobId")
            if job_id:
                await _update_job_status(job_id, "FAILED", progress=0, error=str(exc))
            raise
        result_payload = {
            "success": "error" not in result,
            "data": result if "error" not in result else None,
            "error": result.get("error"),
        }

        if message.reply_to:
            await _send_reply(
                channel=message.channel,
                reply_to=message.reply_to,
                correlation_id=message.correlation_id,
                payload=result_payload,
            )
            logger.info(
                "Sent reply to queue=%s correlation_id=%s",
                message.reply_to,
                message.correlation_id,
            )


async def main() -> None:
    logger.info("Starting Auto Approval Consumer...")
    logger.info(f"RabbitMQ URL: {RABBITMQ_URL}")
    logger.info(f"Queue: {QUEUE_NAME}")

    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        await db.connect()
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=PREFETCH_COUNT)

        queue = await channel.declare_queue(QUEUE_NAME, durable=True)

        logger.info("Consumer ready. Waiting for messages...")
        await queue.consume(_handle_message)

        try:
            await asyncio.Future()
        finally:
            await db.close()


if __name__ == "__main__":
    asyncio.run(main())
