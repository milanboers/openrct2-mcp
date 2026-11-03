"""Financial contracts through MCP, including action acknowledgement vs readback."""

import asyncio
from unittest.mock import Mock

from fastmcp import Client, FastMCP
import pytest

from openrct2_mcp.api_client import APIError, OpenRCT2API
from openrct2_mcp.client_helpers import call_object
from openrct2_mcp.finance_tools import register_finance_tools


@pytest.fixture
def tools():
    api = Mock(spec=OpenRCT2API)
    mcp = FastMCP('Finance tools')
    register_finance_tools(mcp, lambda: api)
    return mcp, api


def test_finances_and_price_setting_preserve_engine_units_and_observed_shared_changes(tools):
    mcp, api = tools
    observed = {
        'ride_id': 0, 'prices': [{'index': 1, 'price_raw': 20}],
        'running_cost_per_fortnight_raw': None, 'income_per_hour_estimate_raw': 0,
        'total_profit_raw': -40, 'total_revenue_raw': None,
    }
    changes = [{'ride_id': 3, 'price_index': 1, 'before_raw': 10, 'after_raw': 20}]
    api.get_ride_finances.return_value = observed
    api.set_ride_price.return_value = {
        'ride_id': 0, 'observed_after': observed, 'stored_price_matches_request': True,
        'observed_price_changes': changes, 'price_change_observations_complete': True,
    }

    async def scenario():
        async with Client(mcp) as client:
            finances = await call_object(client, 'get_ride_finances', ride_id=0)
            priced = await call_object(client, 'set_ride_price', ride_id=0, price_raw=20,
                                       expected_price_raw=10, price_index=1, allow_shared_price_changes=True)
            return finances, priced

    finances, priced = asyncio.run(scenario())

    assert finances == {'success': True, **observed}
    assert priced['success'] is True
    assert priced['operation_outcome'] == 'confirmed'
    assert priced['state_status'] == 'available'
    assert priced['observed_price_changes'] == changes
    assert priced['observed_after'] == observed
    api.get_ride_finances.assert_called_once_with(0)
    api.set_ride_price.assert_called_once_with(
        ride_id=0, price_raw=20, expected_price_raw=10, price_index=1, allow_shared_price_changes=True,
    )
    api.close_ride.assert_not_called()
    api.reset_ride.assert_not_called()


@pytest.mark.parametrize('outcome', ['rejected', 'unknown'])
def test_price_failure_preserves_outcome_and_identity_without_retry(tools, outcome):
    mcp, api = tools
    api.set_ride_price.side_effect = APIError('Price unavailable', outcome=outcome, details={'code': 9})

    async def scenario():
        async with Client(mcp) as client:
            return await call_object(client, 'set_ride_price', allow_failure=True,
                                     ride_id=0, price_raw=20, expected_price_raw=10)

    result = asyncio.run(scenario())

    assert result['success'] is False
    assert result['ride_id'] == 0
    assert result['operation_outcome'] == outcome
    assert result['error_details'] == {'code': 9}
    api.set_ride_price.assert_called_once_with(
        ride_id=0, price_raw=20, expected_price_raw=10, price_index=0, allow_shared_price_changes=False,
    )


@pytest.mark.parametrize(('after', 'matches', 'state_status'), [
    (None, None, 'unavailable'), ({'prices': [{'price_raw': 10}]}, False, 'available'),
])
def test_price_acknowledgement_does_not_claim_success_with_missing_or_mismatched_readback(
    tools, after, matches, state_status,
):
    mcp, api = tools
    api.set_ride_price.return_value = {
        'ride_id': 0, 'observed_after': after, 'stored_price_matches_request': matches,
    }

    async def scenario():
        async with Client(mcp) as client:
            return await call_object(client, 'set_ride_price', allow_failure=True,
                                     ride_id=0, price_raw=20, expected_price_raw=10)

    result = asyncio.run(scenario())

    assert result['success'] is False
    assert result['operation_outcome'] == 'confirmed'
    assert result['state_status'] == state_status
    assert result['stored_price_matches_request'] is matches
    assert api.set_ride_price.call_count == 1


def test_financial_inspection_failure_is_not_an_empty_or_zero_report(tools):
    mcp, api = tools
    api.get_ride_finances.side_effect = APIError('Ride not found')

    async def scenario():
        async with Client(mcp) as client:
            return await call_object(client, 'get_ride_finances', allow_failure=True, ride_id=0)

    result = asyncio.run(scenario())

    assert result == {'success': False, 'ride_id': 0, 'error': 'Ride not found'}


@pytest.mark.parametrize('arguments', [
    {'price_raw': -1, 'expected_price_raw': 10},
    {'price_raw': 201, 'expected_price_raw': 10},
    {'price_raw': 20},
])
def test_invalid_price_input_is_rejected_before_api_call(tools, arguments):
    mcp, api = tools

    async def scenario():
        async with Client(mcp) as client:
            return await client.call_tool('set_ride_price', {'ride_id': 0, **arguments}, raise_on_error=False)

    result = asyncio.run(scenario())

    assert result.is_error
    api.set_ride_price.assert_not_called()
