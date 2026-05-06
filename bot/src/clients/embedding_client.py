import os

from openai import AsyncOpenAI

from src.utilities import get_logger, log_async_execution, log_execution

logger = get_logger(__name__)


@log_execution
def build_embedding_client() -> AsyncOpenAI:
    base_url = (
        os.getenv("EMBEDDING_BASE_URL")
        or os.getenv("BASE_URL")
        or os.getenv("OPENAI_BASE_URL")
        or os.getenv("COPILOT_API")
    )
    api_key = (
        os.getenv("EMBEDDING_API_KEY")
        or os.getenv("API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or os.getenv("COPILOT_API_KEY")
    )

    if not api_key and base_url:
        api_key = "dummy-key"
        logger.debug("Using dummy API key for custom base_url")

    if not api_key:
        logger.error("Missing API key for embedding client")
        raise RuntimeError("Missing EMBEDDING_API_KEY/OPENAI_API_KEY")

    if base_url:
        logger.info(f"Using custom base_url: {base_url}")
        return AsyncOpenAI(api_key=api_key, base_url=base_url)

    logger.info("Using OpenAI default endpoint")
    return AsyncOpenAI(api_key=api_key)


@log_async_execution
async def embed_text(
    text: str,
    model: str | None = None,
) -> list[float] | None:
    if not text or not text.strip():
        return None

    client = build_embedding_client()
    model_name = model or os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

    response = await client.embeddings.create(
        model=model_name,
        input=text,
    )
    if not response.data:
        return None

    return response.data[0].embedding
