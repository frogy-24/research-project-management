import base64
import mimetypes
import os
from dataclasses import dataclass, field

import fitz
from openai import AsyncOpenAI

from src.utilities import get_logger, log_async_execution, log_execution

logger = get_logger(__name__)

SUPPORTED_IMAGE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".webp",
    ".bmp", ".tif", ".tiff", ".gif",
}


@dataclass
class OcrResult:
    text: str
    page_count: int
    model: str
    pages: list[dict] = field(default_factory=list)


@log_execution
def is_supported_ocr_filename(filename: str) -> bool:
    lower_name = filename.lower()
    return lower_name.endswith(".pdf") or any(
        lower_name.endswith(ext) for ext in SUPPORTED_IMAGE_EXTENSIONS
    )


@log_execution
def _build_vllm_client() -> AsyncOpenAI:
    base_url = os.getenv("BASE_URL_1", "http://localhost:20128/v1")
    api_key  = os.getenv("API_KEY_1", "placeholder")
    return AsyncOpenAI(base_url=base_url, api_key=api_key)


@log_execution
def _build_data_url(image_bytes: bytes, mime_type: str) -> str:
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


@log_execution
def _image_bytes_to_data_url(image_bytes: bytes, filename: str) -> str:
    mime_type, _ = mimetypes.guess_type(filename)
    return _build_data_url(image_bytes, mime_type or "image/jpeg")


@log_execution
def _pdf_to_page_data_urls(file_bytes: bytes) -> list[str]:
    """Chuyển mỗi trang PDF thành 1 data URL JPEG riêng biệt."""
    max_pages   = int(os.getenv("OCR_MAX_PDF_PAGES", "50"))
    zoom_factor = float(os.getenv("OCR_PDF_RENDER_ZOOM", "2.0"))

    document = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        page_count = min(len(document), max_pages)
        matrix     = fitz.Matrix(zoom_factor, zoom_factor)

        data_urls: list[str] = []
        for page_index in range(page_count):
            page       = document[page_index]
            pixmap     = page.get_pixmap(matrix=matrix, alpha=False)
            jpeg_bytes = pixmap.tobytes("jpeg")
            data_urls.append(_build_data_url(jpeg_bytes, "image/jpeg"))

        return data_urls
    finally:
        document.close()


@log_execution
def _build_ocr_prompt(custom_prompt: str | None) -> str:
    if custom_prompt and custom_prompt.strip():
        return custom_prompt.strip()
    return (
        "Bạn là công cụ OCR chuyên nghiệp. "
        "Hãy trích xuất TOÀN BỘ văn bản từ ảnh này, "
        "giữ nguyên cấu trúc dòng và đoạn văn, "
        "không thêm bất kỳ nhận xét hay giải thích nào."
    )


async def _ocr_single_image(
    client: AsyncOpenAI,
    model_name: str,
    data_url: str,
    prompt: str,
    page_num: int,
) -> str:
    """Gọi OCR cho 1 ảnh duy nhất, trả về text."""
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
    except Exception as e:
        base_url = os.getenv("BASE_URL_1", "http://localhost:20128/v1")
        error_msg = (
            f"[Trang {page_num}] Lỗi khi gọi AI server tại {base_url}: {e}"
        )
        logger.error(error_msg)
        raise ConnectionError(error_msg) from e


@log_async_execution
async def run_ocr_with_vllm(
    file_bytes: bytes,
    filename: str,
    prompt: str | None = None,
) -> OcrResult:
    model_name = os.getenv("MODEL_OCR", "openrouter/baidu/qianfan-ocr-fast:free")
    ocr_prompt = _build_ocr_prompt(prompt)
    client     = _build_vllm_client()

    # ✅ Sửa lỗi: tạo image_data_urls trước vòng lặp
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        image_data_urls = _pdf_to_page_data_urls(file_bytes)
    elif any(lower_name.endswith(ext) for ext in SUPPORTED_IMAGE_EXTENSIONS):
        image_data_urls = [_image_bytes_to_data_url(file_bytes, filename)]
    else:
        raise ValueError(f"Định dạng file không được hỗ trợ: {filename}")

    # Gọi OCR từng trang riêng biệt
    pages: list[dict] = []
    for page_num, data_url in enumerate(image_data_urls, start=1):
        logger.info(f"OCR trang {page_num}/{len(image_data_urls)} ...")
        text = await _ocr_single_image(client, model_name, data_url, ocr_prompt, page_num)
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
    """
    OCR một file từ đường dẫn trên disk.

    Args:
        file_path: Đường dẫn tuyệt đối hoặc tương đối tới file PDF / ảnh.
        prompt:    Prompt tuỳ chỉnh; None sẽ dùng prompt mặc định.

    Returns:
        OcrResult chứa toàn bộ văn bản đã trích xuất.

    Raises:
        FileNotFoundError: Nếu file không tồn tại.
        ValueError:        Nếu định dạng file không được hỗ trợ.
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"Không tìm thấy file: {file_path}")

    filename = os.path.basename(file_path)

    if not is_supported_ocr_filename(filename):
        raise ValueError(f"Định dạng file không được hỗ trợ: {filename}")

    logger.info(f"Đọc file từ disk: {file_path}")
    with open(file_path, "rb") as fh:
        file_bytes = fh.read()

    return await run_ocr_with_vllm(file_bytes, filename, prompt)


@log_async_execution
async def ocr_image(
    image_bytes: bytes,
    filename: str = "image.jpg",
    prompt: str | None = None,
) -> OcrResult:
    """
    OCR một ảnh từ bytes trong bộ nhớ (không cần ghi ra disk).

    Args:
        image_bytes: Nội dung ảnh dạng bytes (PNG, JPEG, WEBP, …).
        filename:    Tên file giả để xác định MIME type; mặc định "image.jpg".
        prompt:      Prompt tuỳ chỉnh; None sẽ dùng prompt mặc định.

    Returns:
        OcrResult với page_count = 1.

    Raises:
        ValueError: Nếu filename có đuôi không phải ảnh hoặc là PDF.
    """
    lower_name = filename.lower()

    # Chỉ chấp nhận ảnh, không nhận PDF (dùng ocr_file / run_ocr_with_vllm cho PDF)
    if not any(lower_name.endswith(ext) for ext in SUPPORTED_IMAGE_EXTENSIONS):
        raise ValueError(
            f"ocr_image chỉ hỗ trợ ảnh. "
            f"Định dạng không hợp lệ: {filename}. "
            f"Dùng ocr_file() hoặc run_ocr_with_vllm() cho PDF."
        )

    model_name = os.getenv("MODEL_OCR", "openrouter/baidu/qianfan-ocr-fast:free")
    ocr_prompt = _build_ocr_prompt(prompt)
    client     = _build_vllm_client()

    data_url = _image_bytes_to_data_url(image_bytes, filename)

    logger.info(f"OCR ảnh: {filename} ({len(image_bytes):,} bytes)")
    text = await _ocr_single_image(client, model_name, data_url, ocr_prompt, page_num=1)

    return OcrResult(
        text=text,
        page_count=1,
        model=model_name,
        pages=[{"page": 1, "text": text}],
    )