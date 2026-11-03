"""Evaluate a completed benchmark ride through read-only MCP calls."""

import argparse
import asyncio
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import sys
from typing import Any

from fastmcp import Client
from fastmcp.client.transports import StdioTransport
from openrct2_mcp.benchmark import BenchmarkBrief, evaluate_ride
from openrct2_mcp.metrics import summarize_metrics
from openrct2_mcp.client_helpers import call_object as read, call_json
from openrct2_mcp.trials import TrialSetup, preservation_checks

ROOT = Path(__file__).resolve().parent.parent


async def collect(
    client: Client, brief: BenchmarkBrief, ride_id: int, observe_seconds: float, setup: TrialSetup | None = None,
) -> dict[str, Any]:
    if setup is not None and (setup.ride_id != ride_id or setup.brief != brief):
        raise ValueError('Trial setup does not match this brief and ride ID')
    info = await read(client, 'get_plugin_info')
    if not info.get('matches') or not info.get('protocol_compatible'):
        raise RuntimeError('Plugin/server compatibility check failed')
    if info.get('park_name') != brief.park_name:
        raise RuntimeError(f'Expected park {brief.park_name!r}, got {info.get("park_name")!r}')
    state = await read(client, 'get_coaster_state', ride_id=ride_id, include_image=False)
    protected_states = []
    if setup is not None:
        for protected in setup.protected_rides:
            observed = await call_json(client, 'get_coaster_state', ride_id=protected['ride_id'],
                                       include_image=False, allow_failure=True)
            protected_states.append(observed)
    samples = []
    loop = asyncio.get_running_loop()
    deadline = loop.time() + observe_seconds
    while True:
        samples.append(await read(client, 'get_ride_stats', ride_id=ride_id))
        remaining = deadline - loop.time()
        if remaining <= 0:
            break
        await asyncio.sleep(min(1, remaining))
    after = await read(client, 'get_coaster_state', ride_id=ride_id, include_image=False)
    if after != state:
        raise RuntimeError('Ride layout changed during observation. Rerun after construction has stopped.')
    report = evaluate_ride(brief, state, samples)
    if setup is not None:
        for expected, before in zip(setup.protected_rides, protected_states):
            after_protected = await call_json(client, 'get_coaster_state', ride_id=expected['ride_id'],
                                             include_image=False, allow_failure=True)
            if after_protected != before:
                raise RuntimeError('Protected ride changed during observation; rerun after editing stops')
        report['checks'].extend(preservation_checks(setup, state, protected_states))
        report['passed'] = all(check['passed'] for check in report['checks'])
        report['trial_setup'] = setup.model_dump()
    report['observed_at'] = datetime.now(timezone.utc).isoformat()
    report['requested_observation_seconds'] = observe_seconds
    report['plugin'] = info
    report['evidence'] = {'state': state, 'stats_samples': samples}
    return report


async def run(
    brief: BenchmarkBrief, ride_id: int, observe_seconds: float, setup: TrialSetup | None = None,
) -> dict[str, Any]:
    transport = StdioTransport(command='uv', args=['--directory', str(ROOT), 'run', '--locked', 'openrct2-mcp'],
                               keep_alive=False)
    async with Client(transport, timeout=20) as client:
        return await collect(client, brief, ride_id, observe_seconds, setup)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--brief', required=True, type=Path, help='benchmark JSON brief')
    parser.add_argument('--ride-id', required=True, type=int)
    parser.add_argument('--setup', type=Path, help='optional trial setup.json for prefix/obstacle preservation checks')
    parser.add_argument('--observe-seconds', type=float, default=10, help='seconds to observe movement (1-300, default: 10)')
    parser.add_argument('--agent-label', help='optional label for comparing agent runs; not inferred')
    parser.add_argument('--metrics-file', type=Path, help='optional completed agent server JSONL metrics run')
    parser.add_argument('--allow-incomplete-metrics', action='store_true',
                        help='explicitly allow legacy/unfinished captures and label them incomplete')
    parser.add_argument('--output', type=Path, help='write a new JSON report file instead of stdout; never overwrite')
    args = parser.parse_args()
    if args.ride_id < 0 or not math.isfinite(args.observe_seconds) or not 1 <= args.observe_seconds <= 300:
        parser.error('ride-id must be nonnegative and observe-seconds must be 1-300')
    if args.output and (args.output.exists() or args.output.is_symlink()):
        parser.error(f'Refusing to overwrite {args.output}')
    if args.output and not args.output.parent.is_dir():
        parser.error(f'Report directory does not exist: {args.output.parent}')
    try:
        metrics = (summarize_metrics(args.metrics_file, allow_incomplete=args.allow_incomplete_metrics)
                   if args.metrics_file else None)
        brief = BenchmarkBrief.model_validate_json(args.brief.read_text(encoding="utf-8"))
        setup = TrialSetup.model_validate_json(args.setup.read_text(encoding='utf-8')) if args.setup else None
        report = asyncio.run(run(brief, args.ride_id, args.observe_seconds, setup))
        report['agent_label'] = args.agent_label
        if metrics is not None:
            report['agent_metrics'] = metrics
            report['measurements']['agent_tool_calls'] = metrics['tool_calls']
            report['measurements']['rejected_placements'] = metrics['rejected_placement_requests']
            report['limitations'] = [note for note in report['limitations'] if not note.startswith('Agent tool-call')]
            report['limitations'].append(metrics['limitations'])
        document = json.dumps(report, indent=2, allow_nan=False) + '\n'
        if args.output:
            with args.output.open('x', encoding='utf-8') as output:
                output.write(document)
            print(f'Report: {args.output} (passed: {report["passed"]})', file=sys.stderr)
        else:
            print(document, end='')
        return 0 if report['passed'] else 1
    except (OSError, ValueError, RuntimeError) as exc:
        print(f'Evaluation failed: {exc}', file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        return 130


if __name__ == '__main__':
    sys.exit(main())
