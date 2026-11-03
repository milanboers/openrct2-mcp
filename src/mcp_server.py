"""FastMCP server for Roller Coaster ride creation (Stateless & Coordinate-Free)."""

import logging
import io
from typing import Any, Literal, Optional, Tuple
from fastmcp import FastMCP
from fastmcp.utilities.types import Image as MCPImage
from PIL import Image, ImageDraw
from pydantic import BaseModel, Field

try:
    from .api_client import OpenRCT2API, APIError
except ImportError:
    from api_client import OpenRCT2API, APIError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize MCP server
mcp = FastMCP("Roller Coaster Creator")

# Initialize API client
api_client = OpenRCT2API()


# Track Type Mapping
TRACK_TYPES = {
    0: "Flat",
    1: "EndStation",
    2: "BeginStation",
    3: "MiddleStation",
    4: "Up25",
    5: "Up60",
    10: "Down25",
    11: "Down60",
    6: "FlatToUp25",
    7: "Up25ToUp60",
    8: "Up60ToUp25",
    9: "Up25ToFlat",
    12: "FlatToDown25",
    13: "Down25ToDown60",
    14: "Down60ToDown25",
    15: "Down25ToFlat",
    16: "LeftQuarterTurn5Tiles",
    17: "RightQuarterTurn5Tiles",
    42: "LeftQuarterTurn3Tiles",
    43: "RightQuarterTurn3Tiles",
    18: "FlatToLeftBank",
    19: "FlatToRightBank",
    20: "LeftBankToFlat",
    21: "RightBankToFlat",
    32: "LeftBank",
    33: "RightBank",
    22: "BankedLeftQuarterTurn5Tiles",
    23: "BankedRightQuarterTurn5Tiles",
    44: "LeftBankedQuarterTurn3Tiles",
    45: "RightBankedQuarterTurn3Tiles",
    99: "Brakes",
}

# Reverse mapping for input
TRACK_NAME_TO_ID = {v: k for k, v in TRACK_TYPES.items()}

# Ride type IDs -> names. The plugin's track validation is tuned for the
# Wooden Roller Coaster (52); other types may not place correctly.
RIDE_TYPES = {
    0: "Spiral Roller Coaster",
    1: "Stand-up Roller Coaster",
    3: "Inverted Roller Coaster",
    13: "Bobsleigh Coaster",
    15: "Looping Roller Coaster",
    17: "Mine Train Coaster",
    19: "Corkscrew Roller Coaster",
    44: "Vertical Drop Roller Coaster",
    51: "Twister Roller Coaster",
    52: "Wooden Roller Coaster",
    54: "Steel Wild Mouse",
    57: "Flying Roller Coaster",
}


def _get_ride_type(ride_id: int) -> int:
    """Helper to fetch ride type from the game by ID."""
    try:
        rides = api_client.list_all_rides()
    except APIError as e:
        raise APIError(f"Cannot determine ride type: {e}") from e
    for ride in rides:
        if ride.get("id") == ride_id:
            if not isinstance(ride.get("type"), int):
                raise APIError(f"Ride {ride_id} has no valid ride type")
            return ride["type"]
    raise APIError(f"Ride {ride_id} not found")


def generate_coaster_image(
    history: list[dict[str, Any]], next_endpoint: dict[str, Any],
    track_elements: Optional[list[dict[str, Any]]] = None,
) -> MCPImage:
    """
    Generate a visual top-down representation of the coaster as an MCP ImageContent.
    """
    if not history:
        # Return a simple empty image
        img = Image.new("RGB", (100, 100), color=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return MCPImage(data=buf.getvalue(), format="png")

    points = []
    for p in history:
        points.append((p["x"], p["y"], p["z"], "P"))
    if next_endpoint and "x" in next_endpoint:
        points.append((next_endpoint["x"], next_endpoint["y"], next_endpoint["z"], "C"))

    bounds = points + [(e["x"], e["y"], e["z"], "T") for e in track_elements or []]
    min_x = min(p[0] for p in bounds)
    max_x = max(p[0] for p in bounds)
    min_y = min(p[1] for p in bounds)
    max_y = max(p[1] for p in bounds)

    padding = 2
    min_x -= padding
    max_x += padding
    min_y -= padding
    max_y += padding

    tile_size = min(40, 1600 / max(max_x - min_x + 1, max_y - min_y + 1))
    width = max(1, round((max_x - min_x + 1) * tile_size))
    height = max(1, round((max_y - min_y + 1) * tile_size))

    img_main = Image.new("RGB", (width, height), color=(40, 40, 40))
    draw = ImageDraw.Draw(img_main)

    # Function to convert tile coords to pixel coords in image (center of tile)
    def to_img_center(tx: int, ty: int) -> tuple[float, float]:
        return (
            (tx - min_x) * tile_size + tile_size // 2,
            (ty - min_y) * tile_size + tile_size // 2,
        )

    def to_img_topleft(tx: int, ty: int) -> tuple[float, float]:
        return (tx - min_x) * tile_size, (ty - min_y) * tile_size

    # Draw grid
    for x in range(min_x, max_x + 1):
        ix, _ = to_img_topleft(x, 0)
        draw.line([(ix, 0), (ix, height)], fill=(60, 60, 60))
    for y in range(min_y, max_y + 1):
        _, iy = to_img_topleft(0, y)
        draw.line([(0, iy), (width, iy)], fill=(60, 60, 60))

    # Actual track-element tiles are a footprint, not collision clearance.
    for element in track_elements or []:
        ix, iy = to_img_topleft(element["x"], element["y"])
        inset = min(2, tile_size / 4)
        draw.rectangle([ix + inset, iy + inset, ix + tile_size - inset, iy + tile_size - inset], fill=(70, 70, 90))

    # Determine height range for color scaling
    min_z_val = min(p[2] for p in points)
    max_z_val = max(p[2] for p in points)
    z_range = max(1, max_z_val - min_z_val)

    def get_color(z: int) -> tuple[int, int, int]:
        z_norm = (z - min_z_val) / z_range
        return (
            int(255 * z_norm),
            int(255 * (1 - z_norm)),
            int(255 * (1 - abs(0.5 - z_norm) * 2)),
        )

    # 1. Draw connecting lines first (the track itself)
    for i in range(len(points) - 1):
        p1 = points[i]
        p2 = points[i + 1]
        c1 = to_img_center(p1[0], p1[1])
        c2 = to_img_center(p2[0], p2[1])

        # Curved pieces need more than a straight line between tile origins.
        # Approximate their centreline using the entry and exit directions;
        # this is not an exact track footprint.
        piece = history[i] if i < len(history) else {}
        turn_types = {16, 17, 22, 23, 42, 43, 44, 45}
        line = [c1, c2]
        if piece.get("trackType") in turn_types and "nextDirection" in piece:
            directions = [(-1, 0), (0, 1), (1, 0), (0, -1)]
            start_direction = directions[piece["direction"] % 4]
            end_direction = directions[piece["nextDirection"] % 4]
            distance = max(abs(c2[0] - c1[0]), abs(c2[1] - c1[1])) * 0.55
            control1 = (c1[0] + start_direction[0] * distance, c1[1] + start_direction[1] * distance)
            control2 = (c2[0] - end_direction[0] * distance, c2[1] - end_direction[1] * distance)
            line = []
            for step in range(21):
                t = step / 20
                u = 1 - t
                line.append(tuple(round(u**3 * c1[j] + 3 * u**2 * t * control1[j]
                                        + 3 * u * t**2 * control2[j] + t**3 * c2[j]) for j in (0, 1)))
        draw.line(line, fill=get_color(p1[2]), width=12)
        draw.line(line, fill=(200, 200, 200), width=2)

    # 2. Draw nodes (boxes) on top
    for i, (px, py, pz, ptype) in enumerate(points):
        ix, iy = to_img_topleft(px, py)
        color = get_color(pz)

        # Border color
        outline = (255, 255, 255) if ptype == "C" else (150, 150, 150)
        if i == 0:
            outline = (0, 255, 0)  # Green for start

        # Draw a small box for the node
        box_size = min(10, tile_size / 4)
        cx, cy = to_img_center(px, py)
        draw.rectangle(
            [cx - box_size, cy - box_size, cx + box_size, cy + box_size],
            fill=color,
            outline=outline,
            width=2,
        )

        # Label with height (offset so it doesn't overlap the line)
        label = f"{pz}"
        if i == 0:
            label = f"S:{pz}"
        elif ptype == "C":
            label = f"C:{pz}"

        if tile_size >= 16:
            draw.text((ix + 2, iy + 2), label, fill=(255, 255, 255))

    buf_final = io.BytesIO()
    img_main.save(buf_final, format="PNG")
    return MCPImage(data=buf_final.getvalue(), format="png")


def generate_height_map(track_elements: Optional[list[dict[str, Any]]]) -> str:
    """Show actual track-element base heights, not collision clearance."""
    if track_elements is None:
        return "Track occupancy unavailable: update the OpenRCT2 plugin."
    if not track_elements:
        return "No track elements."

    grid: dict[tuple[int, int], set[float]] = {}
    for element in track_elements:
        grid.setdefault((element["x"], element["y"]), set()).add(element["z"])
    min_x = min(x for x, _ in grid)
    max_x = max(x for x, _ in grid)
    min_y = min(y for _, y in grid)
    max_y = max(y for _, y in grid)
    if (max_x - min_x + 1) * (max_y - min_y + 1) > 4096:
        return "Track occupancy grid omitted (over 4096 tiles). Use track_elements or get_map_area."
    labels = {key: "/".join(f"{z:g}" for z in sorted(heights)) for key, heights in grid.items()}
    width = max(4, max(len(label) for label in labels.values()) + 1, len(str(min_x)) + 1, len(str(max_x)) + 1)
    lines = ["Track-element base heights (not collision clearance):"]
    lines.append(" " * 5 + "".join(f"{x:>{width}}" for x in range(min_x, max_x + 1)))
    lines.append(" " * 5 + "-" * (width * (max_x - min_x + 1)))
    for y in range(min_y, max_y + 1):
        row = [f"{y:3} |"]
        row.extend(f"{labels.get((x, y), '.'):>{width}}" for x in range(min_x, max_x + 1))
        lines.append("".join(row))
    return "\n".join(lines)


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


def _mutation_state(ride_id: int, outcome: str = "confirmed", error: Optional[str] = None) -> Any:
    state = get_coaster_state(ride_id)
    summary = state[0] if isinstance(state, list) else state
    if not summary.get("success"):
        summary["state_error"] = summary.get("error")
    summary["operation_outcome"] = outcome
    if error is not None:
        summary["success"] = False
        summary["error_message"] = error
    return state


@mcp.tool()
def create_ride(
    name: str = "New Coaster",
    ride_type: int = 52,
    station_x: int = 67,
    station_y: int = 66,
    station_z: int = 14,
    direction: int = 0,
) -> Any:
    """
    Create a new roller coaster ride and place the first station piece.
    All parameters are optional and have reasonable defaults.

    ride_type: Numeric ride type ID from the game. 52 = Wooden Roller Coaster
    (the tested default); see the build-coaster skill for other known IDs.
    """
    ride_id: Optional[int] = None
    try:
        # 1. Create the ride via API
        result = api_client.create_ride(
            ride_type=ride_type,
            # Let OpenRCT2 choose a compatible loaded vehicle object.
            ride_object=65535,
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
        state = _mutation_state(ride_id)
        mismatch = placement.get("endpointPredictionMismatch")
        if isinstance(mismatch, dict):
            summary = state[0] if isinstance(state, list) else state
            summary["endpoint_prediction_mismatches"] = [{"segment_index": 0, **mismatch}]
        return state

    except APIError as e:
        logger.error(f"API error creating ride: {e}")
        failure: dict[str, Any] = {"success": False, "error": str(e), "operation_outcome": e.outcome}
        if ride_id is not None:
            failure["ride_id"] = ride_id
            failure["message"] = (
                "Ride was created; inspect operation_outcome for the station placement. "
                "Inspect the ride before retrying or deleting it."
            )
        return failure


class TrackSegment(BaseModel):
    """A single track piece and its placement options."""

    track_type: str
    has_chain_lift: bool = False
    brake_speed: int = 0
    seat_rotation: int = 0


class InvalidTrackType(APIError):
    pass


def _place_track_segment(
    ride_id: int, ride_type: int, segment: TrackSegment, *, query: bool = False
) -> dict[str, Any]:
    try:
        state = api_client.get_valid_next_pieces(ride_id)
    except APIError as e:
        raise APIError(f"Cannot read construction endpoint: {e}") from e
    if state.get("isCircuitComplete"):
        raise APIError("Circuit is already complete")
    track_id = TRACK_NAME_TO_ID.get(segment.track_type)
    if track_id is None or track_id not in state.get("validPieces", []):
        raise InvalidTrackType(f"Invalid track type at this position: {segment.track_type}")
    position = state.get("position")
    if not position:
        raise APIError("Game did not return a track placement position")
    options = {"query": True} if query else {}
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
    ride_id: int, track_type: str, brake_speed: int = 0,
    seat_rotation: int = 0, has_chain_lift: bool = False,
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
def get_map_area(x: int, y: int, radius: int = 4) -> dict[str, Any]:
    """Get terrain and map elements within 0–8 tiles of a map centre.

    Base and clearance Z are in track height units (8 game coordinates).
    Water height is the raw OpenRCT2 value. This is not a placement guarantee.
    """
    try:
        return api_client.get_map_area(x, y, radius)
    except APIError as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def place_track_segment(
    ride_id: int,
    track_type: str,
    brake_speed: int = 0,
    seat_rotation: int = 0,
    has_chain_lift: bool = False,
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
        placement = _place_track_segment(ride_id, _get_ride_type(ride_id), segment)
    except APIError as e:
        return _mutation_state(ride_id, e.outcome, str(e))
    state = _mutation_state(ride_id)
    mismatch = placement.get("endpointPredictionMismatch")
    if isinstance(mismatch, dict):
        summary = state[0] if isinstance(state, list) else state
        summary["endpoint_prediction_mismatches"] = [{"segment_index": 0, **mismatch}]
    return state


@mcp.tool()
def place_track_sequence(
    ride_id: int, segments: list[TrackSegment] = Field(min_length=1, max_length=256)
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
    try:
        ride_type = _get_ride_type(ride_id)
        for index, segment in enumerate(segments):
            failed_index = index
            placement = _place_track_segment(ride_id, ride_type, segment)
            placed += 1
            mismatch = placement.get("endpointPredictionMismatch") if isinstance(placement, dict) else None
            if isinstance(mismatch, dict):
                mismatches.append({"segment_index": index, **mismatch})
        failed_index = None
    except APIError as e:
        error = str(e)
        outcome = e.outcome
        if outcome == "confirmed":
            placed += 1

    result = _mutation_state(ride_id, outcome, error)
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
def undo_last_piece(ride_id: int) -> Any:
    """
    Remove the terminal track segment of the selected connected layout.

    This is not chronological undo. On a closed circuit it removes the segment
    immediately before the selected station start. Disconnected layouts are rejected.
    """
    try:
        api_client.delete_last_track_piece(ride_id)
        # Re-fetch the authoritative state: the delete response only contains
        # the next endpoint, not the remaining track history.
        return _mutation_state(ride_id)
    except APIError as e:
        return _mutation_state(ride_id, e.outcome, str(e))


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
def place_entrance_exit(ride_id: int) -> Any:
    """
    Place entrance and exit for a ride's station.
    """
    try:
        result = api_client.place_entrance_exit(ride_id)
        state = _mutation_state(ride_id, "partial" if result.get("warning") else "confirmed")
        summary = state[0] if isinstance(state, list) else state
        summary["entrance_exit"] = result
        if result.get("warning"):
            summary["success"] = False
            summary["error_message"] = result["warning"]
        return state
    except APIError as e:
        logger.error(f"API error placing entrance/exit: {e}")
        return _mutation_state(ride_id, e.outcome, str(e))


@mcp.tool()
def start_ride_test(ride_id: int) -> dict[str, Any]:
    """
    Start the ride in test mode to calculate ratings.
    """
    try:
        result = api_client.start_ride_test(ride_id)
        return {"success": True, "ride_id": ride_id, "operation_outcome": "confirmed", "message": str(result)}
    except APIError as e:
        logger.error(f"API error starting ride test: {e}")
        return {"success": False, "operation_outcome": e.outcome, "error": str(e)}


@mcp.tool()
def close_ride(ride_id: int) -> dict[str, Any]:
    """Close a ride before editing its track or vehicle configuration."""
    try:
        result = api_client.close_ride(ride_id)
        return {"success": True, "ride_id": ride_id, "operation_outcome": "confirmed", "message": str(result)}
    except APIError as e:
        return {"success": False, "ride_id": ride_id, "operation_outcome": e.outcome, "error": str(e)}


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def get_ride_stats(ride_id: int) -> dict[str, Any]:
    """
    Get ride status, pause state, train velocities, and ratings.

    Ratings use the game's decimal scale (e.g. 6.52), and are null until
    calculated. Vehicles are instantiated trains: each includes its car count
    when the complete train can be read. Closed rides may have no vehicles.
    Vehicle velocities are raw OpenRCT2 values, not mph or km/h.
    """
    try:
        return api_client.get_ride_stats(ride_id)
    except APIError as e:
        logger.error(f"API error getting ride stats: {e}")
        return {"success": False, "error": str(e)}


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


@mcp.tool()
def set_ride_vehicles(
    ride_id: int, setting: Literal["trains", "cars_per_train"], value: int
) -> dict[str, Any]:
    """Set the proposed train count or cars per train using OpenRCT2's ride action.

    The game checks whether the change is allowed and may limit the effective
    count based on station length and track layout. Close the ride first.
    """
    try:
        return {"success": True, "operation_outcome": "confirmed", **api_client.set_ride_vehicles(ride_id, setting, value)}
    except APIError as e:
        return {"success": False, "ride_id": ride_id, "error": str(e)}


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": False})
def get_plugin_info() -> dict[str, Any]:
    """Diagnose the connection, plugin/protocol compatibility, map and pause state.

    Older plugins do not support this endpoint; an error can mean the plugin
    needs updating or the game is unavailable.
    """
    try:
        info = api_client.get_plugin_info()
        return {**info, "version": info.get("version"), "expected_version": "0.10.0",
                "matches": info.get("version") == "0.10.0",
                "expected_protocol_version": 1, "protocol_compatible": info.get("protocol_version") == 1}
    except APIError as e:
        return {"success": False, "error": str(e), "expected_version": "0.10.0"}


@mcp.tool(annotations={"destructiveHint": True, "openWorldHint": False})
def delete_ride(ride_id: int) -> dict[str, Any]:
    """Permanently demolish one ride by ID, including its track and vehicles."""
    try:
        api_client.delete_ride(ride_id)
        return {"success": True, "ride_id": ride_id, "operation_outcome": "confirmed"}
    except APIError as e:
        return {"success": False, "operation_outcome": e.outcome, "error": str(e), "ride_id": ride_id}


@mcp.tool(annotations={"destructiveHint": True, "openWorldHint": False})
def delete_all_rides() -> dict[str, Any]:
    """
    Delete all rides and clear state.
    """
    try:
        result = api_client.delete_all_rides()
        return {"success": True, "operation_outcome": "confirmed", "message": str(result)}
    except APIError as e:
        logger.error(f"API error deleting rides: {e}")
        return {"success": False, "operation_outcome": e.outcome, "error": str(e)}


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


def main() -> None:
    """Main entry point."""
    mcp.run()


if __name__ == "__main__":
    main()
