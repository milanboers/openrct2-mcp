"""Readiness failures are collected without construction or paid agent calls."""

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from openrct2_mcp.readiness import REQUIRED_TOOLS, inspect_readiness


def test_readiness_reports_missing_client_tools_without_game_calls():
    client = SimpleNamespace(list_tools=AsyncMock(return_value=[SimpleNamespace(name='get_plugin_info')]))
    with patch('openrct2_mcp.readiness.call_object', AsyncMock()) as call:
        report = asyncio.run(inspect_readiness(client))

    assert report['ready'] is False
    assert 'place_path_tile' in report['missing_tools']
    call.assert_not_awaited()


def test_readiness_collects_park_constraints_without_mutations():
    client = SimpleNamespace(list_tools=AsyncMock(return_value=[SimpleNamespace(name=name) for name in REQUIRED_TOOLS]))
    with patch('openrct2_mcp.readiness.call_object', AsyncMock(side_effect=[
        {'version': '0.15.0', 'protocol_version': 1},
        {'game_mode': 'normal', 'park_name': 'sandbox', 'game_paused': False},
    ])) as call, patch('openrct2_mcp.readiness.call_json', AsyncMock(return_value=[])) as rides:
        report = asyncio.run(inspect_readiness(client, 'sandbox', require_empty=True, require_unpaused=True))

    assert report['ready'] is True
    assert all(report['checks'].values())
    assert [item.args[1] for item in call.call_args_list] == ['get_plugin_info', 'get_park_status']
    rides.assert_awaited_once_with(client, 'list_all_rides')
