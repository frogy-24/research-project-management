"""
Report Generation Consumer - Tao bao cao voi RabbitMQ + LLM
"""

import asyncio
import json
import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any

import aio_pika

if str(Path(__file__).resolve().parents[2]) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.db import db
from src.services.file_data_filler_service import get_file_data_filler
from src.utilities import get_logger

logger = get_logger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://admin:admin123@localhost:5672/")
QUEUE_NAME = os.getenv("REPORT_QUEUE", "report_generation_queue")
PREFETCH_COUNT = int(os.getenv("REPORT_PREFETCH", "1"))
REPORT_OUTPUT_DIR = os.getenv("REPORT_OUTPUT_DIR", "/home/caoviet/Documents/reports_shared")
NEXTJS_BASE_URL = os.getenv("NEXTJS_BASE_URL", "http://localhost:3000")


async def _update_job_status(
    job_id: str,
    status: str,
    progress: int = 0,
    result_url: str | None = None,
    error: str | None = None,
) -> None:
    now = datetime.now()
    set_parts = ['"status" = $1', '"progress" = $2', '"updatedAt" = $3']
    params: list[Any] = [status, progress, now]
    param_idx = 4

    if result_url:
        set_parts.append(f'"resultUrl" = ${param_idx}')
        params.append(result_url)
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


async def _upload_report_to_nextjs(filepath: str, report_type: str | None = None) -> str:
    import aiohttp

    filename = os.path.basename(filepath)
    upload_url = f"{NEXTJS_BASE_URL}/api/reports/upload"
    logger.info(f"Uploading report to: {upload_url}")

    try:
        with open(filepath, "rb") as f:
            file_content = f.read()

        form_data = aiohttp.FormData()
        form_data.add_field("file", file_content, filename=filename, content_type="application/octet-stream")
        if report_type:
            form_data.add_field("reportType", report_type)

        headers = {"X-Internal-Request": "true"}
        async with aiohttp.ClientSession() as session:
            async with session.post(upload_url, data=form_data, headers=headers) as response:
                if response.status != 200:
                    text = await response.text()
                    raise Exception(f"Failed to upload report: {response.status} {text}")

                result = await response.json()
                logger.info(f"Uploaded report, URL: {result.get('url')}")
                return result.get("url", f"/uploads/reports/{filename}")

    except aiohttp.ClientError as e:
        logger.error(f"HTTP error uploading report: {e}")
        raise Exception(f"Failed to upload report to Next.js: {e}")


async def _download_template_from_nextjs(template_url: str) -> tuple[str, str]:
    import aiohttp

    template_filename = os.path.basename(template_url)
    full_url = f"{NEXTJS_BASE_URL}{template_url}"
    logger.info(f"Downloading template from: {full_url}")

    temp_dir = os.getenv("TEMP_UPLOAD_DIR", tempfile.gettempdir())
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(
        temp_dir,
        f"template_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{template_filename}",
    )

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(full_url) as response:
                if response.status != 200:
                    raise FileNotFoundError(f"Failed to download template: {response.status} {full_url}")

                with open(temp_path, "wb") as f:
                    async for chunk in response.content.iter_chunked(8192):
                        f.write(chunk)

        logger.info(f"Downloaded template to: {temp_path}")
        return temp_path, template_filename

    except aiohttp.ClientError as e:
        logger.error(f"HTTP error downloading template: {e}")
        raise FileNotFoundError(f"Failed to download template from {full_url}: {e}")


async def _process_payload(payload: dict[str, Any]) -> dict[str, Any]:
    report_type = payload.get("reportType")
    template_url = payload.get("templateUrl")
    job_id = payload.get("jobId")

    if not report_type:
        return {"error": "Missing reportType"}
    if not template_url:
        return {"error": "Missing templateUrl"}

    if job_id:
        await _update_job_status(job_id, "PROCESSING", progress=10)

    template_path, _ = await _download_template_from_nextjs(template_url)

    if job_id:
        await _update_job_status(job_id, "PROCESSING", progress=30)

    filler = get_file_data_filler()
    fill_result = await filler.analyze_and_fill(template_path, REPORT_OUTPUT_DIR)

    if not fill_result.get("success"):
        return {"error": fill_result.get("error", "Fill report failed")}

    if job_id:
        await _update_job_status(job_id, "PROCESSING", progress=80)

    result_url = await _upload_report_to_nextjs(fill_result["outputPath"], report_type=report_type)

    if job_id:
        await _update_job_status(job_id, "COMPLETED", progress=100, result_url=result_url)

    return {
        "reportType": report_type,
        "resultUrl": result_url,
        "outputPath": fill_result["outputPath"],
        "rowCount": fill_result.get("rowCount", 0),
        "sql": (fill_result.get("analysis") or {}).get("sql"),
        "columnMappings": ((fill_result.get("analysis") or {}).get("llmAnalysis") or {}).get("columnMappings", {}),
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

        try:
            result = await _process_payload(payload)
        except Exception as exc:
            job_id = payload.get("jobId")
            if job_id:
                try:
                    await _update_job_status(job_id, "FAILED", progress=0, error=str(exc))
                except Exception as update_exc:
                    logger.error(f"Failed to mark job as FAILED: {update_exc}")
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


async def main() -> None:
    logger.info("Starting Report Generation Consumer...")
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
