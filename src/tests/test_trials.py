"""Trial starting conditions retain partial work and never reset a park."""

import asyncio
import hashlib
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastmcp import Client

from openrct2_mcp.reference import ReferenceLayout
from openrct2_mcp.trials import TrialFixture, TrialPreparationError, prepare_trial

BENCHMARKS = Path(__file__).resolve().parents[2] / 'benchmarks'
INFO = {'matches': True, 'protocol_compatible': True}
PARK = {'park_name': 'sandbox', 'game_mode': 'normal', 'game_paused': False}
OBJECTS = {'objects': [{'identifier': 'rct2.ride.ptct1', 'index': 3}]}


def client_with_responses(*values):
    client = MagicMock(spec=Client)
    client.call_tool = AsyncMock(side_effect=[SimpleNamespace(
        is_error=False, content=[SimpleNamespace(type='text', text=json.dumps(value))],
    ) for value in values])
    return client


def fixture_and_reference(name):
    fixture = TrialFixture.model_validate_json((BENCHMARKS / 'fixtures' / f'{name}.json').read_text())
    reference = ReferenceLayout.model_validate_json((BENCHMARKS / 'references' / f'{fixture.reference}.json').read_text())
    return fixture, reference


@pytest.mark.parametrize('name', ['continue-coaster', 'obstructed-coaster', 'revise-coaster'])
def test_bundled_trial_inputs_have_valid_protected_prefixes(name):
    fixture, reference = fixture_and_reference(name)

    assert fixture.protected_prefix_pieces <= fixture.prefix_segments + 1 <= len(reference.segments) + 1
    assert fixture.brief.criteria.require_station_buildings is True
    assert '{ride_id}' in fixture.brief.prompt
    canonical = json.dumps(fixture.model_dump(exclude={'validation'}), sort_keys=True, separators=(',', ':')).encode()
    assert fixture.validation['input_sha256'] == hashlib.sha256(canonical).hexdigest()
    assert fixture.validation['reference_input_sha256'] == reference.validation['input_sha256']
    completion = ReferenceLayout.model_validate_json((BENCHMARKS / 'references/rated-coaster.json').read_text())
    assert fixture.validation['completion_reference_input_sha256'] == completion.validation['input_sha256']
    assert fixture.validation['protected_prefix_preserved'] is True
    assert fixture.validation['protected_rides_preserved'] is True
    assert fixture.validation['completed_ratings']['excitement'] >= fixture.brief.criteria.min_excitement
    assert fixture.validation['completed_ratings']['intensity'] <= fixture.brief.criteria.max_intensity


def test_obstruction_setup_creates_distinct_rides_and_preserves_initial_evidence():
    fixture, reference = fixture_and_reference('obstructed-coaster')
    endpoint = {'x': 118, 'y': 115, 'z': 14, 'direction': 0}
    obstacle = {'ride_id': 0, 'piece_count': 1, 'pieces': [{'trackType': 'EndStation'}]}
    target = {'ride_id': 1, 'piece_count': 8, 'pieces': [{'trackType': 'BeginStation'}]}
    client = client_with_responses(INFO, PARK, [], OBJECTS, {'ride_id': 0}, obstacle,
                                   {'ride_id': 1, 'current_endpoint': endpoint}, {}, target)

    report = asyncio.run(prepare_trial(client, fixture, reference))

    assert report['ride_id'] == 1
    assert report['created_ride_ids'] == [0, 1]
    assert report['protected_rides'] == [obstacle]
    assert report['initial_state'] == target
    assert report['protected_prefix_pieces'] == 8
    assert 'ride 1' in report['brief']['prompt'] and '{ride_id}' not in report['brief']['prompt']
    assert report['initial_stats_samples'] == []
    calls = client.call_tool.call_args_list
    assert [call.args[0] for call in calls] == [
        'get_plugin_info', 'get_park_status', 'list_all_rides', 'get_loaded_ride_objects',
        'create_ride', 'get_coaster_state', 'create_ride', 'place_track_sequence', 'get_coaster_state',
    ]
    assert calls[4].args[1]['station_x'] == 104
    assert calls[7].args[1]['expected_endpoint'] == endpoint
    assert len(calls[7].args[1]['segments']) == 7


def test_trial_refuses_existing_rides_before_creating_anything():
    fixture, reference = fixture_and_reference('continue-coaster')
    client = client_with_responses(INFO, PARK, [{'id': 5, 'name': 'Existing park work'}])

    with pytest.raises(RuntimeError, match='existing work is never deleted'):
        asyncio.run(prepare_trial(client, fixture, reference))

    assert client.call_tool.call_count == 3


def test_trial_retains_both_obstacle_and_target_on_partial_creation_failure():
    fixture, reference = fixture_and_reference('obstructed-coaster')
    client = client_with_responses(INFO, PARK, [], OBJECTS, {'ride_id': 0}, {'ride_id': 0},
                                   {'success': False, 'ride_id': 7, 'error': 'Station placement unknown'})

    with pytest.raises(TrialPreparationError, match='Station placement unknown') as failure:
        asyncio.run(prepare_trial(client, fixture, reference))

    assert failure.value.ride_ids == [0, 7]
    assert client.call_tool.call_count == 7


def test_revision_setup_waits_for_a_working_initial_ride_without_requiring_target_ratings():
    fixture, reference = fixture_and_reference('revise-coaster')
    state = {'ride_id': 7, 'is_circuit_complete': True}
    stats = {'ratings_available': True, 'excitement': 0.28, 'vehicles': [{'velocity': 100}]}
    client = client_with_responses(INFO, PARK, [], OBJECTS, {'ride_id': 7, 'current_endpoint': {}}, {},
                                   state, {}, {}, stats, state)

    report = asyncio.run(prepare_trial(client, fixture, reference))

    assert report['initial_stats_samples'] == [stats]
    assert report['protected_prefix_pieces'] == 3
    assert report['initial_state'] == state
    assert [call.args[0] for call in client.call_tool.call_args_list][-5:] == [
        'get_coaster_state', 'place_entrance_exit', 'start_ride_test', 'get_ride_stats', 'get_coaster_state',
    ]


@pytest.fixture
def setup_evidence():
    from openrct2_mcp.trials import TrialSetup

    fixture, _ = fixture_and_reference('obstructed-coaster')
    return TrialSetup(
        schema_version=1, run_kind='trial_setup', fixture_id=fixture.id, prepared_at='2026-11-03',
        ride_id=7, created_ride_ids=[6, 7], brief=fixture.brief, plugin=INFO,
        initial_state={'ride_id': 7, 'pieces': [{'index': 0}, {'index': 1}]},
        protected_prefix_pieces=2, protected_rides=[{'ride_id': 6, 'pieces': [{'index': 0}]}],
        initial_stats_samples=[], limitations=[],
    )


@pytest.mark.parametrize(('pieces', 'protected', 'expected'), [
    ([{'index': 0}, {'index': 1}, {'index': 2}], [{'ride_id': 6, 'pieces': [{'index': 0}]}], [True, True]),
    ([{'index': 0}, {'index': 99}], [{'ride_id': 6, 'pieces': [{'index': 0}]}], [False, True]),
    (None, [], [False, False]),
    ([{'index': 0}, {'index': 1}], [{'success': False, 'error': 'Ride not found'}], [True, False]),
])
def test_trial_preservation_checks_require_both_prefix_and_obstacles(setup_evidence, pieces, protected, expected):
    from openrct2_mcp.trials import preservation_checks

    checks = preservation_checks(setup_evidence, {'pieces': pieces}, protected)

    assert [check['passed'] for check in checks] == expected
