"""SqlAssistant Service - Generate SQL from Vietnamese natural language queries using LLM."""

import json
from typing import Any

from src.services.llm_service import get_llm_service
from src.utilities import get_logger

logger = get_logger(__name__)

# Prompt template cho LLM sinh SQL
SQL_GENERATION_PROMPT = """
    Bạn là một chuyên gia PostgreSQL và hệ thống Quản lý Chất lượng TNCKH (Nghiên cứu khoa học).

    Nhiệm vụ của bạn là:
    - Phân tích câu hỏi tiếng Việt của người dùng.
    - Sinh ra câu lệnh SQL SELECT chính xác dựa trên database schema được cung cấp.
    - Trả kết quả theo đúng format JSON yêu cầu.

    ==================================================
    DATABASE SCHEMA
    ==================================================
    {schema}

    ==================================================
    QUY TẮC QUAN TRỌNG VỀ TÊN BẢNG VÀ TÊN CỘT
    ==================================================

    ⚠️ PostgreSQL phân biệt chữ hoa/chữ thường khi dùng dấu ngoặc kép.

    Database này sử dụng PascalCase cho tên bảng và tên cột.

    VÌ VẬY:
    - LUÔN bọc tên bảng trong dấu ngoặc kép
    - LUÔN bọc tên cột trong dấu ngoặc kép

    Ví dụ đúng:
    SELECT u."id", u."createdAt"
    FROM "User" u

    Ví dụ sai:
    SELECT id, createdat FROM user

    ==================================================
    QUY TẮC BẮT BUỘC
    ==================================================

    1. CHỈ được sinh câu lệnh SELECT
    ❌ Không dùng:
    - INSERT
    - UPDATE
    - DELETE
    - DROP
    - ALTER
    - TRUNCATE
    - CREATE
    - EXECUTE

    2. Chỉ sử dụng bảng và cột tồn tại trong schema.

    3. LUÔN dùng alias cho bảng:
    Ví dụ:
    - "User" u
    - "Project" p
    - "Department" d

    4. Khi JOIN:
    - Phải JOIN đúng quan hệ logic
    - Chỉ JOIN khi cần thiết

    5. KHÔNG tự động thêm LIMIT
    - Chỉ thêm LIMIT nếu người dùng yêu cầu:
        + top N
        + lấy N bản ghi
        + giới hạn kết quả

    6. Nếu người dùng yêu cầu:
    - thống kê → dùng COUNT, SUM, AVG, GROUP BY
    - sắp xếp → dùng ORDER BY
    - top → dùng ORDER BY + LIMIT
    - tìm kiếm → dùng ILIKE
    - khoảng thời gian → dùng BETWEEN hoặc >= <=

    7. Nếu câu hỏi không rõ:
    - Không tự suy đoán sai
    - Trả explanation yêu cầu người dùng bổ sung thông tin

    ==================================================
    QUY TẮC FILTER NGỮ NGHĨA
    ==================================================

    Nếu người dùng hỏi:
    - "sinh viên"
    → WHERE u."role" = 'STUDENT'

    - "giảng viên"
    → WHERE u."role" = 'LECTURER'

    - "trưởng khoa"
    → WHERE u."role" = 'DEAN'

    - "quản trị viên"
    → WHERE u."role" = 'ADMIN'

    - "thành viên hội đồng"
    → WHERE u."role" = 'COUNCIL'

    - "trưởng đơn vị"
    → WHERE u."role" = 'LEADER'

    ==================================================
    PROJECT STATUS
    ==================================================

    Các trạng thái đề tài:
    - DRAFT
    - SUBMITTED
    - DEAN_APPROVED
    - APPROVED
    - IN_PROGRESS
    - COMPLETED
    - REJECTED

    Nếu người dùng hỏi:
    - "đề tài đã duyệt"
    → status IN ('APPROVED', 'DEAN_APPROVED')

    - "đề tài hoàn thành"
    → status = 'COMPLETED'

    - "đề tài bị từ chối"
    → status = 'REJECTED'

    ==================================================
    QUY TẮC AN TOÀN
    ==================================================

    - Không sinh nhiều câu SQL.
    - Không thêm comment SQL.
    - Không markdown.
    - Không giải thích dài dòng.
    - Không sinh SQL nguy hiểm.
    - Không tự tạo tên bảng/cột không tồn tại.

    ==================================================
    CÂU HỎI NGƯỜI DÙNG
    ==================================================

    {user_request}

    ==================================================
    RESOLVED ENTITIES / NOTE
    ==================================================

    Đây là các thông tin đã được hệ thống xử lý trước từ câu hỏi người dùng.
    Ưu tiên sử dụng chính xác các giá trị này trong WHERE clause.
    KHÔNG tự ý thay đổi giá trị.

    {note}

    ==================================================
    OUTPUT FORMAT
    ==================================================
  
    Chỉ trả về JSON hợp lệ:

    {
    "sql": "SELECT ...",
    "explanation": "Giải thích ngắn gọn"
    }

    ==================================================
    VÍ DỤ SQL ĐÚNG
    ==================================================

    SELECT 
        u."id",
        u."code",
        u."name",
        u."email",
        u."role",
        u."createdAt"
    FROM "User" u;
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


class SqlAssistantService:
    """Service for generating SQL queries from Vietnamese natural language."""

    def __init__(self):
        pass

    @staticmethod
    def _build_schema_for_prompt() -> str:
        """Build schema string for LLM prompt."""
        schema_parts = []
        for table_name, table_info in DATABASE_SCHEMA["tables"].items():
            schema_parts.append(f"\n### {table_name}: {table_info['description']}")
            for col_name, col_info in table_info["columns"].items():
                col_type = col_info.get("type", "Unknown")
                col_desc = col_info.get("description", "")
                schema_parts.append(f"  - {col_name}: {col_type}" + (f" - {col_desc}" if col_desc else ""))
        return "\n".join(schema_parts)

    async def generate_sql(self, user_request: str, note: str = None) -> dict[str, str]:
        """
        Generate SQL query from Vietnamese user request using LLM.
        
        Args:
            user_request: User's question in Vietnamese
            note: Additional context/resolved entities from the system
            
        Returns:
            {"sql": "...", "explanation": "..."}
        """
        logger.info(f"🤖 Using LLM to generate SQL for: {user_request[:80]}...")
        
        try:
            llm = get_llm_service()
            schema_str = self._build_schema_for_prompt()
            
            prompt = SQL_GENERATION_PROMPT.format(
                schema=schema_str,
                user_request=user_request,
                note=note or "Không có"
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


# Singleton instance
_sql_assistant_service: SqlAssistantService | None = None


def get_sql_assistant_service() -> SqlAssistantService:
    """Get the SqlAssistantService singleton instance."""
    global _sql_assistant_service
    if _sql_assistant_service is None:
        _sql_assistant_service = SqlAssistantService()
    return _sql_assistant_service


# Backward compatibility functions
async def _generate_sql_with_llm(user_request: str, note: str) -> dict[str, str]:
    """
    Generate SQL query from Vietnamese user request using LLM.
    
    Returns:
        {"sql": "...", "explanation": "..."}
    """
    service = get_sql_assistant_service()
    return await service.generate_sql(user_request, note)
