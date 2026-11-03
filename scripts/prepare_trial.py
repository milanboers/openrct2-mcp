"""Prepare an explicit continuation, obstruction or rating-revision agent trial."""

import argparse
import asyncio
import json
from pathlib import Path
import sys

from fastmcp import Client
from fastmcp.client.transports import StdioTransport

from openrct2_mcp.reference import ReferenceLayout
from openrct2_mcp.trials import TrialFixture, TrialPreparationError, prepare_trial

ROOT = Path(__file__).resolve().parent.parent


async def run(fixture: TrialFixture, reference: ReferenceLayout) -> dict:
    transport = StdioTransport(command='uv', args=['--directory', str(ROOT), 'run', '--locked', 'openrct2-mcp'],
                               keep_alive=False)
    async with Client(transport, timeout=20) as client:
        return await prepare_trial(client, fixture, reference)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fixture', required=True, type=Path, help='fixture manifest (not the agent prompt)')
    parser.add_argument('--output-dir', required=True, type=Path, help='new directory for brief and setup evidence')
    parser.add_argument('--yes', action='store_true', help='explicitly consent to adding fixture rides')
    args = parser.parse_args()
    if args.output_dir.exists() or args.output_dir.is_symlink():
        parser.error(f'Refusing to overwrite {args.output_dir}')
    if not args.output_dir.parent.is_dir():
        parser.error(f'Output parent does not exist: {args.output_dir.parent}')
    report = None
    try:
        fixture = TrialFixture.model_validate_json(args.fixture.read_text(encoding='utf-8'))
        reference = ReferenceLayout.model_validate_json(
            (ROOT / 'benchmarks' / 'references' / f'{fixture.reference}.json').read_text(encoding='utf-8'),
        )
        if not args.yes and input('This adds fixture rides in an empty sandbox and retains them. Continue? [y/N] ').lower() not in ('y', 'yes'):
            return 130
        # Reserve the output before creating any ride. An interrupted setup is
        # intentionally not reusable or silently overwritten.
        args.output_dir.mkdir()
        report = asyncio.run(run(fixture, reference))
        with (args.output_dir / 'setup.json').open('x', encoding='utf-8') as output:
            output.write(json.dumps(report, indent=2, allow_nan=False) + '\n')
        with (args.output_dir / 'brief.json').open('x', encoding='utf-8') as output:
            output.write(json.dumps(report['brief'], indent=2, allow_nan=False) + '\n')
        print(f'Trial target ride {report["ride_id"]}; brief and evidence: {args.output_dir}')
        return 0
    except TrialPreparationError as error:
        print(str(error), file=sys.stderr)
        try:
            with (args.output_dir / 'failure.json').open('x', encoding='utf-8') as output:
                output.write(json.dumps({'success': False, 'retained_ride_ids': error.ride_ids, 'error': str(error)}) + '\n')
        except OSError as write_error:
            print(f'Could not write failure evidence: {write_error}', file=sys.stderr)
        return 2
    except (OSError, ValueError, RuntimeError) as error:
        print(f'Trial preparation failed: {error}', file=sys.stderr)
        if report is not None:
            print(f'Created rides {report["created_ride_ids"]} are retained for inspection', file=sys.stderr)
        return 2
    except (EOFError, KeyboardInterrupt):
        print('Cancelled. Any created fixture rides remain; inspect the park before retrying.', file=sys.stderr)
        return 130


if __name__ == '__main__':
    sys.exit(main())
