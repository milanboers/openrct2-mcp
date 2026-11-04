"""Shared mutation metadata. Action acknowledgement and inspection are independent."""

from typing import Any, Literal, Optional

from pydantic import BaseModel

from .api_client import APIError

Outcome = Literal['confirmed', 'rejected', 'unknown', 'partial']


class MutationStatus(BaseModel):
    operation_outcome: Outcome
    execution_status: Literal['completed', 'rejected', 'partial', 'unknown']
    state_status: Literal['available', 'unavailable', 'not_requested']


def mutation_status(
    outcome: Outcome, *, confirmed_steps: int = 0, requested_steps: Optional[int] = None,
    state_available: Optional[bool] = None,
) -> dict[str, Any]:
    execution = 'completed' if outcome == 'confirmed' else outcome
    if confirmed_steps and (outcome != 'confirmed' or
                            (requested_steps is not None and confirmed_steps < requested_steps)):
        execution = 'partial'
    state = 'not_requested' if state_available is None else 'available' if state_available else 'unavailable'
    return MutationStatus(operation_outcome=outcome, execution_status=execution, state_status=state).model_dump()


def mutation_failure(error: APIError, *, ride_id: Optional[int] = None, confirmed_steps: int = 0,
                     identity: Optional[int] = None, identity_key: Optional[str] = None) -> dict[str, Any]:
    result = {'success': False, 'error': str(error),
              **mutation_status(error.outcome, confirmed_steps=confirmed_steps)}
    if ride_id is not None:
        result['ride_id'] = ride_id
    if identity_key is not None and identity is not None:
        result[identity_key] = identity
    if error.details:
        result['error_details'] = error.details
    return result


def action_result(ride_id: Optional[int], payload: Any, response: str, *, identity_key: Optional[str] = 'ride_id') -> dict[str, Any]:
    """Keep action acknowledgement independent from optional setting readback."""
    result = {'success': True, **mutation_status('confirmed')}
    if identity_key is not None and ride_id is not None:
        result[identity_key] = ride_id
    if response == 'message':
        result['message'] = str(payload)
    elif response in {'payload', 'readback'}:
        result.update(payload)
        if response == 'readback':
            available = payload.get('observed_after') is not None
            result.update(mutation_status('confirmed', state_available=available))
            result['success'] = available and payload.get('readback_matches_request') is True
    return result
