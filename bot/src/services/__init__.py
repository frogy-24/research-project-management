"""Business service layer."""

from src.services.auto_approval_ocr_service import maybe_index_project_documents
from src.services.auto_approval_service import evaluate_project_with_llm, process_job
from src.services.council_service import (
    generate_councils_from_prompt
)
from src.services.docx_to_pdf_service import (
    build_pdf_filename,
    cleanup_files,
    convert_docx_file_to_pdf,
    is_docx_filename,
    save_upload_file,
)
from src.services.ocr import (
    OcrResult,
    SUPPORTED_IMAGE_EXTENSIONS,
    is_supported_ocr_filename,
    ocr_file,
    ocr_image,
    run_ocr_with_vllm,
)
from src.services.qdrant_index_service import index_ocr_document

__all__ = [
    "is_docx_filename",
    "build_pdf_filename",
    "save_upload_file",
    "convert_docx_file_to_pdf",
    "cleanup_files",
    "maybe_index_project_documents",
    "evaluate_project_with_llm",
    "process_job",
    "OcrResult",
    "SUPPORTED_IMAGE_EXTENSIONS",
    "is_supported_ocr_filename",
    "ocr_file",
    "ocr_image",
    "run_ocr_with_vllm",
    "index_ocr_document",
    "generate_councils_from_prompt",
    "confirm_councils",
    "cancel_councils",
    "get_preview",
]
