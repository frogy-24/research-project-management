"""
LLM Service - Service chung để xử lý các tác vụ với LLM
Sử dụng llm_mcp_client để tận dụng MCP tools khi cần
"""

import json
import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from openai import AsyncOpenAI

from src.clients.llm_mcp_client import run_llm_with_mcp
from src.utilities import get_logger

load_dotenv()

logger = get_logger(__name__)


class LLMService:
    """Service chung để xử lý các tác vụ với LLM"""
    
    def __init__(self):
        """Khởi tạo LLM service"""
        self.client = self._build_client()
        self.default_model = os.getenv("LLM_MODEL", "gpt-4o-mini")
    
    def _build_client(self) -> AsyncOpenAI:
        """Build OpenAI client"""
        base_url = os.getenv("BASE_URL") or os.getenv("COPILOT_BASE_URL")
        api_key = os.getenv("API_KEY") or os.getenv("COPILOT_API_KEY")
        
        # if not api_key:
        #     raise RuntimeError("Missing API_KEY/COPILOT_API_KEY")
        
        if base_url:
            logger.info(f"Using custom base_url: {base_url}")
            return AsyncOpenAI(api_key=api_key, base_url=base_url)
        
        logger.info("Using OpenAI default endpoint")
        return AsyncOpenAI(api_key=api_key)
    
    async def chat_completion(
        self,
        messages: list[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.3,
        response_format: Optional[Dict[str, str]] = None,
        **kwargs
    ) -> str:
        """
        Gọi LLM chat completion đơn giản
        
        Args:
            messages: Danh sách messages (role, content)
            model: Model name (default: gpt-4o-mini)
            temperature: Temperature (default: 0.3)
            response_format: Response format (e.g., {"type": "json_object"})
            **kwargs: Các tham số khác cho OpenAI API
        
        Returns:
            Response content từ LLM
        """
        model = model or self.default_model
        
        try:
            params = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                **kwargs
            }
            
            if response_format:
                params["response_format"] = response_format
            
            response = await self.client.chat.completions.create(**params)
            return response.choices[0].message.content or ""
        
        except Exception as e:
            logger.error(f"Error in chat_completion: {e}")
            raise
    
    async def evaluate_project(
        self,
        project: Dict[str, Any],
        criteria: Dict[str, Any],
        model: Optional[str] = None,
        similar_context: str = "",
        is_duplicate: bool = False,
        duplicate_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Đánh giá đề tài nghiên cứu bằng LLM
        
        Args:
            project: Thông tin đề tài (title, objective, expectedOutput, etc.)
            criteria: Tiêu chí đánh giá
            model: Model name (default: gpt-4o-mini)
            similar_context: Context từ Qdrant về các đề tài tương tự
            is_duplicate: Có phải là đề tài trùng lặp không
            duplicate_info: Thông tin về đề tài trùng lặp
        
        Returns:
            Dict với score, decision, reason
        """
        # Build duplicate warning if needed
        duplicate_warning = ""
        if is_duplicate and duplicate_info:
            duplicate_warning = f"""
        **⚠️ CẢNH BÁO TRÙNG LẶP:**
        Đề tài này có độ tương đồng cao ({duplicate_info.get('score', 0):.2f}) với đề tài đã duyệt:
        - Đề tài trùng: {duplicate_info.get('projectTitle', 'N/A')}
        - Chủ nhiệm: {duplicate_info.get('leaderName', 'N/A')}
        Hãy cân nhắc kỹ và có thể yêu cầu REVISION hoặc REJECT nếu quá giống.
        """
        
        prompt = f"""Bạn là chuyên gia đánh giá đề tài nghiên cứu khoa học. Hãy đánh giá đề tài sau dựa trên các tiêu chí được cung cấp.

        **Thông tin đề tài:**
        - Tiêu đề: {project.get('title', 'N/A')}
        - Mục tiêu: {project.get('objective', 'N/A')}
        - Kết quả dự kiến: {project.get('expectedOutput', 'Không có')}
        - Sinh viên: {project.get('leaderName', 'N/A')} ({project.get('leaderCode', 'N/A')})

        **Tiêu chí đánh giá:**
        {criteria.get('description', 'Đánh giá tổng quan về tính khả thi, tính mới và ý nghĩa khoa học của đề tài')}
        
        {similar_context}
        {duplicate_warning}

        **Yêu cầu:**
        1. Đánh giá đề tài theo thang điểm 0-100
        2. Đưa ra quyết định: APPROVE (điểm >= 70), REVISION (50-69), hoặc REJECT (< 50)
        3. Nếu phát hiện trùng lặp, cân nhắc giảm điểm hoặc yêu cầu REVISION
        4. Giải thích ngắn gọn lý do

        Trả về kết quả dưới dạng JSON với format:
        {{
            "score": <số điểm 0-100>,
            "decision": "<APPROVE|REVISION|REJECT>",
            "reason": "<lý do ngắn gọn>"
        }}
        """
        
        try:
            response = await self.chat_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert research project evaluator. Always respond in Vietnamese and return valid JSON."
                    },
                    {"role": "user", "content": prompt}
                ],
                model=model,
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response)
            return {
                "score": result.get("score", 0),
                "decision": result.get("decision", "REVISION"),
                "reason": result.get("reason", ""),
            }
        
        except Exception as e:
            logger.error(f"Error evaluating project {project.get('id')}: {e}")
            return {
                "score": 0,
                "decision": "ERROR",
                "reason": f"Lỗi khi đánh giá: {str(e)}",
            }
    
    async def run_with_mcp_tools(
        self,
        prompt: str,
        model: Optional[str] = None,
        max_rounds: int = 6
    ) -> str:
        """
        Chạy LLM với MCP tools (có thể gọi database tools, etc.)
        
        Args:
            prompt: User prompt
            model: Model name
            max_rounds: Max conversation rounds
        
        Returns:
            LLM response
        """
        model = model or self.default_model
        return await run_llm_with_mcp(
            prompt=prompt,
            model=model,
            max_rounds=max_rounds,
            llm_client=self.client
        )
    
    async def summarize_text(
        self,
        text: str,
        max_length: int = 200,
        model: Optional[str] = None
    ) -> str:
        """
        Tóm tắt văn bản
        
        Args:
            text: Văn bản cần tóm tắt
            max_length: Độ dài tối đa của tóm tắt
            model: Model name
        
        Returns:
            Văn bản đã tóm tắt
        """
        prompt = f"""Hãy tóm tắt văn bản sau trong tối đa {max_length} từ:

        {text}

        Tóm tắt:"""

        response = await self.chat_completion(
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes text concisely."},
                {"role": "user", "content": prompt},
            ],
            model=model,
            temperature=0.3,
            max_tokens=max_length * 2,
        )
        
        return response.strip()
    
    async def extract_keywords(
        self,
        text: str,
        max_keywords: int = 10,
        model: Optional[str] = None
    ) -> list[str]:
        """
        Trích xuất từ khóa từ văn bản
        
        Args:
            text: Văn bản cần trích xuất từ khóa
            max_keywords: Số lượng từ khóa tối đa
            model: Model name
        
        Returns:
            Danh sách từ khóa
        """
        prompt = f"""Trích xuất tối đa {max_keywords} từ khóa quan trọng nhất từ văn bản sau:

{text}

Trả về dưới dạng JSON array: ["keyword1", "keyword2", ...]"""
        
        response = await self.chat_completion(
            messages=[
                {"role": "system", "content": "You are a helpful assistant that extracts keywords."},
                {"role": "user", "content": prompt}
            ],
            model=model,
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        try:
            result = json.loads(response)
            if isinstance(result, dict) and "keywords" in result:
                return result["keywords"]
            elif isinstance(result, list):
                return result
            return []
        except:
            return []


# Singleton instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get singleton LLM service instance"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
