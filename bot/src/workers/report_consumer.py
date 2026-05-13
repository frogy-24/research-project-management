"""
Report Generation Consumer - Xu ly tao bao cao qua RabbitMQ
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
from src.utilities import get_logger

logger = get_logger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
QUEUE_NAME = os.getenv("REPORT_QUEUE", "report_generation_queue")
PREFETCH_COUNT = int(os.getenv("REPORT_PREFETCH", "1"))


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
        UPDATE "ReportJob"
        SET {', '.join(set_parts)}
        WHERE id = ${param_idx}
    """
    await db.execute(query, *params)


async def _generate_report(payload: dict[str, Any]) -> dict[str, Any]:
    """Generate report based on type and parameters."""
    report_type = payload.get("reportType")
    parameters = payload.get("parameters") or {}
    template_url = payload.get("templateUrl")
    template_id = payload.get("templateId")
    call_round_id = payload.get("callRoundId")
    template_type = payload.get("templateType", "default")

    logger.info(f"Generating report type={report_type} template_type={template_type}")

    try:
        if report_type == "dean_approvals":
            result = await _generate_dean_approval_report(
                call_round_id=call_round_id,
                parameters=parameters,
                template_url=template_url,
                template_id=template_id,
                template_type=template_type,
            )
        elif report_type == "council_assignments":
            result = await _generate_council_assignment_report(
                call_round_id=call_round_id,
                parameters=parameters,
            )
        elif report_type == "project_summary":
            result = await _generate_project_summary_report(
                call_round_id=call_round_id,
                parameters=parameters,
            )
        else:
            return {"error": f"Unknown report type: {report_type}"}

        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        return {"error": str(e)}


async def _generate_dean_approval_report(
    call_round_id: str | None,
    parameters: dict[str, Any],
    template_url: str | None,
    template_id: str | None,
    template_type: str,
) -> dict[str, Any]:
    """Generate dean approval report with optional custom template."""
    # Fetch data from DB
    query = """
        SELECT 
            r.id,
            r.title,
            r.objective,
            r.expected_output as "expectedOutput",
            r.faculty_status as "facultyStatus",
            r.instructor_status as "instructorStatus",
            r.created_at as "createdAt",
            u.name as "studentName",
            u.code as "studentCode",
            u.email as "studentEmail",
            cr.name as "callRoundName",
            i.name as "instructorName",
            d.name as "departmentName"
        FROM "ProjectRegistration" r
        LEFT JOIN "User" u ON r.user_id = u.id
        LEFT JOIN "CallRound" cr ON r.call_round_id = cr.id
        LEFT JOIN "User" i ON r.instructor_id = i.id
        LEFT JOIN "Department" d ON u.department_id = d.id
        WHERE ($1::uuid IS NULL OR r.call_round_id = $1::uuid)
        ORDER BY r.created_at DESC
        LIMIT 1000
    """
    
    rows = await db.fetch_all(query, call_round_id)
    
    # Convert to list of dicts
    registrations = [dict(row) for row in rows]
    
    # Calculate summary stats
    total = len(registrations)
    approved = sum(1 for r in registrations if r.get("facultyStatus") == "APPROVED")
    rejected = sum(1 for r in registrations if r.get("facultyStatus") == "REJECTED")
    pending = sum(1 for r in registrations if r.get("facultyStatus") == "PENDING")

    return {
        "reportType": "dean_approvals",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "callRoundId": call_round_id,
        "templateType": template_type,
        "templateUrl": template_url,
        "templateId": template_id,
        "summary": {
            "total": total,
            "approved": approved,
            "rejected": rejected,
            "pending": pending,
        },
        "registrations": registrations,
    }


async def _generate_council_assignment_report(
    call_round_id: str | None,
    parameters: dict[str, Any],
) -> dict[str, Any]:
    """Generate council assignment report."""
    query = """
        SELECT 
            ca.id,
            ca.project_title as "projectTitle",
            ca.council_id as "councilId",
            c.name as "councilName",
            u.name as "councilChair",
            r.name as "reviewerName",
            r2.name as "secretaryName"
        FROM "CouncilAssignment" ca
        LEFT JOIN "Council" c ON ca.council_id = c.id
        LEFT JOIN "CouncilMember" cm1 ON c.id = cm1.council_id AND cm1.role = 'CHAIRPERSON'
        LEFT JOIN "CouncilMember" cm2 ON c.id = cm2.council_id AND cm2.role = 'REVIEWER'
        LEFT JOIN "CouncilMember" cm3 ON c.id = cm3.council_id AND cm3.role = 'SECRETARY'
        LEFT JOIN "User" u ON cm1.user_id = u.id
        LEFT JOIN "User" r ON cm2.user_id = r.id
        LEFT JOIN "User" r2 ON cm3.user_id = r2.id
        WHERE ($1::uuid IS NULL OR ca.call_round_id = $1::uuid)
    """
    
    rows = await db.fetch_all(query, call_round_id)
    assignments = [dict(row) for row in rows]

    return {
        "reportType": "council_assignments",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "callRoundId": call_round_id,
        "summary": {
            "total": len(assignments),
        },
        "assignments": assignments,
    }


async def _generate_project_summary_report(
    call_round_id: str | None,
    parameters: dict[str, Any],
) -> dict[str, Any]:
    """Generate project summary report."""
    query = """
        SELECT 
            cr.name as "callRoundName",
            COUNT(*) as "totalRegistrations",
            COUNT(CASE WHEN r.faculty_status = 'APPROVED' THEN 1 END) as "approved",
            COUNT(CASE WHEN r.faculty_status = 'REJECTED' THEN 1 END) as "rejected",
            COUNT(CASE WHEN r.faculty_status = 'PENDING' THEN 1 END) as "pending",
            COUNT(CASE WHEN r.instructor_id IS NOT NULL THEN 1 END) as "withInstructor"
        FROM "ProjectRegistration" r
        LEFT JOIN "CallRound" cr ON r.call_round_id = cr.id
        WHERE ($1::uuid IS NULL OR r.call_round_id = $1::uuid)
        GROUP BY cr.id, cr.name
    """
    
    rows = await db.fetch_all(query, call_round_id)
    summaries = [dict(row) for row in rows]

    return {
        "reportType": "project_summary",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "callRoundId": call_round_id,
        "summaries": summaries,
    }


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

        logger.info(f"Processing report payload: {payload}")

        job_id = payload.get("jobId")
        if job_id:
            await _update_job_status(job_id, "PROCESSING", progress=0)

        try:
            result = await _generate_report(payload)
        except Exception as exc:
            if job_id:
                await _update_job_status(job_id, "FAILED", progress=0, error=str(exc))
            raise

        result_payload = {
            "success": "error" not in result,
            "data": result if "error" not in result else None,
            "error": result.get("error"),
        }

        if job_id:
            if "error" in result:
                await _update_job_status(job_id, "FAILED", progress=0, error=result["error"])
            else:
                await _update_job_status(job_id, "COMPLETED", progress=100, results=result)

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
    logger.info("Starting Report Consumer...")
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
