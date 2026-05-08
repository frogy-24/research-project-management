"""
Council Service - Service xử lý tạo hội đồng bằng LLM
"""

import json
import math
import random
import uuid
from typing import Any

from src.repositories import get_lecturers_for_council
from src.services.llm_service import get_llm_service
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)

# Thứ tự ưu tiên role từ cao đến thấp (User.role từ DB)
# Chỉnh lại danh sách này cho khớp với enum role thực tế trong DB
ROLE_PRIORITY: dict[str, int] = {
    "ADMIN": 100,
    "MANAGER": 90,
    "HEAD_OF_DEPARTMENT": 80,
    "SENIOR_LECTURER": 70,
    "LECTURER": 60,
    "ASSISTANT": 50,
}

# Map từ thứ hạng trong hội đồng → tên role hội đồng
COUNCIL_ROLE_BY_RANK = {
    0: "Chủ tịch",
    1: "Thư ký",
}
COUNCIL_ROLE_DEFAULT = "Ủy viên"


def _get_role_priority(role: str | None) -> int:
    """Trả về điểm ưu tiên của role, role không xác định = 0"""
    return ROLE_PRIORITY.get(role or "", 0)


def _assign_council_roles(members_raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Tự động phân vai trong hội đồng dựa trên role từ bảng User:
      - Người có role cao nhất → Chủ tịch
      - Người có role cao thứ hai → Thư ký
      - Còn lại → Ủy viên
    Nếu nhiều người cùng role priority thì chọn ngẫu nhiên trong nhóm đó.

    Args:
        members_raw: list lecturer dict, mỗi phần tử có key "role" là User.role từ DB

    Returns:
        list member dict đã bổ sung key "council_role"
    """
    if not members_raw:
        return []

    # Nhóm theo priority
    groups: dict[int, list[dict]] = {}
    for m in members_raw:
        p = _get_role_priority(m.get("role"))
        groups.setdefault(p, []).append(m)

    # Shuffle trong từng nhóm để random hoá khi cùng priority
    for group in groups.values():
        random.shuffle(group)

    # Sắp xếp từ priority cao → thấp, flatten
    sorted_members: list[dict] = []
    for priority in sorted(groups.keys(), reverse=True):
        sorted_members.extend(groups[priority])

    result = []
    for rank, member in enumerate(sorted_members):
        council_role = COUNCIL_ROLE_BY_RANK.get(rank, COUNCIL_ROLE_DEFAULT)
        result.append({**member, "council_role": council_role})

    return result


def _compute_council_sizes(total: int, max_per_council: int = 3) -> list[int]:
    """
    Tính kích thước các hội đồng sao cho CÂN BẰNG nhất có thể.

    Ví dụ:
      10 người, max 3 → 4 hội đồng: [3, 3, 2, 2]
      20 người, max 3 → 7 hội đồng: [3, 3, 3, 3, 2, 2, 2]
      30 người, max 3 → 10 hội đồng: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
       9 người, max 3 → 3 hội đồng: [3, 3, 3]

    Args:
        total: Tổng số giảng viên
        max_per_council: Số thành viên tối đa mỗi hội đồng (mặc định 3)

    Returns:
        List kích thước từng hội đồng (đã sắp xếp giảm dần)
    """
    if total <= 0:
        return []

    num_councils = math.ceil(total / max_per_council)
    base_size = total // num_councils      # phần chia đều
    remainder = total % num_councils       # số hội đồng được thêm 1 người

    # remainder hội đồng có (base_size + 1) người, còn lại có base_size người
    sizes = [base_size + 1] * remainder + [base_size] * (num_councils - remainder)
    return sizes                           # đã sắp xếp giảm dần tự nhiên


def _build_council_generation_system_prompt(
    majors: dict[str, int],
    departments: dict[str, int],
    council_sizes: list[int],
    required_from_user: str | None = None,
) -> str:
    """
    Build system prompt cho việc tạo hội đồng.
    Truyền thẳng council_sizes để LLM biết chính xác cần tạo bao nhiêu
    hội đồng và mỗi hội đồng bao nhiêu thành viên.
    """
    dept_info = "\n".join([
        f"  - {dept}: {count} giảng viên"
        for dept, count in departments.items()
    ])

    majors_info = "\n".join([
        f"  - {major}: {count} giảng viên"
        for major, count in majors.items()
    ])

    # Mô tả kích thước từng hội đồng rõ ràng cho LLM
    sizes_description = "\n".join([
        f"  - Hội đồng {i + 1}: {size} thành viên"
        for i, size in enumerate(council_sizes)
    ])

    total_councils = len(council_sizes)

    return f"""Bạn là chuyên gia phân công hội đồng chấm đồ án nghiên cứu khoa học.

## Thông tin hiện tại:
- Phân bổ theo khoa:
{dept_info}
- Phân bổ theo chuyên ngành:
{majors_info}

## Số lượng hội đồng và thành viên đã được tính toán sẵn ({total_councils} hội đồng):
{sizes_description}

## Quy tắc bắt buộc:
1. Tạo ĐÚNG {total_councils} hội đồng, KHÔNG thêm, KHÔNG bớt.
2. Số thành viên mỗi hội đồng phải ĐÚNG như bảng trên, KHÔNG được sai lệch.
3. Tên hội đồng theo format: "Hội đồng [số thứ tự]" (VD: "Hội đồng 1", "Hội đồng 2").
4. Phân bổ giảng viên đều theo khoa — tránh tập trung quá nhiều vào một khoa trong cùng hội đồng.
5. Đảm bảo mỗi hội đồng có đại diện từ các chuyên ngành khác nhau nếu có thể.
6. Mỗi giảng viên chỉ xuất hiện đúng một lần trong toàn bộ danh sách.

## Yêu cầu thêm từ người dùng (ưu tiên cao nhất):
{required_from_user if required_from_user else "Không có yêu cầu đặc biệt nào"}

## Output (JSON bắt buộc, không kèm markdown):
{{
    "reasoning": "Giải thích ngắn cách phân bổ thành viên vào các hội đồng",
    "councils": [
        {{
            "name": "Hội đồng 1",
            "member_ids": ["user_id_1", "user_id_2", "user_id_3"]
        }},
        ...
    ]
}}

Lưu ý: Chỉ sử dụng user_id từ danh sách lecturers được cung cấp.
"""


def _build_council_generation_user_prompt(
    required_from_user: str | None,
    lecturer_data: list[dict[str, str]],
) -> str:
    required_text = (
        required_from_user.strip()
        if required_from_user
        else "Tạo các hội đồng phù hợp với số đề tài"
    )
    return f"""Yêu cầu: {required_text}

Danh sách giảng viên khả dụng:
{json.dumps(lecturer_data, ensure_ascii=False, indent=2)}

Hãy phân bổ thành viên vào các hội đồng theo đúng số lượng đã quy định trong system prompt.
Chỉ sử dụng user_id trong danh sách giảng viên trên."""


@log_async_execution
async def generate_councils_from_prompt(
    call_round_id: str,
    prompt: str | None,
    creator_id: str,
) -> dict[str, Any]:
    """
    Tạo hội đồng từ prompt sử dụng LLM.

    Args:
        call_round_id: ID đợt đăng ký
        prompt: Prompt từ người dùng
        creator_id: ID người tạo

    Returns:
        Dict chứa session_id và danh sách councils đã tạo
    """
    # ------------------------------------------------------------------ #
    # 1. Lấy danh sách giảng viên                                         #
    # ------------------------------------------------------------------ #
    lecturers = await get_lecturers_for_council(call_round_id)
    if not lecturers:
        return {"error": "Không có giảng viên nào khả dụng"}

    logger.info(f"Tìm thấy {len(lecturers)} giảng viên khả dụng")

    lecturers_by_id: dict[str, dict] = {l["id"]: l for l in lecturers}

    # ------------------------------------------------------------------ #
    # 2. Tính trước kích thước hội đồng (cân bằng)                       #
    # ------------------------------------------------------------------ #
    council_sizes = _compute_council_sizes(len(lecturers), max_per_council=3)
    logger.info(
        f"Phân bổ hội đồng: {len(council_sizes)} hội đồng, "
        f"kích thước: {council_sizes}"
    )

    # ------------------------------------------------------------------ #
    # 3. Chuẩn bị dữ liệu cho LLM                                        #
    # ------------------------------------------------------------------ #
    lecturer_data = [
        {
            "user_id": l["id"],
            "name": l["name"],
            "email": l["email"],
            "department": l.get("department_name", "N/A"),
            "major": l.get("major_name", "N/A"),
            # Gửi role để LLM có thể tham khảo khi cần
            "role": l.get("role", "N/A"),
        }
        for l in lecturers
    ]

    departments: dict[str, int] = {}
    majors: dict[str, int] = {}
    for l in lecturers:
        dept = l.get("department_name", "Unknown")
        major = l.get("major_name", "Unknown")
        departments[dept] = departments.get(dept, 0) + 1
        majors[major] = majors.get(major, 0) + 1

    system_prompt = _build_council_generation_system_prompt(
        majors=majors,
        departments=departments,
        council_sizes=council_sizes,
        required_from_user=prompt,
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": _build_council_generation_user_prompt(prompt, lecturer_data),
        },
    ]

    # ------------------------------------------------------------------ #
    # 4. Gọi LLM                                                          #
    # ------------------------------------------------------------------ #
    llm_client = get_llm_service()
    try:
        content = await llm_client.chat_completion(
            messages=messages,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        result = json.loads(content)
        logger.info(
            f"LLM trả về: {json.dumps(result, ensure_ascii=False)[:200]}..."
        )
    except Exception as e:
        logger.error(f"Lỗi khi gọi LLM: {e}")
        return {"error": f"Lỗi LLM: {str(e)}"}

    # ------------------------------------------------------------------ #
    # 5. Xây dựng councils + phân vai trò dựa trên User.role              #
    # ------------------------------------------------------------------ #
    session_id = str(uuid.uuid4())
    raw_councils: list[dict] = (
        result.get("councils", []) if isinstance(result, dict) else []
    )
    created_councils: list[dict[str, Any]] = []

    for council in raw_councils:
        name = council.get("name", "Hội đồng mới")
        member_ids = [
            m for m in council.get("member_ids", []) if m in lecturers_by_id
        ]

        # Tập hợp lecturer dict thô (bao gồm User.role từ DB)
        members_raw = [
            lecturers_by_id[mid]
            for mid in member_ids
            if mid in lecturers_by_id
        ]

        # Phân vai tự động theo role hierarchy
        members_with_role = _assign_council_roles(members_raw)

        members = [
            {
                "id": m["id"],
                "name": m.get("name", "N/A"),
                "email": m.get("email"),
                "role": m["council_role"],  # Chủ tịch / Thư ký / Ủy viên
            }
            for m in members_with_role
        ]

        created_councils.append(
            {
                "id": str(uuid.uuid4()),
                "name": name,
                "member_ids": member_ids,
                "members": members,
                "projects": [],
            }
        )

    return {
        "session_id": session_id,
        "reasoning": result.get("reasoning", "") if isinstance(result, dict) else "",
        "councils": created_councils,
        "total_councils": len(created_councils),
    }