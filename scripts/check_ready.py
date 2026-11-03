"""Read-only check of a fresh MCP server, plugin, park and required tool inventory.

This does not certify the tool allowlist of a different, already-running AI session.
"""

import argparse
import asyncio
import json
from pathlib import Path
import sys

from fastmcp import Client
from fastmcp.client.transports import StdioTransport

from openrct2_mcp.readiness import inspect_readiness

ROOT = Path(__file__).resolve().parent.parent


async def run(args):
    transport = StdioTransport(command='uv', args=['--directory', str(ROOT), 'run', '--locked',
                               'openrct2-mcp', '--port', str(args.port)], keep_alive=False)
    async with Client(transport, timeout=20) as client:
        return await inspect_readiness(client, args.expected_park, args.require_empty, args.require_unpaused)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--expected-park')
    parser.add_argument('--require-empty', action='store_true')
    parser.add_argument('--require-unpaused', action='store_true')
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('port must be 1-65535')
    try:
        report = asyncio.run(run(args))
        print(json.dumps(report, indent=2))
        return 0 if report['ready'] else 1
    except (OSError, RuntimeError, ValueError) as error:
        print(f'Readiness collection failed: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
