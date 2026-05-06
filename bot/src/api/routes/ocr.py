from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from src.services import is_supported_ocr_filename, run_ocr_with_vllm
from src.utilities import log_api_request

router = APIRouter(tags=["ocr"])

class OcrApiResponse(BaseModel):
    filename: str = Field(..., description="Tên file gốc")
    page_count: int = Field(..., description="Số trang (PDF) hoặc số lượng ảnh đã xử lý")
    model: str = Field(..., description="Tên model AI đã sử dụng để OCR")
    text: str = Field(..., description="Toàn bộ văn bản được trích xuất")


@router.post(
    "/ocr", 
    response_model=OcrApiResponse,
    summary="OCR file PDF hoặc Hình ảnh",
    description="Tải lên một file PDF hoặc file ảnh (png, jpg, webp,...). Hệ thống sẽ tự động nhận diện định dạng và trích xuất toàn bộ văn bản."
)
@log_api_request("/ocr", "POST")
async def ocr_file(
    file: UploadFile = File(..., description="File PDF hoặc Ảnh cần OCR"),
    prompt: str | None = Form(default=None, description="Prompt tùy chỉnh (tùy chọn). Nếu bỏ trống sẽ dùng prompt mặc định."),
) -> OcrApiResponse:
    
    filename = file.filename or ""
    
    # 1. Kiểm tra định dạng file (Hỗ trợ cả PDF và các đuôi ảnh phổ biến)
    if not filename or not is_supported_ocr_filename(filename):
        raise HTTPException(
            status_code=400,
            detail="Chỉ hỗ trợ file PDF hoặc ảnh (png/jpg/jpeg/webp/bmp/tif/tiff/gif)",
        )

    # 2. Đọc nội dung file
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="File rỗng hoặc không thể đọc nội dung")

    # 3. Gọi Service để xử lý OCR
    try:
        result = await run_ocr_with_vllm(
            file_bytes=file_bytes,
            filename=filename,
            prompt=prompt,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR thất bại do lỗi server: {str(exc)}") from exc

    # 4. Trả về kết quả
    return OcrApiResponse(
        filename=filename,
        page_count=result.page_count,
        text=result.text,
    )