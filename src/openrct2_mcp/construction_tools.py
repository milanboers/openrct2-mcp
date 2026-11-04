"""Explicit non-linear construction, without routing or implicit ride lifecycle changes."""

from typing import Annotated, Any, Literal

from fastmcp import FastMCP
from pydantic import Field

from .api_client import APIError, OpenRCT2API
from .models import Direction, PathHeight, RideId, TileCoordinate, TrackElementSelection
from .park_tools import observed_mutation_result
from .results import mutation_failure


def register_construction_tools(mcp: FastMCP, api: OpenRCT2API) -> None:
    @mcp.tool(annotations={'readOnlyHint': True, 'openWorldHint': False})
    def get_ride_build_options() -> dict[str, Any]:
        """Inspect source-pinned normal-play starting pieces, track groups and loaded/researched objects.

        footprint_supported identifies 24 flat-ride/shop/facility types supported by
        place_ride_footprint. Other starting pieces are information, not promises of
        construction support. Track groups do not describe every vehicle's sprite support.
        Loaded/invented does not prove clearance, affordability or buildability.
        """
        try:
            return {'success': True, **api.get_ride_build_options()}
        except APIError as error:
            return {'success': False, 'error': str(error)}

    @mcp.tool(annotations={'readOnlyHint': True, 'openWorldHint': False})
    def get_ride_layout(
        ride_id: RideId, offset: Annotated[int, Field(strict=True, ge=0, le=1000000)] = 0,
        limit: Annotated[int, Field(strict=True, ge=1, le=256)] = 256,
    ) -> dict[str, Any]:
        """Inspect physical track elements, including footprints, mazes and disconnected layouts.

        Non-maze elements have an exact selection for remove_track_piece. Maze sequence
        is inapplicable/null. Nullable maze_entry and outward connection_directions help
        with maze editing, station buildings and shop service paths.
        Elements are not ordered track pieces. Stations and total count accompany a bounded
        page. No stable cursor, traversal, clearance, operation or guest-access proof.
        """
        try:
            return {'success': True, **api.get_ride_layout(ride_id, offset, limit)}
        except APIError as error:
            return {'success': False, 'ride_id': ride_id, 'error': str(error)}

    @mcp.tool(annotations={'openWorldHint': False, 'destructiveHint': True})
    def place_ride_footprint(
        ride_id: RideId, x: TileCoordinate, y: TileCoordinate, z: PathHeight, direction: Direction,
    ) -> dict[str, Any]:
        """Build the source-reviewed footprint of an existing empty flat ride, shop or facility.

        First discover get_ride_build_options and create_unbuilt_ride with an invented
        compatible loaded object. Requires a closed, guest-free, vehicle-free ride and
        even Z (units of 8). X/Y are tiles. Direction is 0 west, 1 +y, 2 east, 3 -y.
        The tool selects only that ride type's normal starting piece, not arbitrary track.
        Engine clearance, ownership, supports and costs apply; permitted scenery may clear.
        Does not name, open, place entrances/exits or build paths. Shops/facilities face
        direction for their service path (information kiosks connect on every side). Readback is not guest-access proof.
        No retries, implicit resets or rollback; an already-created record remains on failure.
        """
        try:
            return observed_mutation_result(api.place_ride_footprint(ride_id, x, y, z, direction))
        except APIError as error:
            return mutation_failure(error, ride_id=ride_id)

    @mcp.tool(annotations={'openWorldHint': False, 'destructiveHint': True})
    def remove_track_piece(ride_id: RideId, selection: TrackElementSelection) -> dict[str, Any]:
        """Remove a chosen whole track piece using an exact element selection from get_ride_layout.

        Supports interior/disconnected track and flat footprints, not mazes. One selected
        sequence element can remove a multi-tile piece. Requires closed, guest-free,
        vehicle-free state; reset_ride explicitly if needed. Rejects stale, ambiguous,
        ghost or wrong-ride selections before the native action. Base Z is raw game units,
        not track origin/connection height. Station types must still match exactly even
        though the native selector treats them alike. Neighbor stations/queues may change.
        Before/after layouts are 256-element prefixes with total counts, not connectivity
        proof. A selection is not a reservation. No automatic retry or rollback.
        """
        try:
            return observed_mutation_result(api.remove_track_piece(ride_id, selection.model_dump()))
        except APIError as error:
            return mutation_failure(error, ride_id=ride_id)

    @mcp.tool(annotations={'openWorldHint': False, 'destructiveHint': True})
    def edit_maze_cell(
        ride_id: RideId, x_game: Annotated[int, Field(strict=True, ge=0, le=32016, multiple_of=16)],
        y_game: Annotated[int, Field(strict=True, ge=0, le=32016, multiple_of=16)], z: PathHeight,
        direction: Direction, mode: Literal['build', 'fill'],
        expected_maze_entry: Annotated[int | None, Field(strict=True, ge=0, le=65535)],
    ) -> dict[str, Any]:
        """Build or fill one caller-chosen maze half-cell using the normal maze editor action.

        Requires maze type 20 and a closed, guest-free, vehicle-free ride. X/Y are raw
        game units aligned to 16 (half a tile), Z is an even height in units of 8.
        Direction is 0 west, 1 +y, 2 east, 3 -y, pointing from the previous cell to the
        cursor. Build edits the cursor cell. Fill edits the previous half-cell (cursor
        minus 16 in direction), matching the native UI. Both cursor and target tiles
        must exist for fill. Pass that affected tile's current maze_entry from
        get_ride_layout, or null for a new tile. The first placement is inferred only
        from an empty layout. Native actions can clear walls/scenery and change adjacent
        maze walls. The guard covers the affected tile, not neighboring tiles or all
        geometry. Readback is a bounded layout, not solvability or guest-access proof.
        No planner, raw maze mask writes, implicit reset, retry or rollback.
        """
        try:
            return observed_mutation_result(api.edit_maze_cell(
                ride_id, x_game, y_game, z, direction, mode, expected_maze_entry,
            ))
        except APIError as error:
            return mutation_failure(error, ride_id=ride_id)
