import os
import uuid
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.models import VectorParams

from src.utilities import get_logger, log_execution

logger = get_logger(__name__)
_QDRANT_ID_NAMESPACE = uuid.UUID("00000000-0000-0000-0000-000000000001")

# Default vector size from embedding model (sentence-transformers/all-MiniLM-L6-v2 produces 384-dim vectors)
DEFAULT_VECTOR_SIZE = 384


def _get_embedding_vector_size() -> int:
    """Get embedding vector size from environment or use default."""
    env_size = os.getenv("EMBEDDING_VECTOR_SIZE")
    if env_size:
        try:
            return int(env_size)
        except ValueError:
            logger.warning(f"Invalid EMBEDDING_VECTOR_SIZE: {env_size}, using default {DEFAULT_VECTOR_SIZE}")
    return DEFAULT_VECTOR_SIZE


def _normalize_point_id(point_id: str | int) -> str | int:
    if isinstance(point_id, int):
        return point_id

    try:
        return str(uuid.UUID(str(point_id)))
    except (ValueError, TypeError):
        return str(uuid.uuid5(_QDRANT_ID_NAMESPACE, str(point_id)))


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
def ensure_collection(collection_name: str, vector_size: int):
    client = _build_qdrant_client()

    if client.collection_exists(collection_name):

        info = client.get_collection(collection_name)

        current_size = info.config.params.vectors.size

        if current_size != vector_size:
            logger.warning(
                f"Collection {collection_name} có dim={current_size}, "
                f"nhưng cần dim={vector_size}. Đang recreate..."
            )

            client.delete_collection(collection_name)

            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=models.Distance.COSINE,
                ),
            )

            logger.info(f"Đã recreate collection {collection_name}")

    else:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=vector_size,
                distance=models.Distance.COSINE,
            ),
        )

        logger.info(f"Đã tạo collection mới {collection_name}")


@log_execution
def upsert_points(collection: str, points: list[dict[str, Any]]) -> None:
    client = _build_qdrant_client()

    point_structs: list[models.PointStruct] = []
    for point in points:
        point_structs.append(
            models.PointStruct(
                id=_normalize_point_id(point.get("id")),
                vector=point.get("vector"),
                payload=point.get("payload"),
            )
        )

    try:
        client.upsert(collection_name=collection, points=point_structs, wait=True)
    except Exception as exc:
        logger.error(f"Failed to upsert points to {collection}: {exc}")


def query_similar_points(
    collection: str,
    query_vector: list[float],
    limit: int = 5,
    score_threshold: float = 0.7,
    exclude_project_id: str | None = None,
) -> list[dict[str, Any]]:
    """
    Query Qdrant for similar points.
    
    Args:
        collection: Collection name
        query_vector: Query vector (embedding)
        limit: Max results
        score_threshold: Minimum similarity score (0-1)
        exclude_project_id: Project ID to exclude from results
    
    Returns:
        List of matching points with payload
    """
    client = _build_qdrant_client()
    
    try:
        results = client.search(
            collection_name=collection,
            query_vector=query_vector,
            limit=limit + 1,  # +1 to account for potential exclusion
            score_threshold=score_threshold,
        )
        
        matches = []
        for result in results:
            payload = result.payload or {}
            # Exclude current project from duplicates check
            if exclude_project_id and payload.get("projectId") == exclude_project_id:
                continue
            matches.append({
                "id": result.id,
                "score": result.score,
                "payload": payload,
            })
        
        return matches[:limit]
        
    except Exception as exc:
        logger.error(f"Failed to query Qdrant collection {collection}: {exc}")
        return []


def query_by_text(
    collection: str,
    query_text: str,
    query_vector: list[float],
    limit: int = 5,
    score_threshold: float = 0.7,
    exclude_project_id: str | None = None,
) -> list[dict[str, Any]]:
    """
    Query Qdrant using text query with embedding.
    Returns similar documents from the collection.
    """
    return query_similar_points(
        collection=collection,
        query_vector=query_vector,
        limit=limit,
        score_threshold=score_threshold,
        exclude_project_id=exclude_project_id,
    )


# =============================================================================
# Extended Qdrant Service Functions
# =============================================================================


def check_collection_exists(collection: str) -> bool:
    """
    Check if a collection exists in Qdrant.
    
    Args:
        collection: Collection name
        
    Returns:
        True if collection exists, False otherwise
    """
    client = _build_qdrant_client()
    try:
        client.get_collection(collection)
        return True
    except Exception:
        return False


def create_collection(collection: str, vector_size: int, distance: str = "Cosine") -> bool:
    """
    Create a new collection in Qdrant.
    
    Args:
        collection: Collection name
        vector_size: Dimension of vectors
        distance: Distance metric (Cosine, Dot, Euclid)
        
    Returns:
        True if created successfully, False otherwise
    """
    client = _build_qdrant_client()
    try:
        # Check if already exists
        if check_collection_exists(collection):
            logger.info(f"Collection {collection} already exists")
            return True
        
        params = models.VectorParams(size=vector_size, distance=_distance_from_string(distance))
        client.create_collection(collection_name=collection, vectors_config=params)
        logger.info(f"Created Qdrant collection: {collection}")
        return True
    except Exception as exc:
        logger.error(f"Failed to create collection {collection}: {exc}")
        return False


def delete_collection(collection: str) -> bool:
    """
    Delete a collection from Qdrant.
    
    Args:
        collection: Collection name
        
    Returns:
        True if deleted successfully, False otherwise
    """
    client = _build_qdrant_client()
    try:
        client.delete_collection(collection_name=collection)
        logger.info(f"Deleted Qdrant collection: {collection}")
        return True
    except Exception as exc:
        logger.error(f"Failed to delete collection {collection}: {exc}")
        return False


def get_collection_info(collection: str) -> dict[str, Any] | None:
    """
    Get information about a collection.
    
    Args:
        collection: Collection name
        
    Returns:
        Dict with collection info or None if not found
    """
    client = _build_qdrant_client()
    try:
        info = client.get_collection(collection)
        return {
            "name": collection,
            "vectors_count": info.vectors_count,
            "points_count": info.points_count,
            "status": str(info.status),
            "vector_size": info.config.params.vectors.size if info.config.params else None,
            "distance": str(info.config.params.distance) if info.config.params else None,
        }
    except Exception as exc:
        logger.error(f"Failed to get collection info {collection}: {exc}")
        return None


def list_collections() -> list[str]:
    """
    List all collections in Qdrant.
    
    Returns:
        List of collection names
    """
    client = _build_qdrant_client()
    try:
        result = client.get_collections()
        return [col.name for col in result.collections]
    except Exception as exc:
        logger.error(f"Failed to list collections: {exc}")
        return []


def upsert_point(collection: str, point_id: str, vector: list[float], payload: dict[str, Any]) -> bool:
    """
    Upsert a single point to Qdrant.
    
    Args:
        collection: Collection name
        point_id: Unique point ID
        vector: Vector embedding
        payload: Metadata payload
        
    Returns:
        True if successful, False otherwise
    """
    client = _build_qdrant_client()
    vector_dim = len(vector)
    
    try:
        # Check collection exists and validate dimension
        try:
            info = client.get_collection(collection)
            existing_size = info.config.params.vectors.size if info.config.params else None
            if existing_size and existing_size != vector_dim:
                logger.warning(
                    "Collection %s has dim=%s, but vector has dim=%s. Recreating collection...",
                    collection,
                    existing_size,
                    vector_dim,
                )
                # Delete and recreate with correct dimension
                try:
                    client.delete_collection(collection_name=collection)
                    logger.info(f"Deleted collection {collection} for dimension fix")
                except Exception as del_err:
                    logger.warning(f"Could not delete collection: {del_err}")
                
                client.create_collection(
                    collection_name=collection,
                    vectors_config=VectorParams(
                        size=vector_dim,
                        distance=models.Distance.COSINE,
                    ),
                )
                logger.info(f"Recreated collection {collection} with dim={vector_dim}")
        except Exception:
            # Collection doesn't exist, create it
            ensure_collection(collection, vector_dim)

        point = models.PointStruct(
            id=_normalize_point_id(point_id),
            vector=vector,
            payload=payload,
        )
        client.upsert(collection_name=collection, points=[point], wait=True)
        logger.debug(f"Upserted point {point_id} to {collection}")
        return True
    except Exception as exc:
        logger.error(f"Failed to upsert point {point_id} to {collection}: {exc}")
        return False


def remove_point(collection: str, point_id: str) -> bool:
    """
    Remove a point from Qdrant collection.
    
    Args:
        collection: Collection name
        point_id: Point ID to remove
        
    Returns:
        True if successful, False otherwise
    """
    client = _build_qdrant_client()
    try:
        client.delete(
            collection_name=collection,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="id",
                            match=models.MatchValue(value=point_id),
                        )
                    ]
                )
            ),
        )
        logger.debug(f"Removed point {point_id} from {collection}")
        return True
    except Exception as exc:
        logger.error(f"Failed to remove point {point_id} from {collection}: {exc}")
        return False


def remove_points_by_filter(collection: str, must_conditions: list[models.FieldCondition]) -> int:
    """
    Remove points from collection using filter conditions.
    
    Args:
        collection: Collection name
        must_conditions: List of filter conditions
        
    Returns:
        Number of points deleted
    """
    client = _build_qdrant_client()
    try:
        client.delete(
            collection_name=collection,
            points_selector=models.FilterSelector(
                filter=models.Filter(must=must_conditions)
            ),
        )
        logger.debug(f"Removed points from {collection} with filter")
        return True
    except Exception as exc:
        logger.error(f"Failed to remove points from {collection}: {exc}")
        return False


def search(
    collection: str,
    query_vector: list[float],
    limit: int = 10,
    score_threshold: float | None = None,
    offset: int | None = None,
    with_payload: bool = True,
    with_vectors: bool = False,
) -> list[dict[str, Any]]:
    """
    Search for similar points in collection.
    
    Args:
        collection: Collection name
        query_vector: Query vector
        limit: Max results
        score_threshold: Minimum score (optional)
        offset: Pagination offset
        with_payload: Include payload in results
        with_vectors: Include vectors in results
        
    Returns:
        List of search results with id, score, payload
    """
    client = _build_qdrant_client()
    try:
        results = client.search(
            collection_name=collection,
            query_vector=query_vector,
            limit=limit,
            score_threshold=score_threshold,
            offset=offset,
            with_payload=with_payload,
            with_vectors=with_vectors,
        )
        
        return [
            {
                "id": str(result.id),
                "score": result.score,
                "payload": result.payload or {},
            }
            for result in results
        ]
    except Exception as exc:
        logger.error(f"Failed to search in {collection}: {exc}")
        return []


def search_by_text(
    collection: str,
    query_text: str,
    embed_text_func,
    limit: int = 10,
    score_threshold: float | None = None,
) -> list[dict[str, Any]]:
    """
    Search by text - embeds text and searches.
    
    Args:
        collection: Collection name
        query_text: Text to search
        embed_text_func: Function to embed text
        limit: Max results
        score_threshold: Minimum score
        
    Returns:
        List of search results
    """
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    vector = loop.run_until_complete(embed_text_func(query_text))
    if not vector:
        logger.warning(f"Failed to embed text for search")
        return []
    
    return search(
        collection=collection,
        query_vector=vector,
        limit=limit,
        score_threshold=score_threshold,
    )


def scroll(
    collection: str,
    limit: int = 100,
    offset: str | None = None,
    with_payload: bool = True,
    filter_conditions: models.Filter | None = None,
) -> tuple[list[dict[str, Any]], str | None]:
    """
    Scroll through points in collection (for pagination).
    
    Args:
        collection: Collection name
        limit: Max points per page
        offset: Last point ID from previous page
        with_payload: Include payload
        filter_conditions: Optional filter
        
    Returns:
        Tuple of (list of points, next offset or None)
    """
    client = _build_qdrant_client()
    try:
        results = client.scroll(
            collection_name=collection,
            limit=limit,
            offset=offset,
            with_payload=with_payload,
            scroll_filter=filter_conditions,
        )
        
        points = [
            {
                "id": str(result.id),
                "payload": result.payload or {},
            }
            for result in results
        ]
        
        next_offset = points[-1]["id"] if points else None
        return points, next_offset
    except Exception as exc:
        logger.error(f"Failed to scroll in {collection}: {exc}")
        return [], None


def count_points(collection: str, filter_conditions: models.Filter | None = None) -> int:
    """
    Count points in collection.
    
    Args:
        collection: Collection name
        filter_conditions: Optional filter
        
    Returns:
        Number of points
    """
    client = _build_qdrant_client()
    try:
        result = client.count(
            collection_name=collection,
            count_filter=filter_conditions,
        )
        return result.count
    except Exception as exc:
        logger.error(f"Failed to count points in {collection}: {exc}")
        return 0
