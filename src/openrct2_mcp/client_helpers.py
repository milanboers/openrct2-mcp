"""Decode this server's MCP text/image results without losing failure metadata."""

import json
from typing import Any

from fastmcp import Client


class MCPResponseError(RuntimeError):
    def __init__(self, tool: str, message: str, payload: Any = None):
        super().__init__(f'{tool}: {message}')
        self.tool = tool
        self.payload = payload
        value = payload.get('ride_id') if isinstance(payload, dict) else None
        self.ride_id = value if isinstance(value, int) and not isinstance(value, bool) else None


async def call_json(client: Client, tool: str, *, allow_failure: bool = False, **arguments: Any) -> Any:
    result = await client.call_tool(tool, arguments, raise_on_error=False)
    text = next((block.text for block in result.content if block.type == 'text'), None)
    if text is None:
        if not result.content and not result.is_error:
            return []  # FastMCP represents an empty list as no content blocks.
        raise MCPResponseError(tool, 'No JSON text response')
    try:
        value = json.loads(text)
    except ValueError as error:
        message = text if result.is_error else 'Invalid JSON text response'
        raise MCPResponseError(tool, message) from error
    if result.is_error or (isinstance(value, dict) and value.get('success') is False and not allow_failure):
        raise MCPResponseError(tool, f'Failed: {json.dumps(value)}', value)
    return value


async def call_object(client: Client, tool: str, **arguments: Any) -> dict[str, Any]:
    value = await call_json(client, tool, **arguments)
    if not isinstance(value, dict):
        raise MCPResponseError(tool, 'Expected a JSON object', value)
    return value
