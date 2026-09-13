"""Tests for the OpenRCT2 ride creation plugin (JS), run via node."""

import shutil
import subprocess
from pathlib import Path

import pytest

TESTS_DIR = Path(__file__).resolve().parent
PLUGIN = TESTS_DIR.parent.parent / "ridecreation-api.js"

_has_node = shutil.which("node") is not None


@pytest.mark.skipif(not _has_node, reason="node is required to test the plugin")
def test_plugin_syntax() -> None:
    """The plugin must at least parse as valid JavaScript."""
    result = subprocess.run(["node", "--check", str(PLUGIN)], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr


@pytest.mark.skipif(not _has_node, reason="node is required to test the plugin")
def test_plugin_request_contract() -> None:
    """The plugin's request/response contract works against a stubbed game API."""
    result = subprocess.run(
        ["node", str(TESTS_DIR / "plugin_test.js")], capture_output=True, text=True
    )
    assert result.returncode == 0, f"plugin JS tests failed:\n{result.stdout}\n{result.stderr}"