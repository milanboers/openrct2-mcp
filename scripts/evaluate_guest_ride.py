"""Read-only guest-use acceptance for one agent attempt in a prepared sandbox."""

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
from openrct2_mcp.client_helpers import call_json, call_object
from openrct2_mcp.guest_evaluation import GuestRoutes, evaluate_guest_ride
from openrct2_mcp.protocol import compatibility_error

ROOT = Path(__file__).resolve().parent.parent


async def collect_paths(client, routes, anchor):
    points = routes.entrance_route + routes.exit_route + [[anchor['x'], anchor['y']]]
    centers = {(x // 17 * 17 + 8, y // 17 * 17 + 8) for x, y in points}
    paths = {}
    for x, y in sorted(centers):
        area = await call_object(client, 'get_path_area', x=x, y=y, radius=8)
        for path in area['paths']:
            paths[json.dumps(path, sort_keys=True)] = path
    return sorted(paths.values(), key=lambda path: (path['x'], path['y'], path['base_z']))


async def collect(args, brief, setup, routes):
    transport = StdioTransport(command='uv', args=['--directory', str(ROOT), 'run', '--locked',
                               'openrct2-mcp', '--port', str(args.port)], keep_alive=False)
    async with Client(transport, timeout=90) as client:
        plugin = await call_object(client, 'get_plugin_info')
        if error := compatibility_error(plugin):
            raise RuntimeError(error)
        park = await call_object(client, 'get_park_status')
        if (park['game_mode'] != 'normal' or plugin['park_name'] != brief.park_name
                or plugin['map_size'] != setup['plugin']['map_size']):
            raise RuntimeError('The intended normal sandbox is not loaded')
        rides = await call_json(client, 'list_all_rides')
        state = await call_object(client, 'get_coaster_state', ride_id=args.ride_id, include_image=False)
        paths = await collect_paths(client, routes, setup['anchor'])
        baseline = await call_object(client, 'get_ride_stats', ride_id=args.ride_id)
        samples = [baseline]
        reports = []
        deadline = time.monotonic() + args.observe_seconds
        eligible = (state.get('ride_type') == 52 and state.get('is_circuit_complete') is True
                    and baseline.get('ride_status') == 'open' and baseline.get('game_paused') is False)
        while True:
            report = await call_object(client, 'get_ride_guest_report', ride_id=args.ride_id,
                                       observe_seconds=min(60, max(0, deadline - time.monotonic())) if eligible else 0)
            reports.append(report)
            samples.extend(item['stats'] for item in report['observations'])
            if (not eligible or time.monotonic() >= deadline
                    or (type(baseline.get('total_customers')) is int
                        and type(samples[-1].get('total_customers')) is int
                        and samples[-1]['total_customers'] > baseline['total_customers'])):
                break
        final_state = await call_object(client, 'get_coaster_state', ride_id=args.ride_id, include_image=False)
        final_paths = await collect_paths(client, routes, setup['anchor'])
        final_park = await call_object(client, 'get_park_status')
        final_rides = await call_json(client, 'list_all_rides')
        stable = (state == final_state and paths == final_paths and rides == final_rides
                  and final_park.get('park_name') == park.get('park_name'))
        fresh = setup['rides'] == [] and len(rides) == 1 and rides[0]['id'] == args.ride_id
        result = evaluate_guest_ride(brief, state, samples, paths, routes, setup['anchor'], baseline, reports,
                                     stable=stable, fresh_park=fresh)
        result.update(run_kind='guest_acceptance_collection', plugin=plugin,
                      evidence={'state': state, 'paths': paths, 'baseline': baseline, 'reports': reports,
                                'final_state': final_state, 'final_paths': final_paths, 'setup': setup},
                      routes=routes.model_dump())
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--brief', type=Path, default=ROOT / 'benchmarks/guest-coaster.json')
    parser.add_argument('--setup', type=Path, required=True)
    parser.add_argument('--routes', type=Path, required=True)
    parser.add_argument('--ride-id', type=int, required=True)
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--observe-seconds', type=float, default=240)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535 or not math.isfinite(args.observe_seconds) or not 0 <= args.observe_seconds <= 240:
        parser.error('port must be 1-65535; observe-seconds must be finite and between 0 and 240')
    try:
        brief = BenchmarkBrief.model_validate_json(args.brief.read_text())
        setup = json.loads(args.setup.read_text())
        routes = GuestRoutes.model_validate_json(args.routes.read_text())
        with args.output.open('x') as output:
            result = asyncio.run(collect(args, brief, setup, routes))
            json.dump(result, output, indent=2, allow_nan=False)
            output.write('\n')
        print(json.dumps({'passed': result['passed'], 'checks': result['checks'],
                          'guest_measurements': result['guest_measurements']}))
        return 0 if result['passed'] else 1
    except (OSError, ValueError, RuntimeError, KeyError) as error:
        print(f'Guest evaluation failed: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
