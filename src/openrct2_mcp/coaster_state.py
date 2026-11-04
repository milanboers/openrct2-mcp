"""Format authoritative coaster observations without changing the wire snapshot."""

from typing import Any, Optional, Tuple
from fastmcp.utilities.types import Image as MCPImage

from .catalog import TRACK_TYPES, RIDE_TYPES
from .visualization import generate_coaster_image, generate_height_map


def format_coaster_state(
    ride_id: int, api_payload: dict[str, Any], valid_piece_ids: list[int], *,
    include_image: bool = True, compact: bool = False,
) -> Tuple[dict[str, Any], Optional[MCPImage]]:
    """Format a snapshot into a summary and optional image, without mutating it."""
    history = api_payload.get("history", [])
    next_endpoint = dict(api_payload.get("nextEndpoint", {}))

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


def coaster_result(ride_id: int, payload: dict[str, Any], *, include_image: bool, compact: bool) -> Any:
    """Derive the endpoint from the observed traversal and package the MCP result."""
    payload = dict(payload)
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
