"""Explicit benchmark reference inputs, not exports of arbitrary park designs."""

import asyncio
from datetime import datetime, timezone
import math
from typing import Any, Literal

from fastmcp import Client
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .benchmark import BenchmarkBrief, evaluate_ride
from .catalog import TRACK_NAME_TO_ID
from .client_helpers import MCPResponseError, call_object
from .inspection import movement_observed
from .models import TrackSegment


class ReferenceStation(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)

    x: int = Field(ge=0)
    y: int = Field(ge=0)
    z: int = Field(ge=0)
    direction: Literal[0, 1, 2, 3]


class ReferenceLayout(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)

    schema_version: Literal[1]
    brief_id: str
    ride_type: int = Field(ge=0)
    ride_object_identifier: str = Field(min_length=1)
    station: ReferenceStation
    segments: list[TrackSegment] = Field(min_length=1, max_length=256)
    validation: dict[str, Any]

    @model_validator(mode='after')
    def known_track_names(self) -> 'ReferenceLayout':
        unknown = sorted({segment.track_type for segment in self.segments} - TRACK_NAME_TO_ID.keys())
        if unknown:
            raise ValueError(f'Unknown track names: {unknown}')
        return self


async def build_reference(
    client: Client, brief: BenchmarkBrief, layout: ReferenceLayout, timeout: float = 180,
) -> dict[str, Any]:
    """Add one reference ride and grade it. Never reset or demolish park work."""
    if layout.brief_id != brief.id or layout.ride_type != brief.criteria.ride_type:
        raise ValueError('Reference and brief IDs/ride types must match')
    if not math.isfinite(timeout) or timeout <= 0:
        raise ValueError('Timeout must be finite and positive')

    info = await call_object(client, 'get_plugin_info')
    if info.get('park_name') != brief.park_name or not info.get('matches') or not info.get('protocol_compatible'):
        raise RuntimeError('Reference validation requires the intended park and a matching plugin')
    objects = await call_object(client, 'get_loaded_ride_objects', ride_type=layout.ride_type)
    selected = next((obj for obj in objects['objects'] if obj['identifier'] == layout.ride_object_identifier), None)
    if selected is None:
        raise RuntimeError(f'Required ride object is not loaded: {layout.ride_object_identifier}')
    ride_id = None
    try:
        created = await call_object(
            client, 'create_ride', name=f'Reference: {brief.id}', ride_type=layout.ride_type,
            ride_object=selected['index'], station_x=layout.station.x, station_y=layout.station.y,
            station_z=layout.station.z, direction=layout.station.direction, include_image=False, compact=True,
        )
        ride_id = created['ride_id']
        await call_object(
            client, 'place_track_sequence', ride_id=ride_id,
            segments=[piece.model_dump() for piece in layout.segments],
            include_image=False, compact=True, expected_endpoint=created['current_endpoint'],
        )
        state = await call_object(client, 'get_coaster_state', ride_id=ride_id, include_image=False)
        if not state.get('is_circuit_complete'):
            raise RuntimeError('Reference circuit did not close')
        await call_object(client, 'place_entrance_exit', ride_id=ride_id, include_image=False, compact=True)
        state = await call_object(client, 'get_coaster_state', ride_id=ride_id, include_image=False)
        await call_object(client, 'start_ride_test', ride_id=ride_id)
        samples = []
        deadline = asyncio.get_running_loop().time() + timeout
        while True:
            samples.append(await call_object(client, 'get_ride_stats', ride_id=ride_id))
            if samples[-1].get('ratings_available') and movement_observed(samples):
                break
            remaining = deadline - asyncio.get_running_loop().time()
            if remaining <= 0:
                raise RuntimeError('Timed out observing movement and ratings')
            await asyncio.sleep(min(1, remaining))
        after = await call_object(client, 'get_coaster_state', ride_id=ride_id, include_image=False)
        if after != state:
            raise RuntimeError('Reference changed during observation')
        report = evaluate_ride(brief, state, samples)
        report.update(run_kind='reference_validation', observed_at=datetime.now(timezone.utc).isoformat(),
                      reference=layout.model_dump(), plugin=info,
                      evidence={'state': state, 'stats_samples': samples})
        return report
    except Exception as error:
        if ride_id is None and isinstance(error, MCPResponseError):
            ride_id = error.ride_id
        if ride_id is None:
            raise
        raise RuntimeError(f'Reference stopped; ride {ride_id} is retained for inspection: {error}') from error
