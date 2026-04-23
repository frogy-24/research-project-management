import base64
import mimetypes
import os
from dataclasses import dataclass

import fitz
from openai import AsyncOpenAI

from src.utilities import get_logger, log_async_execution, log_execution

logger = get_logger(__name__)

SUPPORTED_IMAGE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
    ".gif",
}


@dataclass
class OcrResult:
    text: str
    page_count: int
    model: str


@log_execution
def is_supported_ocr_filename(filename: str) -> bool:
    lower_name = filename.lower()
    return lower_name.endswith(".pdf") or any(
        lower_name.endswith(ext) for ext in SUPPORTED_IMAGE_EXTENSIONS
    )


@log_execution
def _build_vllm_client() -> AsyncOpenAI:
    base_url = os.getenv("VLLM_BASE_URL", "http://127.0.0.1:8001/v1")
    api_key = os.getenv("VLLM_API_KEY", "EMPTY")
    return AsyncOpenAI(base_url=base_url, api_key=api_key)


@log_execution
def _build_data_url(image_bytes: bytes, mime_type: str) -> str:
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


@log_execution
def _image_bytes_to_data_url(image_bytes: bytes, filename: str) -> str:
    mime_type, _ = mimetypes.guess_type(filename)
    normalized_mime = mime_type or "image/png"
    return _build_data_url(image_bytes, normalized_mime)


@log_execution
def _pdf_to_page_data_urls(file_bytes: bytes) -> list[str]:
    max_pages = int(os.getenv("OCR_MAX_PDF_PAGES", "5"))
    zoom_factor = float(os.getenv("OCR_PDF_RENDER_ZOOM", "2.0"))

    document = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        page_count = min(len(document), max_pages)
        matrix = fitz.Matrix(zoom_factor, zoom_factor)

        data_urls: list[str] = []
        for page_index in range(page_count):
            page = document[page_index]
            pixmap = page.get_pixmap(matrix=matrix, alpha=False)
            png_bytes = pixmap.tobytes("png")
            data_urls.append(_build_data_url(png_bytes, "image/png"))

        return data_urls
    finally:
        document.close()


@log_execution
def _build_ocr_prompt(custom_prompt: str | None) -> str:
    if custom_prompt and custom_prompt.strip():
        return custom_prompt.strip()

    return (
        "Ban la OCR engine tieng Viet. "
        "Hay trich xuat toan bo van ban trong anh/tai lieu, giu nguyen cau truc xuong dong toi da co the. "
        "Neu co bang bieu thi giu dang markdown table. "
        "Khong du doan noi dung khong nhin thay."
    )


@log_async_execution
async def run_ocr_with_vllm(
    file_bytes: bytes,
    filename: str,
    prompt: str | None = None,
) -> OcrResult:
    if filename.lower().endswith(".pdf"):
        image_data_urls = _pdf_to_page_data_urls(file_bytes)
    else:
        image_data_urls = [_image_bytes_to_data_url(file_bytes, filename)]

    if not image_data_urls:
        raise ValueError("Khong the chuyen file thanh du lieu hinh anh de OCR")

    model_name = os.getenv("VLLM_OCR_MODEL", "Qwen/Qwen3.5-0.8B")
    temperature = float(os.getenv("OCR_TEMPERATURE", "0"))
    max_tokens = int(os.getenv("OCR_MAX_TOKENS", "2048"))

    content_blocks: list[dict[str, object]] = [{"type": "text", "text": _build_ocr_prompt(prompt)}]
    for image_data_url in image_data_urls:
        content_blocks.append(
            {
                "type": "image_url",
                "image_url": {"url": image_data_url},
            }
        )

    client = _build_vllm_client()
    
    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "user",
                    "content": content_blocks,
                }
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
    except Exception as e:
        base_url = os.getenv("VLLM_BASE_URL", "http://127.0.0.1:8001/v1")
        error_msg = (
            f"Khong the ket noi den VLLM server tai {base_url}. "
            f"Vui long dam bao VLLM server dang chay va cau hinh dung trong file .env. "
            f"Chi tiet loi: {str(e)}"
        )
        logger.error(error_msg)
        raise ConnectionError(error_msg) from e

    text = response.choices[0].message.content or ""
    return OcrResult(text=text, page_count=len(image_data_urls), model=model_name)
