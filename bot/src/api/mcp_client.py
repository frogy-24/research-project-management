"""
MCP Client helper - gọi MCP tools từ các API routes
"""

from typing import Any
from contextlib import asynccontextmanager

from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)

MCP_SERVER_URL = "http://127.0.0.1:9000/mcp"


@asynccontextmanager
async def open_mcp_session():
    client = streamable_http_client(MCP_SERVER_URL)
    async with client as (read_stream, write_stream, _):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            yield session


@log_async_execution
async def call_mcp_tool(tool_name: str, arguments: dict[str, Any]) -> Any:
    logger.info(f"🔧 Gọi MCP tool: {tool_name}")
    logger.debug(f"Tool arguments: {arguments}")

    async with open_mcp_session() as session:
        result = await session.call_tool(tool_name, arguments)

    structured = getattr(result, "structuredContent", None)
    if structured is not None:
        logger.debug("Trả về structured content")
        return structured

    return result