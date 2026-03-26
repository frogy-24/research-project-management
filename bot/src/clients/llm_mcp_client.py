import argparse
import asyncio
import json
import os
from typing import Any
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from openai import AsyncOpenAI

MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://127.0.0.1:9000/mcp")

load_dotenv()


@asynccontextmanager
async def open_mcp_session() -> Any:
    async with streamable_http_client(MCP_SERVER_URL) as (read_stream, write_stream, _):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            yield session


def _to_openai_tools(mcp_tools: Any) -> list[dict[str, Any]]:
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
    return tools


def _normalize_tool_result(result: Any) -> str:
    structured = getattr(result, "structuredContent", None)
    if structured is not None:
        return json.dumps(structured, ensure_ascii=True)

    content_items = getattr(result, "content", None)
    if content_items:
        texts: list[str] = []
        for item in content_items:
            text = getattr(item, "text", None)
            if text:
                texts.append(text)
        if texts:
            return "\n".join(texts)

    return str(result)


async def run_llm_with_mcp(prompt: str, model: str, max_rounds: int) -> str:
    base_url = os.getenv("OPENAI_BASE_URL") or os.getenv("COPILOT_API")
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key and base_url:
        api_key = os.getenv("COPILOT_API_KEY", "dummy-key")

    if not api_key:
        raise RuntimeError("Missing OPENAI_API_KEY (or set COPILOT_API to use dummy key fallback)")

    if base_url:
        llm_client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    else:
        llm_client = AsyncOpenAI(api_key=api_key)

    async with open_mcp_session() as mcp_session:
        mcp_tools = await mcp_session.list_tools()
        openai_tools = _to_openai_tools(mcp_tools)

        messages: list[dict[str, Any]] = [
            {
                "role": "system",
                "content": "You are an assistant that can call MCP tools when needed.",
            },
            {"role": "user", "content": prompt},
        ]

        for _ in range(max_rounds):
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
                return message.content or ""

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

            for call in tool_calls:
                args_text = call.function.arguments or "{}"
                try:
                    arguments = json.loads(args_text)
                except json.JSONDecodeError:
                    arguments = {}

                tool_result = await mcp_session.call_tool(call.function.name, arguments)
                normalized_result = _normalize_tool_result(tool_result)

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.id,
                        "name": call.function.name,
                        "content": normalized_result,
                    }
                )

    return "No final response from model"


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="LLM client calling MCP tools")
    parser.add_argument("prompt", nargs="?", help="Prompt for the LLM")
    parser.add_argument("--model", default=os.getenv("OPENAI_MODEL", "gpt-5-mini"))
    parser.add_argument("--max-rounds", type=int, default=6)
    return parser.parse_args()


async def _interactive_loop(model: str, max_rounds: int) -> None:
    print("Interactive mode. Type 'exit' to quit.")
    while True:
        user_input = input("You: ").strip()
        if not user_input:
            continue
        if user_input.lower() in {"exit", "quit", "q"}:
            print("Bye")
            break

        answer = await run_llm_with_mcp(
            prompt=user_input,
            model=model,
            max_rounds=max_rounds,
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