import os

from src.clients.ocr_client import build_ocr_client, ocr_single_image
from src.utilities import get_logger, log_async_execution

from .types import OcrResult, SUPPORTED_IMAGE_EXTENSIONS
from .utils import (
    build_ocr_prompt,
    image_bytes_to_data_url,
    is_supported_ocr_filename,
    pdf_to_page_data_urls,
)

logger = get_logger(__name__)


@log_async_execution
async def run_ocr_with_vllm(
    file_bytes: bytes,
    filename: str,
    prompt: str | None = None,
) -> OcrResult:
    model_name = os.getenv("OCR_MODEL", "openrouter/baidu/qianfan-ocr-fast:free")
    ocr_prompt = build_ocr_prompt(prompt)
    client = build_ocr_client()

    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        image_data_urls = pdf_to_page_data_urls(file_bytes)
    elif any(lower_name.endswith(ext) for ext in SUPPORTED_IMAGE_EXTENSIONS):
        image_data_urls = [image_bytes_to_data_url(file_bytes, filename)]
    else:
        raise ValueError(f"Dinh dang file khong duoc ho tro: {filename}")

    pages: list[dict] = []
    for page_num, data_url in enumerate(image_data_urls, start=1):
        logger.info(f"OCR trang {page_num}/{len(image_data_urls)} ...")
        text = await ocr_single_image(client, model_name, data_url, ocr_prompt, page_num)
        pages.append({"page": page_num, "text": text})

    full_text = "\n\n".join(p["text"] for p in pages if p["text"])

    return OcrResult(
        text=full_text,
        page_count=len(pages),
        model=model_name,
        pages=pages,
    )


@log_async_execution
async def ocr_file(
    file_path: str,
    prompt: str | None = None,
) -> OcrResult:
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"Khong tim thay file: {file_path}")

    filename = os.path.basename(file_path)

    if not is_supported_ocr_filename(filename):
        raise ValueError(f"Dinh dang file khong duoc ho tro: {filename}")

    logger.info(f"Doc file tu disk: {file_path}")
    with open(file_path, "rb") as fh:
        file_bytes = fh.read()

    return await run_ocr_with_vllm(file_bytes, filename, prompt)


@log_async_execution
async def ocr_image(
    image_bytes: bytes,
    filename: str = "image.jpg",
    prompt: str | None = None,
) -> OcrResult:
    lower_name = filename.lower()

    if not any(lower_name.endswith(ext) for ext in SUPPORTED_IMAGE_EXTENSIONS):
        raise ValueError(
            "ocr_image chi ho tro anh. "
            f"Dinh dang khong hop le: {filename}. "
            "Dung ocr_file() hoac run_ocr_with_vllm() cho PDF."
        )

    model_name = os.getenv("OCR_MODEL", "openrouter/baidu/qianfan-ocr-fast:free")
    ocr_prompt = build_ocr_prompt(prompt)
    client = build_ocr_client()

    data_url = image_bytes_to_data_url(image_bytes, filename)

    logger.info(f"OCR anh: {filename} ({len(image_bytes):,} bytes)")
    text = await ocr_single_image(client, model_name, data_url, ocr_prompt, page_num=1)

    return OcrResult(
        text=text,
        page_count=1,
        model=model_name,
        pages=[{"page": 1, "text": text}],
    )
