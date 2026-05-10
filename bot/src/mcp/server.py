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
from src.services.council_service import generate_councils_from_prompt
from src.services.sql_assistant_service import (
    DATABASE_SCHEMA,
    _generate_sql_with_llm,
    get_sql_assistant_service,
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




@mcp.resource(
    uri="schema://database",
    name="Database Schema",
    description="Mo ta chi tiet cac bang trong database cua he thong QLC TNCKH",
)
def get_database_schema() -> dict[str, Any]:
    """Resource cung cap thong tin schema database cho LLM"""
    return DATABASE_SCHEMA


@mcp.tool(
    name="generate_sql",
    description="""
    Sinh câu lệnh SQL SELECT từ yêu cầu bằng tiếng Việt của người dùng để truy vấn dữ liệu trong cơ sở dữ liệu.

    Chức năng:
    - Phân tích yêu cầu tự nhiên bằng tiếng Việt.
    - Tự động xác định bảng, cột, điều kiện lọc, sắp xếp và phân trang phù hợp.
    - Chỉ sinh câu lệnh SQL dạng SELECT, tuyệt đối không sinh INSERT, UPDATE, DELETE, DROP hoặc ALTER.
    - Hỗ trợ JOIN giữa nhiều bảng nếu cần.
    - Hỗ trợ các điều kiện:
        + Lọc theo thời gian
        + Tìm kiếm theo từ khóa
        + Sắp xếp ASC/DESC
        + GROUP BY, COUNT, SUM, AVG nếu yêu cầu thống kê
        + LIMIT/OFFSET hoặc TOP tùy hệ quản trị CSDL
    - Ưu tiên sinh SQL an toàn, rõ ràng và tối ưu.

    Đầu vào:
    - Câu hỏi hoặc yêu cầu bằng tiếng Việt từ người dùng.
    - Schema cơ sở dữ liệu (tên bảng, cột, quan hệ).

    Đầu ra:
    - Một câu SQL SELECT hợp lệ tương ứng với yêu cầu người dùng.
    - Không giải thích dài dòng.
    - Không thêm markdown ```sql``` nếu không cần.

    Ví dụ:
    - "Lấy danh sách sinh viên khoa CNTT"
    - "Đếm số đề tài đã được duyệt năm 2025"
    - "Top 10 giảng viên có nhiều công trình nghiên cứu nhất"

    Lưu ý:
    - Không được tạo truy vấn làm thay đổi dữ liệu.
    - Nếu yêu cầu không rõ ràng hoặc thiếu thông tin, hãy yêu cầu bổ sung.
    """
)
@log_async_execution
async def mcp_generate_sql(user_request: str, note: str = None) -> dict[str, Any]:
    """
    Sinh cau SQL tu yêu cầu tiếng Việt của người dùng sử dụng LLM.
    
    Ví dụ:
    - "liệt kê các đề tài theo trạng thái" -> SELECT ... WHERE status = ...
    - "cho tôi xem bảng user" -> SELECT * FROM "User"
    - "thống kê đề tài theo khoa" -> SELECT ... GROUP BY departmentId
    
    Sử dụng LLM để sinh SQL thông minh từ câu hỏi tiếng Việt.
    """
    logger.info(f"🔧 MCP Tool: generate_sql - Request: {user_request[:100]}...")
    await _ensure_db_connected()
    
    # Sử dụng LLM để sinh SQL
    result = await _generate_sql_with_llm(user_request, note)
    logger.info(f"✅ LLM Generated SQL: {result['sql'][:100]}...")
    
    return result

if __name__ == "__main__":
    transport = os.getenv("MCP_TRANSPORT", "http").strip().lower()
    if transport == "stdio":
        logger.info("🚀 Starting MCP Server in STDIO mode")
        mcp.run(transport="stdio", show_banner=False, log_level="error")
    else:
        logger.info("🚀 Starting MCP Server in HTTP mode on http://127.0.0.1:9000/mcp")
        mcp.run(transport="http", host="127.0.0.1", port=9000, path="/mcp")
