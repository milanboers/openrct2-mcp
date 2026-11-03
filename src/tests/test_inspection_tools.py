"""Revision and observation contracts through the public tool functions."""

from unittest.mock import patch

import pytest

from openrct2_mcp import mcp_server as server
from openrct2_mcp.api_client import APIError


@pytest.fixture(autouse=True)
def no_game_connection():
    with patch.object(server.api_client, '_send_request', side_effect=AssertionError('Unexpected game connection')):
        yield


@pytest.fixture
def snapshot():
    return {
        'stations': [{'entrance': {'status': 'present'}, 'exit': {'status': 'present'}}],
        'rideType': 52, 'layoutStatus': 'complete', 'isCircuitComplete': False,
        'history': [{'x': 67, 'y': 66, 'z': 14, 'direction': 0, 'trackType': 1,
                     'nextX': 66, 'nextY': 66, 'nextZ': 14, 'nextDirection': 0}],
        'position': {'x': 66, 'y': 66, 'z': 14, 'direction': 0}, 'validPieces': [0, 6], 'pieceCount': 1,
    }


@pytest.fixture
def stats():
    return {'ride_status': 'testing', 'game_paused': False, 'ratings_available': True,
            'excitement': 3.0, 'intensity': 4.0, 'nausea': 1.0, 'vehicles': [{'velocity': 100, 'cars': 4}],
            'max_speed_mph': 32, 'max_lateral_g': 1.2}


def test_candidate_queries_use_one_endpoint_and_keep_rejections_distinct(snapshot):
    with patch.object(server.api_client, 'get_coaster_state', return_value=snapshot) as read, \
         patch.object(server.api_client, 'place_track_piece', side_effect=[
             {'placeable': True, 'cost': 100}, {'placeable': False, 'error': 9, 'error_message': 'Obstructed'},
         ]) as query:
        result = server.check_track_candidates(7, [
            server.TrackSegment(track_type='Flat'), server.TrackSegment(track_type='FlatToUp25', has_chain_lift=True),
            server.TrackSegment(track_type='Up60'),
        ])

    assert result['success'] is True
    assert [item.get('placeable') for item in result['results']] == [True, False, None]
    assert result['results'][2]['success'] is False
    assert result['results'][1]['error'] == 9
    assert read.call_count == 2
    assert query.call_count == 2
    assert all(call.kwargs['query'] is True and call.kwargs['tile_coordinate_x'] == 66
               for call in query.call_args_list)
    assert query.call_args_list[1].kwargs['has_chain_lift'] is True


def test_candidate_queries_refuse_changed_layout(snapshot):
    after = {**snapshot, 'pieceCount': 2}
    with patch.object(server.api_client, 'get_coaster_state', side_effect=[snapshot, after]), \
         patch.object(server.api_client, 'place_track_piece', return_value={'placeable': True}):
        result = server.check_track_candidates(7, [server.TrackSegment(track_type='Flat')])

    assert result['success'] is False
    assert 'changed' in result['error']
    assert 'results' not in result


def test_test_report_observes_without_mutating(snapshot, stats):
    snapshot['isCircuitComplete'] = True
    with patch.object(server.api_client, 'get_coaster_state', return_value=snapshot), \
         patch.object(server.api_client, 'get_ride_stats', return_value=stats) as read_stats:
        result = server.get_ride_test_report(7)

    assert result['success'] is True
    assert result['ready'] is True
    assert result['missing_evidence'] == []
    assert result['sample_count'] == 1
    assert result['latest_stats'] == stats
    read_stats.assert_called_once_with(7)


@pytest.mark.parametrize(('change', 'missing'), [
    ({'game_paused': True}, 'unpaused'),
    ({'ride_status': 'closed'}, 'running'),
    ({'ratings_available': False}, 'ratings_available'),
    ({'vehicles': [{'velocity': 0}]}, 'movement_observed'),
])
def test_test_report_explains_missing_evidence_without_inventing_causes(snapshot, stats, change, missing):
    snapshot['isCircuitComplete'] = True
    with patch.object(server.api_client, 'get_coaster_state', return_value=snapshot), \
         patch.object(server.api_client, 'get_ride_stats', return_value={**stats, **change}):
        result = server.get_ride_test_report(7)

    assert result['success'] is True
    assert result['ready'] is False
    assert result['missing_evidence'] == [missing]


def test_test_report_refuses_mixed_layout_evidence(snapshot, stats):
    with patch.object(server.api_client, 'get_coaster_state', side_effect=[snapshot, {**snapshot, 'pieceCount': 2}]), \
         patch.object(server.api_client, 'get_ride_stats', return_value=stats):
        result = server.get_ride_test_report(7)

    assert result['success'] is False
    assert 'changed' in result['error']


def test_test_report_observes_movement_during_a_bounded_window(snapshot, stats):
    snapshot['isCircuitComplete'] = True
    with patch.object(server.api_client, 'get_coaster_state', return_value=snapshot), \
         patch.object(server.api_client, 'get_ride_stats', side_effect=[
             {**stats, 'vehicles': [{'velocity': 0}]}, stats,
         ]), patch.object(server.time, 'monotonic', side_effect=[10, 10, 11]), \
         patch.object(server.time, 'sleep') as sleep:
        result = server.get_ride_test_report(7, observe_seconds=1)

    assert result['ready'] is True
    assert result['sample_count'] == 2
    assert result['latest_stats'] == stats
    sleep.assert_called_once_with(1)


@pytest.mark.parametrize('seconds', [-1, 61, float('nan')])
def test_test_report_rejects_invalid_windows_without_reading_the_game(seconds):
    result = server.get_ride_test_report(7, observe_seconds=seconds)

    assert result['success'] is False
    assert '0-60' in result['error']


def test_compact_placement_preserves_guards_and_avoids_image_requests(snapshot):
    with patch.object(server.api_client, 'get_valid_next_pieces', return_value=snapshot), \
         patch.object(server, '_get_ride_type', return_value=52), \
         patch.object(server.api_client, 'place_track_piece', return_value={}) as place, \
         patch.object(server, 'get_coaster_state', return_value={'success': True, 'piece_count': 2}) as state:
        result = server.place_track_segment(7, 'Flat', include_image=False, compact=True,
                                           expected_endpoint=server.Endpoint(**snapshot['position']))

    assert result['execution_status'] == 'completed'
    assert result['state_status'] == 'available'
    assert result['piece_count'] == 2
    assert place.call_args.kwargs['expected_endpoint'] == snapshot['position']
    assert place.call_args.kwargs['expected_piece_count'] == 1
    state.assert_called_once_with(7, include_image=False, compact=True)


def test_stale_explicit_endpoint_never_places_track(snapshot):
    with patch.object(server.api_client, 'get_valid_next_pieces', return_value=snapshot), \
         patch.object(server, '_get_ride_type', return_value=52), \
         patch.object(server.api_client, 'place_track_piece') as place, \
         patch.object(server, 'get_coaster_state', return_value={'success': True}):
        result = server.place_track_segment(7, 'Flat', expected_endpoint=server.Endpoint(x=65, y=66, z=14, direction=0))

    assert result['operation_outcome'] == 'rejected'
    assert result['error_details']['category'] == 'stale_endpoint'
    place.assert_not_called()


def test_partial_sequence_reports_progress_separately_from_unknown_last_action():
    with patch.object(server, '_get_ride_type', return_value=52), \
         patch.object(server, '_place_track_segment', side_effect=[{}, APIError('Disconnected', outcome='unknown')]), \
         patch.object(server, 'get_coaster_state', return_value={'success': True}):
        result = server.place_track_sequence(7, [server.TrackSegment(track_type='Flat')] * 2)

    assert result['operation_outcome'] == 'unknown'
    assert result['execution_status'] == 'partial'
    assert result['state_status'] == 'available'
    assert result['placed_count'] == 1
    assert result['failed_index'] == 1


def test_vehicle_failure_preserves_unknown_outcome_and_game_details():
    details = {'endpoint': 'setRideVehicles', 'code': 9, 'message': 'Game message'}
    with patch.object(server.api_client, 'set_ride_vehicles', side_effect=APIError(
        'No acknowledgement', outcome='unknown', details=details,
    )):
        result = server.set_ride_vehicles(7, 'trains', 2)

    assert result == {'success': False, 'error': 'No acknowledgement', 'ride_id': 7,
                      'operation_outcome': 'unknown', 'execution_status': 'unknown',
                      'state_status': 'not_requested', 'error_details': details}


def test_removal_preview_is_read_only_and_guard_is_forwarded_to_removal():
    target = {'x': 67, 'y': 66, 'z': 14, 'direction': 0, 'track_type': 0, 'base_z_game': 112, 'piece_count': 2}
    with patch.object(server.api_client, 'preview_track_removal', return_value={'target': target}) as preview, \
         patch.object(server.api_client, 'delete_last_track_piece', return_value={}) as remove, \
         patch.object(server, 'get_coaster_state', return_value={'success': True, 'piece_count': 1}):
        selected = server.preview_track_removal(7)
        remove.assert_not_called()
        result = server.remove_terminal_piece(7, include_image=False, compact=True,
                                              expected_target=server.RemovalTarget(**selected['target']))

    assert result['piece_count'] == 1
    assert result['operation_outcome'] == 'confirmed'
    preview.assert_called_once_with(7)
    remove.assert_called_once_with(7, expected_target=target)


def test_loaded_objects_filter_and_explicit_creation_selection():
    objects = [{'index': 10, 'ride_types': [52], 'identifier': 'wooden'},
               {'index': 20, 'ride_types': [51], 'identifier': 'twister'}]
    with patch.object(server.api_client, 'get_loaded_ride_objects', return_value=objects), \
         patch.object(server.api_client, 'create_ride', return_value={'rideId': 7}) as create, \
         patch.object(server.api_client, 'place_track_piece', return_value={}), \
         patch.object(server, 'get_coaster_state', return_value={'success': True}):
        catalog = server.get_loaded_ride_objects(52)
        result = server.create_ride(ride_object=10, include_image=False, compact=True)

    assert catalog == {'success': True, 'objects': [objects[0]]}
    assert result['operation_outcome'] == 'confirmed'
    assert create.call_args.kwargs['ride_object'] == 10


def test_creation_rejects_incompatible_object_before_creating_a_ride():
    with patch.object(server.api_client, 'get_loaded_ride_objects', return_value=[{'index': 20, 'ride_types': [51]}]), \
         patch.object(server.api_client, 'create_ride') as create:
        result = server.create_ride(ride_object=20)

    assert result['execution_status'] == 'rejected'
    create.assert_not_called()


@pytest.mark.parametrize('outcome', ['rejected', 'unknown'])
def test_creation_preserves_ride_and_station_when_naming_fails(outcome):
    with patch.object(server.api_client, 'create_ride', return_value={
        'rideId': 7, 'nameWarning': 'Name could not be confirmed', 'nameOutcome': outcome,
    }), patch.object(server.api_client, 'place_track_piece', return_value={}), \
         patch.object(server, 'get_coaster_state', return_value={'success': True, 'ride_id': 7}) as read:
        result = server.create_ride(include_image=False, compact=True)

    assert result['success'] is False
    assert result['ride_id'] == 7
    assert result['operation_outcome'] == 'confirmed'
    assert result['execution_status'] == 'partial'
    assert result['name_outcome'] == outcome
    assert result['error_message'] == 'Name could not be confirmed'
    read.assert_called_once_with(7, include_image=False, compact=True)


def test_confirmed_action_survives_post_mutation_rendering_failure():
    with patch.object(server, '_get_ride_type', return_value=52), \
         patch.object(server, '_place_track_segment', return_value={}), \
         patch.object(server, 'get_coaster_state', side_effect=ValueError('Image rendering failed')):
        result = server.place_track_segment(7, 'Flat')

    assert result['success'] is False
    assert result['operation_outcome'] == 'confirmed'
    assert result['execution_status'] == 'completed'
    assert result['state_status'] == 'unavailable'
    assert result['state_error'] == 'Image rendering failed'


def test_test_report_retains_timed_train_observations(snapshot, stats):
    snapshot['isCircuitComplete'] = True
    vehicle = {'id': 3, 'velocity': 100, 'position': {'x': 64, 'y': 66, 'z': 15},
               'track_location': {'x': 64, 'y': 66, 'z': 14, 'direction': 0, 'track_type': 6},
               'g_forces_raw': {'lateral': 0, 'vertical': 100}, 'status': 'travelling'}
    first = {**stats, 'observed_game_tick': 1234, 'vehicles': [vehicle]}
    second = {**stats, 'observed_game_tick': 1274, 'vehicles': [{**vehicle, 'velocity': 0}]}
    with patch.object(server.api_client, 'get_coaster_state', return_value=snapshot), \
         patch.object(server.api_client, 'get_ride_stats', side_effect=[first, second]), \
         patch.object(server.time, 'monotonic', side_effect=[10, 10, 11]), patch.object(server.time, 'sleep'):
        report = server.get_ride_test_report(7, observe_seconds=1)

    assert report['ready'] is True
    assert report['observations'] == [{'elapsed_seconds': 0, 'stats': first}, {'elapsed_seconds': 1, 'stats': second}]
    assert report['latest_stats'] == second


@pytest.mark.parametrize('building', ['entrance', 'exit'])
def test_test_report_does_not_hide_a_missing_station_building(snapshot, stats, building):
    snapshot['isCircuitComplete'] = True
    snapshot['stations'][0][building]['status'] = 'absent'
    with patch.object(server.api_client, 'get_coaster_state', return_value=snapshot), \
         patch.object(server.api_client, 'get_ride_stats', return_value=stats):
        report = server.get_ride_test_report(7)

    assert report['ready'] is False
    assert report['missing_evidence'] == [f'station_{building}s_present']


def test_park_and_station_tools_are_read_only_adapters_with_explicit_unknown_access():
    park = {'park_name': 'sandbox', 'scenario': {'status': 'inProgress'}}
    access = {'ride_id': 7, 'stations': None, 'paths': [], 'guest_access': 'unknown'}
    with patch.object(server.api_client, 'get_park_status', return_value=park) as read_park, \
         patch.object(server.api_client, 'get_ride_station_access', return_value=access) as read_access:
        assert server.get_park_status() == {'success': True, **park}
        assert server.get_ride_station_access(7, radius=3) == {'success': True, **access}

    read_park.assert_called_once_with()
    read_access.assert_called_once_with(7, 3)


@pytest.mark.parametrize(('tool', 'method', 'arguments'), [
    ('get_park_status', 'get_park_status', {}),
    ('get_ride_station_access', 'get_ride_station_access', {'ride_id': 7}),
])
def test_park_and_station_tools_surface_collection_rejections(tool, method, arguments):
    with patch.object(server.api_client, method, side_effect=APIError('Park unavailable')):
        result = getattr(server, tool)(**arguments)

    assert result['success'] is False
    assert result['error'] == 'Park unavailable'


@pytest.mark.parametrize(('result', 'success', 'state_status'), [
    ({'vehicles_cleared': True}, True, 'available'),
    ({'vehicles_cleared': False}, False, 'available'),
    ({'vehicles_cleared': None, 'state_error': 'Ride disappeared'}, False, 'unavailable'),
])
def test_reset_separates_acknowledgement_from_observed_vehicle_clearance(result, success, state_status):
    with patch.object(server.api_client, 'reset_ride', return_value=result) as reset:
        response = server.reset_ride(7)

    assert response['success'] is success
    assert response['operation_outcome'] == 'confirmed'
    assert response['execution_status'] == 'completed'
    assert response['state_status'] == state_status
    assert response['vehicles_cleared'] == result['vehicles_cleared']
    reset.assert_called_once_with(7)


def test_reset_does_not_retry_an_unknown_outcome():
    with patch.object(server.api_client, 'reset_ride', side_effect=APIError('Lost acknowledgement', outcome='unknown')) as reset:
        response = server.reset_ride(7)

    assert response['operation_outcome'] == 'unknown'
    reset.assert_called_once_with(7)


def test_compact_endpoint_view_summarizes_terrain_without_losing_objects_or_changing_image(snapshot):
    from copy import deepcopy
    import json

    surface = {'type': 'surface', 'base_z': 14, 'clearance_z': 14, 'is_ghost': False,
               'slope': 0, 'water_height_raw': 0}
    elevated = {**surface, 'base_z': 16, 'clearance_z': 16}
    sloped = {**surface, 'slope': 1}
    wet = {**surface, 'water_height_raw': 20}
    ghost_surface = {**surface, 'is_ghost': True}
    higher_clearance = {**surface, 'clearance_z': 16}
    objects = [
        {'type': 'track', 'base_z': 14, 'clearance_z': 18, 'is_ghost': False, 'ride_id': 7},
        {'type': 'track', 'base_z': 24, 'clearance_z': 28, 'is_ghost': False, 'ride_id': 8},
        {'type': 'footpath', 'base_z': 14, 'clearance_z': 16, 'is_ghost': False},
        {'type': 'small_scenery', 'base_z': 14, 'clearance_z': 20, 'is_ghost': False},
        {'type': 'track', 'base_z': 30, 'clearance_z': 34, 'is_ghost': True, 'ride_id': 9},
    ]
    tiles = {(x, y): {'x': x, 'y': y, 'elements': [surface]}
             for x in range(58, 75) for y in range(58, 75)}
    tiles[58, 58]['elements'] = [elevated]
    tiles[66, 66]['elements'] = [surface, *objects]
    for x, element in [(67, elevated), (68, sloped), (69, wet), (70, ghost_surface), (71, higher_clearance)]:
        tiles[x, 66]['elements'] = [element]
    tiles[72, 66]['elements'] = []
    area = {'x': 66, 'y': 66, 'radius': 8, 'tiles': list(tiles.values())}
    original = deepcopy(area)

    with patch.object(server.api_client, 'get_coaster_state', return_value=snapshot), \
         patch.object(server.api_client, 'get_map_area', return_value=area):
        full, full_image = server.get_coaster_view(7, radius=8)
        compact, compact_image = server.get_coaster_view(7, radius=8, compact=True)

    assert compact['map_area'] == {
        'x': 66, 'y': 66, 'radius': 8, 'compact': True,
        'terrain_summary': {'observed_tile_count': 289, 'omitted_surface': surface, 'omitted_surface_count': 282},
        'tiles': [
            {'x': 58, 'y': 58, 'elements': [elevated]},
            {'x': 66, 'y': 66, 'elements': objects},
            {'x': 67, 'y': 66, 'elements': [elevated]},
            {'x': 68, 'y': 66, 'elements': [sloped]},
            {'x': 69, 'y': 66, 'elements': [wet]},
            {'x': 70, 'y': 66, 'elements': [ghost_surface]},
            {'x': 71, 'y': 66, 'elements': [higher_clearance]},
        ],
    }
    assert {key: value for key, value in compact.items() if key not in ('map_area', 'limitations')} == {
        key: value for key, value in full.items() if key not in ('map_area', 'limitations')
    }
    assert 'exact omitted terrain locations' in compact['limitations']
    assert compact_image.data == full_image.data
    assert len(json.dumps(compact)) < len(json.dumps(full)) / 2
    assert full['map_area'] == original
    assert area == original


@pytest.mark.parametrize('tiles', [
    [],
    [{'x': 66, 'y': 66, 'elements': [
        {'type': 'surface', 'base_z': 14, 'clearance_z': 14, 'is_ghost': False,
         'slope': 1, 'water_height_raw': 20},
        {'type': 'surface', 'base_z': 14, 'clearance_z': 14, 'is_ghost': True,
         'slope': 0, 'water_height_raw': 0},
    ]}],
])
def test_compact_endpoint_view_preserves_observations_when_no_surface_can_be_summarized(snapshot, tiles):
    area = {'x': 66, 'y': 66, 'radius': 0, 'tiles': tiles}
    with patch.object(server.api_client, 'get_coaster_state', return_value=snapshot), \
         patch.object(server.api_client, 'get_map_area', return_value=area):
        summary, image = server.get_coaster_view(7, radius=0, compact=True)

    assert summary['success'] is True
    assert summary['map_area'] == {
        **area, 'compact': True,
        'terrain_summary': {'observed_tile_count': len(tiles), 'omitted_surface': None, 'omitted_surface_count': 0},
    }
    assert image.data.startswith(b'\x89PNG')
