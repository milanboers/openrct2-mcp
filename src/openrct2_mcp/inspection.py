"""Summarize map and ride-test observations without inferring unobserved causes."""

from collections import Counter
import math
from typing import Any


def compact_map_area(area: dict[str, Any]) -> dict[str, Any]:
    """Collapse the most common flat, dry surface, retaining every other element."""
    surfaces = Counter(
        tuple(sorted(element.items()))
        for tile in area['tiles'] for element in tile['elements']
        if element['type'] == 'surface' and element.get('slope') == 0
        and element.get('water_height_raw') == 0 and element.get('is_ghost') is False
    )
    common_surface = dict(surfaces.most_common(1)[0][0]) if surfaces else None
    tiles = []
    omitted_count = 0
    for tile in area['tiles']:
        elements = [element for element in tile['elements'] if element != common_surface]
        omitted_count += len(tile['elements']) - len(elements)
        if elements:
            tiles.append({**tile, 'elements': elements})
    return {
        **area, 'compact': True, 'tiles': tiles,
        'terrain_summary': {
            'observed_tile_count': len(area['tiles']),
            'omitted_surface': common_surface,
            'omitted_surface_count': omitted_count,
        },
    }


def movement_observed(samples: list[dict[str, Any]]) -> bool:
    return any(
        isinstance(vehicle.get('velocity'), (int, float)) and
        math.isfinite(vehicle['velocity']) and vehicle['velocity'] != 0
        for sample in samples for vehicle in sample.get('vehicles', [])
    )


def station_buildings_present(stations: Any, building: str) -> bool:
    """Unknown station observations must not pass a presence requirement."""
    return isinstance(stations, list) and bool(stations) and all(
        isinstance(station, dict) and isinstance(station.get(building), dict) and
        station[building].get('status') == 'present'
        for station in stations
    )


def test_report(state: dict[str, Any], samples: list[dict[str, Any]]) -> dict[str, Any]:
    latest = samples[-1] if samples else {}
    moving = movement_observed(samples)
    checks = {
        'connected_layout': state.get('layoutStatus') == 'complete',
        'closed_circuit': state.get('isCircuitComplete') is True,
        'station_entrances_present': station_buildings_present(state.get('stations'), 'entrance'),
        'station_exits_present': station_buildings_present(state.get('stations'), 'exit'),
        'running': latest.get('ride_status') in ('testing', 'open'),
        'unpaused': latest.get('game_paused') is False,
        'ratings_available': latest.get('ratings_available') is True,
        'movement_observed': moving,
    }
    return {
        'ready': all(checks.values()),
        'ride_type': state.get('rideType'),
        'checks': checks,
        'missing_evidence': [name for name, passed in checks.items() if not passed],
        'layout_status': state.get('layoutStatus'),
        'piece_count': len(state.get('history', [])),
        'sample_count': len(samples),
        'latest_stats': latest,
        'limitations': [
            'No observed movement is not proof of a stall; a train may be waiting in the station.',
            'Train samples are discrete observations of head cars, not a complete speed or G-force profile.',
            'Station building presence is checked; queue, exit path and public-network connectivity are not.',
            'Before/after layout equality cannot detect every transient intervening edit.',
        ],
    }
