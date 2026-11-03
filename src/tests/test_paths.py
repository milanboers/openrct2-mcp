"""Explicit flat-route verification does not plan routes or infer public access."""

import pytest

from openrct2_mcp.paths import flat_route_connected


@pytest.mark.parametrize(('change', 'connected'), [
    ({}, True),
    ({'edges': 0}, False),
    ({'base_z': 16}, False),
    ({'is_ghost': True}, False),
    ({'slope_direction': 1}, False),
    ({'edges': None}, False),
])
def test_flat_route_requires_matching_height_reciprocal_edges_and_non_ghost_observations(change, connected):
    paths = [{'x': 10, 'y': 20, 'base_z': 14, 'is_ghost': False, 'slope_direction': None, 'edges': 4},
             {'x': 11, 'y': 20, 'base_z': 14, 'is_ghost': False, 'slope_direction': None, 'edges': 1, **change}]

    assert flat_route_connected(paths, [(10, 20), (11, 20)], 14) is connected


def test_flat_route_rejects_ambiguous_observations_but_tolerates_identical_overlapping_reads():
    path = {'x': 10, 'y': 20, 'base_z': 14, 'is_ghost': False, 'slope_direction': None, 'edges': 4}
    neighbor = {**path, 'x': 11, 'edges': 1}

    assert flat_route_connected([path, path, neighbor], [(10, 20), (11, 20)], 14) is True
    assert flat_route_connected([path, {**path, 'edges': 0}, neighbor], [(10, 20), (11, 20)], 14) is False
    assert flat_route_connected([path], [(10, 20), (12, 20)], 14) is False
    assert flat_route_connected([path], [], 14) is False
