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

ROOT = Path(__file__).resolve().parent.parent


async def read(client: Client, tool: str, **arguments: Any) -> dict[str, Any]:
    result = await client.call_tool(tool, arguments)
    if result.is_error:
        raise RuntimeError(f'{tool} returned an MCP error')
    text = next((block.text for block in result.content if block.type == 'text'), None)
    value = json.loads(text) if text is not None else None
    if not isinstance(value, dict) or value.get('success') is False:
        raise RuntimeError(f'{tool} failed: {value}')
    return value


async def collect(client: Client, brief: BenchmarkBrief, ride_id: int, observe_seconds: float) -> dict[str, Any]:
    info = await read(client, 'get_plugin_info')
    if not info.get('matches') or not info.get('protocol_compatible'):
        raise RuntimeError('Plugin/server compatibility check failed')
    if info.get('park_name') != brief.park_name:
        raise RuntimeError(f'Expected park {brief.park_name!r}, got {info.get("park_name")!r}')
    state = await read(client, 'get_coaster_state', ride_id=ride_id, include_image=False)
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
    report['observed_at'] = datetime.now(timezone.utc).isoformat()
    report['requested_observation_seconds'] = observe_seconds
    report['plugin'] = info
    report['evidence'] = {'state': state, 'stats_samples': samples}
    return report


async def run(brief: BenchmarkBrief, ride_id: int, observe_seconds: float) -> dict[str, Any]:
    transport = StdioTransport(command='uv', args=['--directory', str(ROOT), 'run', '--locked', 'openrct2-mcp'])
    async with Client(transport, timeout=20) as client:
        return await collect(client, brief, ride_id, observe_seconds)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--brief', required=True, type=Path, help='benchmark JSON brief')
    parser.add_argument('--ride-id', required=True, type=int)
    parser.add_argument('--observe-seconds', type=float, default=10, help='seconds to observe movement (1-300, default: 10)')
    parser.add_argument('--agent-label', help='optional label for comparing agent runs; not inferred')
    parser.add_argument('--output', type=Path, help='write a new JSON report file instead of stdout; never overwrite')
    args = parser.parse_args()
    if args.ride_id < 0 or not math.isfinite(args.observe_seconds) or not 1 <= args.observe_seconds <= 300:
        parser.error('ride-id must be nonnegative and observe-seconds must be 1-300')
    if args.output and args.output.exists():
        parser.error(f'Refusing to overwrite {args.output}')
    try:
        brief = BenchmarkBrief.model_validate_json(args.brief.read_text(encoding="utf-8"))
        report = asyncio.run(run(brief, args.ride_id, args.observe_seconds))
        report['agent_label'] = args.agent_label
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
