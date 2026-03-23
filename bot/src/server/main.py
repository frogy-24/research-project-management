"""
FastMCP Server - Định nghĩa các Tools cho AI Agent
"""
from fastmcp import FastMCP
from src.server.tools.ocr import extract_text_from_image

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


if __name__ == "__main__":
    mcp.run()
