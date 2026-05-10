import asyncio
import json
import os
import uuid
from typing import Any

import aio_pika

from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)

DEFAULT_RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://admin:admin123@localhost:5672/")
DEFAULT_QUEUE = os.getenv("AUTO_APPROVAL_QUEUE", "auto_approval_queue")


@log_async_execution
async def publish_message(
    payload: dict[str, Any],
    queue_name: str | None = None,
    correlation_id: str | None = None,
    reply_to: str | None = None,
) -> str:
    queue = queue_name or DEFAULT_QUEUE
    message_id = correlation_id or str(uuid.uuid4())

    connection = await aio_pika.connect_robust(DEFAULT_RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        await channel.declare_queue(queue, durable=True)

        message = aio_pika.Message(
            body=json.dumps(payload).encode("utf-8"),
            content_type="application/json",
            correlation_id=message_id,
            reply_to=reply_to,
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )

        await channel.default_exchange.publish(message, routing_key=queue)

    logger.info(f"Published message to queue={queue} id={message_id}")
    return message_id


@log_async_execution
async def publish_rpc(
    payload: dict[str, Any],
    queue_name: str | None = None,
    timeout_seconds: int = 300,
) -> dict[str, Any]:
    queue = queue_name or DEFAULT_QUEUE
    correlation_id = str(uuid.uuid4())

    connection = await aio_pika.connect_robust(DEFAULT_RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        await channel.declare_queue(queue, durable=True)

        reply_queue = await channel.declare_queue(exclusive=True, auto_delete=True)
        response_future: asyncio.Future[bytes] = asyncio.get_event_loop().create_future()

        async def _on_reply(message: aio_pika.IncomingMessage) -> None:
            if message.correlation_id != correlation_id:
                return
            if not response_future.done():
                response_future.set_result(message.body)

        await reply_queue.consume(_on_reply, no_ack=True)

        message = aio_pika.Message(
            body=json.dumps(payload).encode("utf-8"),
            content_type="application/json",
            correlation_id=correlation_id,
            reply_to=reply_queue.name,
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )

        await channel.default_exchange.publish(message, routing_key=queue)

        try:
            body = await asyncio.wait_for(response_future, timeout_seconds)
        except asyncio.TimeoutError:
            logger.warning(f"RPC timeout after {timeout_seconds}s id={correlation_id}")
            return {
                "timeout": True,
                "messageId": correlation_id,
            }

        try:
            result = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            result = {"raw": body.decode("utf-8", errors="replace")}

        return {
            "timeout": False,
            "messageId": correlation_id,
            "result": result,
        }
