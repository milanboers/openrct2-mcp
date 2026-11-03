"""Opt-in guest-operation calibration for the bundled sandbox. Never resets the park.

Builds an explicit reference, connects it to the sandbox's existing public path,
opens it, checks reciprocal path edges and customer completion, then requests a save.
This is scripted calibration, not an independent agent trial or a layout planner.
"""

import argparse
import asyncio
import json
import math
from pathlib import Path
import sys
import time

from fastmcp import Client
from fastmcp.client.transports import StdioTransport

from openrct2_mcp.benchmark import BenchmarkBrief
from openrct2_mcp.client_helpers import call_object
from openrct2_mcp.paths import flat_route_connected
from openrct2_mcp.readiness import inspect_readiness
from openrct2_mcp.reference import ReferenceLayout, build_reference

ROOT = Path(__file__).resolve().parent.parent


def write_new(path, value):
    with path.open('x', encoding='utf-8') as output:
        output.write(json.dumps(value, indent=2, allow_nan=False) + '\n')


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
        layout = ReferenceLayout.model_validate_json((ROOT / 'benchmarks/references/rated-coaster.json').read_text())
        layout.station.y = 60
        layout.validation = {}  # This translated calibration is not the original reference validation.
        write_new(output / 'construction.json', layout.model_dump())
        brief = BenchmarkBrief.model_validate_json((ROOT / 'benchmarks/rated-coaster.json').read_text())
        built = await build_reference(client, brief, layout, timeout)
        write_new(output / 'construction-result.json', built)
        ride_id = built['ride_id']
        if not built['passed']:
            raise RuntimeError(f'Construction acceptance failed; ride {ride_id} retained')
        state = await call_object(client, 'get_coaster_state', ride_id=ride_id, include_image=False)
        station = state['stations'][0]
        if station['entrance']['position'] != {'x': 117, 'y': 59, 'z': 14, 'direction': 1} or \
                station['exit']['position'] != {'x': 117, 'y': 61, 'z': 14, 'direction': 3}:
            raise RuntimeError(f'Unexpected station geometry; ride {ride_id} retained without connecting paths')
        baseline = await call_object(client, 'get_ride_stats', ride_id=ride_id)
        if not all(type(baseline.get(key)) is int and baseline[key] == 0
                   for key in ('guest_count', 'total_customers')):
            raise RuntimeError('Expected a guest-free reference before connecting paths')
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
        result = {'passed': True, 'run_kind': 'scripted_guest_calibration', 'ride_id': ride_id,
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
    if not args.yes and input('Build a reference coaster and paths in the fresh sandbox, open it and request a checkpoint? (yes/no): ').strip().lower() != 'yes':
        return 130
    try:
        args.output_dir.mkdir(parents=True, exist_ok=False)
    except OSError as error:
        print(f'Refusing output directory: {error}', file=sys.stderr)
        return 2
    try:
        result = asyncio.run(run(args.port, args.output_dir, args.timeout))
        print(f'Guest calibration passed: ride {result["ride_id"]}; evidence in {args.output_dir}')
        return 0
    except Exception as error:
        write_new(args.output_dir / 'failure.json', {'error': str(error), 'partial_work_retained': True})
        print(f'Guest calibration stopped: {error}. No rollback was attempted; inspect the park before retrying.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
