"""Guest smoke tests never reset parks, reuse outputs or build without consent."""

import asyncio
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastmcp import Client
from pydantic import ValidationError

spec = importlib.util.spec_from_file_location('guest_smoke_script', Path(__file__).resolve().parents[2] / 'scripts/guest_smoke_test.py')
script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(script)


def test_guest_smoke_cancellation_does_not_contact_game_or_create_output(tmp_path):
    output = tmp_path / 'smoke'
    with patch('sys.argv', ['guest_smoke_test.py', '--output-dir', str(output)]), \
         patch('builtins.input', return_value='no'), patch.object(script, 'run', AsyncMock()) as run:
        result = script.main()

    assert result == 130
    assert not output.exists()
    run.assert_not_awaited()


def test_guest_smoke_rejects_reused_output_before_game_contact(tmp_path):
    with patch('sys.argv', ['guest_smoke_test.py', '--output-dir', str(tmp_path), '--yes']), \
         patch.object(script, 'run', AsyncMock()) as run:
        result = script.main()

    assert result == 2
    run.assert_not_awaited()


def test_guest_smoke_records_partial_failure_without_retry_or_cleanup(tmp_path):
    output = tmp_path / 'smoke'
    with patch('sys.argv', ['guest_smoke_test.py', '--port', '8081', '--output-dir', str(output), '--yes']), \
         patch.object(script, 'run', AsyncMock(side_effect=RuntimeError('Ride 7 retained'))) as run:
        result = script.main()

    assert result == 1
    assert json.loads((output / 'failure.json').read_text()) == {'error': 'Ride 7 retained', 'partial_work_retained': True}
    run.assert_awaited_once_with(8081, output, 240)


@pytest.mark.parametrize('timeout', ['0', 'nan', 'inf'])
def test_guest_smoke_rejects_invalid_timeout_before_creating_output(tmp_path, timeout):
    output = tmp_path / 'smoke'
    with patch('sys.argv', ['guest_smoke_test.py', '--output-dir', str(output), '--timeout', timeout, '--yes']), \
         patch.object(script, 'run', AsyncMock()) as run:
        with pytest.raises(SystemExit):
            script.main()

    assert not output.exists()
    run.assert_not_awaited()


@pytest.fixture
def coaster_fixture():
    return script.CoasterFixture.model_validate_json((script.ROOT / 'scenarios/guest-coaster.json').read_text())


@pytest.fixture
def game_client():
    state = {'success': True, 'ride_id': 7, 'piece_count': 74, 'is_circuit_complete': True}
    responses = {
        'get_plugin_info': {'matches': True, 'protocol_compatible': True, 'park_name': 'sandbox', 'game_paused': False},
        'get_loaded_ride_objects': {'success': True, 'objects': [{'identifier': 'rct2.ride.ptct1', 'index': 15}]},
        'create_ride': {'success': True, 'ride_id': 7, 'current_endpoint': {'x': 118, 'y': 60, 'z': 14, 'direction': 0}},
        'place_track_sequence': {'success': True}, 'get_coaster_state': state,
        'place_entrance_exit': {'success': True}, 'start_ride_test': {'success': True},
        'get_ride_stats': {'ride_status': 'testing', 'game_paused': False, 'ratings_available': True,
                           'excitement': 5.07, 'intensity': 6.32, 'nausea': 3.43, 'vehicles': [{'velocity': 100}]},
    }
    client = MagicMock(spec=Client)
    client.call_tool = AsyncMock(side_effect=lambda name, args, **kwargs: SimpleNamespace(
        content=[SimpleNamespace(type='text', text=json.dumps(responses[name]))], is_error=False,
    ))
    return client, responses


def test_guest_smoke_builds_fixture_and_observes_operation_without_deleting_work(coaster_fixture, game_client):
    client, _ = game_client
    original = coaster_fixture.model_dump()

    built = asyncio.run(script.build_coaster(client, coaster_fixture, 180))

    assert len(coaster_fixture.segments) + 1 == 74
    assert coaster_fixture.model_dump() == original
    assert built['ride_id'] == 7
    assert built['state']['is_circuit_complete'] is True
    assert built['stats_samples'][0]['excitement'] == 5.07
    assert [call.args[0] for call in client.call_tool.call_args_list] == [
        'get_plugin_info', 'get_loaded_ride_objects', 'create_ride', 'place_track_sequence',
        'get_coaster_state', 'place_entrance_exit', 'get_coaster_state', 'start_ride_test',
        'get_ride_stats', 'get_coaster_state',
    ]
    created = client.call_tool.call_args_list[2].args[1]
    assert created['ride_object'] == 15
    assert (created['station_x'], created['station_y'], created['station_z']) == (119, 60, 14)
    assert client.call_tool.call_args_list[3].args[1]['expected_endpoint'] == {
        'x': 118, 'y': 60, 'z': 14, 'direction': 0,
    }


def test_guest_smoke_retains_partial_build_without_retry(coaster_fixture, game_client):
    client, responses = game_client
    responses['place_track_sequence'] = {'success': False, 'error': 'Obstructed', 'placed_count': 3}

    with pytest.raises(RuntimeError, match='ride 7 is retained'):
        asyncio.run(script.build_coaster(client, coaster_fixture, 180))

    assert [call.args[0] for call in client.call_tool.call_args_list] == [
        'get_plugin_info', 'get_loaded_ride_objects', 'create_ride', 'place_track_sequence',
    ]


@pytest.mark.parametrize('ride_id', [0, 7])
def test_guest_smoke_retains_identity_after_partial_creation(coaster_fixture, game_client, ride_id):
    client, responses = game_client
    responses['create_ride'] = {'success': False, 'ride_id': ride_id, 'operation_outcome': 'unknown',
                                'execution_status': 'partial', 'error': 'Station outcome unknown'}

    with pytest.raises(RuntimeError, match=f'ride {ride_id} is retained'):
        asyncio.run(script.build_coaster(client, coaster_fixture, 180))

    assert client.call_tool.call_count == 3


def test_guest_smoke_does_not_invent_identity_after_rejected_creation(coaster_fixture, game_client):
    client, responses = game_client
    responses['create_ride'] = {'success': False, 'error': 'Object unavailable'}

    with pytest.raises(RuntimeError, match='Object unavailable') as failure:
        asyncio.run(script.build_coaster(client, coaster_fixture, 180))

    assert 'retained' not in str(failure.value)
    assert client.call_tool.call_count == 3


def test_guest_smoke_requires_loaded_object_before_creation(coaster_fixture, game_client):
    client, responses = game_client
    responses['get_loaded_ride_objects'] = {'success': True, 'objects': []}

    with pytest.raises(RuntimeError, match='not loaded'):
        asyncio.run(script.build_coaster(client, coaster_fixture, 180))

    assert client.call_tool.call_count == 2


def test_guest_smoke_rejects_incompatible_plugin_before_mutation(coaster_fixture, game_client):
    client, responses = game_client
    responses['get_plugin_info']['matches'] = False

    with pytest.raises(RuntimeError, match='matching plugin'):
        asyncio.run(script.build_coaster(client, coaster_fixture, 180))

    assert client.call_tool.call_count == 1


def test_guest_smoke_fixture_rejects_unknown_track_names(coaster_fixture):
    invalid = coaster_fixture.model_dump()
    invalid['segments'][0]['track_type'] = 'TypoStation'

    with pytest.raises(ValidationError, match='Unknown track names'):
        script.CoasterFixture.model_validate(invalid)
