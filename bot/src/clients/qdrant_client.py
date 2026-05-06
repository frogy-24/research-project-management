import os
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http import models

from src.utilities import get_logger, log_execution

logger = get_logger(__name__)


@log_execution
def _build_qdrant_client() -> QdrantClient:
    url = os.getenv("QDRANT_URL", "http://127.0.0.1:6333")
    api_key = os.getenv("QDRANT_API_KEY")
    return QdrantClient(url=url, api_key=api_key)


def _distance_from_string(value: str) -> models.Distance:
    normalized = value.strip().upper()
    if normalized == "DOT":
        return models.Distance.DOT
    if normalized == "EUCLID":
        return models.Distance.EUCLID
    return models.Distance.COSINE


@log_execution
def ensure_collection(collection: str, vector_size: int, distance: str = "Cosine") -> None:
    client = _build_qdrant_client()
    try:
        client.get_collection(collection)
        return
    except Exception:
        pass

    params = models.VectorParams(size=vector_size, distance=_distance_from_string(distance))
    try:
        client.create_collection(collection_name=collection, vectors_config=params)
    except Exception as exc:
        logger.error(f"Failed to create Qdrant collection {collection}: {exc}")


@log_execution
def upsert_points(collection: str, points: list[dict[str, Any]]) -> None:
    client = _build_qdrant_client()

    point_structs: list[models.PointStruct] = []
    for point in points:
        point_structs.append(
            models.PointStruct(
                id=point.get("id"),
                vector=point.get("vector"),
                payload=point.get("payload"),
            )
        )

    try:
        client.upsert(collection_name=collection, points=point_structs, wait=True)
    except Exception as exc:
        logger.error(f"Failed to upsert points to {collection}: {exc}")
