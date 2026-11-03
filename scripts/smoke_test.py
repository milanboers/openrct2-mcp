"""Build and test a coaster through MCP in a manually prepared sandbox."""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Any

from fastmcp import Client
from fastmcp.client.transports import StdioTransport

from openrct2_mcp.client_helpers import call_json as call

ROOT = Path(__file__).resolve().parent.parent

# A small closed circuit tested in the bundled sandbox. The agent skill has
# the construction rules; this fixed layout keeps the smoke test repeatable.
TRACK = (
    ["MiddleStation", "EndStation", "FlatToUp25"]
    + ["Up25"] * 4
    + ["Up25ToFlat", "FlatToDown25"]
    + ["Down25"] * 4
    + [
        "Down25ToFlat",
        "FlatToLeftBank",
        "BankedLeftQuarterTurn5Tiles",
        "BankedLeftQuarterTurn5Tiles",
        "LeftBankToFlat",
    ]
    + ["Flat"] * 17
    + [
        "FlatToLeftBank",
        "BankedLeftQuarterTurn5Tiles",
        "BankedLeftQuarterTurn5Tiles",
        "LeftBankToFlat",
        "Flat",
        "Flat",
    ]
)


async def verify_endpoints(client: Client) -> None:
    """Check representative supported cardinal families in every rotation."""
    names = [
        "Flat", "LeftQuarterTurn5Tiles", "FlatToUp25", "Up25", "Up25ToFlat",
        "FlatToLeftBank", "LeftBank", "LeftBankToFlat", "FlatToDown25",
        "Down25", "Down25ToFlat", "RightQuarterTurn3Tiles", "Brakes",
    ]
    for direction in range(4):
        state = await call(client, "create_ride", name=f"Endpoint rotation {direction}",
                           station_x=100, station_y=100, station_z=30, direction=direction)
        ride_id = state["ride_id"]
        if state.get("endpoint_prediction_mismatches"):
            raise RuntimeError(f"Station endpoint mismatch on ride {ride_id}: {state['endpoint_prediction_mismatches']}")
        entry_endpoints = []
        for name in names:
            entry_endpoints.append({key: state["current_endpoint"][key] for key in ("x", "y", "z", "direction")})
            state = await call(client, "place_track_segment", ride_id=ride_id, track_type=name)
            if state.get("endpoint_prediction_mismatches"):
                raise RuntimeError(f"Endpoint validation failed on ride {ride_id}: {json.dumps(state)}")
        for expected in reversed(entry_endpoints):
            state = await call(client, "undo_last_piece", ride_id=ride_id)
            actual = {key: state["current_endpoint"][key] for key in expected}
            if actual != expected:
                raise RuntimeError(f"Removal endpoint mismatch on ride {ride_id}: expected {expected}, got {actual}")
        await call(client, "delete_ride", ride_id=ride_id)
        print(f"Endpoint rotation {direction}: {len(names)} placements and removals checked.", flush=True)


async def verify_collisions(client: Client) -> None:
    """A fourth tight turn collides with this ride's own station/track."""
    state = await call(client, "create_ride", name="Collision regression probe",
                       station_x=100, station_y=100, station_z=30)
    ride_id = state["ride_id"]
    before = await call(client, "place_track_sequence", ride_id=ride_id,
                        segments=[{"track_type": "RightQuarterTurn3Tiles"}] * 3)
    query = await call(client, "check_track_segment", ride_id=ride_id, track_type="RightQuarterTurn3Tiles")
    # The verified OpenRCT2 version reports collision/clearance failures as status 9.
    if query.get("placeable") is not False or query.get("error") != 9:
        raise RuntimeError(f"Same-ride collision query did not reject the piece on ride {ride_id}: {query}")
    after_query = await call(client, "get_coaster_state", ride_id=ride_id, include_image=False, compact=True)
    if (after_query.get("piece_count") != before["piece_count"] or
            after_query.get("current_endpoint") != before["current_endpoint"]):
        raise RuntimeError(f"Collision query mutated ride {ride_id}: {json.dumps(after_query)}")
    rejected = await call(client, "place_track_segment", ride_id=ride_id,
                          track_type="RightQuarterTurn3Tiles", allow_failure=True)
    if rejected.get("success") is not False or rejected.get("operation_outcome") != "rejected":
        raise RuntimeError(f"Same-ride collision placement did not fail safely on ride {ride_id}: {rejected}")
    if (rejected.get("piece_count") != before["piece_count"] or
            rejected.get("current_endpoint") != before["current_endpoint"]):
        raise RuntimeError(f"Rejected collision placement mutated ride {ride_id}: {json.dumps(rejected)}")
    await call(client, "delete_ride", ride_id=ride_id)
    print("Same-ride collision query and placement rejected without changing track.", flush=True)


async def verify_revision_api(client: Client) -> None:
    """Verify guards and option readback on a new ride, without touching existing rides."""
    catalog = await call(client, "get_loaded_ride_objects", ride_type=52)
    if not catalog.get("objects"):
        raise RuntimeError("No loaded wooden coaster object was discovered")
    state = await call(client, "create_ride", name="Revision API probe", station_x=100, station_y=100,
                       station_z=30, ride_object=catalog["objects"][0]["index"], include_image=False, compact=True)
    ride_id = state["ride_id"]
    state = await call(client, "place_track_segment", ride_id=ride_id, track_type="Flat",
                       include_image=False, compact=True, expected_endpoint=state["current_endpoint"])
    queried = await call(client, "check_track_candidates", ride_id=ride_id,
                         candidates=[{"track_type": "Flat"}, {"track_type": "Up60"}])
    if len(queried["results"]) != 2 or queried["results"][1]["success"] is not False:
        raise RuntimeError(f"Independent candidate query contract failed: {queried}")
    preview = await call(client, "preview_track_removal", ride_id=ride_id)
    stale_target = {**preview["target"], "piece_count": preview["target"]["piece_count"] + 1}
    rejected = await call(client, "remove_terminal_piece", ride_id=ride_id, expected_target=stale_target,
                          include_image=False, compact=True, allow_failure=True)
    if rejected.get("operation_outcome") != "rejected" or rejected.get("piece_count") != state["piece_count"]:
        raise RuntimeError(f"Stale removal was not safely rejected: {rejected}")
    state = await call(client, "remove_terminal_piece", ride_id=ride_id, expected_target=preview["target"],
                       include_image=False, compact=True)
    stale_endpoint = {**state["current_endpoint"], "x": state["current_endpoint"]["x"] + 1}
    rejected = await call(client, "place_track_segment", ride_id=ride_id, track_type="Flat",
                          expected_endpoint=stale_endpoint, include_image=False, compact=True, allow_failure=True)
    if rejected.get("operation_outcome") != "rejected" or rejected.get("piece_count") != state["piece_count"]:
        raise RuntimeError(f"Stale append was not safely rejected: {rejected}")
    await call(client, "place_track_segment", ride_id=ride_id, track_type="Flat",
               expected_endpoint=state["current_endpoint"], include_image=False, compact=True)
    await call(client, "place_track_sequence", ride_id=ride_id, include_image=False, compact=True, segments=[
        {"track_type": "FlatToUp25", "has_chain_lift": True},
        {"track_type": "Up25ToFlat", "has_chain_lift": True},
        {"track_type": "Brakes", "brake_speed": 12},
    ])
    observed = await call(client, "get_coaster_state", ride_id=ride_id, include_image=False)
    if observed["pieces"][-3]["options"]["has_chain_lift"] is not True:
        raise RuntimeError(f"Chain flag readback failed on temporary ride {ride_id}")
    if observed["pieces"][-1]["options"]["brake_speed"] != 12:
        raise RuntimeError(f"Brake setting readback failed on temporary ride {ride_id}: {observed['pieces'][-1]}")
    await call(client, "delete_ride", ride_id=ride_id)
    print("Loaded object selection, compact output, candidate queries, guarded append/removal and option readback checked.",
          flush=True)


async def run(
    timeout: float, check_endpoints: bool = False, check_collisions: bool = False,
    check_revision_api: bool = False, metrics_file: Path | None = None,
) -> None:
    args = ["--directory", str(ROOT), "run", "--locked", "openrct2-mcp"]
    if metrics_file is not None:
        args.extend(["--metrics-file", str(metrics_file)])
    transport = StdioTransport(command="uv", args=args, keep_alive=False)
    async with Client(transport) as client:
        rides = await call(client, "list_all_rides")
        if rides:
            raise RuntimeError(f"Park already contains rides (count: {len(rides)}). Load an empty sandbox first.")

        info = await call(client, "get_plugin_info")
        if not info.get("matches") or not info.get("protocol_compatible"):
            raise RuntimeError(f"Plugin/server mismatch: {json.dumps(info)}")
        park = await call(client, "get_park_status")
        if park.get("park_name") != "sandbox" or park.get("game_mode") != "normal" or park.get("game_paused") is not False:
            raise RuntimeError("Load and unpause the intended sandbox before running the smoke test")

        if check_endpoints:
            await verify_endpoints(client)
        if check_collisions:
            await verify_collisions(client)

        if check_revision_api:
            await verify_revision_api(client)

        state = await call(client, "create_ride", name="MCP Smoke Test")
        ride_id = state["ride_id"]
        print(f"Created ride {ride_id}. It will remain in the park.", flush=True)
        if state.get("endpoint_prediction_mismatches"):
            raise RuntimeError(f"Station endpoint prediction mismatch: {state['endpoint_prediction_mismatches']}")

        chain_pieces = {"FlatToUp25", "Up25", "Up25ToFlat"}
        segments = [{"track_type": name, "has_chain_lift": name in chain_pieces} for name in TRACK]
        state = await call(client, "place_track_sequence", ride_id=ride_id, segments=segments)
        if state.get("endpoint_prediction_mismatches"):
            raise RuntimeError(f"Endpoint prediction mismatches: {state['endpoint_prediction_mismatches']}")
        if not state.get("is_circuit_complete"):
            raise RuntimeError(f"Circuit is not complete: {json.dumps(state)}")
        print(f"Placed {state['placed_count']} pieces and closed the circuit.", flush=True)

        for view in ("endpoint", "elevation"):
            observed = await call(client, "get_coaster_view", ride_id=ride_id, view=view)
            if observed.get("piece_count") != state["piece_count"]:
                raise RuntimeError(f"Spatial view did not match the built ride: {json.dumps(observed)}")
        print("Endpoint and elevation views returned for the completed ride.", flush=True)
        await call(client, "place_entrance_exit", ride_id=ride_id)
        await call(client, "start_ride_test", ride_id=ride_id)
        await wait_for_ratings(client, ride_id, timeout)
        await call(client, "close_ride", ride_id=ride_id)
        closed = await call(client, "get_ride_stats", ride_id=ride_id)
        if closed.get("ride_status") != "closed":
            raise RuntimeError(f"Ride did not close: {json.dumps(closed)}")
        reset = await call(client, "reset_ride", ride_id=ride_id)
        if reset.get("vehicles_cleared") is not True:
            raise RuntimeError(f"Vehicle reset was not established: {json.dumps(reset)}")
        await call(client, "undo_last_piece", ride_id=ride_id)
        revised = await call(client, "place_track_segment", ride_id=ride_id, track_type="Flat")
        if not revised.get("is_circuit_complete") or revised.get("endpoint_prediction_mismatches"):
            raise RuntimeError(f"Revision did not restore the circuit: {json.dumps(revised)}")
        # OpenRCT2 can invalidate station entrances/exits when track is edited.
        await call(client, "place_entrance_exit", ride_id=ride_id)
        await call(client, "start_ride_test", ride_id=ride_id)
        stats = await wait_for_ratings(client, ride_id, timeout)
        if check_revision_api:
            report = await call(client, "get_ride_test_report", ride_id=ride_id, observe_seconds=5)
            if not report["checks"]["ratings_available"] or not report["checks"]["closed_circuit"]:
                raise RuntimeError(f"Test report did not match observed operation: {report}")
            print(f"Read-only test report: ready={report['ready']}, samples={report['sample_count']}", flush=True)
        print(f"Smoke test passed (including close/edit/retest): {json.dumps(stats)}", flush=True)


async def wait_for_ratings(client: Client, ride_id: int, timeout: float) -> Any:
    deadline = time.monotonic() + timeout
    observed_moving = False
    while True:
        stats = await call(client, "get_ride_stats", ride_id=ride_id)
        observed_moving |= any(vehicle.get("velocity") not in (None, 0) for vehicle in stats.get("vehicles", []))
        if stats.get("ratings_available") and observed_moving:
            return stats
        if time.monotonic() >= deadline:
            raise RuntimeError(f"Timed out waiting for a moving train and ratings. Last stats: {json.dumps(stats)}")
        await asyncio.sleep(2)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timeout", type=float, default=120, help="seconds to wait for ratings (default: 120)")
    parser.add_argument('--check-endpoints', action='store_true',
                        help='also build and delete temporary rides to check all four cardinal rotations')
    parser.add_argument('--check-collisions', action='store_true',
                        help='also build and delete a temporary ride to verify same-ride collision rejection')
    parser.add_argument('--check-revision-api', action='store_true',
                        help='also check compact output, loaded objects, queries, guards and option readback')
    parser.add_argument('--metrics-file', type=Path, help='new JSONL file for this smoke server process')
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error("--timeout must be positive")
    try:
        answer = input("Load the bundled empty sandbox and unpause the game. This adds a ride. Continue? [y/N] ")
        if answer.strip().lower() not in ("y", "yes"):
            print("Cancelled.")
            return 1
        asyncio.run(run(args.timeout, args.check_endpoints, args.check_collisions,
                        args.check_revision_api, args.metrics_file))
    except (EOFError, KeyboardInterrupt):
        print("\nCancelled.", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Smoke test failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
