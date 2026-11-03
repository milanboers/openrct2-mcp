"""The guest collector is read-only and rejects unstable or mixed park evidence."""

import argparse
import asyncio
import importlib.util
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from openrct2_mcp.guest_evaluation import GuestRoutes

spec = importlib.util.spec_from_file_location('guest_evaluation_script', Path(__file__).parents[2] / 'scripts/evaluate_guest_ride.py')
script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(script)


def test_guest_collector_rejects_wrong_park_before_ride_collection():
    client = MagicMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=False)
    args = argparse.Namespace(port=8081)
    brief = argparse.Namespace(park_name='sandbox')
    setup = {'plugin': {'map_size': {'x': 150, 'y': 150}}}
    with patch.object(script, 'Client', return_value=client), patch.object(script, 'call_object', AsyncMock(side_effect=[
        {'version': '0.13.0', 'protocol_version': 1, 'park_name': 'other', 'map_size': {'x': 150, 'y': 150}},
        {'game_mode': 'normal'},
    ])) as call:
        with pytest.raises(RuntimeError, match='intended normal sandbox'):
            asyncio.run(script.collect(args, brief, setup, GuestRoutes(ride_id=7)))

    assert [item.args[1] for item in call.call_args_list] == ['get_plugin_info', 'get_park_status']


def test_route_collection_deduplicates_overlapping_reads_and_keeps_conflicting_observations():
    path = {'x': 30, 'y': 30, 'base_z': 14, 'edges': 4}
    routes = GuestRoutes(ride_id=7, entrance_route=[[30, 30], [40, 30]])
    with patch.object(script, 'call_object', AsyncMock(side_effect=[
        {'paths': [path]}, {'paths': [path, {**path, 'edges': 0}]},
    ])) as call:
        paths = asyncio.run(script.collect_paths(object(), routes, {'x': 40, 'y': 30}))

    assert len(paths) == 2
    assert {path['edges'] for path in paths} == {0, 4}
    assert all(item.args[1] == 'get_path_area' for item in call.call_args_list)
