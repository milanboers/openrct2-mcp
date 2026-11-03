"""Grade declared flat routes and fresh completion evidence, without choosing routes."""

from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field

from .benchmark import BenchmarkBrief, evaluate_ride
from .paths import flat_route_connected

Coordinate = Annotated[int, Field(ge=0, le=149)]
Cell = Annotated[list[Coordinate], Field(min_length=2, max_length=2)]
DELTAS = [(-1, 0), (0, 1), (1, 0), (0, -1)]


class GuestRoutes(BaseModel):
    """Agent declarations are hints for collection, never authoritative evidence."""

    model_config = ConfigDict(extra='forbid', strict=True)
    ride_id: int = Field(ge=0)
    entrance_route: list[Cell] = Field(default_factory=list, max_length=512)
    exit_route: list[Cell] = Field(default_factory=list, max_length=512)


def route_paths(paths: list[dict[str, Any]], route: list[list[int]], z: int) -> list[dict[str, Any]]:
    selected = []
    for x, y in route:
        matches = [path for path in paths if (path.get('x'), path.get('y'), path.get('base_z')) == (x, y, z)]
        if len(matches) != 1:
            return []
        selected.append(matches[0])
    return selected


def door_connected(station: dict[str, Any], building: str, route: list[list[int]], paths: list[dict[str, Any]], z: int) -> bool:
    observed = station.get(building) or {}
    position = observed.get('position') or {}
    direction = position.get('direction')
    if (observed.get('status') != 'present' or type(direction) is not int or direction not in range(4)
            or position.get('z') != z or type(position.get('x')) not in (int, float)
            or type(position.get('y')) not in (int, float) or not route or not paths
            or type(paths[0].get('edges')) is not int):
        return False
    dx, dy = DELTAS[direction]
    return (route[0] == [position.get('x', -10) - dx, position.get('y', -10) - dy]
            and bool(paths[0]['edges'] & (1 << direction)))


def evaluate_guest_ride(
    brief: BenchmarkBrief, state: dict[str, Any], samples: list[dict[str, Any]],
    paths: list[dict[str, Any]], routes: GuestRoutes, anchor: dict[str, Any],
    baseline: dict[str, Any], reports: list[dict[str, Any]], *, stable: bool, fresh_park: bool,
) -> dict[str, Any]:
    result = evaluate_ride(brief, state, samples)
    z = anchor['base_z']
    end = [anchor['x'], anchor['y']]
    stations = state.get('stations') or []
    station = stations[0] if len(stations) == 1 else {}
    latest = samples[-1] if samples else {}
    selected_entrance = route_paths(paths, routes.entrance_route, z)
    selected_exit = route_paths(paths, routes.exit_route, z)
    anchor_paths = route_paths(paths, [end], z)
    anchor_preserved = False
    if anchor_paths:
        current_anchor = anchor_paths[0]
        initial_edges = anchor.get('edges')
        current_edges = current_anchor.get('edges')
        anchor_preserved = (
            all(current_anchor.get(key) == value for key, value in anchor.items() if key != 'edges')
            and type(initial_edges) is int and type(current_edges) is int
            and current_edges & initial_edges == initial_edges
        )
    queued = []
    public = []
    for path in selected_entrance:
        if public or path.get('is_queue') is not True:
            public.append(path)
        else:
            queued.append(path)
    queue_assigned = bool(queued) and all(
        path.get('is_queue') is True and path.get('ride_id') == routes.ride_id and path.get('station') == 0
        for path in queued
    ) and bool(public) and all(path.get('is_queue') is False for path in public)
    baseline_count = baseline.get('total_customers')
    final_count = latest.get('total_customers')
    counts = [baseline_count] + [sample.get('total_customers') for sample in samples]
    counters_valid = all(type(count) is int and count >= 0 for count in counts)
    monotonic = counters_valid and all(second >= first for first, second in zip(counts, counts[1:]))
    completion = (monotonic and final_count > baseline_count and bool(reports)
                  and all(sample.get('ride_status') == 'open' and sample.get('game_paused') is False
                          for sample in [baseline] + samples)
                  and all(report.get('counter_valid') is True and report.get('completion_counter_supported') is True
                          and report.get('open_unpaused_throughout') is True for report in reports))
    checks = {
        'fresh_empty_park_baseline': fresh_park,
        'declared_target': routes.ride_id == state.get('ride_id'),
        'one_station': len(stations) == 1,
        'public_anchor_preserved': anchor_preserved,
        'entrance_route': (bool(routes.entrance_route) and routes.entrance_route[-1] == end
                           and flat_route_connected(paths, [tuple(cell) for cell in routes.entrance_route], z)),
        'exit_route': (bool(routes.exit_route) and routes.exit_route[-1] == end
                       and flat_route_connected(paths, [tuple(cell) for cell in routes.exit_route], z)),
        'entrance_door': door_connected(station, 'entrance', routes.entrance_route, selected_entrance, z),
        'exit_door': door_connected(station, 'exit', routes.exit_route, selected_exit, z),
        'queue_assignment': queue_assigned,
        'ordinary_exit': bool(selected_exit) and all(path.get('is_queue') is False for path in selected_exit),
        'open_unpaused': latest.get('ride_status') == 'open' and latest.get('game_paused') is False,
        'fresh_customer_completion': completion,
        'stable_collection': stable,
    }
    result['checks'].extend({'name': name, 'passed': bool(passed)} for name, passed in checks.items())
    result['passed'] = all(check['passed'] for check in result['checks'])
    result['guest_measurements'] = {'baseline_customers': baseline_count, 'final_customers': final_count,
                                    'customer_delta': final_count - baseline_count if monotonic else None}
    result['limitations'].extend([
        'Only declared routes to a known prepared-park anchor are checked, not arbitrary public-network connectivity.',
        'Counter progress is sampled on a stable final layout, not an individual guest trajectory.',
        'No progress is a failed acceptance check, not a diagnosis of access failure.',
        'Preservation and prompt compliance also require reviewing the agent trace.',
    ])
    return result
