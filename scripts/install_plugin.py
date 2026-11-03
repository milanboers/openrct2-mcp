"""Copy the plugin to an explicitly selected OpenRCT2 user directory."""

import argparse
import shutil
from pathlib import Path

SOURCE = Path(__file__).resolve().parent.parent / 'ridecreation-api.js'


def install(user_dir: Path, overwrite: bool = False) -> Path:
    user_dir = user_dir.expanduser().resolve()
    if not user_dir.is_dir():
        raise ValueError(f'OpenRCT2 user directory does not exist: {user_dir}')
    destination = user_dir / 'plugin' / SOURCE.name
    if destination.exists() and not overwrite:
        raise ValueError(f'Plugin already exists: {destination}. Use --overwrite to replace it.')
    destination.parent.mkdir(exist_ok=True)
    shutil.copy2(SOURCE, destination)
    return destination


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--user-dir', required=True, type=Path, help='OpenRCT2 user directory (not its plugin subfolder)')
    parser.add_argument('--overwrite', action='store_true', help='replace an existing copy of this plugin')
    args = parser.parse_args()
    try:
        destination = install(args.user_dir, args.overwrite)
    except (ValueError, OSError) as exc:
        parser.exit(1, f'{exc}\n')
    print(f'Installed {destination}')
    print('Restart OpenRCT2 to load this copy. Save your park first. This script does not restart the game.')


if __name__ == '__main__':
    main()
