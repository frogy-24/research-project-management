from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from src.services import (
    build_pdf_filename,
    cleanup_files,
    convert_docx_file_to_pdf,
    is_docx_filename,
    save_upload_file,
)
from src.utilities import get_logger, log_api_request

logger = get_logger(__name__)

router = APIRouter(tags=["document-conversion"])

TEMP_DIR = Path(__file__).resolve().parents[3] / "temp_files"
TEMP_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/convert-docx-to-pdf/")
@log_api_request("/convert-docx-to-pdf/", "POST")
async def convert_docx_to_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> FileResponse:
    filename = file.filename or ""
    if not filename or not is_docx_filename(filename):
        raise HTTPException(status_code=400, detail="Chi ho tro dinh dang file .docx")

    input_path: Path | None = None
    output_path: Path | None = None

    try:
        input_path = save_upload_file(file, TEMP_DIR)
        output_path = convert_docx_file_to_pdf(input_path)

        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Khong tao duoc file PDF")

        background_tasks.add_task(cleanup_files, [input_path, output_path])

        return FileResponse(
            path=str(output_path),
            filename=build_pdf_filename(filename),
            media_type="application/pdf",
        )

    except HTTPException:
        if input_path is not None:
            cleanup_files([input_path])
        raise
    except Exception as exc:
        logger.error(f"DOCX to PDF conversion failed: {exc}", exc_info=True)
        cleanup_candidates = [p for p in (input_path, output_path) if p is not None]
        if cleanup_candidates:
            cleanup_files(cleanup_candidates)
        raise HTTPException(
            status_code=500,
            detail=(
                "Khong the chuyen doi file. Dam bao may chu da cai Microsoft Word "
                "(docx2pdf can Word tren Windows)."
            ),
        ) from exc
