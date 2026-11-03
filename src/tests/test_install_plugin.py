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

    assert destination == tmp_path / 'plugin' / 'ridecreation-api.js'
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
