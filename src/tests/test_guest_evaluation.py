"""Grade game observations, never the agent's claims of success."""

from pathlib import Path

import pytest
from pydantic import ValidationError

from openrct2_mcp.benchmark import BenchmarkBrief
from openrct2_mcp.guest_evaluation import GuestRoutes, evaluate_guest_ride


@pytest.fixture
def evidence():
    brief = BenchmarkBrief.model_validate_json((Path(__file__).parents[2] / 'benchmarks/guest-coaster.json').read_text())
    def path(x, y, edges, queue=False):
        return dict(x=x, y=y, base_z=14, edges=edges, is_queue=queue, is_ghost=False,
                    slope_direction=None, ride_id=7 if queue else None, station=0 if queue else None)
    paths = [path(30, 30, 6, True), path(31, 30, 5), path(32, 30, 5), path(32, 33, 12),
             path(33, 33, 9), path(33, 32, 10), path(33, 31, 10), path(33, 30, 3)]
    state = dict(success=True, ride_id=7, ride_type=52, layout_status='complete', is_circuit_complete=True,
                 piece_count=12, track_elements=[dict(x=30, y=31)], stations=[{
                     'entrance': {'status': 'present', 'position': dict(x=30, y=31, z=14, direction=1)},
                     'exit': {'status': 'present', 'position': dict(x=32, y=32, z=14, direction=3)}}])
    baseline = dict(ride_status='open', game_paused=False, total_customers=0, ratings_available=True,
                    excitement=1.0, intensity=1.0, nausea=1.0, vehicles=[{'velocity': 100}])
    return dict(brief=brief, state=state, samples=[baseline, {**baseline, 'total_customers': 2}], paths=paths,
                routes=GuestRoutes(ride_id=7, entrance_route=[[30, 30], [31, 30], [32, 30]],
                                   exit_route=[[32, 33], [33, 33], [33, 32], [33, 31], [33, 30], [32, 30]]),
                anchor={**paths[2], 'edges': 4}, baseline=baseline,
                reports=[dict(counter_valid=True, completion_counter_supported=True, open_unpaused_throughout=True)],
                stable=True, fresh_park=True)


def test_guest_acceptance_requires_working_coaster_routes_and_fresh_customer_progress(evidence):
    result = evaluate_guest_ride(**evidence)

    assert result['passed'] is True
    assert all(check['passed'] for check in result['checks'])
    assert result['guest_measurements'] == {'baseline_customers': 0, 'final_customers': 2, 'customer_delta': 2}


@pytest.mark.parametrize(('field', 'value', 'failed_check'), [
    ('stable', False, 'stable_collection'),
    ('fresh_park', False, 'fresh_empty_park_baseline'),
])
def test_guest_acceptance_rejects_untrusted_collection(evidence, field, value, failed_check):
    evidence[field] = value

    result = evaluate_guest_ride(**evidence)

    assert result['passed'] is False
    assert next(check for check in result['checks'] if check['name'] == failed_check)['passed'] is False


@pytest.mark.parametrize(('field', 'value', 'failed_check'), [
    ('ride_id', 8, 'queue_assignment'),
    ('is_ghost', True, 'entrance_route'),
    ('edges', 2, 'entrance_route'),
])
def test_guest_acceptance_rejects_bad_queue_observations(evidence, field, value, failed_check):
    evidence['paths'][0][field] = value

    result = evaluate_guest_ride(**evidence)

    assert result['passed'] is False
    assert next(check for check in result['checks'] if check['name'] == failed_check)['passed'] is False


def test_guest_acceptance_does_not_reuse_prior_customers_as_completion(evidence):
    evidence['baseline']['total_customers'] = 2

    result = evaluate_guest_ride(**evidence)

    assert result['passed'] is False
    assert result['guest_measurements']['customer_delta'] == 0


def test_guest_acceptance_checks_door_geometry_and_anchor_preservation(evidence):
    evidence['state']['stations'][0]['entrance']['position']['direction'] = 3
    evidence['paths'][2]['is_queue'] = True

    result = evaluate_guest_ride(**evidence)

    assert result['passed'] is False
    failed = {check['name'] for check in result['checks'] if not check['passed']}
    assert {'entrance_door', 'public_anchor_preserved', 'ordinary_exit'} <= failed


def test_guest_routes_reject_invalid_coordinates_and_extra_claims():
    with pytest.raises(ValidationError):
        GuestRoutes(ride_id=7, entrance_route=[[True, 30]])
    with pytest.raises(ValidationError):
        GuestRoutes.model_validate({'ride_id': 7, 'passed': True})


def test_guest_acceptance_requires_open_unpaused_baseline(evidence):
    evidence['baseline']['ride_status'] = 'closed'

    result = evaluate_guest_ride(**evidence)

    assert result['passed'] is False
    assert next(check for check in result['checks'] if check['name'] == 'fresh_customer_completion')['passed'] is False
