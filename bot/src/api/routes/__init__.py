"""API route modules."""

from src.api.routes.docx_to_pdf import router as docx_to_pdf_router
from src.api.routes.ocr import router as ocr_router

__all__ = ["docx_to_pdf_router", "ocr_router"]
