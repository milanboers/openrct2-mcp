"""Acceptance scoring for benchmark evidence, not coaster design rules."""

from copy import deepcopy
from pathlib import Path

import pytest
from pydantic import ValidationError

from openrct2_mcp.benchmark import BenchmarkBrief, evaluate_ride

BRIEFS = Path(__file__).resolve().parents[2] / 'benchmarks'


@pytest.fixture
def state():
    return {
        'success': True, 'ride_id': 7, 'ride_type': 52, 'piece_count': 42,
        'layout_status': 'complete', 'is_circuit_complete': True,
        'track_elements': [{'x': 20, 'y': 20, 'z': 14}, {'x': 125, 'y': 125, 'z': 14}],
    }


@pytest.fixture
def stats():
    return {'ride_status': 'testing', 'game_paused': False, 'ratings_available': True,
            'excitement': 3.0, 'intensity': 8.0, 'nausea': 1.0, 'vehicles': [{'velocity': 1234}]}


@pytest.mark.parametrize('filename', ['working-coaster.json', 'compact-coaster.json', 'rated-coaster.json'])
def test_bundled_briefs_validate(filename):
    brief = BenchmarkBrief.model_validate_json((BRIEFS / filename).read_text())

    assert brief.id == Path(filename).stem
    assert brief.park_name == 'sandbox'
    assert brief.criteria.ride_type == 52


def test_working_ride_passes_with_movement_observed_before_station_stop(state, stats):
    brief = BenchmarkBrief.model_validate_json((BRIEFS / 'working-coaster.json').read_text())
    stopped = {**stats, 'vehicles': [{'velocity': 0}]}

    result = evaluate_ride(brief, state, [stats, stopped])

    assert result['passed'] is True
    assert all(check['passed'] for check in result['checks'])
    assert result['brief'] == brief.model_dump()
    assert result['measurements'] == {
        'piece_count': 42, 'footprint_bounds': {'min_x': 20, 'max_x': 125, 'min_y': 20, 'max_y': 125},
        'ratings': {'excitement': 3.0, 'intensity': 8.0, 'nausea': 1.0},
        'stats_sample_count': 2, 'agent_tool_calls': None, 'rejected_placements': None,
    }


@pytest.mark.parametrize(('change', 'failed_check'), [
    ({'success': False}, 'state_available'),
    ({'ride_type': 51}, 'ride_type'),
    ({'layout_status': 'disconnected'}, 'connected_layout'),
    ({'is_circuit_complete': False}, 'closed_circuit'),
    ({'track_elements': None}, 'footprint_bounds'),
    ({'track_elements': [{'x': 126, 'y': 20, 'z': 14}]}, 'footprint_bounds'),
])
def test_ride_requirements_fail_independently(state, stats, change, failed_check):
    brief = BenchmarkBrief.model_validate_json((BRIEFS / 'working-coaster.json').read_text())

    result = evaluate_ride(brief, {**state, **change}, [stats])

    assert result['passed'] is False
    assert [check['name'] for check in result['checks'] if not check['passed']] == [failed_check]


@pytest.mark.parametrize(('change', 'failed_check'), [
    ({'game_paused': True}, 'running_unpaused'),
    ({'ride_status': 'closed'}, 'running_unpaused'),
    ({'ratings_available': False}, 'ratings_available'),
    ({'vehicles': [{'velocity': 0}, {'velocity': None}]}, 'observed_train_movement'),
    ({'vehicles': [{'velocity': 'unknown'}]}, 'observed_train_movement'),
])
def test_operational_requirements_fail_independently(state, stats, change, failed_check):
    brief = BenchmarkBrief.model_validate_json((BRIEFS / 'working-coaster.json').read_text())

    result = evaluate_ride(brief, state, [{**stats, **change}])

    assert result['passed'] is False
    assert [check['name'] for check in result['checks'] if not check['passed']] == [failed_check]


@pytest.mark.parametrize(('excitement', 'intensity', 'failed_checks'), [
    (3.0, 8.0, []), (2.99, 8.0, ['min_excitement']), (3.0, 8.01, ['max_intensity']),
    (None, None, ['min_excitement', 'max_intensity']),
    (float('inf'), float('nan'), ['min_excitement', 'max_intensity']),
])
def test_rating_thresholds_use_game_decimal_scale(state, stats, excitement, intensity, failed_checks):
    brief = BenchmarkBrief.model_validate_json((BRIEFS / 'rated-coaster.json').read_text())

    result = evaluate_ride(brief, state, [{**stats, 'excitement': excitement, 'intensity': intensity}])

    assert [check['name'] for check in result['checks'] if not check['passed']] == failed_checks
    assert result['passed'] == (not failed_checks)


def test_missing_stats_never_count_as_operational(state):
    brief = BenchmarkBrief.model_validate_json((BRIEFS / 'working-coaster.json').read_text())

    result = evaluate_ride(brief, state, [])

    assert result['passed'] is False
    assert [check['name'] for check in result['checks'] if not check['passed']] == [
        'ratings_available', 'running_unpaused', 'observed_train_movement',
    ]


@pytest.mark.parametrize('change', [
    {'schema_version': 2},
    {'criteria': {'ride_type': 52, 'footprint_bounds': {'min_x': 10, 'max_x': 5, 'min_y': 0, 'max_y': 1}}},
    {'criteria': {'ride_type': 52.5, 'footprint_bounds': {'min_x': 0, 'max_x': 5, 'min_y': 0, 'max_y': 1}}},
    {'criteria': {'ride_type': 52, 'footprint_bounds': {'min_x': 0, 'max_x': 5, 'min_y': 0, 'max_y': 1},
                  'min_excitemnt': 3}},
])
def test_invalid_briefs_fail_instead_of_silently_dropping_requirements(change):
    original = BenchmarkBrief.model_validate_json((BRIEFS / 'working-coaster.json').read_text()).model_dump()

    with pytest.raises(ValidationError):
        BenchmarkBrief.model_validate({**deepcopy(original), **change})
