"""Copy the plugin to an explicitly selected OpenRCT2 user directory."""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

SOURCE = Path(__file__).resolve().parent.parent / 'openrct2-mcp.js'


def install(user_dir: Path, overwrite: bool = False) -> Path:
    user_dir = user_dir.expanduser().resolve()
    if not user_dir.is_dir():
        raise ValueError(f'OpenRCT2 user directory does not exist: {user_dir}')
    destination = user_dir / 'plugin' / SOURCE.name
    legacy = destination.with_name('ridecreation-api.js')
    for existing in (destination, legacy):
        if existing.exists() and not overwrite:
            raise ValueError(f'Plugin already exists: {existing}. Use --overwrite to replace it.')
    subprocess.run([sys.executable, str(SOURCE.parent / 'scripts/generate_actions.py')], check=True)
    destination.parent.mkdir(exist_ok=True)
    shutil.copy2(SOURCE, destination)
    # Both filenames would load a TCP listener on the same port.
    if legacy.exists():
        legacy.unlink()
    return destination


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--user-dir', required=True, type=Path, help='OpenRCT2 user directory (not its plugin subfolder)')
    parser.add_argument('--overwrite', action='store_true', help='replace this plugin and remove its legacy ridecreation-api.js copy')
    args = parser.parse_args()
    try:
        destination = install(args.user_dir, args.overwrite)
    except (ValueError, OSError, subprocess.CalledProcessError) as exc:
        parser.exit(1, f'{exc}\n')
    print(f'Installed {destination}')
    print('Restart OpenRCT2 to load this copy. Save your park first. This script does not restart the game.')


if __name__ == '__main__':
    main()
