"""Ride financial observations and normal, explicitly scoped price actions."""

from typing import Annotated, Any, Callable

from fastmcp import FastMCP
from pydantic import Field, StrictBool

from .api_client import APIError, OpenRCT2API
from .models import RideId
from .results import mutation_failure, mutation_status


def register_finance_tools(mcp: FastMCP, get_api: Callable[[], OpenRCT2API]) -> None:
    @mcp.tool(annotations={'readOnlyHint': True, 'openWorldHint': False})
    def get_ride_finances(ride_id: RideId) -> dict[str, Any]:
        """Inspect stored/effective prices, charging rules and ride accounting.

        Money is raw engine units: 10 per GBP, not cents; display currency conversion
        is not applied. Running cost is per fortnight (x16 for the game's hourly
        estimate). Income/profit per hour are recent-customer estimates, updated
        about every 960 game ticks. Income already subtracts merchandise costs;
        profit also subtracts upkeep. Total profit is a lifetime counter, not gross
        revenue. Lifetime gross revenue is unavailable; null does not mean zero.
        Common-price flags are unavailable. Item/photo/facility prices may be shared.
        Effective prices reflect park rules, not guest-specific vouchers or purchases.
        """
        try:
            return {'success': True, **get_api().get_ride_finances(ride_id)}
        except APIError as error:
            return {'success': False, 'ride_id': ride_id, 'error': str(error)}

    @mcp.tool(annotations={'openWorldHint': False})
    def set_ride_price(
        ride_id: RideId, price_raw: Annotated[int, Field(strict=True, ge=0, le=200)],
        expected_price_raw: Annotated[int, Field(strict=True, ge=0)], price_index: Annotated[int, Field(strict=True, ge=0, le=1)] = 0,
        allow_shared_price_changes: StrictBool = False,
    ) -> dict[str, Any]:
        """Set an active price through the game's normal action and read it back.

        Raw price is 0-200 (GBP 0-20; 10 raw units per GBP). Read get_ride_finances
        first and pass the current stored expected_price_raw as a stale-value guard.
        Index 0 is admission/item/facility; index 1 is an active photo/secondary item.
        Rejects disabled money or locked admission pricing; never changes park rules.
        Item/photo/facility prices require explicit allow_shared_price_changes because
        common-price flags are unavailable and other rides may change. Observed price
        differences cover active visible slots only, not hidden photo-price slots or
        attribution against concurrent edits. No close/reset, retries or rollback.
        Acknowledgement, stored-price match and inspection availability are separate.
        """
        try:
            result = get_api().set_ride_price(
                ride_id=ride_id, price_raw=price_raw, expected_price_raw=expected_price_raw,
                price_index=price_index, allow_shared_price_changes=allow_shared_price_changes,
            )
            available = result.get('observed_after') is not None
            return {
                **result, 'success': available and result.get('stored_price_matches_request') is True,
                **mutation_status('confirmed', state_available=available),
            }
        except APIError as error:
            return mutation_failure(error, ride_id=ride_id)
