"""
SQL Assistant API Route - Cho phép user hỏi dữ liệu bằng tiếng Việt
Sử dụng MCP tools: generate_sql -> run_raw_sql -> format response
"""

from typing import Any

from fastapi import APIRouter, HTTPException

import sys
from pathlib import Path

# Support running from src/api/routes
if "src" not in sys.modules and str(Path(__file__).resolve().parents[2]) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.mcp.server import _generate_sql_from_request_async, _generate_sql_from_request
from src.db import db
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)
router = APIRouter(prefix="/sql-assistant", tags=["SQL Assistant"])


@router.post("/query")
@log_async_execution
async def sql_assistant_query(request: dict[str, Any]) -> dict[str, Any]:
    """
    Xử lý câu hỏi tiếng Việt và trả về dữ liệu từ database
    Sử dụng LLM để sinh SQL query thông minh.
    
    Body:
        {
            "question": "liệt kê các đề tài theo trạng thái"
        }
    
    Returns:
        {
            "sql": "SELECT ...",
            "explanation": "...",
            "data": [...]
        }
    """
    # Lấy question từ request - hỗ trợ cả 2 format
    question = (
        request.get("question", "").strip() or
        request.get("query", "").strip() or
        request.get("text", "").strip()
    )
    
    if not question:
        raise HTTPException(
            status_code=400, 
            detail="Câu hỏi không được trống. Format đúng: { \"question\": \"câu hỏi tiếng Việt\" }"
        )
    
    logger.info(f"🔍 SQL Assistant nhận câu hỏi: {question}")
    
    try:
        # 1. Generate SQL từ câu hỏi tiếng Việt (dùng LLM)
        sql_result = await _generate_sql_from_request_async(question)
        sql = sql_result["sql"]
        explanation = sql_result["explanation"]
        logger.info(f"📝 LLM Generated SQL: {sql[:100]}...")
        
        # 2. Execute SQL
        await db.connect()
        rows = await db.fetch(sql)
        data = [dict(row) for row in rows]
        logger.info(f"✅ Query thực thi thành công - {len(data)} rows")
        
        # 3. Cập nhật explanation với số bản ghi
        explanation = f"{explanation} - tìm thấy {len(data)} bản ghi"
        
        return {
            "sql": sql,
            "explanation": explanation,
            "data": data,
            "count": len(data)
        }
    
    except Exception as e:
        logger.error(f"❌ SQL Assistant error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schema")
async def get_schema() -> dict[str, Any]:
    """Trả về database schema để user biết có thể hỏi gì"""
    from src.mcp.server import DATABASE_SCHEMA
    return {
        "schema": DATABASE_SCHEMA,
        "example_questions": [
            "Liệt kê các đề tài theo trạng thái",
            "Cho tôi xem bảng user",
            "Hiển thị danh sách khoa",
            "Xem các đợt đăng ký đề tài",
            "Liệt kê hội đồng chấm điểm",
            "Thông báo gần đây",
            "Báo cáo tiến độ của các đề tài",
        ]
    }