"""Refresh reviewed bindings before editable, wheel and source builds."""

from pathlib import Path
import subprocess
import sys

from hatchling.builders.hooks.plugin.interface import BuildHookInterface


class CustomBuildHook(BuildHookInterface):
    def initialize(self, version, build_data):
        subprocess.run(
            [sys.executable, str(Path(self.root) / 'scripts/generate_actions.py')], check=True,
        )
