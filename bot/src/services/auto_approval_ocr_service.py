import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from src.services.docx_to_pdf_service import convert_docx_file_to_pdf
from src.services.ocr import is_supported_ocr_filename, run_ocr_with_vllm
from src.services.qdrant_index_service import index_ocr_document
from src.utilities import get_logger

logger = get_logger(__name__)


def _get_project_root() -> Path:
    env_root = os.getenv("APP_ROOT")
    if env_root:
        return Path(env_root)
    return Path(__file__).resolve().parents[3]


def _resolve_upload_path(file_url: str) -> Path | None:
    if not file_url:
        return None

    parsed = urlparse(file_url)
    path = parsed.path if parsed.scheme else file_url

    if not path.startswith("/uploads/"):
        return None

    project_root = _get_project_root()
    return project_root / "public" / path.lstrip("/")


def _parse_proposal_files(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return []
        if isinstance(parsed, list):
            return [item for item in parsed if isinstance(item, dict)]
    return []


def _match_filenames() -> list[str]:
    raw = os.getenv("OCR_MATCH_FILENAMES", "mau_dang_ky_test.doc")
    names = [name.strip().lower() for name in raw.split(",") if name.strip()]
    return names


def _should_ocr_file(filename: str, match_names: list[str]) -> bool:
    return filename.lower() in match_names


def _normalize_collection_name(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    slug = re.sub(r"-+", "-", slug)
    if not slug:
        return "project-ocr"
    return slug[:62]


def _prepare_ocr_bytes(file_path: Path) -> tuple[bytes, str] | None:
    suffix = file_path.suffix.lower()

    if suffix == ".doc":
        logger.warning(f"DOC khong duoc ho tro de OCR: {file_path.name}")
        return None

    if suffix == ".docx":
        try:
            pdf_path = convert_docx_file_to_pdf(file_path)
        except Exception as exc:
            logger.error(f"DOCX to PDF conversion failed: {exc}")
            return None
        return pdf_path.read_bytes(), pdf_path.name

    if not is_supported_ocr_filename(file_path.name):
        logger.warning(f"Unsupported OCR file type: {file_path.name}")
        return None

    return file_path.read_bytes(), file_path.name


async def maybe_index_project_documents(project: dict[str, Any]) -> None:
    proposal_files = _parse_proposal_files(project.get("proposalFiles"))
    if not proposal_files:
        return

    match_names = _match_filenames()
    call_round_name = str(project.get("callRoundName") or "").strip()
    call_round_id = str(project.get("callRoundId") or "").strip()
    collection_base = call_round_name or call_round_id or "project-ocr"
    collection_name = _normalize_collection_name(collection_base)

    for file_info in proposal_files:
        filename = str(file_info.get("name", ""))
        if not filename or not _should_ocr_file(filename, match_names):
            continue

        file_url = str(file_info.get("url", ""))
        file_path = _resolve_upload_path(file_url)
        if file_path is None or not file_path.exists():
            logger.warning(f"File not found for OCR: {file_url}")
            continue

        prepared = _prepare_ocr_bytes(file_path)
        if not prepared:
            continue

        file_bytes, display_name = prepared
        ocr_result = await run_ocr_with_vllm(file_bytes, display_name)

        payload = {
            "projectId": project.get("id"),
            "projectTitle": project.get("title"),
            "callRoundId": project.get("callRoundId"),
            "callRoundName": project.get("callRoundName"),
            "leaderName": project.get("leaderName"),
            "leaderCode": project.get("leaderCode"),
            "leaderEmail": project.get("leaderEmail"),
            "fileName": filename,
            "fileUrl": file_url,
            "pageCount": ocr_result.page_count,
            "model": ocr_result.model,
            "fullText": ocr_result.text,
        }

        await index_ocr_document(ocr_result.text, payload, collection=collection_name)
        logger.info(
            "Qdrant indexed: collection=%s projectId=%s file=%s pages=%s",
            collection_name,
            project.get("id"),
            filename,
            ocr_result.page_count,
        )
