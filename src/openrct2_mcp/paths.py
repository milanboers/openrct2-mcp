"""Verify explicitly supplied flat routes; never choose routes or infer public access."""

from typing import Any

DIRECTIONS = {(-1, 0): 0, (0, 1): 1, (1, 0): 2, (0, -1): 3}


def flat_route_connected(paths: list[dict[str, Any]], route: list[tuple[int, int]], z: int) -> bool:
    """Require unambiguous, non-ghost, flat observations and reciprocal edges."""
    if len(route) < 2:
        return False
    selected = []
    for x, y in route:
        matches = []
        for path in paths:
            if (path.get('x'), path.get('y'), path.get('base_z')) == (x, y, z) and path not in matches:
                matches.append(path)
        if len(matches) != 1:
            return False
        path = matches[0]
        if (path.get('is_ghost') is not False or 'slope_direction' not in path
                or path['slope_direction'] is not None):
            return False
        if type(path.get('edges')) is not int or not 0 <= path['edges'] <= 15:
            return False
        selected.append(path)
    for first, second in zip(selected, selected[1:]):
        direction = DIRECTIONS.get((second['x'] - first['x'], second['y'] - first['y']))
        if direction is None:
            return False
        if not first['edges'] & (1 << direction) or not second['edges'] & (1 << ((direction + 2) % 4)):
            return False
    return True
