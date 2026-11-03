"""Flat-path, guest observation and checkpoint contracts through MCP."""

import asyncio
import re
from unittest.mock import Mock

from fastmcp import Client, FastMCP
import pytest

from openrct2_mcp.api_client import APIError, OpenRCT2API
from openrct2_mcp.client_helpers import call_object
from openrct2_mcp.park_tools import register_park_tools


@pytest.fixture
def tools():
    api = Mock(spec=OpenRCT2API)
    report = Mock()
    mcp = FastMCP('Park tool contract')
    register_park_tools(mcp, lambda: api, report)
    return mcp, api, report


def test_path_operations_and_opening_preserve_observations_and_action_outcomes(tools):
    mcp, api, _ = tools
    observed = {'x': 10, 'y': 20, 'radius': 1, 'paths': [{'x': 10, 'y': 20, 'base_z': 14}]}
    api.get_path_objects.return_value = {'surfaces': [{'index': 2}], 'railings': [{'index': 3}]}
    api.get_path_area.return_value = observed
    api.place_path_tile.return_value = {'observed_before': {}, 'observed_after': observed, 'cost_raw': 100}
    api.remove_path_tile.return_value = {'observed_before': observed, 'observed_after': {}, 'cost_raw': -50}

    async def scenario():
        async with Client(mcp) as client:
            objects = await call_object(client, 'get_path_objects')
            area = await call_object(client, 'get_path_area', x=10, y=20, radius=1)
            placed = await call_object(client, 'place_path_tile', x=10, y=20, z=14,
                                       surface_object=2, railings_object=3, is_queue=True)
            removed = await call_object(client, 'remove_path_tile', x=10, y=20, z=14,
                                        expected_path=area['paths'][0])
            opened = await call_object(client, 'open_ride', ride_id=7)
        return objects, area, placed, removed, opened

    objects, area, placed, removed, opened = asyncio.run(scenario())

    assert objects['surfaces'] == [{'index': 2}]
    assert area == {'success': True, **observed}
    assert placed['observed_after'] == observed
    assert placed['operation_outcome'] == removed['operation_outcome'] == opened['operation_outcome'] == 'confirmed'
    assert placed['state_status'] == removed['state_status'] == 'available'
    assert removed['cost_raw'] == -50
    api.place_path_tile.assert_called_once_with(x=10, y=20, z=14, surface_object=2, railings_object=3, is_queue=True)
    api.remove_path_tile.assert_called_once_with(x=10, y=20, z=14, expected_path=observed['paths'][0])
    api.open_ride.assert_called_once_with(7)


@pytest.mark.parametrize(('outcome', 'status'), [('rejected', 'rejected'), ('unknown', 'unknown')])
def test_path_placement_preserves_expected_failures_without_retry(tools, outcome, status):
    mcp, api, _ = tools
    api.place_path_tile.side_effect = APIError('Path unavailable', outcome=outcome, details={'code': 9})

    async def scenario():
        async with Client(mcp) as client:
            return await call_object(client, 'place_path_tile', allow_failure=True,
                                     x=10, y=20, z=14, surface_object=2, railings_object=3)

    result = asyncio.run(scenario())

    assert result['execution_status'] == status
    assert result['error_details'] == {'code': 9}
    assert api.place_path_tile.call_count == 1


def test_confirmed_path_action_survives_missing_readback(tools):
    mcp, api, _ = tools
    api.place_path_tile.return_value = {'observed_after': None, 'state_error': 'Inspection unavailable'}

    async def scenario():
        async with Client(mcp) as client:
            return await call_object(client, 'place_path_tile', allow_failure=True,
                                     x=10, y=20, z=14, surface_object=2, railings_object=3)

    result = asyncio.run(scenario())

    assert result['success'] is False
    assert result['operation_outcome'] == 'confirmed'
    assert result['state_status'] == 'unavailable'
    assert result['state_error'] == 'Inspection unavailable'


@pytest.mark.parametrize(('counts', 'ride_type', 'status', 'paused', 'delta', 'completed'), [
    ([0, 2], 52, 'open', False, 2, True),
    ([2, 2], 52, 'open', False, 0, False),
    ([2, 0], 52, 'open', False, None, False),
    ([None, 2], 52, 'open', False, None, False),
    ([0, 2], 51, 'open', False, 2, False),
    ([0, 2], 52, 'testing', False, 2, False),
    ([0, 2], 52, 'open', True, 2, False),
])
def test_guest_observations_distinguish_completion_from_missing_or_unsupported_evidence(
    tools, counts, ride_type, status, paused, delta, completed,
):
    mcp, _, report = tools
    report.return_value = {
        'success': True, 'ride_type': ride_type, 'ready': False,
        'observations': [{'stats': {'total_customers': count, 'ride_status': status, 'game_paused': paused}}
                         for count in counts],
    }

    async def scenario():
        async with Client(mcp) as client:
            return await call_object(client, 'get_ride_guest_report', ride_id=7, observe_seconds=2)

    result = asyncio.run(scenario())

    assert result['customer_delta'] == delta
    assert result['completed_customers_observed'] is completed
    assert result['guest_access'] == 'unknown'
    assert result['observations'] == report.return_value['observations']
    report.assert_called_once_with(7, observe_seconds=2)


def test_checkpoint_uses_a_fresh_basename_and_does_not_claim_disk_persistence(tools):
    mcp, api, _ = tools
    api.save_park.side_effect = lambda name: {'filename': name + '.park', 'file_written': 'unknown'}

    async def scenario():
        async with Client(mcp) as client:
            first = await call_object(client, 'save_park', label='guest-test')
            second = await call_object(client, 'save_park', label='guest-test')
            rejected = await call_object(client, 'save_park', label='../existing', allow_failure=True)
        return first, second, rejected

    first, second, rejected = asyncio.run(scenario())

    assert re.fullmatch(r'mcp-guest-test-[a-f0-9]{32}\.park', first['filename'])
    assert first['filename'] != second['filename']
    assert first['file_written'] == 'unknown'
    assert first['operation_outcome'] == 'confirmed'
    assert rejected['operation_outcome'] == 'rejected'
    assert api.save_park.call_count == 2


def test_unknown_checkpoint_retains_filename_for_inspection_without_retry(tools):
    mcp, api, _ = tools
    api.save_park.side_effect = APIError('Connection lost', outcome='unknown')

    async def scenario():
        async with Client(mcp) as client:
            return await call_object(client, 'save_park', label='uncertain', allow_failure=True)

    result = asyncio.run(scenario())

    assert result['operation_outcome'] == 'unknown'
    assert result['filename'] == api.save_park.call_args.args[0] + '.park'
    assert api.save_park.call_count == 1
