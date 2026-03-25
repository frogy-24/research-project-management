"""
AI Agent for Dean Council quick-add feature.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

from langchain_openai import ChatOpenAI

from src.agent.prompts import DEAN_COUNCIL_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


class DeanCouncilAgent:
    """Process MCP council data into client-ready quick-add view."""

    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("GITHUB_COPILOT_API_KEY", "not-needed")
        base_url = os.getenv("OPENAI_API_BASE")
        model_name = os.getenv("MODEL_NAME", "gpt-4o")

        llm_config: dict[str, Any] = {
            "model": model_name,
            "api_key": api_key,
            "temperature": 0.1,
        }
        if base_url:
            llm_config["base_url"] = base_url

        self.llm = ChatOpenAI(**llm_config)
        logger.info("DeanCouncilAgent initialized with model=%s", model_name)

    async def build_quick_add_view(self, mcp_data: dict, request_input: dict) -> dict:
        """
        Build client view model for quick council add flow.
        """
        try:
            user_content = {
                "request_input": request_input,
                "mcp_data": mcp_data,
                "required_output": {
                    "summary": "string",
                    "callRoundId": "string",
                    "totalCouncils": "number",
                    "totalProjects": "number",
                    "items": [
                        {
                            "councilId": "string",
                            "name": "string",
                            "description": "string|null",
                            "projectCount": "number",
                            "memberCount": "number",
                            "agreeButton": {
                                "label": "Đồng ý",
                                "action": "confirm_quick_add",
                                "payload": {
                                    "councilId": "string"
                                }
                            }
                        }
                    ]
                }
            }

            messages = [
                {"role": "system", "content": DEAN_COUNCIL_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(user_content, ensure_ascii=False),
                },
            ]

            response = await self.llm.ainvoke(messages)
            content = response.content if isinstance(response.content, str) else json.dumps(response.content)

            parsed = self._parse_json(content)
            return {
                "success": True,
                "data": parsed,
            }
        except Exception as exc:
            logger.error("DeanCouncilAgent error: %s", exc)
            return {
                "success": False,
                "error": str(exc),
                "data": self._fallback_view(mcp_data),
            }

    @staticmethod
    def _parse_json(content: str) -> dict:
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            if "```json" in content:
                extracted = content.split("```json", maxsplit=1)[1].split("```", maxsplit=1)[0].strip()
                return json.loads(extracted)
            if "```" in content:
                extracted = content.split("```", maxsplit=1)[1].split("```", maxsplit=1)[0].strip()
                return json.loads(extracted)
            raise

    @staticmethod
    def _fallback_view(mcp_data: dict) -> dict:
        payload = mcp_data if isinstance(mcp_data, dict) else {}
        data = payload.get("data", {}) if isinstance(payload.get("data"), dict) else {}
        councils = data.get("councils", []) if isinstance(data.get("councils"), list) else []

        items = []
        for council in councils:
            council_id = str(council.get("id", ""))
            items.append(
                {
                    "councilId": council_id,
                    "name": council.get("name", "Hội đồng"),
                    "description": council.get("description"),
                    "projectCount": council.get("projectCount", 0),
                    "memberCount": council.get("memberCount", 0),
                    "agreeButton": {
                        "label": "Đồng ý",
                        "action": "confirm_quick_add",
                        "payload": {"councilId": council_id},
                    },
                }
            )

        return {
            "summary": "Danh sách hội đồng được tạo nhanh từ điều kiện đầu vào.",
            "callRoundId": "",
            "totalCouncils": data.get("totalCouncils", len(items)),
            "totalProjects": data.get("totalProjects", 0),
            "items": items,
        }