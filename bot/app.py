"""
FastAPI Server - Tích hợp OCR + LLM
Web API để upload ảnh và trích xuất thông tin
"""
# PHẢI set biến môi trường TRƯỚC KHI import paddle/paddleocr
import os
os.environ['FLAGS_use_mkldnn'] = '0'
os.environ['FLAGS_enable_pir_api'] = '0'
os.environ['MKLDNN_VERBOSE'] = '0'
os.environ['GLOG_v'] = '0'

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pathlib import Path
from typing import Optional
import shutil
import os
import logging
from dotenv import load_dotenv

# Load environment variables sớm để các module phụ thuộc env (OCR/LLM) đọc đúng config.
load_dotenv()

from src.server.tools.ocr import extract_text_from_image
from src.agent.chatbot import OCRChatbot
from src.server.tools.council import auto_divide_councils, get_councils_by_call_round
from src.agent.council_agent import DeanCouncilAgent

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Khởi tạo FastAPI app
app = FastAPI(
    title="OCR + LLM Information Extraction API",
    description="Upload ảnh để trích xuất text (OCR) và phân tích thông tin (LLM)",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Khởi tạo chatbot (lazy loading)
chatbot = None
dean_council_agent = None

def get_chatbot():
    """Lazy loading chatbot để tránh lỗi khi chưa có API key"""
    global chatbot
    if chatbot is None:
        try:
            chatbot = OCRChatbot()
        except Exception as e:
            logger.warning(f"Could not initialize chatbot: {e}")
            return None
    return chatbot


def get_dean_council_agent() -> Optional[DeanCouncilAgent]:
    """Lazy loading DeanCouncilAgent để xử lý dữ liệu hội đồng."""
    global dean_council_agent
    if dean_council_agent is None:
        try:
            dean_council_agent = DeanCouncilAgent()
        except Exception as e:
            logger.warning(f"Could not initialize DeanCouncilAgent: {e}")
            return None
    return dean_council_agent


class QuickAddCouncilsRequest(BaseModel):
    api_base_url: str = Field(default="http://localhost:3000")
    call_round_id: str
    min_projects_per_council: int = Field(default=5, ge=1)
    max_projects_per_council: int = Field(default=10, ge=1)
    clear_existing: bool = False
    auth_token: Optional[str] = None
    cookie: Optional[str] = None


class ConfirmQuickAddRequest(BaseModel):
    api_base_url: str = Field(default="http://localhost:3000")
    call_round_id: str
    selected_council_ids: list[str] = Field(default_factory=list)
    auth_token: Optional[str] = None
    cookie: Optional[str] = None


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    API endpoint để upload ảnh và xử lý OCR + LLM
    """
    try:
        # Save uploaded file
        file_path = UPLOAD_DIR / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"File uploaded: {file_path}")
        
        # Perform OCR
        ocr_result = await extract_text_from_image(str(file_path))
        
        if not ocr_result["success"]:
            raise HTTPException(status_code=400, detail=f"OCR failed: {ocr_result.get('error')}")
        
        # Extract information using LLM
        bot = get_chatbot()
        if bot and ocr_result["text"]:
            llm_result = await bot.extract_information(ocr_result["text"])
        else:
            llm_result = {
                "success": False,
                "error": "LLM not available or no text extracted",
                "data": None
            }
        
        return JSONResponse({
            "success": True,
            "image_path": str(file_path),
            "ocr_result": ocr_result,
            "llm_result": llm_result
        })
        
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/process-url")
async def process_url(data: dict):
    """
    API endpoint để xử lý ảnh từ URL
    """
    try:
        import httpx
        from PIL import Image
        import io
        
        image_url = data.get("image_url")
        if not image_url:
            raise HTTPException(status_code=400, detail="Missing image_url")
        
        # Download image
        async with httpx.AsyncClient() as client:
            response = await client.get(image_url, timeout=30.0)
            response.raise_for_status()
            
            # Save image
            img = Image.open(io.BytesIO(response.content))
            file_name = f"url_image_{hash(image_url)}.jpg"
            file_path = UPLOAD_DIR / file_name
            img.save(file_path)
        
        logger.info(f"Image downloaded from URL: {file_path}")
        
        # Perform OCR
        ocr_result = await extract_text_from_image(str(file_path))
        
        if not ocr_result["success"]:
            raise HTTPException(status_code=400, detail=f"OCR failed: {ocr_result.get('error')}")
        
        # Extract information using LLM
        bot = get_chatbot()
        if bot and ocr_result["text"]:
            llm_result = await bot.extract_information(ocr_result["text"])
        else:
            llm_result = {
                "success": False,
                "error": "LLM not available or no text extracted",
                "data": None
            }
        
        return JSONResponse({
            "success": True,
            "image_path": str(file_path),
            "ocr_result": ocr_result,
            "llm_result": llm_result
        })
        
    except Exception as e:
        logger.error(f"URL processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/dean/councils/quick-add")
async def quick_add_councils(request_data: QuickAddCouncilsRequest):
    """
    Flow thêm nhanh hội đồng:
    input điều kiện -> MCP gọi API -> AI Agent chuẩn hóa -> trả về view cho client.
    """
    mcp_result = await auto_divide_councils(
        api_base_url=request_data.api_base_url,
        call_round_id=request_data.call_round_id,
        min_projects_per_council=request_data.min_projects_per_council,
        max_projects_per_council=request_data.max_projects_per_council,
        clear_existing=request_data.clear_existing,
        auth_token=request_data.auth_token,
        cookie=request_data.cookie,
    )

    if not mcp_result.get("success"):
        raise HTTPException(
            status_code=502,
            detail={
                "message": "MCP call failed",
                "mcp_result": mcp_result,
            },
        )

    agent = get_dean_council_agent()
    if not agent:
        raise HTTPException(status_code=500, detail="DeanCouncilAgent not available")

    ai_result = await agent.build_quick_add_view(
        mcp_data=mcp_result,
        request_input=request_data.model_dump(exclude={"auth_token", "cookie"}),
    )

    return JSONResponse(
        {
            "success": True,
            "source": "mcp+ai-agent",
            "client_view": ai_result.get("data", {}),
            "mcp_meta": {
                "endpoint": mcp_result.get("endpoint"),
                "status_code": mcp_result.get("status_code"),
            },
        }
    )


@app.post("/api/dean/councils/quick-add/confirm")
async def confirm_quick_add_councils(request_data: ConfirmQuickAddRequest):
    """
    Endpoint để client gọi khi bấm nút "Đồng ý".
    """
    current_list = await get_councils_by_call_round(
        api_base_url=request_data.api_base_url,
        call_round_id=request_data.call_round_id,
        auth_token=request_data.auth_token,
        cookie=request_data.cookie,
    )

    if not current_list.get("success"):
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Fetch councils failed",
                "mcp_result": current_list,
            },
        )

    councils = current_list.get("data", [])
    if not isinstance(councils, list):
        councils = []

    selected_set = set(request_data.selected_council_ids)
    selected_items = [item for item in councils if str(item.get("id", "")) in selected_set]

    return JSONResponse(
        {
            "success": True,
            "message": "Đã xác nhận danh sách hội đồng.",
            "confirmed_count": len(selected_items),
            "confirmed_items": selected_items,
        }
    )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "1.0.0"}


def main():
    """Entry point để chạy bằng uv run bot"""
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")


if __name__ == "__main__":
    main()
