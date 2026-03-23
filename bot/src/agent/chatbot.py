"""
Chatbot - Cấu hình LLM sử dụng GitHub Copilot API hoặc OpenAI
"""
import os
from langchain_openai import ChatOpenAI
from src.agent.prompts import EXTRACTION_SYSTEM_PROMPT
import json
import logging

logger = logging.getLogger(__name__)


class OCRChatbot:
    """Chatbot tích hợp OCR và LLM để trích xuất thông tin"""
    
    def __init__(self):
        """Khởi tạo LLM client"""
        # Lấy config từ env
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("GITHUB_COPILOT_API_KEY", "not-needed")
        base_url = os.getenv("OPENAI_API_BASE")
        model_name = os.getenv("MODEL_NAME", "gpt-4o")
        
        # Log configuration
        logger.info(f"Initializing LLM with model: {model_name}")
        logger.info(f"Base URL: {base_url or 'default'}")
        
        # Khởi tạo LLM với cấu hình linh hoạt
        llm_config = {
            "model": model_name,
            "api_key": api_key,
            "temperature": 0.1,  # Low temperature for consistent extraction
        }
        
        # Chỉ set base_url nếu có
        if base_url:
            llm_config["base_url"] = base_url
            
        self.llm = ChatOpenAI(**llm_config)
        logger.info("LLM initialized successfully")
        
    async def extract_information(self, ocr_text: str, user_prompt: str = None) -> dict:
        """
        Sử dụng LLM để trích xuất thông tin từ OCR text
        
        Args:
            ocr_text: Text đã được OCR từ ảnh
            user_prompt: Prompt tùy chỉnh từ user (optional)
            
        Returns:
            dict chứa thông tin đã trích xuất
        """
        try:
            if not ocr_text or ocr_text.strip() == "":
                return {
                    "success": False,
                    "error": "Empty OCR text",
                    "data": None
                }
            
            # Tạo prompt
            if user_prompt:
                prompt = f"{EXTRACTION_SYSTEM_PROMPT}\n\nUser request: {user_prompt}\n\nOCR Text:\n{ocr_text}"
            else:
                prompt = f"{EXTRACTION_SYSTEM_PROMPT}\n\nOCR Text:\n{ocr_text}"
            
            # Gọi LLM
            messages = [
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": f"OCR Text:\n{ocr_text}"}
            ]
            
            response = await self.llm.ainvoke(messages)
            result_text = response.content
            
            # Parse JSON từ response
            try:
                # Thử parse JSON trực tiếp
                result_data = json.loads(result_text)
            except json.JSONDecodeError:
                # Nếu không phải JSON thuần, thử extract JSON từ markdown
                if "```json" in result_text:
                    json_text = result_text.split("```json")[1].split("```")[0].strip()
                    result_data = json.loads(json_text)
                elif "```" in result_text:
                    json_text = result_text.split("```")[1].split("```")[0].strip()
                    result_data = json.loads(json_text)
                else:
                    # Nếu không parse được, trả về text thuần
                    result_data = {
                        "raw_response": result_text,
                        "note": "Could not parse as JSON"
                    }
            
            return {
                "success": True,
                "data": result_data,
                "raw_ocr_text": ocr_text
            }
            
        except Exception as e:
            logger.error(f"LLM Extraction Error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "data": None
            }
