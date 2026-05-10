"""
Dean Auto Approval API - Publish evaluation jobs to RabbitMQ
"""

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.clients.rabbitmq_client import publish_message, publish_rpc
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)
router = APIRouter(prefix="/api/dean", tags=["auto-approval"])


class CallRoundFilters(BaseModel):
    callRoundId: str = Field(..., description="ID cua dot dang ky")
    fromDate: str | None = Field(None, description="ISO datetime tu ngay")
    toDate: str | None = Field(None, description="ISO datetime den ngay")


class EvaluationCriteria(BaseModel):
    minScore: int = Field(70, description="Diem toi thieu de APPROVE")
    requireInstructor: bool = Field(True, description="Bat buoc co giang vien huong dan")
    checkPlagiarism: bool = Field(False, description="Co kiem tra dao van hay khong")


class EvaluateWithAiRequest(BaseModel):
    filters: CallRoundFilters
    criteria: EvaluationCriteria
    replyTo: str | None = Field(None, description="Reply queue for RPC")
    correlationId: str | None = Field(None, description="Correlation id for RPC")
    wait: bool = Field(default=False, description="Wait for result via RPC")
    timeoutSeconds: int = Field(default=300, description="RPC timeout in seconds")
    jobId: str | None = Field(None, description="AutoApprovalJob id")


@router.post("/evaluate-with-ai")
@log_async_execution
async def evaluate_with_ai(request: EvaluateWithAiRequest) -> dict[str, Any]:
    """
    Publish evaluation job to RabbitMQ.
    """
    try:
        payload = {
            "filters": request.filters.model_dump(),
            "criteria": request.criteria.model_dump(),
            "jobId": request.jobId,
        }

        if request.wait:
            rpc_result = await publish_rpc(
                payload=payload,
                timeout_seconds=request.timeoutSeconds,
            )
            if rpc_result.get("timeout"):
                return {
                    "success": True,
                    "status": "PROCESSING",
                    "messageId": rpc_result.get("messageId"),
                }
            return {
                "success": True,
                "status": "COMPLETED",
                "messageId": rpc_result.get("messageId"),
                "result": rpc_result.get("result"),
            }

        message_id = await publish_message(
            payload=payload,
            correlation_id=request.correlationId,
            reply_to=request.replyTo,
        )

        return {
            "success": True,
            "status": "QUEUED",
            "messageId": message_id,
        }

    except Exception as exc:
        logger.error(f"Loi khi publish evaluate-with-ai: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
