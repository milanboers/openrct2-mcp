"""Tests for explicit plugin installation, without touching a real game directory."""

import importlib.util
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / 'scripts' / 'install_plugin.py'
spec = importlib.util.spec_from_file_location('install_plugin', SCRIPT)
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


def test_install_requires_explicit_overwrite(tmp_path):
    destination = installer.install(tmp_path)

    assert destination == tmp_path / 'plugin' / 'openrct2-mcp.js'
    assert destination.read_bytes() == installer.SOURCE.read_bytes()
    destination.write_text('old plugin')
    with pytest.raises(ValueError, match='already exists'):
        installer.install(tmp_path)
    assert destination.read_text() == 'old plugin'

    installer.install(tmp_path, overwrite=True)
    assert destination.read_bytes() == installer.SOURCE.read_bytes()


def test_install_rejects_nonexistent_user_directory(tmp_path):
    with pytest.raises(ValueError, match='does not exist'):
        installer.install(tmp_path / 'missing')
    assert not (tmp_path / 'missing').exists()


@pytest.mark.parametrize('existing_names', [
    ('ridecreation-api.js',),
    ('ridecreation-api.js', 'openrct2-mcp.js'),
])
def test_install_migrates_legacy_filename_only_with_explicit_overwrite(tmp_path, existing_names):
    plugin_dir = tmp_path / 'plugin'
    plugin_dir.mkdir()
    for name in existing_names:
        (plugin_dir / name).write_text('existing plugin')
    unrelated = plugin_dir / 'other-plugin.js'
    unrelated.write_text('unrelated plugin')

    with pytest.raises(ValueError, match='already exists'):
        installer.install(tmp_path)

    assert {name: (plugin_dir / name).read_text() for name in existing_names} == {
        name: 'existing plugin' for name in existing_names
    }

    destination = installer.install(tmp_path, overwrite=True)

    assert destination == plugin_dir / 'openrct2-mcp.js'
    assert destination.read_bytes() == installer.SOURCE.read_bytes()
    assert not (plugin_dir / 'ridecreation-api.js').exists()
    assert unrelated.read_text() == 'unrelated plugin'
