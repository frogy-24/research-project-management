"""
FastMCP Server - Định nghĩa các Tools cho AI Agent
"""
from fastmcp import FastMCP
from src.server.tools.ocr import extract_text_from_image
from src.server.tools.council import auto_divide_councils, get_councils_by_call_round

# Khởi tạo FastMCP Server
mcp = FastMCP("OCR-Assistant-Server")

# Đăng ký OCR tool
@mcp.tool()
async def ocr_extract_text(image_path: str) -> dict:
    """
    Trích xuất text từ ảnh sử dụng PaddleOCR (hỗ trợ tiếng Việt)
    
    Args:
        image_path: Đường dẫn đến file ảnh cần OCR
        
    Returns:
        dict chứa text và thông tin chi tiết
    """
    return await extract_text_from_image(image_path)


@mcp.tool()
async def dean_quick_add_councils(
    api_base_url: str,
    call_round_id: str,
    min_projects_per_council: int = 5,
    max_projects_per_council: int = 10,
    clear_existing: bool = False,
    auth_token: str | None = None,
    cookie: str | None = None,
) -> dict:
    """
    Tạo nhanh hội đồng theo điều kiện đầu vào.
    """
    return await auto_divide_councils(
        api_base_url=api_base_url,
        call_round_id=call_round_id,
        min_projects_per_council=min_projects_per_council,
        max_projects_per_council=max_projects_per_council,
        clear_existing=clear_existing,
        auth_token=auth_token,
        cookie=cookie,
    )


@mcp.tool()
async def dean_get_councils(
    api_base_url: str,
    call_round_id: str,
    auth_token: str | None = None,
    cookie: str | None = None,
) -> dict:
    """
    Lấy danh sách hội đồng hiện tại của một đợt.
    """
    return await get_councils_by_call_round(
        api_base_url=api_base_url,
        call_round_id=call_round_id,
        auth_token=auth_token,
        cookie=cookie,
    )


if __name__ == "__main__":
    mcp.run()
