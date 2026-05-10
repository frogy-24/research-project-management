from typing import Any
import json
import os
import re
import sys
from pathlib import Path

from fastmcp import FastMCP

# Support running this file directly: `uv run server.py` from `src/mcp`.
if "src" not in sys.modules and str(Path(__file__).resolve().parents[2]) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.db import db
from src.repositories import get_admin_statistics_snapshot, get_all_users, get_user_by_id
from src.services.council_service import generate_councils_from_prompt
from src.services.llm_service import get_llm_service
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)

mcp = FastMCP(name="user-db-mcp-server")

logger.info("🚀 FastMCP Server được khởi tạo: user-db-mcp-server")

# Prompt template cho LLM sinh SQL
SQL_GENERATION_PROMPT = """Bạn là một SQL Expert cho hệ thống Quản lý Chất lượng TNCKH. Dựa vào câu hỏi của người dùng và database schema, hãy sinh câu lệnh SQL SELECT.

## Database Schema
{schema}

## QUY TẮC NGHIÊM NGẶT VỀ TÊN CỘT:
⚠️ QUAN TRỌNG: Tất cả tên cột trong schema đều dùng PascalCase (viết hoa chữ cái đầu mỗi từ).
Ví dụ: dateOfBirth, createdAt, updatedAt, projectStartDate, registrationEndDate

Khi viết SQL, PHẢI bọc tên cột trong dấu ngoặc kép:
- ✅ "dateOfBirth" 
- ❌ dateofbirth (SAI!)
- ✅ "createdAt"
- ❌ createdat (SAI!)

Tên bảng cũng phải bọc trong dấu ngoặc kép:
- ✅ "User", "Project", "Department"
- ❌ User, project (nếu không bọc có thể bị PostgreSQL chuyển thành chữ thường)

## Các quy tắc bắt buộc:
1. CHỈ sinh câu lệnh SELECT (không INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER)
2. Sử dụng tên bảng và cột chính xác từ schema
3. LUÔN bọc tên cột trong dấu ngoặc kép: "dateOfBirth", "createdAt", "status"
4. Áp dụng JOIN nếu cần lấy dữ liệu từ nhiều bảng liên quan
5. Thêm WHERE clause nếu người dùng yêu cầu filter
6. Giới hạn 30 bản ghi với LIMIT 30
7. Luôn sử dụng alias cho các bảng khi JOIN (vd: u cho User, p cho Project, d cho Department)

## Các Role trong hệ thống:
- STUDENT: Sinh viên
- LECTURER: Giảng viên  
- DEAN: Trưởng khoa
- ADMIN: Quản trị viên
- COUNCIL: Thành viên hội đồng
- LEADER: Trưởng đơn vị

## Các Status của Project:
- DRAFT, SUBMITTED, DEAN_APPROVED, APPROVED, IN_PROGRESS, COMPLETED, REJECTED

## Câu hỏi của người dùng:
{user_request}

## Yêu cầu:
1. Phân tích câu hỏi và sinh SQL phù hợp
2. Nếu người dùng hỏi về "user có vai trò sinh viên", phải thêm WHERE u.role = 'STUDENT'
3. Nếu người dùng hỏi về "đề tài theo trạng thái", phải SELECT p.status và có thể GROUP BY

## Output format:
Trả về kết quả theo format JSON:
{{"sql": "<câu SQL hoàn chỉnh với tên cột đúng PascalCase trong dấu ngoặc kép>", "explanation": "<giải thích ngắn gọn>"}}

Ví dụ SQL đúng:
SELECT u."id", u."code", u."name", u."email", u."role", u."createdAt" FROM "User" u LIMIT 30;
"""

# Database schema description for LLM context
DATABASE_SCHEMA = {
    "tables": {
        "User": {
            "description": "Người dùng trong hệ thống",
            "columns": {
                "id": {"type": "String (cuid)", "description": "ID unique"},
                "code": {"type": "String", "description": "Mã người dùng (unique)"},
                "name": {"type": "String", "description": "Họ tên"},
                "email": {"type": "String", "description": "Email (unique)", "nullable": False},
                "password": {"type": "String", "description": "Mật khẩu hash"},
                "role": {"type": "enum Role", "description": "STUDENT|LECTURER|DEAN|ADMIN|COUNCIL|LEADER"},
                "gender": {"type": "enum Gender", "description": "MALE|FEMALE|OTHER"},
                "dateOfBirth": {"type": "DateTime", "description": "Ngày sinh"},
                "phone": {"type": "String", "description": "Số điện thoại"},
                "address": {"type": "String", "description": "Địa chỉ"},
                "departmentId": {"type": "String (FK)", "description": "Tham chiếu Department.id"},
                "majorId": {"type": "String (FK)", "description": "Tham chiếu Major.id"},
                "classId": {"type": "String (FK)", "description": "Tham chiếu Class.id"},
                "createdAt": {"type": "DateTime", "description": "Thời điểm tạo"},
                "updatedAt": {"type": "DateTime", "description": "Thời điểm cập nhật"},
            }
        },
        "Department": {
            "description": "Khoa/Bộ môn",
            "columns": {
                "id": {"type": "String (cuid)"},
                "code": {"type": "String", "description": "Mã khoa (unique)"},
                "name": {"type": "String", "description": "Tên khoa"},
                "description": {"type": "String", "description": "Mô tả"},
                "createdAt": {"type": "DateTime"},
                "updatedAt": {"type": "DateTime"},
            }
        },
        "Major": {
            "description": "Ngành học",
            "columns": {
                "id": {"type": "String (cuid)"},
                "code": {"type": "String", "description": "Mã ngành (unique)"},
                "name": {"type": "String", "description": "Tên ngành"},
                "departmentId": {"type": "String (FK)", "description": "Tham chiếu Department.id"},
            }
        },
        "Class": {
            "description": "Lớp học",
            "columns": {
                "id": {"type": "String (cuid)"},
                "code": {"type": "String", "description": "Mã lớp (unique)"},
                "name": {"type": "String", "description": "Tên lớp"},
                "majorId": {"type": "String (FK)", "description": "Tham chiếu Major.id"},
            }
        },
        "CallRound": {
            "description": "Đợt đăng ký đề tài",
            "columns": {
                "id": {"type": "String (cuid)"},
                "name": {"type": "String", "description": "Tên đợt đăng ký"},
                "description": {"type": "String"},
                "registrationStartDate": {"type": "DateTime", "description": "Ngày bắt đầu đăng ký"},
                "registrationEndDate": {"type": "DateTime", "description": "Ngày kết thúc đăng ký"},
                "projectStartDate": {"type": "DateTime", "description": "Ngày bắt đầu thực hiện"},
                "projectEndDate": {"type": "DateTime", "description": "Ngày kết thúc dự kiến"},
                "defenseDate": {"type": "DateTime", "description": "Ngày bảo vệ"},
                "isActive": {"type": "Boolean", "description": "Còn hoạt động không"},
                "approvalStatus": {"type": "enum CallRoundApprovalStatus", "description": "PENDING_APPROVAL|APPROVED|REJECTED"},
                "applicableFor": {"type": "enum ApplicableFor", "description": "STUDENT|LECTURER|BOTH"},
            }
        },
        "Project": {
            "description": "Đề tài nghiên cứu",
            "columns": {
                "id": {"type": "String (cuid)"},
                "code": {"type": "String", "description": "Mã đề tài (unique)"},
                "title": {"type": "String", "description": "Tiêu đề đề tài"},
                "objective": {"type": "String", "description": "Mục tiêu"},
                "expectedOutput": {"type": "String", "description": "Kết quả dự kiến"},
                "budgetRequested": {"type": "Decimal(12,2)", "description": "Ngân sách yêu cầu"},
                "budgetApproved": {"type": "Decimal(12,2)", "description": "Ngân sách được duyệt"},
                "status": {"type": "enum ProjectStatus", "description": "DRAFT|SUBMITTED|DEAN_APPROVED|APPROVED|IN_PROGRESS|COMPLETED|REJECTED|..."},
                "leaderId": {"type": "String (FK)", "description": "Tham chiếu User.id - Chủ nhiệm"},
                "instructorId": {"type": "String (FK)", "description": "Tham chiếu User.id - Giảng viên hướng dẫn"},
                "deanReviewerId": {"type": "String (FK)", "description": "Tham chiếu User.id - Trưởng khoa duyệt"},
                "callRoundId": {"type": "String (FK)", "description": "Tham chiếu CallRound.id"},
            }
        },
        "ProjectRegistration": {
            "description": "Đăng ký đề tài",
            "columns": {
                "id": {"type": "String (cuid)"},
                "userId": {"type": "String (FK)", "description": "Tham chiếu User.id - Người đăng ký"},
                "callRoundId": {"type": "String (FK)", "description": "Tham chiếu CallRound.id"},
                "title": {"type": "String"},
                "objective": {"type": "String"},
                "expectedOutput": {"type": "String"},
                "status": {"type": "enum RegistrationStatus", "description": "PENDING|APPROVED|CANCELED|REJECTED"},
                "instructorId": {"type": "String (FK)", "description": "Tham chiếu User.id"},
                "instructorStatus": {"type": "enum InstructorStatus", "description": "PENDING|ACCEPTED|REJECTED"},
            }
        },
        "ProgressReport": {
            "description": "Báo cáo tiến độ",
            "columns": {
                "id": {"type": "String (cuid)"},
                "projectId": {"type": "String (FK)", "description": "Tham chiếu Project.id"},
                "week": {"type": "Int", "description": "Tuần thứ"},
                "periodLabel": {"type": "String", "description": "Nhãn kỳ báo cáo"},
                "summary": {"type": "String", "description": "Tóm tắt báo cáo"},
                "fileUrl": {"type": "String"},
                "mentorScore": {"type": "Float"},
                "submittedAt": {"type": "DateTime"},
            }
        },
        "CouncilEvaluation": {
            "description": "Đánh giá của hội đồng",
            "columns": {
                "id": {"type": "String (cuid)"},
                "projectId": {"type": "String (FK)"},
                "councilMemberId": {"type": "String (FK)", "description": "Tham chiếu User.id"},
                "score": {"type": "Float", "description": "Điểm 0-100"},
                "decision": {"type": "enum ReviewDecision", "description": "PASS|NEED_REVISION|FAIL"},
                "comment": {"type": "String"},
                "evaluatedAt": {"type": "DateTime"},
            }
        },
        "Council": {
            "description": "Hội đồng đánh giá",
            "columns": {
                "id": {"type": "String (cuid)"},
                "callRoundId": {"type": "String (FK)"},
                "name": {"type": "String", "description": "Tên hội đồng"},
                "description": {"type": "String"},
                "defenseDate": {"type": "DateTime"},
                "defenseLocation": {"type": "String"},
            }
        },
        "Notification": {
            "description": "Thông báo",
            "columns": {
                "id": {"type": "String (cuid)"},
                "userId": {"type": "String (FK)"},
                "type": {"type": "enum NotificationType"},
                "title": {"type": "String"},
                "message": {"type": "String"},
                "isRead": {"type": "Boolean"},
                "createdAt": {"type": "DateTime"},
            }
        },
        "Post": {
            "description": "Bài đăng",
            "columns": {
                "id": {"type": "String (cuid)"},
                "title": {"type": "String"},
                "content": {"type": "String"},
                "audience": {"type": "enum PostAudience", "description": "LECTURERS|STUDENTS|DEPARTMENT|ALL"},
                "status": {"type": "enum PostStatus", "description": "PENDING|APPROVED|REJECTED"},
                "authorId": {"type": "String (FK)"},
                "departmentId": {"type": "String (FK)"},
            }
        },
    }
}

def _build_schema_for_prompt() -> str:
    """Build schema string for LLM prompt"""
    schema_parts = []
    for table_name, table_info in DATABASE_SCHEMA["tables"].items():
        schema_parts.append(f"\n### {table_name}: {table_info['description']}")
        for col_name, col_info in table_info["columns"].items():
            col_type = col_info.get("type", "Unknown")
            col_desc = col_info.get("description", "")
            schema_parts.append(f"  - {col_name}: {col_type}" + (f" - {col_desc}" if col_desc else ""))
    return "\n".join(schema_parts)


async def _generate_sql_with_llm(user_request: str) -> dict[str, str]:
    """
    Generate SQL query from Vietnamese user request using LLM.
    
    Returns:
        {"sql": "...", "explanation": "..."}
    """
    logger.info(f"🤖 Using LLM to generate SQL for: {user_request[:80]}...")
    
    try:
        llm = get_llm_service()
        schema_str = _build_schema_for_prompt()
        
        prompt = SQL_GENERATION_PROMPT.format(
            schema=schema_str,
            user_request=user_request
        )
        
        response = await llm.chat_completion(
            messages=[
                {"role": "system", "content": "You are a SQL expert. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response)
        sql = result.get("sql", "").strip()
        explanation = result.get("explanation", "Truy vấn dữ liệu từ database")
        
        # Validate SQL - ensure it's SELECT only
        normalized = sql.lower().strip()
        if not normalized.startswith("select"):
            logger.error(f"❌ LLM generated non-SELECT query: {sql[:50]}")
            raise ValueError("LLM generated invalid query - only SELECT allowed")
        
        logger.info(f"✅ LLM generated SQL: {sql[:80]}...")
        return {"sql": sql, "explanation": explanation}
    
    except Exception as e:
        logger.error(f"❌ LLM SQL generation failed: {e}")
        # Fallback to simple query
        return {
            "sql": 'SELECT id, code, name, email, role, "createdAt" FROM "User" LIMIT 50;',
            "explanation": "Truy vấn dữ liệu từ bảng người dùng (fallback do lỗi LLM)"
        }


# Sync wrapper for backwards compatibility
def _generate_sql_from_request(user_request: str) -> str:
    """
    DEPRECATED: Use _generate_sql_with_llm() instead.
    This is kept for backwards compatibility with sync code.
    """
    # For sync code, return default query
    # In practice, this should be called via async wrapper
    return 'SELECT id, code, name, email, role, "createdAt" FROM "User" LIMIT 50;'


async def _generate_sql_from_request_async(user_request: str) -> dict[str, str]:
    """
    Generate SQL from user request using LLM.
    
    Args:
        user_request: Vietnamese user question
        
    Returns:
        {"sql": "...", "explanation": "..."}
    """
    return await _generate_sql_with_llm(user_request)


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
    description="Sinh cau SQL SELECT tu yeu cau bang tieng Viet cua nguoi dung. Dung de tra loi cac cau hoi ve du lieu.",
)
@log_async_execution
async def mcp_generate_sql(user_request: str) -> dict[str, Any]:
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
    result = await _generate_sql_with_llm(user_request)
    logger.info(f"✅ LLM Generated SQL: {result['sql'][:100]}...")
    
    return result


def _get_sql_explanation(sql: str, user_request: str) -> str:
    """Generate explanation for the SQL query"""
    req = user_request.lower()
    
    explanations = {
        "bảng user": "Truy vấn dữ liệu từ bảng người dùng",
        "người dùng": "Truy vấn dữ liệu từ bảng người dùng",
        "khoa": "Truy vấn dữ liệu từ bảng khoa/bộ môn",
        "ngành": "Truy vấn dữ liệu từ bảng ngành",
        "lớp": "Truy vấn dữ liệu từ bảng lớp",
        "đề tài": "Truy vấn dữ liệu từ bảng đề tài",
        "đợt đăng ký": "Truy vấn dữ liệu từ bảng đợt đăng ký",
        "hội đồng": "Truy vấn dữ liệu từ bảng hội đồng",
        "thông báo": "Truy vấn dữ liệu từ bảng thông báo",
        "bài đăng": "Truy vấn dữ liệu từ bảng bài đăng",
        "báo cáo tiến độ": "Truy vấn dữ liệu từ bảng báo cáo tiến độ",
    }
    
    for key, exp in explanations.items():
        if key in req:
            return exp
    
    return "Truy vấn dữ liệu từ database"


if __name__ == "__main__":
    transport = os.getenv("MCP_TRANSPORT", "http").strip().lower()
    if transport == "stdio":
        logger.info("🚀 Starting MCP Server in STDIO mode")
        mcp.run(transport="stdio", show_banner=False, log_level="error")
    else:
        logger.info("🚀 Starting MCP Server in HTTP mode on http://127.0.0.1:9000/mcp")
        mcp.run(transport="http", host="127.0.0.1", port=9000, path="/mcp")
