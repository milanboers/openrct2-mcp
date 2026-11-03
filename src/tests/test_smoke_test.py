"""Tests for the opt-in live smoke test orchestration."""

import asyncio
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "smoke_test.py"
spec = importlib.util.spec_from_file_location("smoke_test", SCRIPT)
smoke_test = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke_test)


class FakeClient:
    def __init__(self, rides=None, mismatches=None):
        self.rides = rides or []
        self.mismatches = mismatches or []
        self.calls = []
        self.closed = False
        self.endpoints = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    async def call_tool(self, name, arguments):
        self.calls.append((name, arguments))
        if name == 'close_ride':
            self.closed = True
        elif name == 'start_ride_test':
            self.closed = False
        if name == 'create_ride':
            self.endpoints = [{'x': 10, 'y': 10, 'z': 14, 'direction': 0}]
        elif name == 'place_track_segment':
            previous = self.endpoints[-1]
            self.endpoints.append({**previous, 'x': previous['x'] - 1})
        elif name == 'undo_last_piece' and len(self.endpoints) > 1:
            self.endpoints.pop()
        responses = {
            "get_plugin_info": {"matches": True, "protocol_compatible": True},
            "get_coaster_view": {"success": True, "piece_count": 42},
            "close_ride": {"success": True},
            "undo_last_piece": {"success": True, "current_endpoint": self.endpoints[-1] if self.endpoints else {}},
            "place_track_segment": {"success": True, "is_circuit_complete": True,
                                    "current_endpoint": self.endpoints[-1] if self.endpoints else {}},
            "delete_ride": {"success": True},
            "list_all_rides": self.rides,
            "create_ride": {"success": True, "ride_id": 7, "current_endpoint": self.endpoints[-1] if self.endpoints else {}},
            "place_track_sequence": {"success": True, "is_circuit_complete": True, "placed_count": len(arguments.get('segments', [])),
                                     "piece_count": len(arguments.get('segments', [])) + 1,
                                     "endpoint_prediction_mismatches": self.mismatches},
            "place_entrance_exit": {"success": True},
            "start_ride_test": {"success": True},
            "get_ride_stats": {"ratings_available": True, "vehicles": [{"velocity": 100}],
                               "ride_status": "closed" if self.closed else "testing"},
        }
        if name == "list_all_rides" and not self.rides:
            return SimpleNamespace(content=[], is_error=False)
        return SimpleNamespace(content=[SimpleNamespace(type="text", text=json.dumps(responses[name]))], is_error=False)


def test_smoke_test_builds_and_tests_a_coaster(capsys):
    client = FakeClient()
    with patch.object(smoke_test, "Client", return_value=client):
        asyncio.run(smoke_test.run(10))

    assert [name for name, _ in client.calls] == [
        "list_all_rides", "get_plugin_info", "create_ride", "place_track_sequence",
        "get_coaster_view", "get_coaster_view", "place_entrance_exit",
        "start_ride_test", "get_ride_stats", "close_ride", "get_ride_stats", "undo_last_piece",
        "place_track_segment", "place_entrance_exit", "start_ride_test", "get_ride_stats",
    ]
    segments = client.calls[3][1]["segments"]
    assert len(segments) == 41
    assert segments[2] == {"track_type": "FlatToUp25", "has_chain_lift": True}
    assert "Smoke test passed" in capsys.readouterr().out


def test_smoke_test_fails_on_endpoint_mismatch():
    client = FakeClient(mismatches=[{"segment_index": 3, "predicted": {"x": 1}, "actual": {"x": 2}}])
    with patch.object(smoke_test, "Client", return_value=client):
        with pytest.raises(RuntimeError, match="Endpoint prediction mismatches"):
            asyncio.run(smoke_test.run(10))

    assert [name for name, _ in client.calls] == ['list_all_rides', 'get_plugin_info', 'create_ride', 'place_track_sequence']


def test_smoke_test_refuses_park_with_rides():
    client = FakeClient(rides=[{"id": 1, "name": "Existing ride"}])
    with patch.object(smoke_test, "Client", return_value=client):
        with pytest.raises(RuntimeError, match="Park already contains rides"):
            asyncio.run(smoke_test.run(10))

    assert [name for name, _ in client.calls] == ["list_all_rides"]


def test_endpoint_checks_cover_rotations_and_delete_only_created_rides():
    client = FakeClient()
    asyncio.run(smoke_test.verify_endpoints(client))

    assert [arguments['direction'] for name, arguments in client.calls if name == 'create_ride'] == [0, 1, 2, 3]
    assert [name for name, _ in client.calls] == (
        ['create_ride'] + ['place_track_segment'] * 13 + ['undo_last_piece'] * 13 + ['delete_ride']
    ) * 4
    assert all(arguments['ride_id'] == 7 for name, arguments in client.calls if name == 'delete_ride')


class CollisionClient:
    def __init__(self, overrides=None):
        endpoint = {'x': 101, 'y': 101, 'z': 30, 'direction': 3}
        state = {'success': True, 'piece_count': 4, 'current_endpoint': endpoint}
        self.responses = {
            'create_ride': {'success': True, 'ride_id': 8},
            'place_track_sequence': state,
            'check_track_segment': {'placeable': False, 'error': 9},
            'get_coaster_state': state,
            'place_track_segment': {**state, 'success': False, 'operation_outcome': 'rejected'},
            'delete_ride': {'success': True},
        }
        self.responses.update(overrides or {})
        self.calls = []

    async def call_tool(self, name, arguments):
        self.calls.append((name, arguments))
        return SimpleNamespace(content=[SimpleNamespace(type='text', text=json.dumps(self.responses[name]))],
                               is_error=False)


def test_collision_check_confirms_rejection_and_no_mutation():
    client = CollisionClient()

    asyncio.run(smoke_test.verify_collisions(client))

    assert [name for name, _ in client.calls] == [
        'create_ride', 'place_track_sequence', 'check_track_segment', 'get_coaster_state',
        'place_track_segment', 'delete_ride',
    ]
    assert client.calls[-1] == ('delete_ride', {'ride_id': 8})


@pytest.mark.parametrize(('override', 'error'), [
    ({'check_track_segment': {'placeable': True}}, 'query did not reject'),
    ({'get_coaster_state': {'success': True, 'piece_count': 5}}, 'mutated ride'),
    ({'place_track_segment': {'success': False, 'operation_outcome': 'unknown'}}, 'did not fail safely'),
])
def test_collision_check_fails_and_preserves_ride_for_inspection(override, error):
    client = CollisionClient(override)

    with pytest.raises(RuntimeError, match=error):
        asyncio.run(smoke_test.verify_collisions(client))

    assert 'delete_ride' not in [name for name, _ in client.calls]
