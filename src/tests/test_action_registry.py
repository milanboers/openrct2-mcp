"""Contracts for reviewed generation, schemas and acknowledged setting readback."""

import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from unittest.mock import Mock

import pytest
from fastmcp import Client, FastMCP
from pydantic import ValidationError

from openrct2_mcp._action_tools import register_action_tools
from openrct2_mcp.api_client import APIError, OpenRCT2API
from openrct2_mcp.client_helpers import call_object

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('generate_actions', ROOT / 'scripts/generate_actions.py')
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)
REGISTRY = generator.load_registry()


def test_generated_actions_are_current():
    subprocess.run([sys.executable, str(ROOT / 'scripts/generate_actions.py'), '--check'], check=True)


def test_inventory_renders_multiline_descriptions_as_wrapping_list_items():
    descriptions = {
        'set_wait': 'Set the waiting time.\n\nThe game may adjust both bounds.',
        'choose_mode': 'Choose A | B\nwith\tspaces. More details.',
    }

    inventory = generator.inventory_source(descriptions)

    assert inventory == (
        '- `choose_mode` — Choose A | B with spaces.\n'
        '- `set_wait` — Set the waiting time.\n'
    )


@pytest.mark.parametrize('invalid', ['duplicate', 'unknown_field', 'bad_mapping', 'missing_readback'])
def test_registry_rejects_invalid_definitions(tmp_path, invalid):
    definition = json.loads((ROOT / 'src/openrct2_mcp/actions.json').read_text())
    if invalid == 'duplicate':
        definition['operations'].append(definition['operations'][0])
    elif invalid == 'unknown_field':
        definition['operations'][0]['arbitrary_action'] = 'cheatset'
    elif invalid == 'bad_mapping':
        definition['operations'][0]['arguments'][0]['action_field'] = 'status'
    else:
        next(op for op in definition['operations'] if op['response'] == 'readback').pop('readback')
    path = tmp_path / 'invalid.json'
    path.write_text(json.dumps(definition))

    with pytest.raises((ValueError, ValidationError)):
        generator.load_registry(path)


@pytest.mark.anyio
async def test_registry_tools_keep_typed_schemas_and_annotations():
    mcp = FastMCP('registry contract')
    register_action_tools(mcp, lambda: Mock(spec=OpenRCT2API))

    async with Client(mcp) as client:
        tools = {tool.name: tool for tool in await client.list_tools()}

    assert tools.keys() == {op.name for op in REGISTRY.operations}
    for operation in REGISTRY.operations:
        tool = tools[operation.name]
        assert tool.description == operation.description
        assert tool.annotations.read_only_hint is (operation.response == 'observation')
        assert tool.annotations.open_world_hint is False
        assert tool.annotations.destructive_hint is (False if operation.response == 'observation' else operation.destructive)
        assert tool.annotations.idempotent_hint is (operation.response == 'observation')
        assert tool.input_schema.get('required', []) == [arg.name for arg in operation.arguments]
        if operation.identity:
            assert tool.input_schema['properties'][operation.identity]['minimum'] == 0
    interval = tools['set_ride_inspection_interval'].input_schema['properties']['interval']
    assert interval['enum'] == ['every_10_minutes', 'every_20_minutes', 'every_30_minutes',
                                'every_45_minutes', 'every_hour', 'every_2_hours', 'never']
    seconds = tools['set_ride_minimum_waiting_time'].input_schema['properties']['seconds']
    assert seconds['minimum'] == 0 and seconds['maximum'] == 250
    assert tools['set_ride_name'].input_schema['properties']['name']['minLength'] == 1


@pytest.mark.anyio
@pytest.mark.parametrize('after,matches,state,success', [
    ({'minimum_waiting_time_seconds': 70, 'maximum_waiting_time_seconds': 70}, True, 'available', True),
    ({'minimum_waiting_time_seconds': 10, 'maximum_waiting_time_seconds': 60}, False, 'available', False),
    (None, None, 'unavailable', False),
])
async def test_setting_acknowledgement_is_separate_from_readback(after, matches, state, success):
    api = Mock(spec=OpenRCT2API)
    payload = {
        'ride_id': 0, 'requested': {'ride_id': 0, 'seconds': 70},
        'observed_before': {'minimum_waiting_time_seconds': 10, 'maximum_waiting_time_seconds': 60},
        'observed_after': after, 'readback_matches_request': matches,
    }
    api.set_ride_minimum_waiting_time.return_value = payload
    mcp = FastMCP('registry outcome contract')
    register_action_tools(mcp, lambda: api)

    async with Client(mcp) as client:
        result = await call_object(client, 'set_ride_minimum_waiting_time', allow_failure=True,
                                   ride_id=0, seconds=70)

    assert result == {**payload, 'success': success, 'operation_outcome': 'confirmed',
                      'execution_status': 'completed', 'state_status': state}
    api.set_ride_minimum_waiting_time.assert_called_once_with(0, 70)


@pytest.mark.anyio
@pytest.mark.parametrize('outcome', ['rejected', 'unknown'])
async def test_setting_error_preserves_ride_zero_and_does_not_retry(outcome):
    api = Mock(spec=OpenRCT2API)
    api.set_ride_name.side_effect = APIError('Game refusal', outcome=outcome, details={'code': 9})
    mcp = FastMCP('registry error contract')
    register_action_tools(mcp, lambda: api)

    async with Client(mcp) as client:
        result = await call_object(client, 'set_ride_name', allow_failure=True, ride_id=0, name='New name')

    assert result == {'success': False, 'ride_id': 0, 'error': 'Game refusal', 'error_details': {'code': 9},
                      'operation_outcome': outcome, 'execution_status': outcome, 'state_status': 'not_requested'}
    api.set_ride_name.assert_called_once_with(0, 'New name')


def test_generated_api_rejects_malformed_acknowledgement_without_retry():
    api = OpenRCT2API()
    api._send_request = Mock(return_value='not an object')

    with pytest.raises(APIError) as error:
        api.set_ride_name(0, 'New name')

    assert error.value.outcome == 'unknown'
    api._send_request.assert_called_once_with('setRideName', {'rideId': 0, 'name': 'New name'})


@pytest.mark.parametrize('method,endpoint,arguments,params', [
    ('get_ride_operating_settings', 'getRideOperatingSettings', (0,), {'rideId': 0}),
    ('get_ride_maintenance_status', 'getRideMaintenanceStatus', (0,), {'rideId': 0}),
    ('get_loaded_music_objects', 'getLoadedMusicObjects', (), {}),
])
def test_registered_observations_do_not_run_mutation_preflight(method, endpoint, arguments, params):
    api = OpenRCT2API()
    api._exchange = Mock(return_value={'observation': 'available'})

    assert getattr(api, method)(*arguments) == {'observation': 'available'}

    api._exchange.assert_called_once_with(endpoint, params, 5.0)


@pytest.mark.anyio
async def test_registered_observation_failure_has_no_mutation_outcome():
    api = Mock(spec=OpenRCT2API)
    api.get_ride_operating_settings.side_effect = APIError('Ride not found')
    mcp = FastMCP('registry read error contract')
    register_action_tools(mcp, lambda: api)

    async with Client(mcp) as client:
        result = await call_object(client, 'get_ride_operating_settings', allow_failure=True, ride_id=0)

    assert result == {'success': False, 'ride_id': 0, 'error': 'Ride not found'}
    api.get_ride_operating_settings.assert_called_once_with(0)


def test_pinned_build_metadata_retains_normal_flags_and_footprint_connections():
    surface = json.loads((ROOT / 'docs/game-api-surface.json').read_text())
    rows = {row['ride_type']: row for row in surface['ride_build_types']}

    assert sum(row['footprint_supported'] for row in rows.values()) == 24
    assert rows[33]['track_type'] == 266
    assert rows[33]['connection_sides'][0] == []
    assert rows[33]['connection_sides'][6] == [2, 3]
    assert rows[52]['has_entrance_and_exit'] is True  # Includes shared native flags.
    assert rows[52]['allow_reversed_trains'] is True
    assert rows[52]['allow_multiple_circuits'] is True
    assert rows[52]['allow_music'] is True
    assert 49 not in rows[52]['track_groups']  # Booster is cheat-extra for wooden.
    assert surface['ride_entry_flags']['noReverseOption'] == 1 << 23
