from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from src.services import is_supported_ocr_filename, run_ocr_with_vllm
from src.utilities import log_api_request

router = APIRouter(tags=["ocr"])


class OcrApiResponse(BaseModel):
    filename: str
    page_count: int
    model: str
    text: str


@router.post("/ocr", response_model=OcrApiResponse)
@log_api_request("/ocr", "POST")
async def ocr_file(
    file: UploadFile = File(...),
    prompt: str | None = Form(default=None),
) -> OcrApiResponse:
    filename = file.filename or ""
    if not filename or not is_supported_ocr_filename(filename):
        raise HTTPException(
            status_code=400,
            detail="Chi ho tro file PDF hoac anh (png/jpg/jpeg/webp/bmp/tif/tiff/gif)",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="File rong")

    try:
        result = await run_ocr_with_vllm(
            file_bytes=file_bytes,
            filename=filename,
            prompt=prompt,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR that bai: {str(exc)}") from exc

    return OcrApiResponse(
        filename=filename,
        page_count=result.page_count,
        model=result.model,
        text=result.text,
    )