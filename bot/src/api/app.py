import json
import os
import re
import sys
from typing import Any
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from pydantic import BaseModel, Field

# Support running this file directly: `uv run app.py` from `src/api`.
if "src" not in sys.modules and str(Path(__file__).resolve().parents[2]) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.clients.llm_mcp_client import run_llm_with_mcp


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


MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://127.0.0.1:9000/mcp")

app = FastAPI(title="FastAPI -> FastMCP Bridge", version="1.0.0")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@asynccontextmanager
async def open_mcp_session() -> Any:
    async with streamable_http_client(MCP_SERVER_URL) as (read_stream, write_stream, _):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            yield session


async def _call_mcp_tool(tool_name: str, arguments: dict[str, Any]) -> Any:
    async with open_mcp_session() as session:
        result = await session.call_tool(tool_name, arguments)

    structured = getattr(result, "structuredContent", None)
    if structured is not None:
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
                    return json.loads(texts[0])
                except json.JSONDecodeError:
                    return texts[0]
            return texts

    return str(result)


def _extract_candidate_name(message: str) -> str | None:
    normalized = " ".join(message.strip().split())
    patterns = [
        r"nguoi\s+dung\s+(.+?)\s+co\s+trong",
        r"ng(?:uoi|ười)\s+dung\s+(.+?)\s+co\s+trong",
        r"kiem\s+tra\s+(.+?)\s+co\s+trong",
    ]
    for pattern in patterns:
        match = re.search(pattern, normalized, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip(" .,!?")
    return None


async def _fallback_chat_answer(message: str) -> str | None:
    candidate_name = _extract_candidate_name(message)
    if not candidate_name:
        return None

    rows = await _call_mcp_tool(
        "run_raw_sql",
        {
            "query": 'SELECT id, name, email FROM "User" WHERE LOWER(name) LIKE LOWER($1) ORDER BY "createdAt" DESC LIMIT 10',
            "args": [f"%{candidate_name}%"],
        },
    )

    if not isinstance(rows, list):
        return None

    if not rows:
        return f"Khong tim thay nguoi dung ten gan dung '{candidate_name}' trong DB."

    head = rows[0]
    name = head.get("name", "Unknown")
    email = head.get("email", "Unknown")
    user_id = head.get("id", "Unknown")

    return (
        f"Co tim thay nguoi dung trong DB. Ket qua dau tien: id={user_id}, "
        f"name={name}, email={email}. Tong so ket qua phu hop: {len(rows)}."
    )


@app.post("/mcp/call", response_model=McpCallResponse)
async def call_mcp_tool(payload: McpCallRequest) -> McpCallResponse:
    try:
        tool_result = await _call_mcp_tool(payload.tool, payload.arguments)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return McpCallResponse(tool=payload.tool, result=tool_result)


@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    model_name = os.getenv("OPENAI_MODEL", "gpt-5-mini")
    max_rounds = 6

    try:
        answer = await run_llm_with_mcp(
            prompt=payload.message,
            model=model_name,
            max_rounds=max_rounds,
        )
    except Exception as exc:
        fallback = await _fallback_chat_answer(payload.message)
        if fallback is not None:
            return ChatResponse(message=payload.message, answer=fallback)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return ChatResponse(message=payload.message, answer=answer)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
