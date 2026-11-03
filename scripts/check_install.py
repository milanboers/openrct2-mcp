"""Build an sdist/wheel, install in isolation, and check the installed MCP entry point."""

import asyncio
import base64
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

from openrct2_mcp.client_helpers import call_json, call_object
from openrct2_mcp.metrics import summarize_metrics

ROOT = Path(__file__).resolve().parent.parent
REQUIRED_TOOLS = {
    "create_ride", "get_coaster_state", "get_coaster_view", "close_ride", "place_track_sequence",
    "get_ride_test_report", "check_track_candidates", "preview_track_removal", "remove_terminal_piece",
    "get_loaded_ride_objects", "get_park_status", "get_ride_station_access", "reset_ride",
    "get_path_objects", "get_path_area", "place_path_tile", "remove_path_tile", "open_ride",
    "get_ride_guest_report", "save_park",
}


def run(*arguments: str, cwd: Path = ROOT) -> None:
    subprocess.run(arguments, cwd=cwd, check=True)


def check_archives(sdist: Path, wheel: Path) -> None:
    with tarfile.open(sdist) as archive:
        files = {name.split('/', 1)[1] for name in archive.getnames() if '/' in name}
    required = {
        'pyproject.toml', 'uv.lock', 'ridecreation-api.js', 'skills/build-coaster/SKILL.md',
        'docs/reference.md',
        'scenarios/sandbox.park', 'scripts/smoke_test.py', 'benchmarks/working-coaster.json',
        'scripts/build_reference.py', 'benchmarks/references/rated-coaster.json', 'src/tests/plugin_server.js',
        'src/openrct2_mcp/mcp_server.py', 'scripts/prepare_trial.py',
        'benchmarks/fixtures/continue-coaster.json', 'benchmarks/fixtures/obstructed-coaster.json',
        'benchmarks/fixtures/revise-coaster.json',
    }
    if missing := required - files:
        raise RuntimeError(f'Source distribution is missing: {sorted(missing)}')
    with zipfile.ZipFile(wheel) as archive:
        names = archive.namelist()
    if 'openrct2_mcp/mcp_server.py' not in names or any(name.startswith(('src/', 'tests/')) or '/tests/' in name for name in names):
        raise RuntimeError('Wheel must contain openrct2_mcp, without the source tree or tests')


def extract_plugin_fixture(sdist: Path, destination: Path) -> Path:
    # Copy only fixed paths, not arbitrary archive member names.
    with tarfile.open(sdist) as archive:
        members = {member.name.split('/', 1)[1]: member for member in archive.getmembers() if '/' in member.name}
        for relative in ('ridecreation-api.js', 'src/tests/plugin_server.js'):
            source = archive.extractfile(members[relative])
            if source is None:
                raise RuntimeError(f'Source archive has no file content for {relative}')
            target = destination / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            with source:
                target.write_bytes(source.read())
    return destination / 'src' / 'tests' / 'plugin_server.js'


async def check_server(executable: Path, cwd: Path, fixture: Path) -> None:
    environment = {key: value for key, value in os.environ.items()
                   if key not in ('PYTHONPATH', 'PYTHONHOME', 'VIRTUAL_ENV', 'OPENRCT2_METRICS_FILE')}
    metrics = cwd / 'installed-metrics.jsonl'
    log = cwd / 'plugin-stub.log'
    with log.open('wb') as stderr:
        proc = await asyncio.create_subprocess_exec(
            'node', str(fixture), '--tcp', stdout=asyncio.subprocess.PIPE, stderr=stderr,
        )
        try:
            bootstrap = json.loads(await asyncio.wait_for(proc.stdout.readline(), timeout=10))
            port = bootstrap['port']
            if not isinstance(port, int) or not 1 <= port <= 65535:
                raise RuntimeError('Plugin stub did not report a valid local port')
            transport = StdioTransport(command=str(executable), cwd=str(cwd), env=environment, keep_alive=False,
                                       args=['--port', str(port), '--metrics-file', str(metrics)])
            async with Client(transport, timeout=20) as client:
                tools = {tool.name: tool for tool in await client.list_tools()}
                if missing := REQUIRED_TOOLS - tools.keys():
                    raise RuntimeError(f'Installed server is missing tools: {sorted(missing)}')
                if not tools['get_coaster_view'].annotations.read_only_hint:
                    raise RuntimeError('Read-only tool metadata did not survive installation')
                info = await call_object(client, 'get_plugin_info')
                # Prove we reached our ephemeral stub before sending any mutation.
                if info.get('park_name') != bootstrap['park_name'] or not info.get('matches'):
                    raise RuntimeError('Installed server did not reach this plugin stub; refusing mutations')
                park = await call_object(client, 'get_park_status')
                assert park['park_name'] == bootstrap['park_name'] and park['scenario']['objective']['type'] == 'haveFun'
                objects = await call_object(client, 'get_loaded_ride_objects', ride_type=52)
                assert objects['objects'][0]['research'] == [{'ride_type': 52, 'status': 'invented'}]
                created = await client.call_tool('create_ride', {
                    'name': 'Installed café contract', 'include_image': False, 'compact': True,
                })
                state = created.structured_content
                assert state['success'] and state['name'] == 'Installed café contract'
                ride_id = state['ride_id']
                assert state['piece_count'] == 1 and 'pieces' not in state
                assert state['stations'][0]['entrance']['status'] == 'absent'
                access = await call_object(client, 'get_ride_station_access', ride_id=ride_id)
                assert access['guest_access'] == 'unknown' and access['stations'] == state['stations']
                partial = await call_json(client, 'place_track_sequence', allow_failure=True, ride_id=ride_id,
                                          segments=[{'track_type': 'Flat'}] * 3, include_image=False, compact=True)
                assert partial['operation_outcome'] == 'rejected' and partial['execution_status'] == 'partial'
                assert partial['placed_count'] == 2 and partial['piece_count'] == 3
                assert partial['error_details']['code'] == 9
                queried = await call_object(client, 'check_track_candidates', ride_id=ride_id,
                                            candidates=[{'track_type': 'Flat'}, {'track_type': 'Up60'}])
                assert queried['results'][0]['placeable'] is True
                assert queried['results'][1]['success'] is False
                preview = await call_object(client, 'preview_track_removal', ride_id=ride_id)
                rejected = await call_json(client, 'remove_terminal_piece', allow_failure=True, ride_id=ride_id,
                                           expected_target={**preview['target'], 'piece_count': 99},
                                           include_image=False, compact=True)
                assert rejected['operation_outcome'] == 'rejected' and rejected['piece_count'] == 3
                removed = await call_object(client, 'remove_terminal_piece', ride_id=ride_id,
                                           expected_target=preview['target'], include_image=False, compact=True)
                assert removed['piece_count'] == 2
                restored = await call_object(client, 'place_track_segment', ride_id=ride_id, track_type='Flat',
                                            expected_endpoint=removed['current_endpoint'],
                                            include_image=False, compact=True)
                assert restored['piece_count'] == 3 and restored['layout_status'] == 'complete'
                view = await client.call_tool('get_coaster_view', {'ride_id': ride_id, 'view': 'elevation'})
                assert view.structured_content['piece_count'] == 3
                image = next(block for block in view.content if block.type == 'image')
                assert base64.b64decode(image.data).startswith(b'\x89PNG\r\n\x1a\n')
                assert (await call_object(client, 'close_ride', ride_id=ride_id))['operation_outcome'] == 'confirmed'
                assert (await call_object(client, 'reset_ride', ride_id=ride_id))['vehicles_cleared'] is True
                assert (await call_object(client, 'delete_ride', ride_id=ride_id))['operation_outcome'] == 'confirmed'
                assert await call_json(client, 'list_all_rides') == []
                placed_path = await call_object(client, 'place_path_tile', x=90, y=90, z=14,
                                                surface_object=0, railings_object=0, is_queue=True)
                observation = placed_path['observed_after']['paths'][0]
                removed_path = await call_object(client, 'remove_path_tile', x=90, y=90, z=14,
                                                expected_path=observation)
                assert removed_path['observed_after']['paths'] == []
                saved = await call_object(client, 'save_park', label='installed-contract')
                assert saved['save_requested'] and saved['file_written'] == 'unknown'
            captured = summarize_metrics(metrics)
            assert captured['capture_complete'] is True
            assert captured['confirmed_placements'] == 5 and captured['rejected_placement_requests'] == 1
            assert captured['confirmed_removals'] == 2 and captured['response_image_base64_chars'] > 0
        except Exception:
            print(log.read_text(errors='replace')[-4000:], file=sys.stderr)
            raise
        finally:
            if proc.returncode is None:
                try:
                    proc.terminate()
                except ProcessLookupError:
                    pass
            try:
                await asyncio.wait_for(proc.wait(), timeout=5)
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
    print(f'Installed console entry point registered {len(tools)} MCP tools and passed the isolated plugin contract.')


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
        fixture = extract_plugin_fixture(sdist, work / 'plugin-fixture')
        asyncio.run(check_server(binary_dir / ('openrct2-mcp.exe' if os.name == 'nt' else 'openrct2-mcp'), outside, fixture))
    print('Clean-install check passed. Temporary build/install files removed.')


if __name__ == '__main__':
    main()
