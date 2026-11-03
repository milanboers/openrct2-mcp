"""End-to-end guest-operation smoke test for the bundled sandbox.

Builds a fixed test coaster, connects explicit queue/exit paths, opens it and
checks customer completion. Never resets the park or deletes existing work.
"""

import argparse
import asyncio
import json
import math
from pathlib import Path
import sys
import time
from typing import Literal

from fastmcp import Client
from fastmcp.client.transports import StdioTransport
from pydantic import BaseModel, ConfigDict, Field, model_validator

from openrct2_mcp.catalog import TRACK_NAME_TO_ID
from openrct2_mcp.client_helpers import MCPResponseError, call_object
from openrct2_mcp.inspection import movement_observed
from openrct2_mcp.models import TrackSegment
from openrct2_mcp.paths import flat_route_connected
from openrct2_mcp.readiness import inspect_readiness

ROOT = Path(__file__).resolve().parent.parent


def write_new(path, value):
    with path.open('x', encoding='utf-8') as output:
        output.write(json.dumps(value, indent=2, allow_nan=False) + '\n')


class CoasterFixture(BaseModel):
    """Fixed construction input for this sandbox smoke test, not a design API."""

    model_config = ConfigDict(extra='forbid', strict=True)
    ride_type: Literal[52]
    ride_object_identifier: str = Field(min_length=1)
    station_x: int = Field(ge=0)
    station_y: int = Field(ge=0)
    station_z: int = Field(ge=0)
    direction: Literal[0, 1, 2, 3]
    segments: list[TrackSegment] = Field(min_length=1, max_length=256)

    @model_validator(mode='after')
    def known_track_names(self) -> 'CoasterFixture':
        unknown = sorted({segment.track_type for segment in self.segments} - TRACK_NAME_TO_ID.keys())
        if unknown:
            raise ValueError(f'Unknown track names: {unknown}')
        return self


async def build_coaster(client, fixture, timeout):
    """Build the fixture and check operation; retain partial work on failure."""
    if not math.isfinite(timeout) or timeout <= 0:
        raise ValueError('Timeout must be finite and positive')
    info = await call_object(client, 'get_plugin_info')
    if (info.get('park_name') != 'sandbox' or info.get('matches') is not True
            or info.get('protocol_compatible') is not True or info.get('game_paused') is not False):
        raise RuntimeError('Load the unpaused sandbox with a matching plugin')
    objects = await call_object(client, 'get_loaded_ride_objects', ride_type=fixture.ride_type)
    selected = next((obj for obj in objects['objects'] if obj['identifier'] == fixture.ride_object_identifier), None)
    if selected is None:
        raise RuntimeError(f'Required ride object is not loaded: {fixture.ride_object_identifier}')
    ride_id = None
    try:
        created = await call_object(
            client, 'create_ride', name='Guest Smoke Coaster', ride_type=fixture.ride_type,
            ride_object=selected['index'], station_x=fixture.station_x, station_y=fixture.station_y,
            station_z=fixture.station_z, direction=fixture.direction, include_image=False, compact=True,
        )
        ride_id = created['ride_id']
        await call_object(client, 'place_track_sequence', ride_id=ride_id,
                          segments=[piece.model_dump() for piece in fixture.segments],
                          include_image=False, compact=True, expected_endpoint=created['current_endpoint'])
        state = await call_object(client, 'get_coaster_state', ride_id=ride_id, include_image=False)
        if not state.get('is_circuit_complete'):
            raise RuntimeError('Test circuit did not close')
        await call_object(client, 'place_entrance_exit', ride_id=ride_id, include_image=False, compact=True)
        state = await call_object(client, 'get_coaster_state', ride_id=ride_id, include_image=False)
        await call_object(client, 'start_ride_test', ride_id=ride_id)
        samples = []
        deadline = asyncio.get_running_loop().time() + timeout
        while True:
            latest = await call_object(client, 'get_ride_stats', ride_id=ride_id)
            samples.append(latest)
            if (latest.get('ratings_available') is True and movement_observed(samples)
                    and latest.get('ride_status') == 'testing' and latest.get('game_paused') is False):
                break
            remaining = deadline - asyncio.get_running_loop().time()
            if remaining <= 0:
                raise RuntimeError('Timed out observing an unpaused test with movement and ratings')
            await asyncio.sleep(min(1, remaining))
        after = await call_object(client, 'get_coaster_state', ride_id=ride_id, include_image=False)
        if after != state:
            raise RuntimeError('Test coaster changed during observation')
        return {'ride_id': ride_id, 'state': state, 'stats_samples': samples}
    except Exception as error:
        if ride_id is None and isinstance(error, MCPResponseError):
            ride_id = error.ride_id
        if ride_id is None:
            raise
        raise RuntimeError(f'Construction stopped; ride {ride_id} is retained for inspection: {error}') from error


async def run(port, output, timeout):
    transport = StdioTransport(command='uv', args=['--directory', str(ROOT), 'run', '--locked',
                               'openrct2-mcp', '--port', str(port)], keep_alive=False)
    async with Client(transport, timeout=30) as client:
        ready = await inspect_readiness(client, 'sandbox', require_empty=True, require_unpaused=True)
        write_new(output / 'readiness.json', ready)
        if not ready['ready'] or ready['park']['scenario']['name'] != 'sandbox':
            raise RuntimeError('Load the intended fresh, unpaused bundled sandbox; existing work is never deleted')
        anchor = await call_object(client, 'get_path_area', x=146, y=67, radius=0)
        if not any(p['base_z'] == 14 and p['is_queue'] is False and p['is_ghost'] is False
                   and p['slope_direction'] is None and p['edges'] & 4 for p in anchor['paths']):
            raise RuntimeError('The calibrated sandbox public-path anchor is unavailable')
        fixture = CoasterFixture.model_validate_json((ROOT / 'scenarios/guest-coaster.json').read_text())
        write_new(output / 'construction.json', fixture.model_dump())
        built = await build_coaster(client, fixture, timeout)
        write_new(output / 'construction-result.json', built)
        ride_id = built['ride_id']
        state = await call_object(client, 'get_coaster_state', ride_id=ride_id, include_image=False)
        station = state['stations'][0]
        if station['entrance']['position'] != {'x': 117, 'y': 59, 'z': 14, 'direction': 1} or \
                station['exit']['position'] != {'x': 117, 'y': 61, 'z': 14, 'direction': 3}:
            raise RuntimeError(f'Unexpected station geometry; ride {ride_id} retained without connecting paths')
        baseline = await call_object(client, 'get_ride_stats', ride_id=ride_id)
        if not all(type(baseline.get(key)) is int and baseline[key] == 0
                   for key in ('guest_count', 'total_customers')):
            raise RuntimeError('Expected a guest-free test coaster before connecting paths')
        public = [(x, 67) for x in range(145, 111, -1)] + [(117, y) for y in range(62, 67)]
        queue = [(x, 58) for x in range(117, 111, -1)] + [(112, y) for y in range(59, 67)]
        objects = await call_object(client, 'get_path_objects')
        surfaces = {obj['identifier']: obj['index'] for obj in objects['surfaces']}
        railings = {obj['identifier']: obj['index'] for obj in objects['railings']}
        normal = surfaces['rct2.footpath_surface.ash']
        queued = surfaces['rct2.footpath_surface.queue_blue']
        railing = railings['rct2.footpath_railings.bamboo_black']
        with (output / 'path-actions.jsonl').open('x') as actions:
            for is_queue, points, surface in [(False, public, normal), (True, queue, queued)]:
                for x, y in points:
                    actions.write(json.dumps({'phase': 'requested', 'x': x, 'y': y, 'is_queue': is_queue}) + '\n')
                    actions.flush()
                    result = await call_object(client, 'place_path_tile', x=x, y=y, z=14,
                                               surface_object=surface, railings_object=railing, is_queue=is_queue)
                    actions.write(json.dumps({'phase': 'completed', 'x': x, 'y': y, 'is_queue': is_queue, 'result': result}) + '\n')
                    actions.flush()
        paths = []
        for x in (120, 136, 146):
            paths.extend((await call_object(client, 'get_path_area', x=x, y=62, radius=8))['paths'])
        entrance_route = queue + [(112, 67)] + [(x, 67) for x in range(113, 147)]
        exit_route = [(117, y) for y in range(62, 68)] + [(x, 67) for x in range(118, 147)]
        checks = {
            'entrance_route_edges': flat_route_connected(paths, entrance_route, 14),
            'exit_route_edges': flat_route_connected(paths, exit_route, 14),
            'entrance_door_edge': any(p['x'] == 117 and p['y'] == 58 and p['base_z'] == 14
                                      and p['edges'] & 2 for p in paths),
            'exit_door_edge': any(p['x'] == 117 and p['y'] == 62 and p['base_z'] == 14
                                  and p['edges'] & 8 for p in paths),
            'queue_assignment': all(any(p['x'] == x and p['y'] == y and p['base_z'] == 14
                                        and p['is_queue'] and p['ride_id'] == ride_id and p['station'] == 0
                                        for p in paths) for x, y in queue),
            'track_preserved': state == await call_object(client, 'get_coaster_state', ride_id=ride_id, include_image=False),
        }
        write_new(output / 'access.json', {'checks': checks, 'paths': paths, 'baseline': baseline,
                                          'public_anchor': anchor, 'entrance_route': entrance_route, 'exit_route': exit_route})
        if not all(checks.values()):
            raise RuntimeError(f'Flat access checks failed; ride {ride_id} and partial paths retained')
        await call_object(client, 'close_ride', ride_id=ride_id)
        await call_object(client, 'open_ride', ride_id=ride_id)
        deadline = time.monotonic() + timeout
        with (output / 'observations.jsonl').open('x') as observations:
            while True:
                report = await call_object(client, 'get_ride_guest_report', ride_id=ride_id,
                                           observe_seconds=min(10, max(0, deadline - time.monotonic())))
                observations.write(json.dumps(report) + '\n')
                observations.flush()
                if (report['completion_counter_supported'] and report['counter_valid']
                        and report['open_unpaused_throughout']
                        and report['latest_stats']['total_customers'] > baseline['total_customers']):
                    break
                if time.monotonic() >= deadline:
                    raise RuntimeError(f'No completed customers observed; ride {ride_id} retained. This is not proof of an access failure.')
        checkpoint = await call_object(client, 'save_park', label='guest-connected')
        result = {'passed': True, 'run_kind': 'guest_smoke_test', 'ride_id': ride_id,
                  'checks': checks, 'baseline': baseline, 'final_observation': report, 'checkpoint': checkpoint,
                  'limitations': ['Specific flat routes to the bundled sandbox anchor were checked, not arbitrary park-wide connectivity.',
                                 'Customer completion and exit-route connectivity were observed, not individual guest trajectories.',
                                 'Checkpoint file persistence must be verified on disk. No scenario-finance or objective success is claimed.']}
        write_new(output / 'result.json', result)
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--output-dir', required=True, type=Path)
    parser.add_argument('--timeout', type=float, default=240)
    parser.add_argument('--yes', action='store_true')
    args = parser.parse_args()
    if not 1 <= args.port <= 65535 or not math.isfinite(args.timeout) or args.timeout <= 0:
        parser.error('port must be 1-65535 and timeout must be finite and positive')
    if not args.yes and input('Build a test coaster and paths in the fresh sandbox, open it and request a checkpoint? (yes/no): ').strip().lower() != 'yes':
        return 130
    try:
        args.output_dir.mkdir(parents=True, exist_ok=False)
    except OSError as error:
        print(f'Refusing output directory: {error}', file=sys.stderr)
        return 2
    try:
        result = asyncio.run(run(args.port, args.output_dir, args.timeout))
        print(f'Guest smoke test passed: ride {result["ride_id"]}; evidence in {args.output_dir}')
        return 0
    except Exception as error:
        write_new(args.output_dir / 'failure.json', {'error': str(error), 'partial_work_retained': True})
        print(f'Guest smoke test stopped: {error}. No rollback was attempted; inspect the park before retrying.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
