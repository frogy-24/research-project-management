import os

from openai import AsyncOpenAI

from src.utilities import get_logger, log_async_execution, log_execution

logger = get_logger(__name__)


@log_execution
def build_ocr_client() -> AsyncOpenAI:
    base_url = os.getenv("BASE_URL_1", "http://localhost:20128/v1")
    api_key = os.getenv("API_KEY_1", "placeholder")
    return AsyncOpenAI(base_url=base_url, api_key=api_key)


@log_async_execution
async def ocr_single_image(
    client: AsyncOpenAI,
    model_name: str,
    data_url: str,
    prompt: str,
    page_num: int,
) -> str:
    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
            max_tokens=int(os.getenv("OCR_MAX_TOKENS", "4096")),
        )
        return response.choices[0].message.content or ""
    except Exception as exc:
        base_url = os.getenv("BASE_URL_1", "http://localhost:20128/v1")
        error_msg = f"[Trang {page_num}] Loi khi goi AI server tai {base_url}: {exc}"
        logger.error(error_msg)
        raise ConnectionError(error_msg) from exc
