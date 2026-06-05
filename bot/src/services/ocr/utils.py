import base64
import mimetypes
import os

import fitz

from src.utilities import get_logger, log_execution

from .types import SUPPORTED_IMAGE_EXTENSIONS

logger = get_logger(__name__)


@log_execution
def is_supported_ocr_filename(filename: str) -> bool:
    lower_name = filename.lower()
    return lower_name.endswith(".pdf") or any(
        lower_name.endswith(ext) for ext in SUPPORTED_IMAGE_EXTENSIONS
    )


@log_execution
def build_data_url(image_bytes: bytes, mime_type: str) -> str:
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


@log_execution
def image_bytes_to_data_url(image_bytes: bytes, filename: str) -> str:
    mime_type, _ = mimetypes.guess_type(filename)
    return build_data_url(image_bytes, mime_type or "image/jpeg")


@log_execution
def pdf_to_page_data_urls(file_bytes: bytes) -> list[str]:
    """Chuyen moi trang PDF thanh 1 data URL JPEG rieng biet."""
    max_pages = int(os.getenv("OCR_MAX_PDF_PAGES", "50"))
    zoom_factor = float(os.getenv("OCR_PDF_RENDER_ZOOM", "2.0"))

    document = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        page_count = min(len(document), max_pages)
        matrix = fitz.Matrix(zoom_factor, zoom_factor)

        data_urls: list[str] = []
        for page_index in range(page_count):
            page = document[page_index]
            pixmap = page.get_pixmap(matrix=matrix, alpha=False)
            jpeg_bytes = pixmap.tobytes("jpeg")
            data_urls.append(build_data_url(jpeg_bytes, "image/jpeg"))

        return data_urls
    finally:
        document.close()


def build_ocr_prompt(custom_prompt: str | None) -> str:
    if custom_prompt and custom_prompt.strip():
        return custom_prompt.strip()

    return """
Bạn là công cụ OCR chuyên dùng cho tài liệu học thuật, biểu mẫu và hồ sơ nghiên cứu khoa học.

Hãy trích xuất toàn bộ nội dung có trong ảnh với độ chính xác cao nhất.

YÊU CẦU:
- Giữ nguyên 100% nội dung gốc.
- Giữ nguyên cấu trúc tiêu đề, đề mục, bảng biểu và danh sách.
- Giữ nguyên các thông tin như:
  + Tên đề tài
  + Mục tiêu nghiên cứu
  + Nội dung nghiên cứu
  + Thông tin sinh viên
  + Thông tin giảng viên hướng dẫn
  + Kinh phí
  + Tiến độ thực hiện
  + Các chữ ký, mã số, ngày tháng (nếu có)
- Nếu có bảng biểu, xuất dưới dạng bảng Markdown.
- Không được tự ý sửa nội dung.
- Không được diễn giải hay tóm tắt.
- Không được bỏ sót nội dung.
- Nếu không đọc được một phần, ghi [KHÔNG ĐỌC ĐƯỢC] tại đúng vị trí đó.

ĐẦU RA:
Chỉ trả về nội dung OCR đã trích xuất, không kèm bất kỳ lời giải thích nào.
"""