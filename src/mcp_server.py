"""FastMCP server for Roller Coaster ride creation (Stateless & Coordinate-Free)."""

import logging
import io
from typing import Any, Optional, Tuple
from fastmcp import FastMCP
from fastmcp.utilities.types import Image as MCPImage
from PIL import Image, ImageDraw

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

# Map common error codes to descriptive strings for the agent
ERROR_MAP = {
    1: "Not enough space (Path might be blocked by scenery or another ride)",
    9: "Location occupied (You might be trying to build into the ground or another track piece)",
    11: "Invalid height (Too high above ground or too deep below)",
    12: "Track piece not available for this ride type",
}


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
}

# Reverse mapping for input
TRACK_NAME_TO_ID = {v: k for k, v in TRACK_TYPES.items()}


def _get_ride_type(ride_id: int) -> int:
    """Helper to fetch ride type from the game by ID."""
    try:
        rides = api_client.list_all_rides()
        for ride in rides:
            if ride.get("id") == ride_id:
                type_val = ride.get("type")
                return int(type_val) if type_val is not None else 52
    except Exception as e:
        logger.warning(f"Failed to fetch ride type for {ride_id}: {e}")
    return 52  # Fallback to default (Wooden Roller Coaster)


def generate_coaster_image(
    history: list[dict[str, Any]], next_endpoint: dict[str, Any]
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

    min_x = min(p[0] for p in points)
    max_x = max(p[0] for p in points)
    min_y = min(p[1] for p in points)
    max_y = max(p[1] for p in points)

    padding = 2
    min_x -= padding
    max_x += padding
    min_y -= padding
    max_y += padding

    tile_size = 40
    width = (max_x - min_x + 1) * tile_size
    height = (max_y - min_y + 1) * tile_size

    img_main = Image.new("RGB", (width, height), color=(40, 40, 40))
    draw = ImageDraw.Draw(img_main)

    # Function to convert tile coords to pixel coords in image (center of tile)
    def to_img_center(tx: int, ty: int) -> tuple[int, int]:
        return (
            (tx - min_x) * tile_size + tile_size // 2,
            (ty - min_y) * tile_size + tile_size // 2,
        )

    def to_img_topleft(tx: int, ty: int) -> tuple[int, int]:
        return (tx - min_x) * tile_size, (ty - min_y) * tile_size

    # Draw grid
    for x in range(min_x, max_x + 1):
        ix, _ = to_img_topleft(x, 0)
        draw.line([(ix, 0), (ix, height)], fill=(60, 60, 60))
    for y in range(min_y, max_y + 1):
        _, iy = to_img_topleft(0, y)
        draw.line([(0, iy), (width, iy)], fill=(60, 60, 60))

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

        # Draw thick line for the track piece
        draw.line([c1, c2], fill=get_color(p1[2]), width=12)
        # Draw a slightly thinner highlights line for a "railed" look
        draw.line([c1, c2], fill=(200, 200, 200), width=2)

    # 2. Draw nodes (boxes) on top
    for i, (px, py, pz, ptype) in enumerate(points):
        ix, iy = to_img_topleft(px, py)
        color = get_color(pz)

        # Border color
        outline = (255, 255, 255) if ptype == "C" else (150, 150, 150)
        if i == 0:
            outline = (0, 255, 0)  # Green for start

        # Draw a small box for the node
        box_size = 10
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

        draw.text((ix + 2, iy + 2), label, fill=(255, 255, 255))

    buf_final = io.BytesIO()
    img_main.save(buf_final, format="PNG")
    return MCPImage(data=buf_final.getvalue(), format="png")


def generate_height_map(
    history: list[dict[str, Any]], next_endpoint: dict[str, Any]
) -> str:
    """
    Generate a text-based height map of the coaster.
    """
    if not history:
        return "No track pieces placed yet."

    nodes = []
    for p in history:
        nodes.append((p["x"], p["y"], p["z"]))
    if next_endpoint and "x" in next_endpoint:
        nodes.append((next_endpoint["x"], next_endpoint["y"], next_endpoint["z"]))

    # Fill in intermediate tiles using simple linear interpolation
    all_points = []
    for i in range(len(nodes) - 1):
        p1 = nodes[i]
        p2 = nodes[i + 1]

        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        steps = max(abs(dx), abs(dy))

        if steps <= 1:
            all_points.append(p1)
            continue

        for s in range(steps):
            tx = p1[0] + round(s * dx / steps)
            ty = p1[1] + round(s * dy / steps)
            tz = p1[2] + round(s * (p2[2] - p1[2]) / steps)
            all_points.append((tx, ty, tz))

    all_points.append(nodes[-1])  # Add the final endpoint

    min_x = min(p[0] for p in all_points)
    max_x = max(p[0] for p in all_points)
    min_y = min(p[1] for p in all_points)
    max_y = max(p[1] for p in all_points)

    grid = {}
    for x, y, z in all_points:
        if (x, y) not in grid:
            grid[(x, y)] = []
        if z not in grid[(x, y)]:
            grid[(x, y)].append(z)

    lines = ["Height Map (z-values):"]
    header = " " * 5 + "".join(f"{x:4}" for x in range(min_x, max_x + 1))
    lines.append(header)
    lines.append(" " * 5 + "-" * (4 * (max_x - min_x + 1)))

    for y in range(min_y, max_y + 1):
        row = [f"{y:3} |"]
        for x in range(min_x, max_x + 1):
            heights = grid.get((x, y))
            if heights:
                val = str(heights[-1])  # Show the most recent height if multiple
                row.append(f"{val:>4}")
            else:
                row.append("   .")
        lines.append("".join(row))

    return "\n".join(lines)


def format_coaster_state(
    ride_id: int, api_payload: dict[str, Any], valid_pieces: list[int]
) -> Tuple[dict[str, Any], MCPImage]:
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

    # Calculate circuit completion
    is_circuit_complete = False
    if start_pos and next_endpoint:
        is_circuit_complete = (
            next_endpoint.get("x") == start_pos.get("x")
            and next_endpoint.get("y") == start_pos.get("y")
            and next_endpoint.get("z") == start_pos.get("z")
            and next_endpoint.get("direction") == start_pos.get("direction")
        )

    # Enrich next_endpoint with distance
    if start_pos and next_endpoint:
        next_endpoint["distance"] = {
            "x": next_endpoint["x"] - start_pos["x"],
            "y": next_endpoint["y"] - start_pos["y"],
            "z": next_endpoint["z"] - start_pos["z"],
        }

    # Generate coaster image visualization
    coaster_image = generate_coaster_image(history, next_endpoint)
    # Generate height map text
    height_map = generate_height_map(history, next_endpoint)

    # Convert valid_pieces to semantic names
    valid_names = [TRACK_TYPES.get(p, str(p)) for p in valid_pieces]

    state_dict = {
        "success": True,
        "ride_id": ride_id,
        "ride_type": _get_ride_type(ride_id),
        "pieces": formatted_pieces,
        "current_endpoint": next_endpoint,
        "valid_pieces": valid_names,
        "is_circuit_complete": is_circuit_complete,
        "height_map": height_map,
    }

    return (state_dict, coaster_image)


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
    """
    try:
        # 1. Create the ride via API
        result = api_client.create_ride(
            ride_type=ride_type,
            ride_object=0,
            entrance_object=0,
            colour1=0,
            colour2=0,
            inspection_interval=2,
            name=name,
        )

        ride_id = int(result["rideId"])

        # 2. Place the first station piece
        api_client.place_track_piece(
            ride_id=ride_id,
            tile_coordinate_x=station_x,
            tile_coordinate_y=station_y,
            tile_coordinate_z=station_z,
            direction=direction,
            track_type=2,  # BeginStation
            ride_type=ride_type,
        )

        # 3. Get the initial state
        return get_coaster_state(ride_id)

    except APIError as e:
        logger.error(f"API error creating ride: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
def place_track_segment(
    ride_id: int,
    track_type: str,
    brake_speed: int = 0,
    seat_rotation: int = 0,
    has_chain_lift: bool = False,
) -> Any:
    """
    Place a track segment.
    track_type must be a semantic name (e.g., 'Flat', 'Up25', 'FlatToUp25').
    This tool validates that the piece is legally allowed by the game engine before placing.
    """
    try:
        # 1. Fetch current state to validate selection
        current_state_list = get_coaster_state(ride_id)
        if isinstance(current_state_list, dict) and not current_state_list.get(
            "success"
        ):
            return current_state_list

        current_state = current_state_list[0]  # type: ignore
        ride_type = current_state.get("ride_type", 52)

        valid_pieces = current_state.get("valid_pieces", [])  # type: ignore
        if track_type not in valid_pieces:
            error_msg = f"Invalid track type '{track_type}'. You MUST choose from the valid_pieces list: {valid_pieces}."
            logger.warning(f"Agent attempted invalid move: {error_msg}")
            return {
                "success": False,
                "error_message": error_msg,
                "ride_id": ride_id,
                "pieces": current_state["pieces"],
                "current_endpoint": current_state["current_endpoint"],
                "valid_pieces": valid_pieces,
                "is_circuit_complete": False,
            }

        # Translate track name to ID
        track_id = TRACK_NAME_TO_ID.get(track_type)
        if track_id is None:
            # This should ideally not happen if it's in valid_pieces, but for safety:
            return {
                "success": False,
                "error_message": f"Unknown track type name: {track_type}",
            }

        endpoint = current_state["current_endpoint"]

        # 2. Proceed with placement
        api_client.place_track_piece(
            ride_id=ride_id,
            tile_coordinate_x=endpoint["x"],
            tile_coordinate_y=endpoint["y"],
            tile_coordinate_z=endpoint["z"],
            direction=endpoint["direction"],
            track_type=track_id,
            ride_type=ride_type,
            colour=0,
            brake_speed=brake_speed,
            seat_rotation=seat_rotation,
            track_place_flags=0,
            is_from_track_design=True,
            has_chain_lift=has_chain_lift,
        )

        # 3. Return the full authoritative state
        return get_coaster_state(ride_id)

    except APIError as e:
        error_msg_raw = str(e)
        error_msg = error_msg_raw
        try:
            error_code = int(error_msg_raw)
            error_msg = ERROR_MAP.get(error_code, f"Game Engine Error {error_code}")
        except ValueError:
            pass

        logger.error(f"Placement FAILED: {error_msg}")
        try:
            state = get_coaster_state(ride_id)
            if isinstance(state, list):
                state[0]["success"] = False
                state[0]["error_message"] = error_msg
            return state
        except Exception:
            return {"success": False, "error_message": error_msg}


@mcp.tool()
def undo_last_piece(ride_id: int) -> Any:
    """
    Remove the last placed track segment.
    """
    try:
        result = api_client.delete_last_track_piece(ride_id)
        valid_pieces_resp = api_client.get_valid_next_pieces(ride_id)
        valid_pieces = valid_pieces_resp.get("validPieces", [])
        return list(format_coaster_state(ride_id, result, valid_pieces))
    except APIError as e:
        logger.error(f"API error undoing last piece: {e}")
        return get_coaster_state(ride_id)


@mcp.tool()
def get_coaster_state(ride_id: int) -> Any:
    """
    Get the current authoritative state of a coaster ride.
    """
    try:
        valid_pieces_resp = api_client.get_valid_next_pieces(ride_id)
        valid_pieces = valid_pieces_resp.get("validPieces", [])
        history_resp = api_client.get_track_history(ride_id)

        history = history_resp.get("history", [])
        next_endpoint = {}
        if history:
            last = history[-1]
            next_endpoint = {
                "x": last["nextX"],
                "y": last["nextY"],
                "z": last["nextZ"],
                "direction": last["nextDirection"],
            }
        elif valid_pieces_resp.get("position"):
            pos = valid_pieces_resp["position"]
            next_endpoint = {
                "x": pos["x"],
                "y": pos["y"],
                "z": pos["z"],
                "direction": pos["direction"],
            }

        payload = {
            "history": history,
            "nextEndpoint": next_endpoint,
            "isCircuitComplete": False,
        }

        return list(format_coaster_state(ride_id, payload, valid_pieces))
    except APIError as e:
        logger.error(f"API error getting coaster state: {e}")
        return {"success": False, "ride_id": ride_id, "error": str(e)}


@mcp.tool()
def place_entrance_exit(ride_id: int) -> Any:
    """
    Place entrance and exit for a ride's station.
    """
    try:
        result = api_client.place_entrance_exit(ride_id)
        state = get_coaster_state(ride_id)
        # state is a list [dict, Image]
        if isinstance(state, list) and len(state) > 0:
            state[0]["entrance_exit"] = result
        return state
    except APIError as e:
        logger.error(f"API error placing entrance/exit: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
def start_ride_test(ride_id: int) -> dict[str, Any]:
    """
    Start the ride in test mode to calculate ratings.
    """
    try:
        result = api_client.start_ride_test(ride_id)
        return {"success": True, "ride_id": ride_id, "message": str(result)}
    except APIError as e:
        logger.error(f"API error starting ride test: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
def get_ride_stats(ride_id: int) -> dict[str, Any]:
    """
    Get ride statistics (ratings).
    """
    try:
        return api_client.get_ride_stats(ride_id)
    except APIError as e:
        logger.error(f"API error getting ride stats: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
def delete_all_rides() -> dict[str, Any]:
    """
    Delete all rides and clear state.
    """
    try:
        result = api_client.delete_all_rides()
        return {"success": True, "message": str(result)}
    except APIError as e:
        logger.error(f"API error deleting rides: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
def list_all_rides() -> list[dict[str, Any]]:
    """
    List all rides.
    """
    try:
        return api_client.list_all_rides()
    except APIError as e:
        logger.error(f"API error listing rides: {e}")
        return []


def main() -> None:
    """Main entry point."""
    mcp.run()


if __name__ == "__main__":
    main()
