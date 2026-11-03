"""Explicit, opt-in starting conditions for agent trials, not agent solutions."""

import asyncio
from datetime import datetime, timezone
import math
from typing import Any, Literal

from fastmcp import Client
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .benchmark import BenchmarkBrief
from .client_helpers import MCPResponseError, call_json, call_object
from .inspection import movement_observed
from .reference import ReferenceLayout, ReferenceStation


class TrialFixture(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)

    schema_version: Literal[1]
    id: str = Field(min_length=1)
    brief: BenchmarkBrief
    reference: Literal['working-coaster', 'rated-coaster']
    station: ReferenceStation
    prefix_segments: int = Field(ge=1, le=256)
    protected_prefix_pieces: int = Field(ge=1, le=257)
    obstruction: ReferenceStation | None = None
    test_before_handoff: bool = False
    validation: dict[str, Any] = Field(default_factory=dict)


class TrialSetup(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)

    schema_version: Literal[1]
    run_kind: Literal['trial_setup']
    fixture_id: str
    prepared_at: str
    ride_id: int = Field(ge=0)
    created_ride_ids: list[int]
    brief: BenchmarkBrief
    plugin: dict[str, Any]
    initial_state: dict[str, Any]
    protected_rides: list[dict[str, Any]]
    protected_prefix_pieces: int = Field(ge=1)
    initial_stats_samples: list[dict[str, Any]]
    limitations: list[str]

    @model_validator(mode='after')
    def consistent_evidence(self) -> 'TrialSetup':
        if type(self.initial_state.get('ride_id')) is not int or self.initial_state['ride_id'] != self.ride_id:
            raise ValueError('Initial state does not belong to the target ride')
        pieces = self.initial_state.get('pieces')
        if not isinstance(pieces, list) or len(pieces) < self.protected_prefix_pieces:
            raise ValueError('Initial state does not contain the protected prefix')
        protected_ids = [state.get('ride_id') for state in self.protected_rides]
        if (self.ride_id not in self.created_ride_ids or
            any(type(ride_id) is not int or ride_id < 0 or ride_id == self.ride_id or
                ride_id not in self.created_ride_ids for ride_id in protected_ids) or
            len(set(protected_ids)) != len(protected_ids)):
            raise ValueError('Trial setup has inconsistent protected/created ride IDs')
        return self


def preservation_checks(
    setup: TrialSetup, state: dict[str, Any], protected_states: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    prefix = setup.initial_state.get('pieces')
    final = state.get('pieces')
    count = setup.protected_prefix_pieces
    preserved = (isinstance(prefix, list) and isinstance(final, list) and len(prefix) >= count and
                 len(final) >= count and prefix[:count] == final[:count])
    return [
        {'name': 'protected_prefix_preserved', 'passed': preserved,
         'actual': 'preserved' if preserved else 'changed or unavailable', 'expected': f'First {count} pieces unchanged'},
        {'name': 'protected_rides_preserved', 'passed': protected_states == setup.protected_rides,
         'actual': protected_states, 'expected': setup.protected_rides},
    ]


class TrialPreparationError(RuntimeError):
    def __init__(self, message: str, ride_ids: list[int]):
        self.ride_ids = list(ride_ids)
        super().__init__(f'Trial setup stopped; created rides {ride_ids} are retained for inspection: {message}')


async def prepare_trial(
    client: Client, fixture: TrialFixture, reference: ReferenceLayout, timeout: float = 180,
) -> dict[str, Any]:
    """Prepare one fixture in an empty intended sandbox; never reset or demolish."""
    if reference.brief_id != fixture.reference or reference.ride_type != fixture.brief.criteria.ride_type:
        raise ValueError('Fixture and reference do not match')
    if fixture.prefix_segments > len(reference.segments):
        raise ValueError('Fixture prefix is longer than its reference')
    if fixture.protected_prefix_pieces > fixture.prefix_segments + 1:
        raise ValueError('Protected prefix is longer than the initial ride')
    if timeout <= 0 or not math.isfinite(timeout):
        raise ValueError('Timeout must be finite and positive')

    info = await call_object(client, 'get_plugin_info')
    if not info.get('matches') or not info.get('protocol_compatible'):
        raise RuntimeError('Trial preparation requires a matching plugin')
    park = await call_object(client, 'get_park_status')
    if park.get('park_name') != fixture.brief.park_name or park.get('game_mode') != 'normal':
        raise RuntimeError('Load the intended sandbox in normal game mode before preparing a trial')
    if park.get('game_paused') is not False:
        raise RuntimeError('Unpause the sandbox before preparing a trial')
    rides = await call_json(client, 'list_all_rides')
    if not isinstance(rides, list):
        raise RuntimeError('Expected a ride list before trial preparation')
    if rides:
        raise RuntimeError('Trial preparation requires a fresh sandbox with no rides; existing work is never deleted')
    objects = await call_object(client, 'get_loaded_ride_objects', ride_type=reference.ride_type)
    selected = next((obj for obj in objects['objects'] if obj['identifier'] == reference.ride_object_identifier), None)
    if selected is None:
        raise RuntimeError(f'Required ride object is not loaded: {reference.ride_object_identifier}')

    created_ids: list[int] = []
    try:
        protected = []
        if fixture.obstruction is not None:
            obstacle = await call_object(
                client, 'create_ride', name=f'Trial obstruction: {fixture.id}', ride_type=reference.ride_type,
                ride_object=selected['index'], **station_arguments(fixture.obstruction),
                include_image=False, compact=True,
            )
            created_ids.append(obstacle['ride_id'])
            protected.append(await call_object(client, 'get_coaster_state', ride_id=obstacle['ride_id'], include_image=False))
        created = await call_object(
            client, 'create_ride', name=f'Trial target: {fixture.id}', ride_type=reference.ride_type,
            ride_object=selected['index'], **station_arguments(fixture.station), include_image=False, compact=True,
        )
        ride_id = created['ride_id']
        created_ids.append(ride_id)
        await call_object(
            client, 'place_track_sequence', ride_id=ride_id,
            segments=[piece.model_dump() for piece in reference.segments[:fixture.prefix_segments]],
            expected_endpoint=created['current_endpoint'], include_image=False, compact=True,
        )
        samples = []
        if fixture.test_before_handoff:
            state = await call_object(client, 'get_coaster_state', ride_id=ride_id, include_image=False)
            if not state.get('is_circuit_complete'):
                raise RuntimeError('The starting ride did not close')
            await call_object(client, 'place_entrance_exit', ride_id=ride_id, include_image=False, compact=True)
            await call_object(client, 'start_ride_test', ride_id=ride_id)
            deadline = asyncio.get_running_loop().time() + timeout
            while True:
                samples.append(await call_object(client, 'get_ride_stats', ride_id=ride_id))
                if samples[-1].get('ratings_available') and movement_observed(samples):
                    break
                remaining = deadline - asyncio.get_running_loop().time()
                if remaining <= 0:
                    raise RuntimeError('Timed out observing initial ride movement and ratings')
                await asyncio.sleep(min(1, remaining))
        state = await call_object(client, 'get_coaster_state', ride_id=ride_id, include_image=False)
        brief = fixture.brief.model_copy(update={
            'prompt': fixture.brief.prompt.replace('{ride_id}', str(ride_id)),
        })
        return {
            'schema_version': 1, 'run_kind': 'trial_setup', 'fixture_id': fixture.id,
            'prepared_at': datetime.now(timezone.utc).isoformat(), 'ride_id': ride_id,
            'created_ride_ids': created_ids, 'brief': brief.model_dump(), 'plugin': info,
            'initial_state': state, 'protected_rides': protected,
            'protected_prefix_pieces': fixture.protected_prefix_pieces, 'initial_stats_samples': samples,
            'limitations': [
                'Setup evidence is not an agent result or proof of prompt compliance.',
                'Use setup.json with the evaluator for final-snapshot preservation checks; transient edits cannot all be detected.',
                'Do not supply reference layouts or setup recipes to the agent.',
            ],
        }
    except Exception as error:
        if isinstance(error, MCPResponseError) and error.ride_id is not None and error.ride_id not in created_ids:
            created_ids.append(error.ride_id)
        raise TrialPreparationError(str(error), created_ids) from error


def station_arguments(station: ReferenceStation) -> dict[str, int]:
    return {'station_x': station.x, 'station_y': station.y, 'station_z': station.z, 'direction': station.direction}

