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
    def __init__(self, rides=None):
        self.rides = rides or []
        self.calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    async def call_tool(self, name, arguments):
        self.calls.append((name, arguments))
        responses = {
            "list_all_rides": self.rides,
            "create_ride": {"success": True, "ride_id": 7},
            "place_track_sequence": {"success": True, "is_circuit_complete": True, "placed_count": 41},
            "place_entrance_exit": {"success": True},
            "start_ride_test": {"success": True},
            "get_ride_stats": {"ratings_available": True, "vehicles": [{"velocity": 100}]},
        }
        return SimpleNamespace(content=[SimpleNamespace(type="text", text=json.dumps(responses[name]))])


def test_smoke_test_builds_and_tests_a_coaster(capsys):
    client = FakeClient()
    with patch.object(smoke_test, "Client", return_value=client):
        asyncio.run(smoke_test.run(10))

    assert [name for name, _ in client.calls] == [
        "list_all_rides", "create_ride", "place_track_sequence", "place_entrance_exit",
        "start_ride_test", "get_ride_stats",
    ]
    segments = client.calls[2][1]["segments"]
    assert len(segments) == 41
    assert segments[2] == {"track_type": "FlatToUp25", "has_chain_lift": True}
    assert "Smoke test passed" in capsys.readouterr().out


def test_smoke_test_refuses_park_with_rides():
    client = FakeClient(rides=[{"id": 1, "name": "Existing ride"}])
    with patch.object(smoke_test, "Client", return_value=client):
        with pytest.raises(RuntimeError, match="Park already contains rides"):
            asyncio.run(smoke_test.run(10))

    assert [name for name, _ in client.calls] == ["list_all_rides"]
