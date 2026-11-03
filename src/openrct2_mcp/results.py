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
    outcome: Outcome, *, confirmed_steps: int = 0, state_available: Optional[bool] = None,
) -> dict[str, Any]:
    execution = 'completed' if outcome == 'confirmed' else outcome
    if outcome != 'confirmed' and confirmed_steps:
        execution = 'partial'
    state = 'not_requested' if state_available is None else 'available' if state_available else 'unavailable'
    return MutationStatus(operation_outcome=outcome, execution_status=execution, state_status=state).model_dump()


def mutation_failure(error: APIError, *, ride_id: Optional[int] = None, confirmed_steps: int = 0) -> dict[str, Any]:
    result = {'success': False, 'error': str(error),
              **mutation_status(error.outcome, confirmed_steps=confirmed_steps)}
    if ride_id is not None:
        result['ride_id'] = ride_id
    if error.details:
        result['error_details'] = error.details
    return result
