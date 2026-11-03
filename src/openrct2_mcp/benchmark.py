"""Deterministic acceptance checks for agent-built rides, without designing them."""

import math
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class FootprintBounds(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)

    min_x: int = Field(ge=0)
    max_x: int = Field(ge=0)
    min_y: int = Field(ge=0)
    max_y: int = Field(ge=0)

    @model_validator(mode='after')
    def ordered(self) -> 'FootprintBounds':
        if self.min_x > self.max_x or self.min_y > self.max_y:
            raise ValueError('Footprint bounds must be ordered')
        return self


class AcceptanceCriteria(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, allow_inf_nan=False)

    ride_type: int = Field(ge=0)
    footprint_bounds: FootprintBounds
    min_excitement: Optional[float] = Field(default=None, ge=0)
    max_intensity: Optional[float] = Field(default=None, ge=0)


class BenchmarkBrief(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)

    schema_version: Literal[1]
    id: str = Field(min_length=1)
    park_name: str = Field(min_length=1)
    prompt: str = Field(min_length=1)
    criteria: AcceptanceCriteria


def evaluate_ride(
    brief: BenchmarkBrief, state: dict[str, Any], stats_samples: list[dict[str, Any]],
) -> dict[str, Any]:
    """Grade observed state only. Unknown evidence never counts as a pass."""
    elements = state.get('track_elements') or []
    actual_bounds = None
    if elements:
        actual_bounds = {
            'min_x': min(element['x'] for element in elements),
            'max_x': max(element['x'] for element in elements),
            'min_y': min(element['y'] for element in elements),
            'max_y': max(element['y'] for element in elements),
        }
    bounds = brief.criteria.footprint_bounds
    inside_bounds = actual_bounds is not None and (
        bounds.min_x <= actual_bounds['min_x'] <= actual_bounds['max_x'] <= bounds.max_x and
        bounds.min_y <= actual_bounds['min_y'] <= actual_bounds['max_y'] <= bounds.max_y
    )
    latest = stats_samples[-1] if stats_samples else {}
    observed_moving = any(
        isinstance(vehicle.get('velocity'), (int, float)) and
        math.isfinite(vehicle['velocity']) and vehicle['velocity'] != 0
        for sample in stats_samples for vehicle in sample.get('vehicles', [])
    )
    running = latest.get('ride_status') in ('testing', 'open') and latest.get('game_paused') is False
    checks = [
        {'name': 'state_available', 'passed': state.get('success') is True,
         'actual': state.get('success'), 'expected': True},
        {'name': 'connected_layout', 'passed': state.get('layout_status') == 'complete',
         'actual': state.get('layout_status'), 'expected': 'complete'},
        {'name': 'ride_type', 'passed': state.get('ride_type') == brief.criteria.ride_type,
         'actual': state.get('ride_type'), 'expected': brief.criteria.ride_type},
        {'name': 'closed_circuit', 'passed': state.get('is_circuit_complete') is True,
         'actual': state.get('is_circuit_complete'), 'expected': True},
        {'name': 'footprint_bounds', 'passed': inside_bounds,
         'actual': actual_bounds, 'expected': bounds.model_dump()},
        {'name': 'ratings_available', 'passed': latest.get('ratings_available') is True,
         'actual': latest.get('ratings_available'), 'expected': True},
        {'name': 'running_unpaused', 'passed': running,
         'actual': {'status': latest.get('ride_status'), 'paused': latest.get('game_paused')},
         'expected': 'testing or open, unpaused'},
        {'name': 'observed_train_movement', 'passed': observed_moving,
         'actual': observed_moving, 'expected': True},
    ]
    for name, value, minimum in [
        ('excitement', brief.criteria.min_excitement, True),
        ('intensity', brief.criteria.max_intensity, False),
    ]:
        if value is not None:
            actual = latest.get(name)
            passed = False
            if latest.get('ratings_available') is True and isinstance(actual, (int, float)) and math.isfinite(actual):
                passed = actual >= value if minimum else actual <= value
            checks.append({'name': ('min_' if minimum else 'max_') + name, 'passed': passed,
                           'actual': actual, 'expected': value})
    return {
        'schema_version': 1,
        'brief_id': brief.id,
        'brief': brief.model_dump(),
        'ride_id': state.get('ride_id'),
        'passed': all(check['passed'] for check in checks),
        'checks': checks,
        'measurements': {
            'piece_count': state.get('piece_count'),
            'footprint_bounds': actual_bounds,
            'ratings': {name: latest.get(name) for name in ('excitement', 'intensity', 'nausea')},
            'stats_sample_count': len(stats_samples),
            'agent_tool_calls': None,
            'rejected_placements': None,
        },
        'limitations': [
            'This evaluates the resulting ride, not whether the agent followed the prompt or preserved other work.',
            'Footprint bounds use actual element tiles, not clearance extents.',
            'No observed movement is a failed check, not proof that the ride can never move.',
            'Agent tool-call counts and rejected placements are not collected; null does not mean zero.',
        ],
    }
