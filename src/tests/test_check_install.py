"""Distribution checks fail when assets are lost or source/test trees leak into wheels."""

import importlib.util
from pathlib import Path
import tarfile
import zipfile

import pytest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('check_install_script', ROOT / 'scripts' / 'check_install.py')
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


@pytest.fixture
def archives(tmp_path):
    files = [
        'pyproject.toml', 'uv.lock', 'ridecreation-api.js', 'skills/build-coaster/SKILL.md',
        'docs/reference.md',
        'scenarios/sandbox.park', 'scripts/smoke_test.py', 'benchmarks/working-coaster.json',
        'scripts/build_reference.py', 'benchmarks/references/rated-coaster.json', 'src/tests/plugin_server.js',
        'src/openrct2_mcp/mcp_server.py', 'scripts/prepare_trial.py',
        'benchmarks/fixtures/continue-coaster.json', 'benchmarks/fixtures/obstructed-coaster.json',
        'benchmarks/fixtures/revise-coaster.json',
    ]
    sdist, wheel = tmp_path / 'package.tar.gz', tmp_path / 'package.whl'
    with tarfile.open(sdist, 'w:gz') as archive:
        for name in files:
            archive.addfile(tarfile.TarInfo('package/' + name))
    with zipfile.ZipFile(wheel, 'w') as archive:
        archive.writestr('openrct2_mcp/mcp_server.py', b'')
    return sdist, wheel


def test_archives_contain_installation_assets_without_bundling_source_tree(archives):
    checker.check_archives(*archives)


@pytest.mark.parametrize('extra', ['src/mcp_server.py', 'tests/test_server.py', 'openrct2_mcp/tests/test_server.py'])
def test_wheel_rejects_source_tree_or_tests(archives, extra):
    sdist, wheel = archives
    with zipfile.ZipFile(wheel, 'a') as archive:
        archive.writestr(extra, b'')

    with pytest.raises(RuntimeError, match='without the source tree or tests'):
        checker.check_archives(sdist, wheel)


def test_source_distribution_requires_the_game_plugin(archives):
    sdist, wheel = archives
    with tarfile.open(sdist) as archive:
        members = [member for member in archive.getmembers() if not member.name.endswith('/ridecreation-api.js')]
    with tarfile.open(sdist, 'w:gz') as archive:
        for member in members:
            archive.addfile(member)

    with pytest.raises(RuntimeError, match='ridecreation-api.js'):
        checker.check_archives(sdist, wheel)
