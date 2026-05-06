import asyncio
import os
from typing import Any
from uuid import uuid4

from src.clients.embedding_client import embed_text
from src.clients.qdrant_client import ensure_collection, upsert_points
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)


@log_async_execution
async def index_ocr_document(
    text: str,
    payload: dict[str, Any],
    collection: str | None = None,
) -> None:
    if not text or not text.strip():
        logger.info("Skip Qdrant index: empty text")
        return

    collection_name = collection or os.getenv("QDRANT_COLLECTION", "project_ocr")

    embedding = await embed_text(text)
    if not embedding:
        logger.warning("Skip Qdrant index: missing embedding")
        return

    vector_size = len(embedding)

    await asyncio.to_thread(ensure_collection, collection_name, vector_size)

    point = {
        "id": uuid4().hex,
        "vector": embedding,
        "payload": payload,
    }

    await asyncio.to_thread(upsert_points, collection_name, [point])
    logger.info(f"Indexed OCR document into Qdrant collection {collection_name}")
