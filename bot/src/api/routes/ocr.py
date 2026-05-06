from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

# from src.services import is_supported_ocr_filename, run_ocr_with_vllm
# from src.utilities import log_api_request


from src.services import (
    SUPPORTED_IMAGE_EXTENSIONS,
    is_supported_ocr_filename,
    ocr_image,
    run_ocr_with_vllm,
)
from src.utilities import log_api_request


router = APIRouter()



class OcrApiResponse(BaseModel):
    filename: str = Field(..., description="Tên file gốc")
    page_count: int = Field(..., description="Số trang (PDF) hoặc số lượng ảnh đã xử lý")
    model: str = Field(..., description="Tên model AI đã sử dụng để OCR")
    text: str = Field(..., description="Toàn bộ văn bản được trích xuất")


# ──────────────────────────────────────────────
# Helper dùng chung
# ──────────────────────────────────────────────

def _check_file_not_empty(file_bytes: bytes) -> None:
    if not file_bytes:
        raise HTTPException(status_code=400, detail="File rỗng hoặc không thể đọc nội dung")


# ──────────────────────────────────────────────
# Endpoint 1 — OCR file (PDF hoặc ảnh)
# ──────────────────────────────────────────────

@router.post(
    "/ocr/file",
    response_model=OcrApiResponse,
    summary="OCR file PDF hoặc Hình ảnh",
    description=(
        "Tải lên một file PDF hoặc file ảnh (png, jpg, webp, …). "
        "Hệ thống tự động nhận diện định dạng và trích xuất toàn bộ văn bản. "
        "Với PDF nhiều trang, kết quả các trang được ghép liền mạch."
    ),
)
@log_api_request("/ocr/file", "POST")
async def api_ocr_file(
    file: UploadFile = File(..., description="File PDF hoặc Ảnh cần OCR"),
    prompt: str | None = Form(
        default=None,
        description="Prompt tuỳ chỉnh (tuỳ chọn). Bỏ trống sẽ dùng prompt mặc định.",
    ),
) -> OcrApiResponse:
    filename = file.filename or ""

    # 1. Validate định dạng
    if not filename or not is_supported_ocr_filename(filename):
        raise HTTPException(
            status_code=400,
            detail="Chỉ hỗ trợ file PDF hoặc ảnh (png/jpg/jpeg/webp/bmp/tif/tiff/gif)",
        )

    # 2. Đọc nội dung
    file_bytes = await file.read()
    _check_file_not_empty(file_bytes)

    # 3. Gọi service OCR
    try:
        result = await run_ocr_with_vllm(
            file_bytes=file_bytes,
            filename=filename,
            prompt=prompt,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ConnectionError as exc:
        raise HTTPException(status_code=502, detail=f"Không thể kết nối AI server: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR thất bại do lỗi server: {exc}") from exc

    # 4. Trả kết quả — bao gồm model (fix so với mẫu gốc)
    return OcrApiResponse(
        filename=filename,
        page_count=result.page_count,
        model=result.model,   # ✅ mẫu gốc bị thiếu field này
        text=result.text,
    )


# ──────────────────────────────────────────────
# Endpoint 2 — OCR ảnh (chỉ nhận ảnh, không nhận PDF)
# ──────────────────────────────────────────────

@router.post(
    "/ocr/image",
    response_model=OcrApiResponse,
    summary="OCR Hình ảnh",
    description=(
        "Tải lên một file ảnh (png, jpg, jpeg, webp, bmp, tif, tiff, gif). "
        "Endpoint này chỉ xử lý ảnh đơn — không nhận PDF. "
        "Dùng /ocr/file nếu bạn cần OCR PDF."
    ),
)
@log_api_request("/ocr/image", "POST")
async def api_ocr_image(
    file: UploadFile = File(..., description="File ảnh cần OCR"),
    prompt: str | None = Form(
        default=None,
        description="Prompt tuỳ chỉnh (tuỳ chọn). Bỏ trống sẽ dùng prompt mặc định.",
    ),
) -> OcrApiResponse:
    filename = file.filename or ""

    # 1. Validate — chỉ chấp nhận ảnh, từ chối PDF rõ ràng
    if not filename:
        raise HTTPException(status_code=400, detail="Thiếu tên file")

    lower_name = filename.lower()

    if lower_name.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Endpoint này không nhận PDF. Vui lòng dùng /ocr/file để OCR PDF.",
        )

    if not any(lower_name.endswith(ext) for ext in SUPPORTED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail="Chỉ hỗ trợ ảnh: png, jpg, jpeg, webp, bmp, tif, tiff, gif",
        )

    # 2. Đọc nội dung
    file_bytes = await file.read()
    _check_file_not_empty(file_bytes)

    # 3. Gọi service OCR ảnh
    try:
        result = await ocr_image(
            image_bytes=file_bytes,
            filename=filename,
            prompt=prompt,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ConnectionError as exc:
        raise HTTPException(status_code=502, detail=f"Không thể kết nối AI server: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR thất bại do lỗi server: {exc}") from exc

    # 4. Trả kết quả
    return OcrApiResponse(
        filename=filename,
        page_count=result.page_count,
        model=result.model,
        text=result.text,
    )