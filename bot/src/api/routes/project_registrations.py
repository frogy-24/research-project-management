"""
ProjectRegistration API Routes - Xử lý lấy thông tin đăng ký đề tài
"""

import json
import os
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.db import db
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)
router = APIRouter(prefix="/api/project-registrations", tags=["project-registrations"])


class GetByIdsRequest(BaseModel):
    """Request model cho việc lấy danh sách đăng ký theo IDs"""
    ids: list[str] = Field(..., description="Danh sách ID của các bản ghi đăng ký")


@router.post("/batch")
@log_async_execution
async def get_project_registrations_by_ids(request: GetByIdsRequest) -> dict[str, Any]:
    """
    Lấy thông tin các bản ghi đăng ký đề tài dựa trên danh sách ID
    
    Args:
        request: Object chứa danh sách IDs cần lấy
        
    Returns:
        Dict chứa danh sách bản ghi đăng ký
    """
    logger.info(f"Lấy thông tin đăng ký đề tài - Số lượng IDs: {len(request.ids)}")
    
    if not request.ids:
        logger.warning("Danh sách IDs rỗng")
        return {
            "success": True,
            "data": [],
            "total": 0,
            "message": "Danh sách IDs rỗng"
        }
    
    try:
        # Chuyển đổi list IDs thành placeholder $1, $2, ...
        placeholders = ", ".join([f"${i+1}" for i in range(len(request.ids))])
        
        query = f'''
            SELECT 
                pr.id,
                pr."userId",
                pr."callRoundId",
                pr.title,
                pr.objective,
                pr."expectedOutput",
                pr."proposalFiles",
                pr."teamMembers",
                pr.status,
                pr."cancelReason",
                pr."createdAt",
                pr."updatedAt",
                pr."instructorId",
                pr."instructorStatus",
                pr."facultyStatus",
                pr."facultyReviewerId",
                u.name as "userName",
                u.email as "userEmail",
                cr.name as "callRoundName"
            FROM "ProjectRegistration" pr
            LEFT JOIN "User" u ON pr."userId" = u.id
            LEFT JOIN "CallRound" cr ON pr."callRoundId" = cr.id
            WHERE pr.id IN ({placeholders})
            ORDER BY pr."createdAt" DESC
        '''
        
        rows = await db.fetch(query, *request.ids)
        
        # Chuyển đổi kết quả thành list dict
        registrations = []
        for row in rows:
            reg = dict(row)
            # Chuyển đổi datetime objects thành ISO string
            if reg.get("createdAt"):
                reg["createdAt"] = reg["createdAt"].isoformat()
            if reg.get("updatedAt"):
                reg["updatedAt"] = reg["updatedAt"].isoformat()
            
            # Trích xuất fullText từ OCR file đính kèm
            full_text = await _extract_ocr_text(reg.get("proposalFiles"))
            reg["fullText"] = full_text
            
            registrations.append(reg)
        
        # Index documents to Qdrant - collection name based on CallRound.name
        from src.clients.embedding_client import embed_text
        from src.clients.qdrant_client import check_collection_exists, create_collection, upsert_point
        
        # sentence-transformers/all-MiniLM-L6-v2 produces 384-dim vectors
        VECTOR_SIZE = int(os.getenv("EMBEDDING_VECTOR_SIZE", "384"))
        
        # Lấy CallRound names để tạo collection names
        call_round_ids = list(set(r.get("callRoundId") for r in registrations if r.get("callRoundId")))
        call_round_names = {}
        
        if call_round_ids:
            placeholders = ", ".join([f"${i+1}" for i in range(len(call_round_ids))])
            cr_query = f'SELECT id, name FROM "CallRound" WHERE id IN ({placeholders})'
            cr_rows = await db.fetch(cr_query, *call_round_ids)
            call_round_names = {row["id"]: row["name"] for row in cr_rows}
            logger.info(f"Tìm thấy {len(call_round_names)} CallRound: {call_round_names}")
        
        def _sanitize_collection_name(name: str) -> str:
            """Sanitize CallRound name thành valid Qdrant collection name"""
            sanitized = name.strip().replace(" ", "_").replace("-", "_")
            sanitized = ''.join(c for c in sanitized if c.isalnum() or c == "_")
            return sanitized[:50] if sanitized else "default"
        
        for reg in registrations:
            try:
                reg_id = reg.get("id")
                if not reg_id:
                    continue
                
                # Build collection name từ CallRound.name
                call_round_id = reg.get("callRoundId")
                call_round_name = call_round_names.get(call_round_id) if call_round_id else None
                collection_name = _sanitize_collection_name(call_round_name) if call_round_name else "default"
                
                # Ensure collection exists
                if not check_collection_exists(collection_name):
                    create_collection(collection_name, VECTOR_SIZE)
                    logger.info(f"Tạo collection mới: {collection_name}")
                
                # Build fullText từ title + objective + ocr text
                full_text = reg.get("fullText") or ""
                title = reg.get("title") or ""
                objective = reg.get("objective") or ""
                
                combined_text = f"{title}\n{objective}\n{full_text}".strip()
                
                if combined_text:
                    vector = await embed_text(combined_text)
                    if vector:
                        payload = {
                            "id": reg_id,
                            "projectId": reg_id,
                            "title": title,
                            "objective": objective,
                            "status": reg.get("status"),
                            "userId": reg.get("userId"),
                            "callRoundId": call_round_id,
                            "callRoundName": call_round_name,
                            "userName": reg.get("userName"),
                            "fullText": reg.get("fullText")  # Limit size
                        }
                        if upsert_point(collection_name, reg_id, vector, payload):
                            logger.info(f"Indexed project {reg_id} vào collection '{collection_name}'")
                        else:
                            logger.warning(f"Failed to index project {reg_id} into collection '{collection_name}'")
            except Exception as exc:
                logger.warning(f"Failed to index project {reg.get('id')}: {exc}")
        
        logger.info(f"Đã lấy {len(registrations)} bản ghi đăng ký đề tài")
        
        return {
            "success": True,
            "data": registrations,
            "total": len(registrations),
            "message": f"Tìm thấy {len(registrations)} bản ghi"
        }
        
    except Exception as exc:
        logger.error(f"Lỗi khi lấy thông tin đăng ký: {str(exc)}")
        raise HTTPException(status_code=500, detail=str(exc))


def _build_fulltext_from_fields(title: str | None, objective: str | None) -> str | None:
    """Tạo fullText từ title và objective của đăng ký đề tài"""
    parts = []
    if title:
        parts.append(f"TIÊU ĐỀ: {title}")
    if objective:
        parts.append(f"MỤC TIÊU NGHIÊN CỨU: {objective}")
    if parts:
        return "\n\n".join(parts)
    return None


async def _extract_ocr_text(proposal_files_json: str | None) -> str | None:
    """Trích xuất text từ OCR của các file đính kèm trong đăng ký đề tài"""
    if not proposal_files_json:
        return None
    
    try:
        files = json.loads(proposal_files_json)
        if not files or not isinstance(files, list):
            return None
        
        full_text_parts = []
        for file_info in files:
            if not isinstance(file_info, dict):
                continue
            
            file_url = file_info.get("url")
            file_name = file_info.get("name", "unknown")
            
            if not file_url:
                continue
            
            ocr_text = await _ocr_file_from_url(file_url, file_name)
            if ocr_text:
                full_text_parts.append(ocr_text)
        
        if full_text_parts:
            return "\n\n---\n\n".join(full_text_parts)
        return None
        
    except json.JSONDecodeError as exc:
        logger.warning(f"Không parse được proposalFiles JSON: {exc}")
        return None
    except Exception as exc:
        logger.error(f"Lỗi khi trích xuất OCR text: {exc}")
        return None


async def _ocr_file_from_url(file_url: str, file_name: str) -> str | None:
    """Tải file từ URL và chạy OCR"""
    import httpx
    from src.services.ocr.ocr_service import run_ocr_with_vllm
    
    try:
        app_url = os.getenv("APP_URL")
        base_url = app_url if app_url else "http://localhost:3000"
        full_url = f"{base_url}{file_url}" if file_url.startswith("/") else file_url
        
        logger.info(f"Tải file: {full_url}")
        logger.info(f"  - file_name: {file_name}")
        logger.info(f"  - APP_URL: {app_url}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(full_url)
            response.raise_for_status()
            file_bytes = response.content
            logger.info(f"  - Tải thành công: {len(file_bytes)} bytes")
        
        lower_name = file_name.lower()
        
        # Chỉ xử lý file PDF
        if not lower_name.endswith(".pdf"):
            logger.debug(f"Bỏ qua file không phải PDF: {file_name}")
            return None
        
        logger.info(f"Chạy OCR cho file PDF: {file_name}")
        ocr_result = await run_ocr_with_vllm(file_bytes, file_name)
        
        if ocr_result and ocr_result.text:
            logger.info(f"  - OCR thành công: {len(ocr_result.text)} ký tự")
            return ocr_result.text
        
        logger.warning(f"  - OCR không trả về text")
        return None
        
    except httpx.HTTPStatusError as exc:
        logger.error(f"Không tải được file {file_url}: status={exc.response.status_code}")
        return None
    except Exception as exc:
        logger.error(f"Lỗi xử lý file {file_name}: {type(exc).__name__}: {exc}")
        return None


async def _extract_text_from_doc(file_bytes: bytes, file_name: str) -> str | None:
    """Trích xuất text từ file DOC/DOCX"""
    import tempfile
    
    is_docx = file_name.lower().endswith('.docx')
    
    try:
        if is_docx:
            try:
                from docx import Document
                
                with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
                    tmp.write(file_bytes)
                    tmp_path = tmp.name
                
                try:
                    doc = Document(tmp_path)
                    paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
                    text = '\n'.join(paragraphs)
                    
                    for table in doc.tables:
                        for row in table.rows:
                            cells = [cell.text.strip() for cell in row.cells]
                            if any(cells):
                                text += '\n' + ' | '.join(cells)
                    
                    logger.info(f"Đọc DOCX thành công - {len(text)} ký tự")
                    return text if text.strip() else None
                finally:
                    os.unlink(tmp_path)
                    
            except ImportError:
                logger.warning("python-docx chưa được cài đặt")
                return None
        else:
            try:
                import docx2txt
                
                with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
                    tmp.write(file_bytes)
                    tmp_path = tmp.name
                
                try:
                    text = docx2txt.process(tmp_path)
                    logger.info(f"Đọc DOC bằng docx2txt thành công - {len(text)} ký tự")
                    return text if text.strip() else None
                finally:
                    os.unlink(tmp_path)
            except ImportError:
                logger.warning("docx2txt chưa được cài đặt")
                return None
            except Exception as exc:
                logger.warning(f"docx2txt lỗi: {exc}")
                return None
                
    except Exception as exc:
        logger.error(f"Lỗi trích xuất text từ DOC: {exc}")
        return None