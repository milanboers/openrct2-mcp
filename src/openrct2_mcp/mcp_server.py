"""MCP tools for inspecting, constructing and testing OpenRCT2 coasters."""

import argparse
from contextlib import ExitStack
import logging
import os
from pathlib import Path
import time
from typing import Annotated, Any, Literal, Optional, Tuple
from fastmcp import FastMCP
from fastmcp.utilities.types import Image as MCPImage
from pydantic import Field

from .api_client import OpenRCT2API, APIError
from .catalog import TRACK_TYPES, TRACK_NAME_TO_ID, RIDE_TYPES
from .models import Endpoint, RemovalTarget, TrackSegment
from .inspection import compact_map_area, test_report
from .metrics import ResultMiddleware
from .park_tools import register_park_tools
from .protocol import PLUGIN_VERSION, PROTOCOL_VERSION
from .results import mutation_failure, mutation_status
from .visualization import (
    elevation_samples, generate_coaster_image, generate_height_map, render_elevation_view, render_endpoint_view,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize MCP server
mcp = FastMCP("Roller Coaster Creator")
result_middleware = ResultMiddleware()
mcp.add_middleware(result_middleware)

# Initialize API client
api_client = OpenRCT2API()


def _get_ride_type(ride_id: int) -> int:
    """Helper to fetch ride type from the game by ID."""
    try:
        rides = api_client.list_all_rides()
    except APIError as e:
        raise APIError(f"Cannot determine ride type: {e}", details=e.details) from e
    for ride in rides:
        if ride.get("id") == ride_id:
            if not isinstance(ride.get("type"), int):
                raise APIError(f"Ride {ride_id} has no valid ride type")
            return ride["type"]
    raise APIError(f"Ride {ride_id} not found")


def format_coaster_state(
    ride_id: int, api_payload: dict[str, Any], valid_piece_ids: list[int], *,
    include_image: bool = True, compact: bool = False,
) -> Tuple[dict[str, Any], Optional[MCPImage]]:
    """
    Format the authoritative coaster state from the API payload.
    Calculates distances and circuit completion on the fly.
    Returns a list of [state_dict, visual_map_image].
    """
    history = api_payload.get("history", [])
    next_endpoint = api_payload.get("nextEndpoint", {})

    formatted_pieces = []
    start_pos: Optional[dict[str, Any]] = None

    for i, p in enumerate(history):
        if i == 0:
            start_pos = p

        distance = {"x": 0, "y": 0, "z": 0}
        if start_pos:
            distance = {
                "x": p["x"] - start_pos["x"],
                "y": p["y"] - start_pos["y"],
                "z": p["z"] - start_pos["z"],
            }

        formatted_pieces.append(
            {
                "index": i,
                "x": p["x"],
                "y": p["y"],
                "z": p["z"],
                "direction": p["direction"],
                "trackType": TRACK_TYPES.get(
                    p["trackType"], f"Unknown({p['trackType']})"
                ),
                "distance": distance,
                "track_type_id": p["trackType"],
                "options": p.get("options"),
            }
        )

    is_circuit_complete = api_payload.get("isCircuitComplete", False)

    # Enrich next_endpoint with distance
    if start_pos and next_endpoint:
        next_endpoint["distance"] = {
            "x": next_endpoint["x"] - start_pos["x"],
            "y": next_endpoint["y"] - start_pos["y"],
            "z": next_endpoint["z"] - start_pos["z"],
        }

    # Generate coaster image visualization
    track_elements = api_payload.get("trackElements")
    coaster_image = generate_coaster_image(history, next_endpoint, track_elements) if include_image else None
    height_map = generate_height_map(track_elements) if not compact else None

    # Convert valid_pieces to semantic names, merging in the predicted endpoint
    # for each piece so the agent sees name + destination together.
    raw_endpoints = api_payload.get("validPieceEndpoints", {})
    valid_pieces = []
    for piece in valid_piece_ids:
        name = TRACK_TYPES.get(piece, str(piece))
        entry: dict[str, Any] = {"name": name, "ride_support": "unknown"}
        ep = raw_endpoints.get(str(piece)) or raw_endpoints.get(piece)
        if ep:
            entry["endpoint"] = ep
        valid_pieces.append(entry)

    ride_type = api_payload.get("rideType")

    ride_type_name = RIDE_TYPES.get(ride_type, f"Unknown({ride_type})")

    state_dict = {
        "success": True,
        "ride_id": ride_id,
        "ride_type": ride_type,
        "ride_type_name": ride_type_name,
        "name": api_payload.get("rideName"),
        "ride_object": api_payload.get("rideObject"),
        "stations": api_payload.get("stations"),
        "pieces": formatted_pieces,
        "current_endpoint": next_endpoint,
        "valid_pieces": valid_pieces,
        "candidate_status": api_payload.get("candidateStatus"),
        "layout_status": api_payload.get("layoutStatus"),
        "piece_count": len(history),
        "is_circuit_complete": is_circuit_complete,
        "height_map": height_map,
        "track_elements": track_elements,
    }

    if compact:
        for key in ("pieces", "height_map", "track_elements"):
            state_dict.pop(key)
    return (state_dict, coaster_image)


def _mutation_state(
    ride_id: int, outcome: str = "confirmed", error: Optional[str] = None, *,
    include_image: bool = True, compact: bool = False, confirmed_steps: int = 0,
    error_details: Optional[dict[str, Any]] = None,
) -> Any:
    try:
        state = get_coaster_state(ride_id, include_image=include_image, compact=compact)
        summary = state[0] if isinstance(state, list) else state
        available = bool(summary.get("success"))
    except Exception as inspection_error:
        # A rendering/formatting failure must not erase an acknowledged action.
        logger.exception("Post-mutation inspection failed for ride %s", ride_id)
        state = summary = {"success": False, "ride_id": ride_id, "error": str(inspection_error)}
        available = False
    if not available:
        summary["state_error"] = summary.get("error")
    summary.update(mutation_status(outcome, confirmed_steps=confirmed_steps, state_available=available))
    if error is not None:
        summary["success"] = False
        summary["error_message"] = error
    if error_details:
        summary["error_details"] = error_details
    return state


@mcp.tool()
def create_ride(
    name: str = "New Coaster",
    ride_type: int = 52,
    station_x: int = 67,
    station_y: int = 66,
    station_z: int = 14,
    direction: int = 0,
    ride_object: int = 65535,
    include_image: bool = True,
    compact: bool = False,
) -> Any:
    """
    Create a new roller coaster ride and place the first station piece.
    All parameters are optional and have reasonable defaults.

    ride_type: Numeric ride type ID from the game. 52 = Wooden Roller Coaster
    (the tested default); see the build-coaster skill for other known IDs.
    """
    ride_id: Optional[int] = None
    try:
        if ride_object != 65535:
            objects = api_client.get_loaded_ride_objects()
            if not any(obj["index"] == ride_object and ride_type in obj["ride_types"] for obj in objects):
                raise APIError("Selected ride object is not loaded for this ride type")
        # 1. Create the ride via API
        result = api_client.create_ride(
            ride_type=ride_type,
            # Let OpenRCT2 choose a compatible loaded vehicle object.
            ride_object=ride_object,
            entrance_object=0,
            colour1=0,
            colour2=0,
            inspection_interval=2,
            name=name,
        )

        ride_id = int(result["rideId"])

        # 2. Place the first station piece
        placement = api_client.place_track_piece(
            ride_id=ride_id,
            tile_coordinate_x=station_x,
            tile_coordinate_y=station_y,
            tile_coordinate_z=station_z,
            direction=direction,
            track_type=2,  # BeginStation
            ride_type=ride_type,
        )

        # 3. Get the initial state
        state = _mutation_state(ride_id, include_image=include_image, compact=compact)
        if result.get("nameWarning"):
            summary = state[0] if isinstance(state, list) else state
            summary["success"] = False
            summary["execution_status"] = "partial"
            summary["name_outcome"] = result.get("nameOutcome", "unknown")
            summary["error_message"] = result["nameWarning"]
        mismatch = placement.get("endpointPredictionMismatch")
        if isinstance(mismatch, dict):
            summary = state[0] if isinstance(state, list) else state
            summary["endpoint_prediction_mismatches"] = [{"segment_index": 0, **mismatch}]
        return state

    except APIError as e:
        logger.error(f"API error creating ride: {e}")
        failure = mutation_failure(e, ride_id=ride_id, confirmed_steps=int(ride_id is not None))
        if ride_id is not None:
            failure["ride_id"] = ride_id
            failure["message"] = (
                "Ride was created; inspect operation_outcome for the station placement. "
                "Inspect the ride before retrying or deleting it."
            )
        return failure


class InvalidTrackType(APIError):
    pass


def _place_track_segment(
    ride_id: int, ride_type: int, segment: TrackSegment, *, query: bool = False,
    expected_endpoint: Optional[Endpoint] = None,
) -> dict[str, Any]:
    try:
        state = api_client.get_valid_next_pieces(ride_id)
    except APIError as e:
        raise APIError(f"Cannot read construction endpoint: {e}", details=e.details) from e
    if state.get("isCircuitComplete"):
        raise APIError("Circuit is already complete")
    track_id = TRACK_NAME_TO_ID.get(segment.track_type)
    if track_id is None or track_id not in state.get("validPieces", []):
        raise InvalidTrackType(f"Invalid track type at this position: {segment.track_type}")
    position = state.get("position")
    if not position:
        raise APIError("Game did not return a track placement position")
    if expected_endpoint is not None and any(
        position.get(axis) != value for axis, value in expected_endpoint.model_dump().items()
    ):
        raise APIError("Construction endpoint changed; inspect before retrying", details={"category": "stale_endpoint"})
    options = {"query": True} if query else {
        "expected_endpoint": position, "expected_piece_count": state.get("pieceCount"),
    }
    return api_client.place_track_piece(
        ride_id=ride_id,
        tile_coordinate_x=position["x"],
        tile_coordinate_y=position["y"],
        tile_coordinate_z=position["z"],
        direction=position["direction"],
        track_type=track_id,
        ride_type=ride_type,
        brake_speed=segment.brake_speed,
        seat_rotation=segment.seat_rotation,
        has_chain_lift=segment.has_chain_lift,
        **options,
    )


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def check_track_segment(
    ride_id: int, track_type: str,
    brake_speed: Annotated[int, Field(ge=0, le=255)] = 0,
    seat_rotation: Annotated[int, Field(ge=0, le=255)] = 0, has_chain_lift: bool = False,
) -> dict[str, Any]:
    """Query whether a compatible piece can be placed at the current endpoint.

    Does not place track. A successful query is not a reservation and does not
    guarantee ride support or track connectivity. The park may change before
    placement. Game errors include the title and message if available.
    """
    try:
        segment = TrackSegment(track_type=track_type, brake_speed=brake_speed,
                               seat_rotation=seat_rotation, has_chain_lift=has_chain_lift)
        return _place_track_segment(ride_id, _get_ride_type(ride_id), segment, query=True)
    except APIError as e:
        return {"success": False, "error": str(e)}


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def check_track_candidates(
    ride_id: int, candidates: list[TrackSegment] = Field(min_length=1, max_length=32),
) -> dict[str, Any]:
    """Query 1-32 independent alternatives at one observed endpoint, not a sequence.

    Each candidate uses the same starting position. No pieces are placed.
    A changed layout invalidates the batch. Queries are not reservations or
    proof of ride-specific support; each item reports its own query result.
    """
    try:
        state = api_client.get_coaster_state(ride_id)
        if state.get("isCircuitComplete"):
            raise APIError("Circuit is already complete")
        position = state.get("position")
        if not position or state.get("layoutStatus") != "complete":
            raise APIError("Candidate queries require a complete connected traversal and an endpoint")
        results = []
        for candidate in candidates:
            track_id = TRACK_NAME_TO_ID.get(candidate.track_type)
            if track_id not in state.get("validPieces", []):
                results.append({"candidate": candidate.model_dump(), "success": False,
                                "error": "Not a supported connection-compatible candidate"})
                continue
            result = api_client.place_track_piece(
                ride_id=ride_id, ride_type=state["rideType"], track_type=track_id,
                tile_coordinate_x=position["x"], tile_coordinate_y=position["y"],
                tile_coordinate_z=position["z"], direction=position["direction"],
                brake_speed=candidate.brake_speed, seat_rotation=candidate.seat_rotation,
                has_chain_lift=candidate.has_chain_lift, query=True,
            )
            results.append({"candidate": candidate.model_dump(), "success": True, **result})
        if api_client.get_coaster_state(ride_id) != state:
            raise APIError("Ride layout changed during queries; discard these results and query again")
        return {"success": True, "ride_id": ride_id, "endpoint": position, "results": results,
                "limitations": "Independent current-park queries, not a sequence preview or reservation"}
    except APIError as error:
        return {"success": False, "ride_id": ride_id, "error": str(error)}


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def get_map_area(x: int, y: int, radius: int = 4) -> dict[str, Any]:
    """Get terrain and map elements within 0–8 tiles of a map centre.

    Base and clearance Z are in track height units (8 game coordinates).
    Water height is the raw OpenRCT2 value. This is not a placement guarantee.
    """
    try:
        return api_client.get_map_area(x, y, radius)
    except APIError as e:
        return {"success": False, "error": str(e)}


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def get_coaster_view(
    ride_id: int, view: Literal["endpoint", "elevation"] = "endpoint", radius: int = 4, compact: bool = False,
) -> Any:
    """Inspect terrain/objects around the endpoint, or a track elevation profile.

    Endpoint view includes terrain base heights, slope/water indicators, paths,
    scenery and tracks at all heights. It is not a clearance simulation. Radius
    is 0-8 tiles. Elevation uses equally spaced track-piece boundaries, not track
    length, and omits within-piece geometry. The first height is the track origin.
    Green indicates the track start/return heading, yellow the current endpoint.
    compact=True summarizes repeated flat, dry terrain in endpoint text, keeping
    all other elements and heights. It does not change the image or elevation view.
    """
    if view not in ("endpoint", "elevation") or not 0 <= radius <= 8:
        return {"success": False, "ride_id": ride_id, "error": "Expected endpoint/elevation view and radius 0-8"}
    try:
        snapshot = api_client.get_coaster_state(ride_id)
        history = snapshot.get("history", [])
        if not history or snapshot.get("layoutStatus") != "complete":
            raise APIError("Spatial views require a connected layout with a complete track traversal")
        last = history[-1]
        endpoint = {"x": last["nextX"], "y": last["nextY"], "z": last["nextZ"],
                    "direction": last["nextDirection"]}
        start = {key: history[0][key] for key in ("x", "y", "z", "direction")}
        summary: dict[str, Any] = {
            "success": True, "ride_id": ride_id, "view": view, "piece_count": len(history),
            "current_endpoint": endpoint, "track_start": start,
            "return_offset": {axis: start[axis] - endpoint[axis] for axis in ("x", "y", "z")},
            "is_circuit_complete": snapshot.get("isCircuitComplete", False),
        }
        if view == "endpoint":
            area = api_client.get_map_area(endpoint["x"], endpoint["y"], radius)
            summary["map_area"] = compact_map_area(area) if compact else area
            summary["limitations"] = (
                "All object heights are included, not just the endpoint height. Terrain labels are base Z, "
                "not slope clearance. Ghost objects are omitted from the image but retained in map_area. "
                "Ride and map reads are separate; the park may change between them."
            )
            if compact:
                summary["limitations"] += (
                    " Compact map_area summarizes the most common flat, dry, non-ghost surface; "
                    "matching surfaces and tiles left empty are omitted. All other elements retain "
                    "their coordinates and heights. Use compact=False for exact omitted terrain locations. "
                    "Neither mode establishes clearance."
                )
            image = render_endpoint_view(area, ride_id, endpoint, start)
        else:
            samples = elevation_samples(history)
            summary["height_range"] = {"min": min(sample["z"] for sample in samples),
                                       "max": max(sample["z"] for sample in samples)}
            summary["sample_count"] = len(samples)
            summary["limitations"] = (
                "X axis is track-piece boundary index, not distance. First point is the track origin, "
                "remaining points are next-connection heights. Lines omit within-piece geometry. "
                "No terrain clearance, speed or G-forces are inferred."
            )
            image = render_elevation_view(samples)
        return [summary, image]
    except APIError as e:
        return {"success": False, "ride_id": ride_id, "error": str(e)}


@mcp.tool()
def place_track_segment(
    ride_id: int,
    track_type: str,
    brake_speed: Annotated[int, Field(ge=0, le=255)] = 0,
    seat_rotation: Annotated[int, Field(ge=0, le=255)] = 0,
    has_chain_lift: bool = False,
    include_image: bool = True,
    compact: bool = False,
    expected_endpoint: Optional[Endpoint] = None,
) -> Any:
    """Place a track segment using a name from the latest valid_pieces list.

    Compatible pieces may still be rejected by the game due to obstructions.
    Inspect the final state after a placement error before retrying.
    """
    try:
        segment = TrackSegment(
            track_type=track_type,
            brake_speed=brake_speed,
            seat_rotation=seat_rotation,
            has_chain_lift=has_chain_lift,
        )
        placement = _place_track_segment(ride_id, _get_ride_type(ride_id), segment, expected_endpoint=expected_endpoint)
    except APIError as e:
        return _mutation_state(ride_id, e.outcome, str(e), include_image=include_image, compact=compact,
                               error_details=e.details)
    state = _mutation_state(ride_id, include_image=include_image, compact=compact)
    mismatch = placement.get("endpointPredictionMismatch")
    if isinstance(mismatch, dict):
        summary = state[0] if isinstance(state, list) else state
        summary["endpoint_prediction_mismatches"] = [{"segment_index": 0, **mismatch}]
    return state


@mcp.tool()
def place_track_sequence(
    ride_id: int, segments: list[TrackSegment] = Field(min_length=1, max_length=256),
    include_image: bool = True, compact: bool = False,
    expected_endpoint: Optional[Endpoint] = None,
) -> Any:
    """Place track pieces in order, stopping at the first failure.

    Each piece is validated against the latest game state. Earlier pieces are
    not rolled back on failure. Returns the final state and image, with the
    number of confirmed placements and, on failure, the zero-based failed index
    and error. Any placement error can leave the failed piece's outcome unknown;
    inspect the final state before retrying.
    """
    placed = 0
    failed_index = None
    error = None
    outcome = "confirmed"
    mismatches: list[dict[str, Any]] = []
    error_details = None
    try:
        ride_type = _get_ride_type(ride_id)
        for index, segment in enumerate(segments):
            failed_index = index
            placement = _place_track_segment(ride_id, ride_type, segment,
                                             expected_endpoint=expected_endpoint if index == 0 else None)
            placed += 1
            mismatch = placement.get("endpointPredictionMismatch") if isinstance(placement, dict) else None
            if isinstance(mismatch, dict):
                mismatches.append({"segment_index": index, **mismatch})
        failed_index = None
    except APIError as e:
        error = str(e)
        error_details = e.details
        outcome = e.outcome
        if outcome == "confirmed":
            placed += 1

    result = _mutation_state(ride_id, outcome, error, confirmed_steps=placed,
                             include_image=include_image, compact=compact, error_details=error_details)
    summary = result[0] if isinstance(result, list) else result
    summary["placed_count"] = placed
    if mismatches:
        summary["endpoint_prediction_mismatches"] = mismatches
    if error is not None:
        summary["success"] = False
        summary["failed_index"] = failed_index
        summary["error_message"] = error
    return result


@mcp.tool(annotations={"destructiveHint": True, "openWorldHint": False})
def undo_last_piece(
    ride_id: int, include_image: bool = True, compact: bool = False,
    expected_target: Optional[RemovalTarget] = None,
) -> Any:
    """
    Remove the terminal track segment of the selected connected layout.

    This is not chronological undo. On a closed circuit it removes the segment
    immediately before the selected station start. Disconnected layouts are rejected.
    """
    try:
        if expected_target is None:
            api_client.delete_last_track_piece(ride_id)
        else:
            api_client.delete_last_track_piece(ride_id, expected_target=expected_target.model_dump())
        # Re-fetch the authoritative state: the delete response only contains
        # the next endpoint, not the remaining track history.
        return _mutation_state(ride_id, include_image=include_image, compact=compact)
    except APIError as e:
        return _mutation_state(ride_id, e.outcome, str(e), include_image=include_image, compact=compact,
                               error_details=e.details)


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def preview_track_removal(ride_id: int) -> dict[str, Any]:
    """Identify the exact terminal segment without removing it.

    Pass the returned target as expected_target to remove_terminal_piece or
    undo_last_piece. The guard detects target/count changes, not every layout
    change. This is selection inspection, not a game-action permission query.
    """
    try:
        return {"success": True, "ride_id": ride_id, **api_client.preview_track_removal(ride_id)}
    except APIError as error:
        return {"success": False, "ride_id": ride_id, "error": str(error)}


@mcp.tool(annotations={"destructiveHint": True, "openWorldHint": False})
def remove_terminal_piece(
    ride_id: int, include_image: bool = True, compact: bool = False,
    expected_target: Optional[RemovalTarget] = None,
) -> Any:
    """Remove the terminal segment, optionally guarding against a changed preview target.

    Same operation as undo_last_piece, not chronological undo. Close the ride
    first. A preview is not a reservation; pass expected_target to recheck it.
    """
    return undo_last_piece(ride_id, include_image=include_image, compact=compact, expected_target=expected_target)


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def get_coaster_state(ride_id: int, include_image: bool = True, compact: bool = False) -> Any:
    """Read one authoritative snapshot of the ride and its construction candidates.

    Set include_image=false to omit rendering. compact=true also omits full
    history, occupancy elements and the text grid, while retaining piece_count,
    endpoint, layout status and candidates.
    """
    try:
        payload = api_client.get_coaster_state(ride_id)
        history = payload.get("history", [])
        if history:
            last = history[-1]
            payload["nextEndpoint"] = {
                "x": last["nextX"], "y": last["nextY"], "z": last["nextZ"],
                "direction": last["nextDirection"],
            }
        else:
            payload["nextEndpoint"] = payload.get("position", {})
        summary, image = format_coaster_state(
            ride_id, payload, payload.get("validPieces", []), include_image=include_image, compact=compact,
        )
        return [summary, image] if image is not None else summary
    except APIError as e:
        return {"success": False, "ride_id": ride_id, "error": str(e)}


@mcp.tool()
def place_entrance_exit(ride_id: int, include_image: bool = True, compact: bool = False) -> Any:
    """
    Place entrance and exit for a ride's station.
    """
    try:
        result = api_client.place_entrance_exit(ride_id)
        state = _mutation_state(ride_id, "partial" if result.get("warning") else "confirmed",
                                include_image=include_image, compact=compact)
        summary = state[0] if isinstance(state, list) else state
        summary["entrance_exit"] = result
        if result.get("warning"):
            summary["success"] = False
            summary["error_message"] = result["warning"]
        return state
    except APIError as e:
        logger.error(f"API error placing entrance/exit: {e}")
        return _mutation_state(ride_id, e.outcome, str(e), include_image=include_image, compact=compact,
                               error_details=e.details)


@mcp.tool()
def start_ride_test(ride_id: int) -> dict[str, Any]:
    """
    Start the ride in test mode to calculate ratings.
    """
    try:
        result = api_client.start_ride_test(ride_id)
        return {"success": True, "ride_id": ride_id, **mutation_status("confirmed"), "message": str(result)}
    except APIError as e:
        logger.error(f"API error starting ride test: {e}")
        return mutation_failure(e, ride_id=ride_id)


@mcp.tool()
def close_ride(ride_id: int) -> dict[str, Any]:
    """Close a ride before editing track or vehicles. Does not guarantee trains are cleared.

    Closing an already closed ride invokes OpenRCT2's reset behaviour. Prefer the
    guarded reset_ride tool for an explicit vehicle reset; never retry an unknown outcome.
    """
    try:
        result = api_client.close_ride(ride_id)
        return {"success": True, "ride_id": ride_id, **mutation_status("confirmed"), "message": str(result)}
    except APIError as e:
        return mutation_failure(e, ride_id=ride_id)


@mcp.tool(annotations={"destructiveHint": True, "openWorldHint": False})
def reset_ride(ride_id: Annotated[int, Field(ge=0)]) -> dict[str, Any]:
    """Explicitly clear vehicles for construction on an already closed, guest-free ride.

    Uses the game's second-close behaviour, which can also clear crash/test state.
    Rejects running rides and nonzero/unknown guest counts. No track is removed.
    Acknowledgement and observed vehicle clearance are reported separately.
    """
    try:
        result = api_client.reset_ride(ride_id)
        cleared = result.get("vehicles_cleared")
        response = {"success": cleared is True, "ride_id": ride_id, **mutation_status("confirmed"), **result,
                    "state_status": "available" if isinstance(cleared, bool) else "unavailable"}
        if cleared is not True:
            response["error_message"] = "Reset action acknowledged, but vehicle clearance was not established"
        return response
    except APIError as error:
        return mutation_failure(error, ride_id=ride_id)


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def get_ride_stats(ride_id: int) -> dict[str, Any]:
    """
    Get ride status, pause state, train velocities, and ratings.

    Ratings use the game's decimal scale (e.g. 6.52), and are null until
    calculated. Vehicles are instantiated trains: each includes its car count
    when the complete train can be read. Closed rides may have no vehicles.
    Vehicle velocities are raw OpenRCT2 values, not mph or km/h. Head-car status,
    sprite/track-block positions, progress and raw G-forces are discrete observations,
    not a full physics trace. Coordinates use tiles and units of 8 game coordinates.
    """
    try:
        return api_client.get_ride_stats(ride_id)
    except APIError as e:
        logger.error(f"API error getting ride stats: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def get_ride_test_report(
    ride_id: int, observe_seconds: Annotated[float, Field(ge=0, le=60)] = 0,
) -> dict[str, Any]:
    """Read test readiness, ratings and game-reported telemetry without changing the ride.

    Optional observation (0-60 seconds, default one immediate sample) looks for
    nonzero train velocities. This does not start testing or unpause the game.
    Includes timed observations and station building presence checks, not guest
    path connectivity. Not observing movement is not proof of a stall. Stop construction first.
    """
    if not 0 <= observe_seconds <= 60:
        return {"success": False, "ride_id": ride_id, "error": "observe_seconds must be 0-60"}
    try:
        state = api_client.get_coaster_state(ride_id)
        samples = []
        observations = []
        started = time.monotonic()
        deadline = started + observe_seconds
        while True:
            samples.append(api_client.get_ride_stats(ride_id))
            observed = time.monotonic()
            observations.append({"elapsed_seconds": observed - started, "stats": samples[-1]})
            remaining = deadline - observed
            if remaining <= 0:
                break
            time.sleep(min(1, remaining))
        after = api_client.get_coaster_state(ride_id)
        if after != state:
            raise APIError("Ride layout changed during observation; collect again after editing stops")
        return {"success": True, "ride_id": ride_id, "observation_seconds_requested": observe_seconds,
                **test_report(state, samples), "observations": observations}
    except APIError as error:
        return {"success": False, "ride_id": ride_id, "error": str(error)}


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def get_track_catalog() -> Any:
    """List the game's track descriptors and which types this server can place.

    This catalog is not filtered for a ride or endpoint. A listed type is not
    necessarily available for a ride, compatible with its endpoint, or placeable.
    """
    try:
        catalog = api_client.get_track_catalog()
        for piece in catalog:
            name = TRACK_TYPES.get(piece.get("type"))
            piece["supported_name"] = name
        return catalog
    except APIError as e:
        return {"success": False, "error": str(e)}


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def get_loaded_ride_objects(ride_type: Optional[int] = None) -> dict[str, Any]:
    """Discover loaded vehicle/ride objects, optionally filtered by numeric ride type.

    Object indices can be passed as ride_object to create_ride. Car limits are
    object metadata, not guarantees of effective train length. Track availability
    remains unknown. Per-type research status is invented, uninvented or unknown,
    not a guarantee that creation or track placement is permitted.
    """
    try:
        objects = api_client.get_loaded_ride_objects()
        if ride_type is not None:
            objects = [obj for obj in objects if ride_type in obj["ride_types"]]
        return {"success": True, "objects": objects}
    except APIError as error:
        return {"success": False, "error": str(error)}


@mcp.tool()
def set_ride_vehicles(
    ride_id: int, setting: Literal["trains", "cars_per_train"], value: Annotated[int, Field(ge=1, le=255)]
) -> dict[str, Any]:
    """Set the proposed train count or cars per train using OpenRCT2's ride action.

    The game checks whether the change is allowed and may limit the effective
    count based on station length and track layout. Close the ride first.
    """
    try:
        return {"success": True, **mutation_status("confirmed"), **api_client.set_ride_vehicles(ride_id, setting, value)}
    except APIError as e:
        return mutation_failure(e, ride_id=ride_id)


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def get_park_status() -> dict[str, Any]:
    """Observe park finances, guests, scenario objective/status, date and research.

    Read-only; does not advance time, change settings or infer objective progress.
    Fields ending in _raw retain scripting API units. Requires a loaded normal park.
    """
    try:
        return {"success": True, **api_client.get_park_status()}
    except APIError as error:
        return {"success": False, "error": str(error)}


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def get_ride_station_access(
    ride_id: Annotated[int, Field(ge=0)], radius: Annotated[int, Field(ge=0, le=4)] = 2,
) -> dict[str, Any]:
    """Inspect station buildings and bounded nearby paths without changing the park.

    Coordinates use tiles and height units of 8 game coordinates. Stations expose
    present/absent/unknown positions. Paths retain edges, slopes, queue assignments
    and ghosts. This does not prove guest access or public-network connectivity.
    """
    try:
        return {"success": True, **api_client.get_ride_station_access(ride_id, radius)}
    except APIError as error:
        return {"success": False, "ride_id": ride_id, "error": str(error)}


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def get_plugin_info() -> dict[str, Any]:
    """Diagnose the connection, plugin/protocol compatibility, map and pause state.

    Older plugins do not support this endpoint; an error can mean the plugin
    needs updating or the game is unavailable.
    """
    try:
        info = api_client.get_plugin_info()
        return {**info, "version": info.get("version"), "expected_version": PLUGIN_VERSION,
                "matches": info.get("version") == PLUGIN_VERSION,
                "expected_protocol_version": PROTOCOL_VERSION, "protocol_compatible": type(info.get("protocol_version")) is int and info["protocol_version"] == PROTOCOL_VERSION}
    except APIError as e:
        return {"success": False, "error": str(e), "expected_version": PLUGIN_VERSION}


@mcp.tool(annotations={"destructiveHint": True, "openWorldHint": False})
def delete_ride(ride_id: int) -> dict[str, Any]:
    """Permanently demolish one ride by ID, including its track and vehicles."""
    try:
        api_client.delete_ride(ride_id)
        return {"success": True, "ride_id": ride_id, **mutation_status("confirmed")}
    except APIError as e:
        return mutation_failure(e, ride_id=ride_id)


@mcp.tool(annotations={"destructiveHint": True, "openWorldHint": False})
def delete_all_rides() -> dict[str, Any]:
    """
    Delete all rides and clear state.
    """
    try:
        result = api_client.delete_all_rides()
        return {"success": True, **mutation_status("confirmed"), "message": str(result)}
    except APIError as e:
        logger.error(f"API error deleting rides: {e}")
        return mutation_failure(e)


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def list_all_rides() -> Any:
    """
    List all rides. Each ride includes its id, name, numeric type, and a
    human-readable ride_type_name (e.g. "Wooden Roller Coaster").
    """
    try:
        rides = api_client.list_all_rides()
        for ride in rides:
            ride["ride_type_name"] = RIDE_TYPES.get(
                ride.get("type"), f"Unknown({ride.get('type')})"
            )
        return rides
    except APIError as e:
        logger.error(f"API error listing rides: {e}")
        return {"success": False, "error": str(e)}


register_park_tools(mcp, lambda: api_client, get_ride_test_report)


def main() -> None:
    """Main entry point. Metrics are opt-in and never overwrite an existing run."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8080, help="local plugin TCP port (default: 8080)")
    parser.add_argument("--metrics-file", type=Path, default=os.environ.get("OPENRCT2_METRICS_FILE"),
                        help="new local JSONL metrics file, or OPENRCT2_METRICS_FILE")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be 1-65535")
    api_client.port = args.port
    with ExitStack() as stack:
        if args.metrics_file:
            try:
                result_middleware.sink = stack.enter_context(args.metrics_file.open("x", encoding="utf-8"))
            except OSError as error:
                parser.error(f"Cannot create metrics file: {error}")
        try:
            mcp.run()
        except BaseException:
            # Do not certify an interrupted collection as complete.
            result_middleware.sink = None
            raise
        finally:
            result_middleware.finish_capture()
            api_client.close()


if __name__ == "__main__":
    main()
