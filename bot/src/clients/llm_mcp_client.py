import argparse
import asyncio
import json
import os
import re
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

# Support running this file directly: `uv run llm_mcp_client.py` from src/clients
if "src" not in sys.modules and str(Path(__file__).resolve().parents[2]) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from dotenv import load_dotenv
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from openai import AsyncOpenAI

from src.utilities import get_logger, log_async_execution, log_execution

load_dotenv()

MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://127.0.0.1:9000/mcp")
SYSTEM_PROMPT = (
    "You are an assistant that can call MCP tools when needed.\n"
    "IMPORTANT: Only call tools that are absolutely necessary to answer the user's question.\n"
    "- For user queries with specific IDs, use get_user_by_id or run_raw_sql directly with parameterized query\n"
    "- NEVER call healthcheck unless explicitly asked\n"
    "- Prefer direct SQL queries over multiple tool calls\n"
    "- Be efficient and minimize round trips"
    "\n\n## Council Management Tools:\n"
    "- generate_councils: Tạo hội đồng chấm đồ án từ prompt (cần call_round_id, prompt, creator_id)\n"
    "- get_council_preview: Xem trước các hội đồng đã tạo theo session_id\n"
    "- confirm_councils: Xác nhận và áp dụng các hội đồng vào database (sau khi preview)\n"
    "- cancel_councils: Hủy bỏ các hội đồng tạm thời\n"
    "- Quy trình: generate_councils -> get_council_preview -> confirm_councils/cancel_councils\n"
)
USER_ID_PATTERN = re.compile(r"\b[a-z0-9]{20,40}\b", re.IGNORECASE)

logger = get_logger(__name__)


@asynccontextmanager
async def open_mcp_session() -> Any:
    async with streamable_http_client(MCP_SERVER_URL) as (read_stream, write_stream, _):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            yield session


@log_execution
def _build_llm_client() -> AsyncOpenAI:
    base_url = os.getenv("BASE_URL") or os.getenv("COPILOT_BASE_URL") or os.getenv("COPILOT_BASE_URL")
    api_key = os.getenv("API_KEY") or os.getenv("COPILOT_API_KEY")

    if not api_key and base_url:
        api_key = os.getenv("COPILOT_BASE_URL_KEY", "dummy-key")
        logger.debug("Sử dụng COPILOT_BASE_URL_KEY fallback")

    if not api_key:
        logger.error("❌ Missing API key")
        raise RuntimeError("Missing API_KEY/COPILOT_API_KEY (or set COPILOT_BASE_URL + COPILOT_BASE_URL_KEY)")

    if base_url:
        logger.info(f"Sử dụng custom base_url: {base_url}")
        return AsyncOpenAI(api_key=api_key, base_url=base_url)

    logger.info("Sử dụng OpenAI default endpoint")
    return AsyncOpenAI(api_key=api_key)


@log_execution
def _to_openai_tools(mcp_tools: Any) -> list[dict[str, Any]]:
    logger.debug(f"Chuyển đổi {len(mcp_tools.tools)} MCP tools sang OpenAI format")
    tools: list[dict[str, Any]] = []
    for tool in mcp_tools.tools:
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description or "",
                    "parameters": tool.inputSchema
                    or {"type": "object", "properties": {}, "additionalProperties": False},
                },
            }
        )
    logger.debug(f"Chuyển đổi thành công {len(tools)} tools")
    return tools


@log_execution
def _normalize_tool_result(result: Any) -> str:
    structured = getattr(result, "structuredContent", None)
    if structured is not None:
        logger.debug("Trả về structured content dạng JSON")
        return json.dumps(structured, ensure_ascii=True)

    content_items = getattr(result, "content", None)
    if content_items:
        texts: list[str] = []
        for item in content_items:
            text = getattr(item, "text", None)
            if text:
                texts.append(text)
        if texts:
            logger.debug(f"Trả về {len(texts)} text items")
            return "\n".join(texts)

    logger.debug("Trả về result dạng string")
    return str(result)


@log_execution
def _is_user_lookup_prompt(prompt: str) -> bool:
    lower = prompt.lower()
    return (
        "người dùng" in lower
        or "nguoi dung" in lower
        or "user" in lower
        or "thông tin" in lower
        or "thong tin" in lower
    )


@log_execution
def _extract_user_id_from_prompt(prompt: str) -> str | None:
    candidates = USER_ID_PATTERN.findall(prompt.lower())
    for candidate in candidates:
        if candidate.startswith("cm"):
            return candidate
    return candidates[0] if candidates else None


@log_execution
def _extract_user_record_from_payload(payload: Any) -> dict[str, Any] | None:
    data = payload
    if isinstance(data, dict) and "result" in data:
        data = data["result"]

    if isinstance(data, list):
        if data and isinstance(data[0], dict):
            return data[0]
        return None

    if isinstance(data, dict):
        return data

    return None


@log_execution
def _extract_user_record_from_result(tool_result: Any) -> dict[str, Any] | None:
    structured = getattr(tool_result, "structuredContent", None)
    user = _extract_user_record_from_payload(structured)
    if user is not None:
        return user

    normalized = _normalize_tool_result(tool_result)
    try:
        parsed = json.loads(normalized)
    except json.JSONDecodeError:
        return None

    return _extract_user_record_from_payload(parsed)


@log_execution
def _display(value: Any, fallback: str = "(không có)") -> str:
    if value is None:
        return fallback
    return str(value)


@log_execution
def _format_user_response(user: dict[str, Any]) -> str:
    lines = [
        f"Dưới đây là thông tin người dùng có id \"{_display(user.get('id'))}\":",
        "",
        f"- id: {_display(user.get('id'))}",
        f"- tên: {_display(user.get('name'))}",
        f"- mã (code): {_display(user.get('code'))}",
        f"- email: {_display(user.get('email'))}",
        f"- vai trò: {_display(user.get('role'))}",
        f"- departmentId: {_display(user.get('departmentId'))}",
        f"- địa chỉ: {_display(user.get('address'))}",
        f"- điện thoại: {_display(user.get('phone'))}",
        f"- giới tính: {_display(user.get('gender'))}",
        f"- ngày sinh: {_display(user.get('dateOfBirth'))}",
        f"- classId: {_display(user.get('classId'))}",
        f"- majorId: {_display(user.get('majorId'))}",
        f"- createdAt: {_display(user.get('createdAt'))}",
        f"- updatedAt: {_display(user.get('updatedAt'))}",
    ]
    if "password" in user:
        lines.append("- mật khẩu: (bảo mật - không hiển thị)")

    lines.append("")
    lines.append("Muốn tôi lấy thêm tên khoa từ departmentId hoặc xuất JSON không?")
    return "\n".join(lines)


@log_async_execution
async def _fast_lookup_user(mcp_session: ClientSession, user_id: str) -> dict[str, Any] | None:
    try:
        result = await mcp_session.call_tool("get_user_by_id", {"user_id": user_id})
        user = _extract_user_record_from_result(result)
        if user is not None:
            return user
    except Exception as exc:
        logger.warning(f"get_user_by_id failed, fallback run_raw_sql: {exc}")

    safe_query = (
        'SELECT id, name, email, role, department, "createdAt", "updatedAt", '
        'address, "classId", code, "dateOfBirth", "departmentId", gender, "majorId", phone '
        'FROM "User" WHERE id = $1 LIMIT 1;'
    )
    fallback_result = await mcp_session.call_tool(
        "run_raw_sql",
        {"query": safe_query, "args": [user_id]},
    )
    return _extract_user_record_from_result(fallback_result)


@log_async_execution
async def _run_llm_rounds(
    prompt: str,
    model: str,
    max_rounds: int,
    llm_client: AsyncOpenAI,
    mcp_session: ClientSession,
    openai_tools: list[dict[str, Any]],
) -> str:
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    for round_num in range(max_rounds):
        logger.info(f"🔄 Round {round_num + 1}/{max_rounds}")
        response = await llm_client.chat.completions.create(
            model=model,
            messages=messages,
            tools=openai_tools,
            tool_choice="auto",
            temperature=0,
        )

        message = response.choices[0].message
        tool_calls = message.tool_calls or []

        if not tool_calls:
            content = message.content or ""
            logger.info(f"✅ LLM trả lời cuối cùng (không cần tool): {content[:100]}...")
            return content

        logger.info(f"🛠️ LLM yêu cầu gọi {len(tool_calls)} tools")
        messages.append(
            {
                "role": "assistant",
                "content": message.content or "",
                "tool_calls": [
                    {
                        "id": call.id,
                        "type": "function",
                        "function": {
                            "name": call.function.name,
                            "arguments": call.function.arguments,
                        },
                    }
                    for call in tool_calls
                ],
            }
        )

        async def execute_tool_call(call: Any) -> tuple[str, str, str]:
            logger.info(f"📞 Gọi tool: {call.function.name}")
            args_text = call.function.arguments or "{}"
            try:
                arguments = json.loads(args_text)
                logger.debug(f"Tool arguments: {arguments}")
            except json.JSONDecodeError:
                logger.warning("Failed to parse tool arguments, using empty dict")
                arguments = {}

            tool_result = await mcp_session.call_tool(call.function.name, arguments)
            normalized_result = _normalize_tool_result(tool_result)
            logger.debug(f"Tool result: {normalized_result[:200]}...")
            return call.id, call.function.name, normalized_result

        tool_results = await asyncio.gather(
            *[execute_tool_call(call) for call in tool_calls],
            return_exceptions=True,
        )

        if (
            round_num == 0
            and len(tool_calls) == 1
            and tool_calls[0].function.name in {"get_user_by_id", "run_raw_sql"}
            and _is_user_lookup_prompt(prompt)
        ):
            first_result = tool_results[0]
            if not isinstance(first_result, Exception):
                _, _, content = first_result
                try:
                    parsed = json.loads(content)
                except json.JSONDecodeError:
                    parsed = None
                user = _extract_user_record_from_payload(parsed)
                if user is not None:
                    logger.info("⚡ Short-circuit: trả lời trực tiếp từ tool result")
                    return _format_user_response(user)

        for result in tool_results:
            if isinstance(result, Exception):
                logger.error(f"❌ Tool execution failed: {result}")
                continue

            call_id, tool_name, content = result
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call_id,
                    "name": tool_name,
                    "content": content,
                }
            )

    logger.warning("⚠️ Đã hết max_rounds mà chưa có final response")
    return "No final response from model"


@log_async_execution
async def run_llm_with_mcp(
    prompt: str,
    model: str,
    max_rounds: int,
    llm_client: AsyncOpenAI | None = None,
    mcp_session: ClientSession | None = None,
    openai_tools: list[dict[str, Any]] | None = None,
) -> str:
    logger.info(f"🤖 Bắt đầu LLM conversation - Model: {model}, Max rounds: {max_rounds}")
    logger.info(f"📝 User prompt: {prompt[:100]}...")

    async def _run_with_session(session: ClientSession) -> str:
        fast_prompt = _is_user_lookup_prompt(prompt)
        user_id = _extract_user_id_from_prompt(prompt) if fast_prompt else None
        if user_id:
            start = time.perf_counter()
            user = await _fast_lookup_user(session, user_id)
            if user is not None:
                elapsed = time.perf_counter() - start
                logger.info(f"⚡ Fast-path user lookup thành công trong {elapsed:.3f}s")
                return _format_user_response(user)

        local_openai_tools = openai_tools
        if local_openai_tools is None:
            logger.info("🔌 Đã kết nối MCP session")
            mcp_tools = await session.list_tools()
            logger.info(f"📦 Tải được {len(mcp_tools.tools)} MCP tools")
            local_openai_tools = _to_openai_tools(mcp_tools)

        local_llm_client = llm_client or _build_llm_client()

        return await _run_llm_rounds(
            prompt=prompt,
            model=model,
            max_rounds=max_rounds,
            llm_client=local_llm_client,
            mcp_session=session,
            openai_tools=local_openai_tools,
        )

    if mcp_session is not None:
        return await _run_with_session(mcp_session)

    async with open_mcp_session() as owned_session:
        return await _run_with_session(owned_session)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="LLM client calling MCP tools")
    parser.add_argument("prompt", nargs="?", help="Prompt for the LLM")
    parser.add_argument("--model", default=os.getenv("LLM_MODEL", os.getenv("MODEL", "gpt-5-mini")))
    parser.add_argument("--max-rounds", type=int, default=6)
    return parser.parse_args()


@log_async_execution
async def _interactive_loop(model: str, max_rounds: int) -> None:
    logger.info("💬 Bắt đầu Interactive mode")
    llm_client = _build_llm_client()

    async with open_mcp_session() as mcp_session:
        mcp_tools = await mcp_session.list_tools()
        openai_tools = _to_openai_tools(mcp_tools)
        logger.info(f"📦 Cached {len(openai_tools)} tools cho interactive session")

        print("Interactive mode. Type 'exit' to quit.")
        while True:
            user_input = input("You: ").strip()
            if not user_input:
                continue
            if user_input.lower() in {"exit", "quit", "q"}:
                logger.info("👋 User thoát interactive mode")
                print("Bye")
                break

            answer = await run_llm_with_mcp(
                prompt=user_input,
                model=model,
                max_rounds=max_rounds,
                llm_client=llm_client,
                mcp_session=mcp_session,
                openai_tools=openai_tools,
            )
            print(f"AI: {answer}\n")


async def main() -> None:
    args = _parse_args()
    if args.prompt:
        answer = await run_llm_with_mcp(
            prompt=args.prompt,
            model=args.model,
            max_rounds=args.max_rounds,
        )
        print(answer)
        return

    await _interactive_loop(model=args.model, max_rounds=args.max_rounds)


if __name__ == "__main__":
    asyncio.run(main())
