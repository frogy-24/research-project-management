"""
Council API Routes - Xử lý tạo hội đồng nhanh bằng LLM
"""

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.services import (
    generate_councils_from_prompt
)
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)
router = APIRouter(prefix="/api/dean/councils", tags=["councils"])


class QuickAddRequest(BaseModel):
    call_round_id: str = Field(..., description="ID của đợt đăng ký")
    requiredFromUser: str = Field(default="Tạo các hội đồng phù hợp với số đề tài")
    creator_id: str = Field(default="system")


class ConfirmRequest(BaseModel):
    session_id: str = Field(..., description="Session ID từ quick-add")
    selected_council_ids: list[str] = Field(default_factory=list)


class CancelRequest(BaseModel):
    session_id: str = Field(..., description="Session ID từ quick-add")


@router.post("/quick-add")
@log_async_execution
async def quick_add_councils(request: QuickAddRequest) -> dict[str, Any]:
    """
    Tạo hội đồng nhanh từ prompt sử dụng LLM
    
    Returns:
        Dict chứa session_id và danh sách councils đã tạo
    """
    logger.info(f"Quick add councils cho call_round: {request.call_round_id}")
    
    result = await generate_councils_from_prompt(
        call_round_id=request.call_round_id,
        prompt=request.requiredFromUser,
        creator_id=request.creator_id,
    )
    
    if "error" in result:
        logger.error(f"Lỗi quick add: {result['error']}")
        raise HTTPException(status_code=400, detail=result["error"])
    
    logger.info(f"Đã tạo {result.get('total_councils', 0)} councils với session: {result.get('session_id')}")
    
    return {
        "success": True,
        "session_id": result.get("session_id"),
        "reasoning": result.get("reasoning", ""),
        "councils": result.get("councils", []),
        "total_councils": result.get("total_councils", 0),
        "message": f"Đã tạo {result.get('total_councils', 0)} hội đồng. Vui lòng xem trước và xác nhận."
    }
