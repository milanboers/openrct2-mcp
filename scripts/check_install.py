"""Build an sdist/wheel, install in isolation, and check the installed MCP entry point."""

import asyncio
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import zipfile

from fastmcp import Client
from fastmcp.client.transports import StdioTransport

ROOT = Path(__file__).resolve().parent.parent
REQUIRED_TOOLS = {"create_ride", "get_coaster_state", "get_coaster_view", "close_ride", "place_track_sequence"}


def run(*arguments: str, cwd: Path = ROOT) -> None:
    subprocess.run(arguments, cwd=cwd, check=True)


def check_archives(sdist: Path, wheel: Path) -> None:
    with tarfile.open(sdist) as archive:
        files = {name.split('/', 1)[1] for name in archive.getnames() if '/' in name}
    required = {
        'pyproject.toml', 'uv.lock', 'ridecreation-api.js', 'skills/build-coaster/SKILL.md',
        'scenarios/sandbox.park', 'scripts/smoke_test.py', 'benchmarks/working-coaster.json',
        'src/openrct2_mcp/mcp_server.py',
    }
    if missing := required - files:
        raise RuntimeError(f'Source distribution is missing: {sorted(missing)}')
    with zipfile.ZipFile(wheel) as archive:
        names = archive.namelist()
    if 'openrct2_mcp/mcp_server.py' not in names or any(name.startswith(('src/', 'tests/')) or '/tests/' in name for name in names):
        raise RuntimeError('Wheel must contain openrct2_mcp, without the source tree or tests')


async def check_server(executable: Path, cwd: Path) -> None:
    environment = {key: value for key, value in os.environ.items()
                   if key not in ('PYTHONPATH', 'PYTHONHOME', 'VIRTUAL_ENV')}
    transport = StdioTransport(command=str(executable), args=[], cwd=str(cwd), env=environment)
    async with Client(transport, timeout=20) as client:
        tools = {tool.name: tool for tool in await client.list_tools()}
        if missing := REQUIRED_TOOLS - tools.keys():
            raise RuntimeError(f'Installed server is missing tools: {sorted(missing)}')
        if not tools['get_coaster_view'].annotations.read_only_hint:
            raise RuntimeError('Read-only tool metadata did not survive installation')
    print(f'Installed console entry point registered {len(tools)} MCP tools without connecting to the game.')


def main() -> None:
    with tempfile.TemporaryDirectory(prefix='openrct2-install-check-') as directory:
        work = Path(directory)
        artifacts = work / 'artifacts'
        run('uv', 'build', '--python', sys.executable, '--sdist', '--out-dir', str(artifacts))
        sdist, = artifacts.glob('*.tar.gz')
        # Build the wheel from the archive, not the checkout, to exercise the sdist too.
        run('uv', 'build', str(sdist), '--python', sys.executable, '--wheel', '--out-dir', str(artifacts))
        wheel, = artifacts.glob('*.whl')
        check_archives(sdist, wheel)
        requirements = work / 'runtime.txt'
        subprocess.run(
            ['uv', 'export', '--locked', '--no-dev', '--no-emit-project', '--output-file', str(requirements)],
            cwd=ROOT, check=True, stdout=subprocess.DEVNULL,
        )
        venv = work / 'venv'
        run('uv', 'venv', '--python', sys.executable, str(venv))
        binary_dir = venv / ('Scripts' if os.name == 'nt' else 'bin')
        python = binary_dir / ('python.exe' if os.name == 'nt' else 'python')
        run('uv', 'pip', 'install', '--python', str(python), '--require-hashes', '-r', str(requirements))
        run('uv', 'pip', 'install', '--python', str(python), '--no-deps', str(wheel))
        outside = work / 'outside-checkout'
        outside.mkdir()
        output = subprocess.check_output([
            str(python), '-I', '-c',
            'import json, openrct2_mcp; print(json.dumps(openrct2_mcp.__file__))',
        ], cwd=outside, text=True)
        if not Path(json.loads(output)).is_relative_to(venv):
            raise RuntimeError('Package was not imported from the isolated environment')
        asyncio.run(check_server(binary_dir / ('openrct2-mcp.exe' if os.name == 'nt' else 'openrct2-mcp'), outside))
    print('Clean-install check passed. Temporary build/install files removed.')


if __name__ == '__main__':
    main()
