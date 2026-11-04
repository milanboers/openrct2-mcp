"""End-to-end integration test: Python MCP client <-> real TCP <-> plugin (JS).

The plugin runs in a node subprocess with a stubbed game API. Python owns a
real TCP listener, so the full wire contract is exercised without the game.
"""

import asyncio
import json
import shutil
from pathlib import Path

import pytest

from openrct2_mcp import mcp_server

TESTS_DIR = Path(__file__).resolve().parent
_has_node = shutil.which("node") is not None


@pytest.fixture
def anyio_backend():
    return 'asyncio'


@pytest.fixture
async def plugin_server(tmp_path):
    if not _has_node:
        pytest.skip('node is required for integration tests')
    with (tmp_path / 'plugin.log').open('wb') as log:
        proc = await asyncio.create_subprocess_exec(
            'node', str(TESTS_DIR / 'plugin_server.js'), '--tcp', stdout=asyncio.subprocess.PIPE, stderr=log,
        )
        try:
            bootstrap = json.loads(await asyncio.wait_for(proc.stdout.readline(), timeout=10))
            api = mcp_server.OpenRCT2API(host='127.0.0.1', port=bootstrap['port'])
            try:
                assert api.get_plugin_info()['park_name'] == bootstrap['park_name']
                yield api
            finally:
                api.close()
        finally:
            if proc.returncode is None:
                proc.terminate()
            try:
                await asyncio.wait_for(proc.wait(), timeout=5)
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()


@pytest.mark.anyio
async def test_full_build_flow(plugin_server) -> None:
    """Create a ride, build a station and track, query state, undo, list, delete."""
    from openrct2_mcp.coaster_tools import CoasterTools

    tools = CoasterTools(plugin_server)
    # 1. Create a ride. The game places the first station piece and classifies
    # it as an EndStation (it auto-assigns begin/middle/end by geometry).
    result = tools.create_ride(name="Integration", ride_type=52)
    assert isinstance(result, list)
    state = result[0]
    assert state["success"] is True
    assert state["ride_id"] == 1
    assert state["ride_type"] == 52
    assert state["ride_type_name"] == "Wooden Roller Coaster"
    assert len(state["pieces"]) == 1
    assert state["pieces"][0]["trackType"] == "EndStation"
    assert state["is_circuit_complete"] is False
    # The requested name is applied to the ride.
    rides = tools.list_all_rides()
    assert rides[0]["name"] == "Integration", f"ride name not applied: {rides}"

    # 2. An unknown piece is rejected.
    result = tools.place_track_segment(1, "Banana")
    assert result[0]["success"] is False
    assert result[0]["operation_outcome"] == "rejected"
    assert "Invalid track type" in result[0]["error_message"]

    # 3. Build a 4-piece station (the game keeps reclassifying as we extend it).
    for _ in range(2):
        result = tools.place_track_segment(1, "MiddleStation")
        assert result[0]["success"] is True
    result = tools.place_track_segment(1, "EndStation")
    assert result[0]["success"] is True
    assert result[0]["pieces"][-1]["trackType"] == "EndStation"
    assert len(result[0]["pieces"]) == 4
    assert "Flat" in [p["name"] for p in result[0]["valid_pieces"]]

    # 4. Lay two flat pieces of track.
    for _ in range(2):
        result = tools.place_track_segment(1, "Flat")
        assert result[0]["success"] is True
    assert len(result[0]["pieces"]) == 6
    assert result[0]["is_circuit_complete"] is False
    assert result[0]["current_endpoint"]["direction"] == 0
    # Predicted endpoints for each valid piece arrive merged into the state.
    flat = next((p for p in result[0]["valid_pieces"] if p["name"] == "Flat"), None)
    assert flat is not None, f"Flat missing from valid_pieces: {result[0]['valid_pieces']}"
    assert "endpoint" in flat
    assert "x" in flat["endpoint"] and "direction" in flat["endpoint"]

    # 5. State round-trip.
    result = tools.get_coaster_state(1)
    assert result[0]["success"] is True
    assert len(result[0]["pieces"]) == 6

    # 6. Undo the last piece.
    result = tools.undo_last_piece(1)
    assert result[0]["success"] is True
    assert len(result[0]["pieces"]) == 5

    # 7. List rides (id preserved), then delete all.
    rides = tools.list_all_rides()
    assert len(rides) == 1
    assert rides[0]["id"] == 1
    assert rides[0]["type"] == 52
    result = tools.delete_all_rides()
    assert result["success"] is True
    assert tools.list_all_rides() == []

@pytest.mark.anyio
async def test_mcp_serialization_and_revision_flow(plugin_server):
    from fastmcp import Client

    async with Client(mcp_server.create_server(plugin_server)) as client:
        async def call(tool_name, **arguments):
            result = await client.call_tool(tool_name, arguments)
            assert not result.is_error
            return json.loads(next(block.text for block in result.content if block.type == 'text'))

        tools = {tool.name: tool for tool in await client.list_tools()}
        assert tools['get_coaster_state'].annotations.read_only_hint is True
        assert tools['get_coaster_view'].annotations.read_only_hint is True
        assert tools['delete_ride'].annotations.destructive_hint is True
        created = await call('create_ride', name='MCP contract')
        assert created['operation_outcome'] == 'confirmed'
        ride_id = created['ride_id']
        state = await call('get_coaster_state', ride_id=ride_id, include_image=False, compact=True)
        assert state['piece_count'] == 1
        assert state['layout_status'] == 'complete'
        assert 'pieces' not in state
        for view in ('endpoint', 'elevation'):
            result = await client.call_tool('get_coaster_view', {'ride_id': ride_id, 'view': view})
            assert not result.is_error
            assert [block.type for block in result.content] == ['text', 'image']
            summary = json.loads(result.content[0].text)
            assert summary['success'] is True
            assert summary['view'] == view
            assert summary['piece_count'] == 1
        unchanged = await call('get_coaster_state', ride_id=ride_id, include_image=False, compact=True)
        assert unchanged == state
        assert (await call('start_ride_test', ride_id=ride_id))['success']
        assert (await call('close_ride', ride_id=ride_id))['operation_outcome'] == 'confirmed'
        assert (await call('undo_last_piece', ride_id=ride_id))['piece_count'] == 0
        assert (await call('delete_ride', ride_id=ride_id))['operation_outcome'] == 'confirmed'



@pytest.mark.anyio
async def test_flat_path_placement_guards_opening_and_checkpoint_through_mcp(plugin_server):
    from fastmcp import Client
    from openrct2_mcp.client_helpers import call_object

    async with Client(mcp_server.create_server(plugin_server)) as client:
        objects = await call_object(client, 'get_path_objects')
        assert objects['surfaces'][0]['identifier'] == 'test.surface'
        placed = await call_object(client, 'place_path_tile', x=90, y=90, z=14,
                                   surface_object=0, railings_object=0, is_queue=True)
        assert placed['operation_outcome'] == 'confirmed'
        path = placed['observed_after']['paths'][0]
        assert path['is_queue'] is True and path['base_z'] == 14
        assert path['surface_object'] == path['railings_object'] == 0
        rejected = await call_object(client, 'place_path_tile', allow_failure=True, x=90, y=90, z=14,
                                    surface_object=0, railings_object=0)
        assert rejected['operation_outcome'] == 'rejected'
        stale = await call_object(client, 'remove_path_tile', allow_failure=True, x=90, y=90, z=14,
                                 expected_path={**path, 'edges': 15})
        assert stale['operation_outcome'] == 'rejected'
        removed = await call_object(client, 'remove_path_tile', x=90, y=90, z=14, expected_path=path)
        assert removed['operation_outcome'] == 'confirmed' and removed['observed_after']['paths'] == []
        ride = await call_object(client, 'create_ride', include_image=False, compact=True)
        opened = await call_object(client, 'open_ride', ride_id=ride['ride_id'])
        assert opened['operation_outcome'] == 'confirmed'
        checkpoint = await call_object(client, 'save_park', label='contract')
        assert checkpoint['save_requested'] is True and checkpoint['file_written'] == 'unknown'
