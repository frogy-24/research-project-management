import json
import os
import re
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel as PydanticBaseModel
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from pydantic import BaseModel, Field

# Support running this file directly: `uv run app.py` from `src/api`.
if "src" not in sys.modules and str(Path(__file__).resolve().parents[2]) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.clients.llm_mcp_client import run_llm_with_mcp
from src.api.routes import (
    dean_auto_approval_router,
    docx_to_pdf_router,
    ocr_router,
    project_registrations_router,
    sql_assistant_router,
    file_processor_router,
)
from src.api.routes.councils import router as councils_router
from src.clients.rabbitmq_client import publish_message
from src.db import db  # Import the database instance
from src.utilities import get_logger, log_api_request, log_async_execution, log_execution

logger = get_logger(__name__)


class McpCallRequest(BaseModel):
    tool: str = Field(..., description="Tool name in FastMCP server")
    arguments: dict[str, Any] = Field(default_factory=dict)


class McpCallResponse(BaseModel):
    tool: str
    result: Any


class ChatRequest(BaseModel):
    message: str = Field(..., description="Natural language message for the assistant")


class ChatResponse(BaseModel):
    message: str
    answer: str


class QueuePublishRequest(PydanticBaseModel):
    queue: str = Field(..., description="RabbitMQ queue name")
    payload: dict[str, Any] = Field(default_factory=dict, description="Message payload")


def _build_admin_statistics_report_prompt() -> str:
    return "\n".join(
        [
            "Ban la chuyen gia bao cao thong ke URMS.",
            "Bat buoc goi MCP tool get_admin_statistics_snapshot de lay du lieu truoc khi viet bao cao.",
            "Sau do viet mot bao cao markdown bang tieng Viet, co cau truc sau:",
            "1) Tong quan he thong",
            "2) Phan tich xu huong chinh",
            "3) Rui ro va van de can uu tien",
            "4) De xuat hanh dong cu the (3-7 muc)",
            "5) Tom tat dieu hanh 5 dong.",
            "Yeu cau: dua tren so lieu, neu thieu du lieu thi neu ro; khong bia dat.",
        ]
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> Any:
    """Lifespan handler for startup/shutdown events."""
    # Startup: connect to database
    logger.info("🚀 FastAPI Starting up - connecting to database...")
    try:
        await db.connect()
        logger.info("✅ Database connection established")
    except Exception as exc:
        logger.error(f"❌ Failed to connect to database: {exc}")
    
    yield  # Application runs here
    
    # Shutdown: disconnect from database
    logger.info("🛑 FastAPI Shutting down - disconnecting from database...")
    try:
        await db.close()
        logger.info("✅ Database connection closed")
    except Exception as exc:
        logger.error(f"❌ Error closing database: {exc}")


MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://127.0.0.1:9000/mcp")

app = FastAPI(title="FastAPI -> FastMCP Bridge", version="1.0.0", lifespan=lifespan)
app.include_router(dean_auto_approval_router)
app.include_router(docx_to_pdf_router)
app.include_router(ocr_router)
app.include_router(councils_router)
app.include_router(project_registrations_router)
app.include_router(sql_assistant_router)
app.include_router(file_processor_router)

logger.info("🚀 FastAPI Application khởi tạo thành công")
logger.info(f"MCP Server URL: {MCP_SERVER_URL}")


@app.get("/health")
@log_api_request("/health", "GET")
async def health() -> dict[str, str]:
    logger.info("🏥 Health check endpoint được gọi")
    return {"status": "ok"}


@app.post("/queues/publish")
@log_api_request("/queues/publish", "POST")
async def publish_to_queue(payload: QueuePublishRequest) -> dict[str, Any]:
    logger.info(f"📤 Queue Publish API - Queue: {payload.queue}")
    try:
        message_id = await publish_message(
            payload=payload.payload,
            queue_name=payload.queue,
        )
        logger.info(f"✅ Message published to queue {payload.queue} - ID: {message_id}")
        return {"success": True, "messageId": message_id, "queue": payload.queue}
    except Exception as exc:
        logger.error(f"❌ Failed to publish to queue {payload.queue}: {str(exc)}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@asynccontextmanager
async def open_mcp_session() -> Any:
    async with streamable_http_client(MCP_SERVER_URL) as (read_stream, write_stream, _):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            yield session


@log_async_execution
async def _call_mcp_tool(tool_name: str, arguments: dict[str, Any]) -> Any:
    logger.info(f"🔧 Gọi MCP tool: {tool_name}")
    logger.debug(f"Tool arguments: {arguments}")
    
    async with open_mcp_session() as session:
        result = await session.call_tool(tool_name, arguments)

    structured = getattr(result, "structuredContent", None)
    if structured is not None:
        logger.debug("Trả về structured content")
        return structured

    content_items = getattr(result, "content", None)
    if content_items:
        texts: list[str] = []
        for item in content_items:
            text = getattr(item, "text", None)
            if text:
                texts.append(text)
        if texts:
            if len(texts) == 1:
                try:
                    parsed = json.loads(texts[0])
                    logger.debug("Trả về parsed JSON từ text")
                    return parsed
                except json.JSONDecodeError:
                    logger.debug("Trả về raw text")
                    return texts[0]
            logger.debug(f"Trả về {len(texts)} text items")
            return texts

    logger.debug("Trả về string representation")
    return str(result)


@log_execution
def _extract_candidate_name(message: str) -> str | None:
    logger.debug(f"Trích xuất tên từ message: {message[:50]}...")
    normalized = " ".join(message.strip().split())
    patterns = [
        r"nguoi\s+dung\s+(.+?)\s+co\s+trong",
        r"ng(?:uoi|ười)\s+dung\s+(.+?)\s+co\s+trong",
        r"kiem\s+tra\s+(.+?)\s+co\s+trong",
    ]
    for pattern in patterns:
        match = re.search(pattern, normalized, flags=re.IGNORECASE)
        if match:
            name = match.group(1).strip(" .,!?")
            logger.info(f"✅ Tìm thấy tên: {name}")
            return name
    logger.debug("Không tìm thấy tên trong message")
    return None


@log_async_execution
async def _fallback_chat_answer(message: str) -> str | None:
    logger.info("🔄 Thử fallback chat answer")
    candidate_name = _extract_candidate_name(message)
    if not candidate_name:
        logger.debug("Không có candidate name, bỏ qua fallback")
        return None

    logger.info(f"🔍 Tìm kiếm user với tên: {candidate_name}")
    rows = await _call_mcp_tool(
        "run_raw_sql",
        {
            "query": 'SELECT id, name, email FROM "User" WHERE LOWER(name) LIKE LOWER($1) ORDER BY "createdAt" DESC LIMIT 10',
            "args": [f"%{candidate_name}%"],
        },
    )

    if not isinstance(rows, list):
        logger.warning("Query result không phải list")
        return None

    if not rows:
        logger.info(f"Không tìm thấy user với tên: {candidate_name}")
        return f"Khong tim thay nguoi dung ten gan dung '{candidate_name}' trong DB."

    head = rows[0]
    name = head.get("name", "Unknown")
    email = head.get("email", "Unknown")
    user_id = head.get("id", "Unknown")

    logger.info(f"✅ Tìm thấy {len(rows)} users, trả về thông tin user đầu tiên")
    return (
        f"Co tim thay nguoi dung trong DB. Ket qua dau tien: id={user_id}, "
        f"name={name}, email={email}. Tong so ket qua phu hop: {len(rows)}."
    )


@app.post("/mcp/call", response_model=McpCallResponse)
@log_api_request("/mcp/call", "POST")
async def call_mcp_tool(payload: McpCallRequest) -> McpCallResponse:
    logger.info(f"📨 MCP Call API - Tool: {payload.tool}")
    try:
        tool_result = await _call_mcp_tool(payload.tool, payload.arguments)
        logger.info(f"✅ MCP Call thành công - Tool: {payload.tool}")
    except Exception as exc:
        logger.error(f"❌ MCP Call failed - Tool: {payload.tool} - Error: {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return McpCallResponse(tool=payload.tool, result=tool_result)


@app.post("/chat", response_model=ChatResponse)
@log_api_request("/chat", "POST")
async def chat(payload: ChatRequest) -> ChatResponse:
    logger.info(f"💬 Chat API - Message: {payload.message[:100]}...")
    
    if not payload.message.strip():
        logger.warning("❌ Empty message received")
        raise HTTPException(status_code=400, detail="message must not be empty")

    model_name = os.getenv("LLM_MODEL", "gpt-5-mini")
    max_rounds = 6

    try:
        answer = await run_llm_with_mcp(
            prompt=payload.message,
            model=model_name,
            max_rounds=max_rounds,
        )
        logger.info(f"✅ Chat API thành công - Answer: {answer[:100]}...")
    except Exception as exc:
        logger.warning(f"⚠️ LLM failed, trying fallback - Error: {str(exc)}")
        fallback = await _fallback_chat_answer(payload.message)
        if fallback is not None:
            logger.info("✅ Fallback answer thành công")
            return ChatResponse(message=payload.message, answer=fallback)
        logger.error(f"❌ Chat API failed completely - Error: {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return ChatResponse(message=payload.message, answer=answer)


@app.get("/reports/admin-statistics")
@log_api_request("/reports/admin-statistics", "GET")
async def admin_statistics_report() -> Response:
    logger.info("📄 Report API - Generate admin statistics report file")

    model_name = os.getenv("LLM_MODEL", "gpt-5-mini")
    max_rounds = 6
    prompt = _build_admin_statistics_report_prompt()

    try:
        answer = await run_llm_with_mcp(
            prompt=prompt,
            model=model_name,
            max_rounds=max_rounds,
        )
    except Exception as exc:
        logger.error(f"❌ Report generation failed - Error: {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    generated_at = datetime.now(timezone.utc).isoformat()
    report_content = "\n".join(
        [
            "# Bao Cao Thong Ke URMS (AI + MCP)",
            "",
            f"Ngay tao: {generated_at}",
            "",
            answer,
            "",
        ]
    )

    file_stamp = datetime.now().strftime("%Y%m%d-%H%M")
    filename = f"BaoCaoThongKe_AI_URMS_{file_stamp}.md"

    return Response(
        content=report_content,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


if __name__ == "__main__":
    import uvicorn

    logger.info("🚀 Starting FastAPI server on http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)
