"""End-to-end integration test: Python MCP client <-> real TCP <-> plugin (JS).

The plugin runs in a node subprocess with a stubbed game API. Python owns a
real TCP socket that the MCP client connects to, and bridges it to the plugin's
stdio, so the full wire contract is exercised without the game.
"""

import select
import shutil
import socket
import subprocess
import threading
import time
from pathlib import Path

import pytest

import mcp_server

TESTS_DIR = Path(__file__).resolve().parent
_has_node = shutil.which("node") is not None


class _PluginBridge:
    """Runs the plugin in node and bridges a local TCP socket to its stdio."""

    def __init__(self) -> None:
        self.server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server_sock.bind(("127.0.0.1", 0))
        self.server_sock.listen(1)
        self.port = self.server_sock.getsockname()[1]

        self.proc = subprocess.Popen(
            ["node", str(TESTS_DIR / "plugin_server.js")],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        self.stderr_lines: list[str] = []
        self._wait_ready()
        self._start_bridge()

    def _wait_ready(self) -> None:
        deadline = time.time() + 10
        while time.time() < deadline:
            if self.proc.poll() is not None:
                raise RuntimeError(
                    "plugin server exited early: " + "".join(self.stderr_lines)
                )
            readable, _, _ = select.select([self.proc.stderr], [], [], 0.2)
            if readable:
                line = self.proc.stderr.readline()
                if line:
                    text = line.decode(errors="replace").rstrip()
                    self.stderr_lines.append(text)
                    if text == "READY":
                        return
        raise RuntimeError("plugin server did not become ready: " + "".join(self.stderr_lines))

    def _start_bridge(self) -> None:
        def accept_and_bridge() -> None:
            conn, _ = self.server_sock.accept()

            def to_node() -> None:
                try:
                    while True:
                        data = conn.recv(4096)
                        if not data:
                            break
                        self.proc.stdin.write(data)
                        self.proc.stdin.flush()
                except Exception:
                    pass

            def from_node() -> None:
                try:
                    while True:
                        # read1: don't block filling the pipe's internal buffer.
                        data = self.proc.stdout.read1(4096)
                        if not data:
                            break
                        conn.sendall(data)
                except Exception:
                    pass

            threading.Thread(target=to_node, daemon=True).start()
            threading.Thread(target=from_node, daemon=True).start()

        threading.Thread(target=accept_and_bridge, daemon=True).start()

    def close(self) -> None:
        try:
            self.server_sock.close()
        except Exception:
            pass
        self.proc.terminate()
        try:
            self.proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.proc.kill()


@pytest.fixture
def plugin_server():
    bridge = _PluginBridge()
    old_host = mcp_server.api_client.host
    old_port = mcp_server.api_client.port
    mcp_server.api_client.host = "127.0.0.1"
    mcp_server.api_client.port = bridge.port
    try:
        yield bridge.port
    finally:
        mcp_server.api_client.host = old_host
        mcp_server.api_client.port = old_port
        bridge.close()


@pytest.mark.skipif(not _has_node, reason="node is required for integration tests")
def test_full_build_flow(plugin_server) -> None:
    """Create a ride, build a station and track, query state, undo, list, delete."""
    # 1. Create a ride. The game places the first station piece and classifies
    # it as an EndStation (it auto-assigns begin/middle/end by geometry).
    result = mcp_server.create_ride(name="Integration", ride_type=52)
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
    rides = mcp_server.list_all_rides()
    assert rides[0]["name"] == "Integration", f"ride name not applied: {rides}"

    # 2. An unknown piece is rejected.
    result = mcp_server.place_track_segment(1, "Banana")
    assert isinstance(result, dict)
    assert result["success"] is False
    assert "Invalid track type" in result["error_message"]

    # 3. Build a 4-piece station (the game keeps reclassifying as we extend it).
    for _ in range(2):
        result = mcp_server.place_track_segment(1, "MiddleStation")
        assert result[0]["success"] is True
    result = mcp_server.place_track_segment(1, "EndStation")
    assert result[0]["success"] is True
    assert result[0]["pieces"][-1]["trackType"] == "EndStation"
    assert len(result[0]["pieces"]) == 4
    assert "Flat" in [p["name"] for p in result[0]["valid_pieces"]]

    # 4. Lay two flat pieces of track.
    for _ in range(2):
        result = mcp_server.place_track_segment(1, "Flat")
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
    result = mcp_server.get_coaster_state(1)
    assert result[0]["success"] is True
    assert len(result[0]["pieces"]) == 6

    # 6. Undo the last piece.
    result = mcp_server.undo_last_piece(1)
    assert result[0]["success"] is True
    assert len(result[0]["pieces"]) == 5

    # 7. List rides (id preserved), then delete all.
    rides = mcp_server.list_all_rides()
    assert len(rides) == 1
    assert rides[0]["id"] == 1
    assert rides[0]["type"] == 52
    result = mcp_server.delete_all_rides()
    assert result["success"] is True
    assert mcp_server.list_all_rides() == []