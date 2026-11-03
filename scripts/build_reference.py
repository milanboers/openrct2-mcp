"""Build and evaluate an explicit benchmark reference in a prepared sandbox."""

import argparse
import asyncio
import json
import math
from pathlib import Path
import sys

from fastmcp import Client
from fastmcp.client.transports import StdioTransport

from openrct2_mcp.benchmark import BenchmarkBrief
from openrct2_mcp.reference import ReferenceLayout, build_reference

ROOT = Path(__file__).resolve().parent.parent


async def run(brief: BenchmarkBrief, layout: ReferenceLayout, timeout: float) -> dict:
    transport = StdioTransport(command='uv', args=['--directory', str(ROOT), 'run', '--locked', 'openrct2-mcp'],
                               keep_alive=False)
    async with Client(transport, timeout=20) as client:
        return await build_reference(client, brief, layout, timeout)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--brief', required=True, type=Path)
    parser.add_argument('--reference', required=True, type=Path)
    parser.add_argument('--timeout', type=float, default=180, help='seconds to observe ratings and movement')
    parser.add_argument('--output', type=Path, help='new JSON report file; never overwritten')
    parser.add_argument('--yes', action='store_true', help='confirm construction without an interactive prompt')
    args = parser.parse_args()
    if not math.isfinite(args.timeout) or args.timeout <= 0:
        parser.error('timeout must be finite and positive')
    if args.output and (args.output.exists() or args.output.is_symlink()):
        parser.error(f'Refusing to overwrite {args.output}')
    if args.output and not args.output.parent.is_dir():
        parser.error(f'Report directory does not exist: {args.output.parent}')
    try:
        brief = BenchmarkBrief.model_validate_json(args.brief.read_text(encoding='utf-8'))
        layout = ReferenceLayout.model_validate_json(args.reference.read_text(encoding='utf-8'))
        if layout.brief_id != brief.id or layout.ride_type != brief.criteria.ride_type:
            raise ValueError('Reference and brief IDs/ride types must match')
        if not args.yes and input('This adds a reference ride and leaves it in the park. Continue? [y/N] ').lower() not in ('y', 'yes'):
            return 130
        report = asyncio.run(run(brief, layout, args.timeout))
        document = json.dumps(report, indent=2, allow_nan=False) + '\n'
        if args.output:
            with args.output.open('x', encoding='utf-8') as output:
                output.write(document)
            print(f'Report: {args.output} (passed: {report["passed"]})', file=sys.stderr)
        else:
            print(document, end='')
        return 0 if report['passed'] else 1
    except (OSError, ValueError, RuntimeError) as error:
        print(f'Reference validation failed: {error}', file=sys.stderr)
        return 2
    except (EOFError, KeyboardInterrupt):
        return 130


if __name__ == '__main__':
    sys.exit(main())
