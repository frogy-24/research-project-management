"""API route modules."""

from src.api.routes.dean_auto_approval import router as dean_auto_approval_router
from src.api.routes.docx_to_pdf import router as docx_to_pdf_router
from src.api.routes.ocr import router as ocr_router
from src.api.routes.project_registrations import router as project_registrations_router
from src.api.routes.sql_assistant import router as sql_assistant_router

__all__ = [
	"dean_auto_approval_router",
	"docx_to_pdf_router",
	"ocr_router",
	"project_registrations_router",
	"sql_assistant_router",
]
