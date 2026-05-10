import asyncio
import os
from typing import Dict

from openai import AsyncOpenAI

from src.utilities import get_logger, log_async_execution, log_execution

logger = get_logger(__name__)
_LOCAL_MODELS: Dict[str, "SentenceTransformer"] = {}


def _is_local_embedding(model_name: str | None) -> bool:
    provider = os.getenv("EMBEDDING_PROVIDER", "").lower()
    if provider == "local":
        return True
    if model_name and model_name.startswith("sentence-transformers/"):
        return True
    return False


def _get_local_model(model_name: str) -> "SentenceTransformer":
    # Lazy import to avoid torch load when not needed.
    from sentence_transformers import SentenceTransformer

    cached = _LOCAL_MODELS.get(model_name)
    if cached:
        return cached

    model = SentenceTransformer(model_name)
    _LOCAL_MODELS[model_name] = model
    return model


@log_execution
def build_embedding_client() -> AsyncOpenAI:
    base_url = os.getenv("COPILOT_BASE_URL")
    api_key = os.getenv("COPILOT_API_KEY")
    if not api_key and base_url:
        api_key = "dummy-key"
        logger.debug("Using dummy API key for custom base_url")

    if not api_key:
        logger.error("Missing API key for embedding client")
        raise RuntimeError("Missing COPILOT_API_KEY")

    if base_url:
        logger.info(f"Using custom base_url: {base_url}")
        return AsyncOpenAI(api_key=api_key, base_url=base_url)

    logger.info("Using OpenAI default endpoint")
    return AsyncOpenAI(api_key=api_key)


async def _embed_text_local(text: str, model_name: str) -> list[float] | None:
    if not text or not text.strip():
        return None

    model = _get_local_model(model_name)
    embeddings = await asyncio.to_thread(
        model.encode,
        [text],
        normalize_embeddings=True,
    )
    if embeddings is None or len(embeddings) == 0:
        return None
    return embeddings[0].tolist()


@log_async_execution
async def embed_text(
    text: str,
    model: str | None = None,
) -> list[float] | None:
    if not text or not text.strip():
        return None

    model_name = model or os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

    if _is_local_embedding(model_name):
        return await _embed_text_local(text, model_name)

    client = build_embedding_client()
    response = await client.embeddings.create(model=model_name, input=text)
    if not response.data:
        return None

    return response.data[0].embedding
