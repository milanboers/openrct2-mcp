"""Independent MCP applications and strict custom-tool inputs."""

import asyncio
from unittest.mock import Mock

from fastmcp import Client
import pytest

from openrct2_mcp.api_client import OpenRCT2API
from openrct2_mcp.client_helpers import call_json, call_object
from openrct2_mcp.mcp_server import create_server


def test_servers_keep_clients_independent_and_close_them_at_lifespan_exit():
    first = Mock(spec=OpenRCT2API)
    second = Mock(spec=OpenRCT2API)
    first.list_all_rides.return_value = [{'id': 0, 'name': 'First', 'type': 52}]
    second.list_all_rides.return_value = [{'id': 7, 'name': 'Second', 'type': 52}]

    async def scenario():
        async with Client(create_server(first)) as a, Client(create_server(second)) as b:
            assert (await call_json(a, 'list_all_rides'))[0]['name'] == 'First'
            assert (await call_json(b, 'list_all_rides'))[0]['name'] == 'Second'
            assert {t.name for t in await a.list_tools()} == {t.name for t in await b.list_tools()}
            first.close.assert_not_called()
            second.close.assert_not_called()

    asyncio.run(scenario())

    first.list_all_rides.assert_called_once_with()
    second.list_all_rides.assert_called_once_with()
    first.close.assert_called_once_with()
    second.close.assert_called_once_with()


@pytest.mark.parametrize(('tool', 'arguments'), [
    ('remove_terminal_piece', {'ride_id': False}),
    ('remove_terminal_piece', {'ride_id': '0'}),
    ('remove_terminal_piece', {'ride_id': 0.0}),
    ('remove_terminal_piece', {'ride_id': 65535}),
    ('create_ride', {'station_x': True}),
    ('create_ride', {'direction': False}),
    ('place_track_segment', {'ride_id': 0, 'track_type': 'Flat', 'brake_speed': True}),
    ('place_track_sequence', {'ride_id': 0, 'segments': [{'track_type': 'Flat', 'has_chain_lift': 'false'}]}),
    ('place_track_segment', {'ride_id': 0, 'track_type': 'Flat', 'expected_endpoint': {
        'x': 67, 'y': 66, 'z': 14, 'direction': False,
    }}),
    ('place_path_tile', {'x': 10, 'y': 20, 'z': True, 'surface_object': 0, 'railings_object': 0}),
    ('place_path_sequence', {'tiles': [{'x': '10', 'y': 20, 'z': 14}], 'surface_object': 0, 'railings_object': 0}),
    ('place_station_building', {'ride_id': 0, 'building': 'exit', 'x': 10, 'y': 20, 'direction': False}),
    ('set_ride_price', {'ride_id': 0, 'price_raw': 10, 'expected_price_raw': 0, 'allow_shared_price_changes': 'true'}),
    ('set_ride_price', {'ride_id': 0, 'price_raw': 10, 'expected_price_raw': 0, 'price_index': False}),
])
def test_custom_tools_reject_coercion_before_calling_the_game(tool, arguments):
    api = Mock(spec=OpenRCT2API)

    async def scenario():
        async with Client(create_server(api)) as client:
            result = await client.call_tool(tool, arguments, raise_on_error=False)
            assert result.is_error
            assert api.method_calls == []

    asyncio.run(scenario())


def test_strict_ride_ids_still_accept_zero_for_removal():
    api = Mock(spec=OpenRCT2API)
    api.delete_last_track_piece.return_value = {}
    api.get_coaster_state.return_value = {'history': [], 'validPieces': [], 'rideType': 52}

    async def scenario():
        async with Client(create_server(api)) as client:
            return await call_object(client, 'remove_terminal_piece', ride_id=0, include_image=False)

    result = asyncio.run(scenario())

    assert result['ride_id'] == 0
    assert result['operation_outcome'] == 'confirmed'
    api.delete_last_track_piece.assert_called_once_with(0, include_state=True)
