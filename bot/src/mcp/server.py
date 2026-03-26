from typing import Any
import os
import sys
from pathlib import Path

from fastmcp import FastMCP

# Support running this file directly: `uv run server.py` from `src/mcp`.
if "src" not in sys.modules and str(Path(__file__).resolve().parents[2]) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.db import db
from src.repositories import get_all_users, get_user_by_id

mcp = FastMCP(name="user-db-mcp-server")


async def _ensure_db_connected() -> None:
    await db.connect()


@mcp.tool(name="healthcheck", description="Kiem tra ket noi database va schema hien tai")
async def healthcheck() -> dict[str, Any]:
    await _ensure_db_connected()
    row = await db.fetchrow("SELECT NOW() AS now, current_schema() AS schema")
    if row is None:
        return {"status": "error", "detail": "Cannot read database status"}

    return {
        "status": "ok",
        "now": row["now"].isoformat(),
        "schema": row["schema"],
    }


@mcp.tool(name="get_all_users", description="Lay toan bo user tu bang User")
async def mcp_get_all_users() -> list[dict[str, Any]]:
    await _ensure_db_connected()
    return await get_all_users()


@mcp.tool(name="get_user_by_id", description="Lay user theo id")
async def mcp_get_user_by_id(user_id: int) -> dict[str, Any] | None:
    await _ensure_db_connected()
    return await get_user_by_id(user_id)


@mcp.tool(name="run_raw_sql", description="Chay raw SQL SELECT va tra ve danh sach ban ghi")
async def run_raw_sql(query: str, args: list[Any] | None = None) -> list[dict[str, Any]]:
    await _ensure_db_connected()
    normalized_query = query.strip().lower()
    if not normalized_query.startswith("select"):
        raise ValueError("run_raw_sql chi cho phep cau lenh SELECT")

    params = tuple(args or [])
    rows = await db.fetch(query, *params)
    return [dict(row) for row in rows]


if __name__ == "__main__":
    transport = os.getenv("MCP_TRANSPORT", "http").strip().lower()
    if transport == "stdio":
        # Stream-safe mode when launched by MCP clients.
        mcp.run(transport="stdio", show_banner=False, log_level="error")
    else:
        # Friendly mode for manual local run: `uv run server.py`.
        mcp.run(transport="http", host="127.0.0.1", port=9000, path="/mcp")