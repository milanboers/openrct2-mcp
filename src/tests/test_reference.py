"""Reference calibration inputs and observable construction/retention behaviour."""

import asyncio
import hashlib
from copy import deepcopy
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastmcp import Client
from pydantic import ValidationError

from openrct2_mcp.benchmark import BenchmarkBrief
from openrct2_mcp.reference import ReferenceLayout, build_reference

BENCHMARKS = Path(__file__).resolve().parents[2] / 'benchmarks'


@pytest.mark.parametrize('name', ['working-coaster', 'compact-coaster', 'rated-coaster'])
def test_reference_inputs_match_their_briefs_and_record_validation(name):
    brief = BenchmarkBrief.model_validate_json((BENCHMARKS / f'{name}.json').read_text())
    reference = ReferenceLayout.model_validate_json((BENCHMARKS / 'references' / f'{name}.json').read_text())

    assert reference.brief_id == brief.id
    assert reference.ride_type == brief.criteria.ride_type
    assert reference.ride_object_identifier == 'rct2.ride.ptct1'
    assert reference.validation['plugin_version'] == '0.11.0'
    assert 1 <= len(reference.segments) <= 256
    canonical = json.dumps(reference.model_dump(exclude={'validation'}), sort_keys=True, separators=(',', ':')).encode()
    assert reference.validation['input_sha256'] == hashlib.sha256(canonical).hexdigest()
    measured = reference.validation['footprint_bounds']
    bounds = brief.criteria.footprint_bounds
    assert bounds.min_x <= measured['min_x'] <= measured['max_x'] <= bounds.max_x
    assert bounds.min_y <= measured['min_y'] <= measured['max_y'] <= bounds.max_y


@pytest.fixture
def inputs():
    return (
        BenchmarkBrief.model_validate_json((BENCHMARKS / 'working-coaster.json').read_text()),
        ReferenceLayout.model_validate_json((BENCHMARKS / 'references' / 'working-coaster.json').read_text()),
    )


@pytest.fixture
def client():
    state = {'success': True, 'ride_id': 7, 'ride_type': 52, 'piece_count': 42, 'layout_status': 'complete',
             'is_circuit_complete': True,
             'stations': [{'entrance': {'status': 'present'}, 'exit': {'status': 'present'}}], 'track_elements': [{'x': 67, 'y': 66, 'z': 14}]}
    responses = {
        'get_plugin_info': {'matches': True, 'protocol_compatible': True, 'park_name': 'sandbox'},
        'get_loaded_ride_objects': {'success': True, 'objects': [{'identifier': 'rct2.ride.ptct1', 'index': 15}]},
        'create_ride': {'success': True, 'ride_id': 7, 'current_endpoint': {'x': 66, 'y': 66, 'z': 14, 'direction': 0}},
        'place_track_sequence': {'success': True}, 'get_coaster_state': state,
        'place_entrance_exit': {'success': True}, 'start_ride_test': {'success': True},
        'get_ride_stats': {'ride_status': 'testing', 'game_paused': False, 'ratings_available': True,
                           'excitement': 0.28, 'intensity': 0.3, 'nausea': 0.17, 'vehicles': [{'velocity': 100}]},
    }
    client = MagicMock(spec=Client)
    client.call_tool = AsyncMock(side_effect=lambda name, args, **kwargs: SimpleNamespace(
        content=[SimpleNamespace(type='text', text=json.dumps(responses[name]))], is_error=False,
    ))
    return client, responses


def test_reference_builds_only_a_new_ride_and_preserves_input_and_evidence(inputs, client):
    brief, layout = inputs
    client, _ = client

    report = asyncio.run(build_reference(client, brief, layout))

    assert report['passed'] is True
    assert report['run_kind'] == 'reference_validation'
    assert report['reference'] == layout.model_dump()
    assert report['evidence']['state']['ride_id'] == 7
    assert report['evidence']['stats_samples'][0]['excitement'] == 0.28
    assert [call.args[0] for call in client.call_tool.call_args_list] == [
        'get_plugin_info', 'get_loaded_ride_objects', 'create_ride', 'place_track_sequence',
        'get_coaster_state', 'place_entrance_exit', 'get_coaster_state', 'start_ride_test', 'get_ride_stats', 'get_coaster_state',
    ]
    assert client.call_tool.call_args_list[2].args[1]['ride_object'] == 15
    assert client.call_tool.call_args_list[3].args[1]['expected_endpoint'] == {
        'x': 66, 'y': 66, 'z': 14, 'direction': 0,
    }


def test_reference_retains_partial_build_on_placement_rejection(inputs, client):
    brief, layout = inputs
    client, responses = client
    responses['place_track_sequence'] = {'success': False, 'error': 'Obstructed', 'placed_count': 3}

    with pytest.raises(RuntimeError, match='ride 7 is retained'):
        asyncio.run(build_reference(client, brief, layout))

    assert [call.args[0] for call in client.call_tool.call_args_list] == [
        'get_plugin_info', 'get_loaded_ride_objects', 'create_ride', 'place_track_sequence',
    ]


def test_reference_rejects_mismatched_brief_before_contacting_the_game(inputs, client):
    brief, layout = inputs
    client, _ = client
    other = layout.model_copy(update={'brief_id': 'another-brief'})

    with pytest.raises(ValueError, match='must match'):
        asyncio.run(build_reference(client, brief, other))

    client.call_tool.assert_not_called()


def test_reference_requires_its_loaded_object_before_creating_a_ride(inputs, client):
    brief, layout = inputs
    client, responses = client
    responses['get_loaded_ride_objects'] = {'success': True, 'objects': []}

    with pytest.raises(RuntimeError, match='not loaded'):
        asyncio.run(build_reference(client, brief, layout))

    assert [call.args[0] for call in client.call_tool.call_args_list] == ['get_plugin_info', 'get_loaded_ride_objects']


def test_reference_rejects_unknown_track_names_before_mutation(inputs):
    _, layout = inputs
    invalid = deepcopy(layout.model_dump())
    invalid['segments'][0]['track_type'] = 'TypoStation'

    with pytest.raises(ValidationError, match='Unknown track names'):
        ReferenceLayout.model_validate(invalid)


@pytest.mark.parametrize('ride_id', [0, 7])
def test_reference_reports_retained_ride_when_creation_stops_after_allocating_it(inputs, client, ride_id):
    brief, layout = inputs
    client, responses = client
    responses['create_ride'] = {
        'success': False, 'ride_id': ride_id, 'operation_outcome': 'unknown',
        'execution_status': 'partial', 'error': 'Station outcome unknown',
    }

    with pytest.raises(RuntimeError, match=f'ride {ride_id} is retained'):
        asyncio.run(build_reference(client, brief, layout))

    assert [call.args[0] for call in client.call_tool.call_args_list] == [
        'get_plugin_info', 'get_loaded_ride_objects', 'create_ride',
    ]


def test_reference_does_not_invent_a_retained_ride_after_creation_rejection(inputs, client):
    brief, layout = inputs
    client, responses = client
    responses['create_ride'] = {'success': False, 'error': 'Object unavailable'}

    with pytest.raises(RuntimeError, match='Object unavailable') as failure:
        asyncio.run(build_reference(client, brief, layout))

    assert 'retained' not in str(failure.value)
    assert client.call_tool.call_count == 3
