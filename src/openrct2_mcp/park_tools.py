"""Narrow flat-path and guest-operation tools, using ordinary game actions."""

import re
from typing import Annotated, Any, Callable, Literal, Optional
from uuid import uuid4

from fastmcp import FastMCP
from pydantic import Field

from .api_client import APIError, OpenRCT2API
from .models import Endpoint, PathTile
from .results import mutation_failure, mutation_status


def observed_mutation_result(result: dict[str, Any]) -> dict[str, Any]:
    available = result.get('observed_after') is not None
    return {'success': available, **result, **mutation_status('confirmed', state_available=available)}


def guest_report(report: dict[str, Any]) -> dict[str, Any]:
    if not report.get('success'):
        return report
    samples = [item['stats'] for item in report['observations']]
    counts = [sample.get('total_customers') for sample in samples]
    valid = bool(counts) and all(type(count) is int and count >= 0 for count in counts)
    monotonic = valid and all(after >= before for before, after in zip(counts, counts[1:]))
    delta = counts[-1] - counts[0] if monotonic else None
    open_unpaused = bool(samples) and all(
        sample.get('ride_status') == 'open' and sample.get('game_paused') is False for sample in samples
    )
    # On OpenRCT2 0.5.7, wooden coaster customers increment in Guest::onExitRide.
    supported = report.get('ride_type') == 52
    return {
        **report, 'customer_delta': delta, 'counter_valid': bool(monotonic),
        'open_unpaused_throughout': open_unpaused, 'completion_counter_supported': supported,
        'completed_customers_observed': supported and open_unpaused and delta is not None and delta > 0,
        'guest_access': 'unknown',
        'guest_limitations': [
            'Customer completion interpretation is validated only for wooden coasters on OpenRCT2 0.5.7.',
            'A counter increase does not trace individual guests or prove the current exit route reaches the public network.',
            'No increase is not proof of an access failure: demand, dispatch, breakdowns and observation duration matter.',
            'Already-boarded guests can complete during this window. Use a guest-free baseline when grading a new connection.',
        ],
    }


def register_park_tools(
    mcp: FastMCP, get_api: Callable[[], OpenRCT2API], get_test_report: Callable[..., dict[str, Any]],
) -> None:
    @mcp.tool(annotations={'readOnlyHint': True, 'openWorldHint': False})
    def get_path_objects() -> dict[str, Any]:
        """List loaded modern footpath surfaces and railings with park-local indices.

        Flags are raw object metadata. Legacy paths are not supported for construction.
        """
        try:
            return {'success': True, **get_api().get_path_objects()}
        except APIError as error:
            return {'success': False, 'error': str(error)}

    @mcp.tool(annotations={'readOnlyHint': True, 'openWorldHint': False})
    def get_path_area(x: int, y: int, radius: Annotated[int, Field(ge=0, le=8)] = 4) -> dict[str, Any]:
        """Observe bounded paths, edges, heights, queues and ghosts. Not a pathfinder or guest-access proof."""
        try:
            return {'success': True, **get_api().get_path_area(x, y, radius)}
        except APIError as error:
            return {'success': False, 'error': str(error)}

    @mcp.tool(annotations={'openWorldHint': False})
    def place_path_tile(
        x: int, y: int, z: int, surface_object: int, railings_object: int, is_queue: bool = False,
    ) -> dict[str, Any]:
        """Place one flat ground-level path; no replacement, bridges or scenery clearing.

        Coordinates are tiles, Z is in units of 8 and must be even. Use loaded modern
        surface/railings indices. Overhead track is allowed if the game permits clearance.
        The game assigns queue ownership and connects edges.
        Before/after observations include neighboring paths; these effects are not atomic
        guards or guest-access proof. An acknowledged placement can have unavailable readback.
        """
        try:
            return observed_mutation_result(get_api().place_path_tile(
                x=x, y=y, z=z, surface_object=surface_object, railings_object=railings_object, is_queue=is_queue,
            ))
        except APIError as error:
            return mutation_failure(error)

    @mcp.tool(annotations={'openWorldHint': False})
    def place_path_sequence(
        tiles: Annotated[list[PathTile], Field(min_length=1, max_length=256)],
        surface_object: int, railings_object: int, is_queue: bool = False,
    ) -> dict[str, Any]:
        """Place 1-256 caller-chosen flat ground-level path tiles in order.

        Uses the same restrictions as place_path_tile, with shared path objects
        and queue flag. No routing, replacement or rollback. Stops on the first
        rejected/unknown action or unavailable readback. placed_count and placements
        retain the confirmed prefix; failed_index is zero-based. last_placement
        contains that action's observations, not a final survey of the route.
        Inspect the failed tile before retrying an unknown outcome.
        """
        placements = []
        last = None
        for index, tile in enumerate(tiles):
            try:
                last = observed_mutation_result(get_api().place_path_tile(
                    **tile.model_dump(), surface_object=surface_object,
                    railings_object=railings_object, is_queue=is_queue,
                ))
            except APIError as error:
                return {
                    **mutation_failure(error, confirmed_steps=len(placements)),
                    'placed_count': len(placements), 'placements': placements, 'failed_index': index,
                    'last_placement': last, 'state_status': 'unavailable',
                }
            placements.append({'index': index, **tile.model_dump(), 'cost_raw': last.get('cost_raw')})
            if not last['success']:
                return {
                    **last, 'placed_count': len(placements), 'placements': placements, 'failed_index': index,
                    'execution_status': 'partial' if len(placements) < len(tiles) else 'completed',
                    'last_placement': last,
                }
        return {
            'success': True, **mutation_status('confirmed', state_available=True),
            'placed_count': len(placements), 'placements': placements, 'last_placement': last,
        }

    @mcp.tool(annotations={'openWorldHint': False})
    def place_station_building(
        ride_id: int, building: Literal['entrance', 'exit'], x: int, y: int,
        direction: Literal[0, 1, 2, 3], expected_position: Optional[Endpoint] = None,
    ) -> dict[str, Any]:
        """Place a chosen entrance or exit facing adjacent first-station track.

        Coordinates are tiles. Directions: 0 west, 1 +y, 2 east, 3 -y, toward
        the station. Height comes from station 0; exactly one station is supported.
        Requires a closed ride with known zero guests. Moving an existing building
        requires its exact current expected_position (x, y, z, direction) from
        get_ride_station_access. The guard is not a reservation. No paths or scenery
        are replaced. The game action can reset vehicles and change queue edges.
        Both buildings may be placed on the same side. Does not prove guest access.
        """
        try:
            return observed_mutation_result(get_api().place_station_building(
                ride_id=ride_id, building=building, x=x, y=y, direction=direction,
                expected_position=expected_position.model_dump() if expected_position else None,
            ))
        except APIError as error:
            return mutation_failure(error, ride_id=ride_id)

    @mcp.tool(annotations={'destructiveHint': True, 'openWorldHint': False})
    def remove_path_tile(x: int, y: int, z: int, expected_path: dict[str, Any]) -> dict[str, Any]:
        """Remove one flat, non-ghost path, guarded by its exact current get_path_area observation.

        Use only for authorized work. Neighbor edges and queue assignments can change.
        The observation is not a reservation. Never retry an unknown removal blindly.
        """
        try:
            return observed_mutation_result(get_api().remove_path_tile(x=x, y=y, z=z, expected_path=expected_path))
        except APIError as error:
            return mutation_failure(error)

    @mcp.tool(annotations={'openWorldHint': False})
    def open_ride(ride_id: int) -> dict[str, Any]:
        """Open a ride through the game's normal status action. Not proof of guest access or completed rides."""
        try:
            get_api().open_ride(ride_id)
            return {'success': True, 'ride_id': ride_id, **mutation_status('confirmed')}
        except APIError as error:
            return mutation_failure(error, ride_id=ride_id)

    @mcp.tool(annotations={'readOnlyHint': True, 'openWorldHint': False})
    def get_ride_guest_report(
        ride_id: int, observe_seconds: Annotated[float, Field(ge=0, le=60)] = 0,
    ) -> dict[str, Any]:
        """Observe customer-counter progress without opening, changing or unpausing the ride.

        Includes timed samples and readiness. Completion-counter interpretation is validated
        only for wooden coasters on OpenRCT2 0.5.7. Does not trace individual guests or
        certify public-network connectivity; lack of progress is not proof of an access failure.
        """
        return guest_report(get_test_report(ride_id, observe_seconds=observe_seconds))

    @mcp.tool(annotations={'openWorldHint': False})
    def save_park(label: str) -> dict[str, Any]:
        """Request a checkpoint with a fresh UUID filename in the game's save directory.

        Label is 1-48 ASCII letters, digits, underscores or hyphens. No paths or existing
        save names are accepted. The game API returns void: file_written stays unknown.
        Verify the file before relying on it. Never automatically retry an unknown request.
        """
        if not re.fullmatch(r'[a-zA-Z0-9_-]{1,48}', label):
            return mutation_failure(APIError('Expected a 1-48 character checkpoint label (letters, digits, _ or -)'))
        filename = f'mcp-{label}-{uuid4().hex}'
        try:
            return {'success': True, **get_api().save_park(filename), **mutation_status('confirmed')}
        except APIError as error:
            return {**mutation_failure(error), 'filename': filename + '.park'}
