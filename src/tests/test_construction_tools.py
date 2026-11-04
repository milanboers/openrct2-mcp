"""Normal-player workflow discovery, strict selections and independent action/readback results."""

from unittest.mock import Mock

import pytest
from fastmcp import Client

from openrct2_mcp.api_client import APIError, OpenRCT2API
from openrct2_mcp.client_helpers import call_object
from openrct2_mcp.mcp_server import create_server

SELECTION = {'x': 10, 'y': 20, 'base_z_game': 112, 'direction': 0, 'track_type': 0, 'sequence': 0}


@pytest.mark.anyio
async def test_footprint_and_selected_removal_keep_ride_zero_and_observed_effects():
    api = Mock(spec=OpenRCT2API)
    empty = {'ride_id': 0, 'elements_total': 0, 'elements': []}
    built = {'ride_id': 0, 'elements_total': 9, 'elements': [{'selection': SELECTION}]}
    api.get_ride_build_options.return_value = {'ride_types': [{'ride_type': 33, 'footprint_supported': True}]}
    api.get_ride_layout.return_value = built
    api.place_ride_footprint.return_value = {
        'ride_id': 0, 'cost_raw': 500, 'observed_before': empty, 'observed_after': built,
    }
    api.remove_track_piece.return_value = {
        'ride_id': 0, 'cost_raw': -100, 'observed_before': built, 'observed_after': empty,
    }

    async with Client(create_server(api)) as client:
        tools = {tool.name: tool for tool in await client.list_tools()}
        options = await call_object(client, 'get_ride_build_options')
        placed = await call_object(client, 'place_ride_footprint', ride_id=0, x=10, y=20, z=14, direction=0)
        layout = await call_object(client, 'get_ride_layout', ride_id=0, offset=0, limit=1)
        removed = await call_object(client, 'remove_track_piece', ride_id=0, selection=SELECTION)

    assert options['ride_types'] == [{'ride_type': 33, 'footprint_supported': True}]
    assert placed == {**api.place_ride_footprint.return_value, 'success': True, 'operation_outcome': 'confirmed',
                      'execution_status': 'completed', 'state_status': 'available'}
    assert layout == {'success': True, **built}
    assert removed['observed_after'] == empty
    assert removed['operation_outcome'] == 'confirmed'
    assert tools['get_ride_layout'].annotations.read_only_hint
    assert tools['remove_track_piece'].annotations.destructive_hint
    api.get_ride_build_options.assert_called_once_with()
    api.place_ride_footprint.assert_called_once_with(0, 10, 20, 14, 0)
    api.get_ride_layout.assert_called_once_with(0, 0, 1)
    api.remove_track_piece.assert_called_once_with(0, SELECTION)


@pytest.mark.anyio
@pytest.mark.parametrize('outcome', ['rejected', 'unknown'])
async def test_maze_rejection_or_unknown_outcome_is_never_retried(outcome):
    api = Mock(spec=OpenRCT2API)
    api.edit_maze_cell.side_effect = APIError('Inspect before retrying', outcome=outcome)

    async with Client(create_server(api)) as client:
        result = await call_object(client, 'edit_maze_cell', allow_failure=True, ride_id=0,
                                   x_game=640, y_game=656, z=14, direction=1,
                                   mode='build', expected_maze_entry=None)

    assert result == {'success': False, 'ride_id': 0, 'error': 'Inspect before retrying',
                      'operation_outcome': outcome, 'execution_status': outcome, 'state_status': 'not_requested'}
    api.edit_maze_cell.assert_called_once_with(0, 640, 656, 14, 1, 'build', None)


@pytest.mark.anyio
async def test_acknowledged_construction_does_not_lose_confirmation_when_readback_is_unavailable():
    api = Mock(spec=OpenRCT2API)
    api.remove_track_piece.return_value = {
        'ride_id': 0, 'observed_before': {}, 'observed_after': None, 'state_error': 'Inspection unavailable',
    }

    async with Client(create_server(api)) as client:
        result = await call_object(client, 'remove_track_piece', allow_failure=True, ride_id=0, selection=SELECTION)

    assert result == {**api.remove_track_piece.return_value, 'success': False, 'operation_outcome': 'confirmed',
                      'execution_status': 'completed', 'state_status': 'unavailable'}
    api.remove_track_piece.assert_called_once_with(0, SELECTION)


@pytest.mark.anyio
@pytest.mark.parametrize(('tool', 'arguments'), [
    ('get_ride_layout', {'ride_id': False}),
    ('get_ride_layout', {'ride_id': 0, 'limit': 257}),
    ('place_ride_footprint', {'ride_id': 0, 'x': 10, 'y': 20, 'z': 15, 'direction': 0}),
    ('remove_track_piece', {'ride_id': 0, 'selection': {**SELECTION, 'sequence': '0'}}),
    ('remove_track_piece', {'ride_id': 0, 'selection': {**SELECTION, 'ride_id': 9}}),
    ('edit_maze_cell', {'ride_id': 0, 'x_game': 641, 'y_game': 640, 'z': 14,
                        'direction': 0, 'mode': 'build', 'expected_maze_entry': None}),
    ('edit_maze_cell', {'ride_id': 0, 'x_game': 640, 'y_game': 640, 'z': 14,
                        'direction': 0, 'mode': 'build', 'expected_maze_entry': False}),
    ('place_path_tile', {'x': 1, 'y': 1, 'z': 14, 'surface_object': 0,
                         'railings_object': 0, 'slope_direction': True}),
    ('set_game_speed', {'speed': 5}),
])
async def test_construction_inputs_reject_unsafe_shapes_before_game_calls(tool, arguments):
    api = Mock(spec=OpenRCT2API)

    async with Client(create_server(api)) as client:
        result = await client.call_tool(tool, arguments, raise_on_error=False)

    assert result.is_error
    assert api.method_calls == [('close', (), {})]


@pytest.mark.anyio
async def test_path_sequence_sends_explicit_slope_and_stops_at_first_rejection():
    api = Mock(spec=OpenRCT2API)
    api.place_path_tile.side_effect = [
        {'cost_raw': 10, 'observed_before': {}, 'observed_after': {'paths': []}},
        APIError('Clearance rejected'),
    ]
    tiles = [{'x': 10, 'y': 20, 'z': 14, 'slope_direction': 2},
             {'x': 11, 'y': 20, 'z': 16}, {'x': 12, 'y': 20, 'z': 16}]

    async with Client(create_server(api)) as client:
        result = await call_object(client, 'place_path_sequence', allow_failure=True, tiles=tiles,
                                   surface_object=0, railings_object=1, is_queue=False)

    assert result['placed_count'] == 1
    assert result['failed_index'] == 1
    assert result['execution_status'] == 'partial'
    assert result['operation_outcome'] == 'rejected'
    assert api.place_path_tile.call_count == 2
    assert api.place_path_tile.call_args_list[0].kwargs == {
        **tiles[0], 'surface_object': 0, 'railings_object': 1, 'is_queue': False,
    }
    assert api.place_path_tile.call_args_list[1].kwargs['slope_direction'] is None


@pytest.mark.anyio
async def test_default_inventory_excludes_editor_debug_and_raw_behaviour_mutations():
    async with Client(create_server(Mock(spec=OpenRCT2API))) as client:
        tools = {tool.name: tool for tool in await client.list_tools()}

    assert not tools.keys() & {
        'replace_guest_flags_raw', 'resize_map', 'place_park_entrance', 'remove_park_entrance',
        'place_guest_spawn', 'set_editor_land_rights',
    }
    assert tools['set_game_speed'].input_schema['properties']['speed']['maximum'] == 4
