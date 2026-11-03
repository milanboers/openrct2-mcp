"""Shared MCP response decoding, including actionable partial failures."""

import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from openrct2_mcp.client_helpers import MCPResponseError, call_json, call_object


def client_with(text, *, is_error=False):
    return SimpleNamespace(call_tool=AsyncMock(return_value=SimpleNamespace(
        content=[SimpleNamespace(type='image'), SimpleNamespace(type='text', text=text)], is_error=is_error,
    )))


def test_call_object_ignores_image_blocks_and_passes_arguments_without_default_error_raising():
    client = client_with('{"ride_id":7}')

    assert asyncio.run(call_object(client, 'create_ride', name='café')) == {'ride_id': 7}
    client.call_tool.assert_awaited_once_with('create_ride', {'name': 'café'}, raise_on_error=False)


@pytest.mark.parametrize(('text', 'is_error', 'message', 'payload', 'ride_id'), [
    ('invalid json', False, 'Invalid JSON', None, None),
    ('Tool argument validation failed', True, 'Tool argument validation failed', None, None),
    ('{"success":false,"ride_id":7}', False, 'Failed', {'success': False, 'ride_id': 7}, 7),
    ('{"success":false,"ride_id":0}', True, 'Failed', {'success': False, 'ride_id': 0}, 0),
])
def test_call_failures_preserve_error_text_and_known_ride_identity(text, is_error, message, payload, ride_id):
    client = client_with(text, is_error=is_error)

    with pytest.raises(MCPResponseError, match=message) as failure:
        asyncio.run(call_json(client, 'create_ride'))

    assert failure.value.tool == 'create_ride'
    assert failure.value.payload == payload
    assert failure.value.ride_id == ride_id


def test_call_json_can_inspect_a_domain_rejection_without_masking_it():
    payload = {'success': False, 'placed_count': 2}
    client = client_with(json.dumps(payload))

    assert asyncio.run(call_json(client, 'place_track_sequence', allow_failure=True)) == payload
