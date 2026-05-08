from typing import Any
import os
import sys
from pathlib import Path

from fastmcp import FastMCP

# Support running this file directly: `uv run server.py` from `src/mcp`.
if "src" not in sys.modules and str(Path(__file__).resolve().parents[2]) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.db import db
from src.repositories import get_admin_statistics_snapshot, get_all_users, get_user_by_id
from src.services.council_service import (
	cancel_councils,
	confirm_councils,
	generate_councils_from_prompt,
	get_preview,
)
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)

mcp = FastMCP(name="user-db-mcp-server")

logger.info("🚀 FastMCP Server được khởi tạo: user-db-mcp-server")


@log_async_execution
async def _ensure_db_connected() -> None:
    await db.connect()


@mcp.tool(name="healthcheck", description="Kiem tra ket noi database va schema hien tai")
@log_async_execution
async def healthcheck() -> dict[str, Any]:
    logger.info("🏥 Healthcheck: Kiểm tra kết nối database")
    await _ensure_db_connected()
    row = await db.fetchrow("SELECT NOW() AS now, current_schema() AS schema")
    if row is None:
        logger.error("Healthcheck failed: Không thể đọc database status")
        return {"status": "error", "detail": "Cannot read database status"}

    result = {
        "status": "ok",
        "now": row["now"].isoformat(),
        "schema": row["schema"],
    }
    logger.info(f"✅ Healthcheck OK - Schema: {row['schema']}")
    return result


@mcp.tool(name="get_all_users", description="Lay toan bo user tu bang User")
@log_async_execution
async def mcp_get_all_users() -> list[dict[str, Any]]:
    logger.info("📋 MCP Tool: get_all_users được gọi")
    await _ensure_db_connected()
    return await get_all_users()


@mcp.tool(name="get_user_by_id", description="Lay user theo id")
@log_async_execution
async def mcp_get_user_by_id(user_id: str) -> dict[str, Any] | None:
    logger.info(f"🔍 MCP Tool: get_user_by_id được gọi với user_id={user_id}")
    await _ensure_db_connected()
    return await get_user_by_id(user_id)


@mcp.tool(name="run_raw_sql", description="Chay raw SQL SELECT va tra ve danh sach ban ghi")
@log_async_execution
async def run_raw_sql(query: str, args: list[Any] | None = None) -> list[dict[str, Any]]:
    logger.info(f"⚡ MCP Tool: run_raw_sql - Query: {query[:100]}...")
    await _ensure_db_connected()
    normalized_query = query.strip().lower()
    if not normalized_query.startswith("select"):
        logger.error(f"❌ Query không hợp lệ - chỉ cho phép SELECT: {query[:50]}")
        raise ValueError("run_raw_sql chi cho phep cau lenh SELECT")

    params = tuple(args or [])
    rows = await db.fetch(query, *params)
    logger.info(f"✅ Query thực thi thành công - Trả về {len(rows)} rows")
    return [dict(row) for row in rows]


@mcp.tool(
    name="get_admin_statistics_snapshot",
    description="Lay snapshot thong ke he thong URMS de tao bao cao thong ke bang LLM",
)
@log_async_execution
async def mcp_get_admin_statistics_snapshot() -> dict[str, Any]:
    logger.info("📊 MCP Tool: get_admin_statistics_snapshot được gọi")
    await _ensure_db_connected()
    return await get_admin_statistics_snapshot()


@mcp.tool(
    name="generate_councils",
    description="Tao hoi dong chuang dien bang LLM tu prompt mo ta yeu cau",
)
@log_async_execution
async def mcp_generate_councils(
    call_round_id: str,
    prompt: str,
    creator_id: str,
) -> dict[str, Any]:
    logger.info(f"🏛️ MCP Tool: generate_councils - call_round={call_round_id}, prompt={prompt[:50]}...")
    await _ensure_db_connected()
    return await generate_councils_from_prompt(
        call_round_id=call_round_id,
        prompt=prompt,
        creator_id=creator_id,
    )


@mcp.tool(
    name="confirm_councils",
    description="Xac nhan va apply cac hoi dong ao thanh that",
)
@log_async_execution
async def mcp_confirm_councils(session_id: str) -> dict[str, Any]:
    logger.info(f"✅ MCP Tool: confirm_councils - session={session_id}")
    await _ensure_db_connected()
    return await confirm_councils(session_id)


@mcp.tool(
    name="cancel_councils",
    description="Huy bo cac hoi dong ao",
)
@log_async_execution
async def mcp_cancel_councils(session_id: str) -> dict[str, Any]:
    logger.info(f"❌ MCP Tool: cancel_councils - session={session_id}")
    await _ensure_db_connected()
    return await cancel_councils(session_id)


@mcp.tool(
    name="get_council_preview",
    description="Lay danh sach hoi dong ao theo session de preview",
)
@log_async_execution
async def mcp_get_council_preview(session_id: str) -> list[dict[str, Any]]:
    logger.info(f"👁️ MCP Tool: get_council_preview - session={session_id}")
    await _ensure_db_connected()
    return await get_preview(session_id)





if __name__ == "__main__":
    transport = os.getenv("MCP_TRANSPORT", "http").strip().lower()
    if transport == "stdio":
        logger.info("🚀 Starting MCP Server in STDIO mode")
        mcp.run(transport="stdio", show_banner=False, log_level="error")
    else:
        logger.info("🚀 Starting MCP Server in HTTP mode on http://127.0.0.1:9000/mcp")
        mcp.run(transport="http", host="127.0.0.1", port=9000, path="/mcp")
