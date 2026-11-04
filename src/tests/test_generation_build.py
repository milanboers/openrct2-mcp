"""Normal builds/installations refresh stale generated assets without a manual command."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import zipfile

import pytest

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def checkout(tmp_path):
    root = tmp_path / 'checkout'
    root.mkdir()
    for name in ('pyproject.toml', 'uv.lock', 'hatch_build.py', 'openrct2-mcp.js', 'README.md'):
        shutil.copy2(ROOT / name, root / name)
    shutil.copytree(ROOT / 'src/openrct2_mcp', root / 'src/openrct2_mcp', ignore=shutil.ignore_patterns('__pycache__'))
    (root / 'scripts').mkdir()
    for name in ('generate_actions.py', 'audit_game_api.py', 'install_plugin.py'):
        shutil.copy2(ROOT / 'scripts' / name, root / 'scripts' / name)
    shutil.copytree(ROOT / 'docs', root / 'docs')
    definition = root / 'src/openrct2_mcp/actions.json'
    registry = json.loads(definition.read_text())
    registry['operations'][0]['description'] = 'Automatically rebuilt description'
    registry['operations'][0]['success_message'] = 'Automatically rebuilt plugin table'
    definition.write_text(json.dumps(registry))
    for name in ('_action_client.py', '_action_tools.py'):
        (root / 'src/openrct2_mcp' / name).write_text('# stale generated file\n')
    return root


@pytest.mark.parametrize('target', ['wheel', 'sdist'])
def test_package_build_refreshes_stale_generated_files(checkout, tmp_path, target):
    subprocess.run(['uv', 'build', '--python', sys.executable, '--' + target, '--out-dir', str(tmp_path / 'dist')],
                   cwd=checkout, check=True, capture_output=True, text=True)

    tools = 'src/openrct2_mcp/_action_tools.py'
    if target == 'wheel':
        with zipfile.ZipFile(next((tmp_path / 'dist').glob('*.whl'))) as archive:
            generated = archive.read('openrct2_mcp/_action_tools.py').decode()
            metadata = archive.read(next(name for name in archive.namelist() if name.endswith('/METADATA'))).decode()
            assert '\nName: openrct2-mcp\n' in metadata
    else:
        with tarfile.open(next((tmp_path / 'dist').glob('*.tar.gz'))) as archive:
            generated = archive.extractfile(next(m for m in archive.getmembers() if m.name.endswith('/' + tools))).read().decode()
            plugin = archive.extractfile(next(m for m in archive.getmembers() if m.name.endswith('/openrct2-mcp.js'))).read().decode()
            assert 'Automatically rebuilt plugin table' in plugin
    assert 'Automatically rebuilt description' in generated
    assert 'Automatically rebuilt plugin table' in (checkout / 'openrct2-mcp.js').read_text()
    assert 'class ActionClient' in (checkout / 'src/openrct2_mcp/_action_client.py').read_text()


def test_plugin_install_refreshes_stale_table_and_preserves_overwrite_guard(checkout, tmp_path):
    user = tmp_path / 'user'
    user.mkdir()
    command = [sys.executable, str(checkout / 'scripts/install_plugin.py'), '--user-dir', str(user)]

    subprocess.run(command, check=True, capture_output=True, text=True)

    destination = user / 'plugin/openrct2-mcp.js'
    assert 'Automatically rebuilt plugin table' in destination.read_text()
    destination.write_text('existing park plugin')
    result = subprocess.run(command, capture_output=True, text=True)
    assert result.returncode != 0 and 'already exists' in result.stderr
    assert destination.read_text() == 'existing park plugin'


def test_uv_run_rebuilds_editable_bindings_after_registry_edits(checkout):
    environment = {key: value for key, value in os.environ.items()
                   if key not in {'VIRTUAL_ENV', 'UV_PROJECT_ENVIRONMENT', 'PYTHONPATH', 'PYTHONHOME'}}
    command = ['uv', 'run', '--locked', '--no-dev', '--python', sys.executable, 'python', '-c',
               "from pathlib import Path; import openrct2_mcp; "
               "print((Path(openrct2_mcp.__file__).parent / '_action_tools.py').read_text())"]
    first = subprocess.run(command, cwd=checkout, env=environment, check=True, capture_output=True, text=True)
    assert 'Automatically rebuilt description' in first.stdout

    definition = checkout / 'src/openrct2_mcp/actions.json'
    registry = json.loads(definition.read_text())
    registry['operations'][0]['description'] = 'Rebuilt after another edit'
    definition.write_text(json.dumps(registry))
    second = subprocess.run(command, cwd=checkout, env=environment, check=True, capture_output=True, text=True)

    assert 'Rebuilt after another edit' in second.stdout
    assert 'Automatically rebuilt description' not in second.stdout
