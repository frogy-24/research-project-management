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

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil
import os
import logging
from dotenv import load_dotenv

# Load environment variables sớm để các module phụ thuộc env (OCR/LLM) đọc đúng config.
load_dotenv()

from src.server.tools.ocr import extract_text_from_image
from src.agent.chatbot import OCRChatbot

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

# Mount static files
static_dir = Path("static")
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates_dir = Path("templates")
templates_dir.mkdir(exist_ok=True)
templates = Jinja2Templates(directory="templates")

# Upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Khởi tạo chatbot (lazy loading)
chatbot = None

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


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Trang chủ với form upload ảnh"""
    return templates.TemplateResponse(request, "index.html")


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
