"""Handwritten coaster workflows and snapshot presentation with isolated clients."""

import pytest
from unittest.mock import patch
from typing import Any

from fastmcp import FastMCP
from openrct2_mcp.api_client import OpenRCT2API
from openrct2_mcp._action_tools import register_action_tools
from openrct2_mcp.coaster_tools import CoasterTools
from openrct2_mcp.coaster_state import format_coaster_state
from openrct2_mcp.models import TrackSegment
from openrct2_mcp.visualization import generate_coaster_image, generate_height_map


@pytest.fixture
def tools():
    api = OpenRCT2API()
    with patch.object(api, '_send_request', side_effect=AssertionError('Unit test attempted game connection')):
        yield CoasterTools(api)


@pytest.fixture
def actions(tools):
    return register_action_tools(FastMCP('Action contracts'), lambda: tools.api)


def test_height_map_uses_element_tiles_and_preserves_crossing_heights() -> None:
    elements = [{'x': 10, 'y': 11, 'z': 14}, {'x': 10, 'y': 11, 'z': 18},
                {'x': 12, 'y': 11, 'z': 15.5}]

    result = generate_height_map(elements)

    assert '10' in result and '12' in result
    assert '14/18' in result and '15.5' in result
    assert 'not collision clearance' in result
    assert generate_height_map(None) == 'Track occupancy unavailable: update the OpenRCT2 plugin.'


def test_explicit_incomplete_circuit_is_not_overridden_by_geometric_fallback() -> None:
    piece = {'x': 10, 'y': 10, 'z': 14, 'direction': 0, 'trackType': 0}
    endpoint = {'x': 10, 'y': 10, 'z': 14, 'direction': 0}

    state, _ = format_coaster_state(1, {
        'history': [piece], 'nextEndpoint': endpoint, 'isCircuitComplete': False,
    }, [])

    assert state['is_circuit_complete'] is False


def test_coaster_image_draws_turns_as_curves() -> None:
    from io import BytesIO
    from PIL import Image

    piece = {'x': 10, 'y': 10, 'z': 14, 'direction': 0, 'nextDirection': 3, 'trackType': 16}
    endpoint = {'x': 7, 'y': 7, 'z': 14}
    curved = Image.open(BytesIO(generate_coaster_image([piece], endpoint).data))
    straight = Image.open(BytesIO(generate_coaster_image([{**piece, 'trackType': 0}], endpoint).data))

    assert curved.size == straight.size
    assert curved.tobytes() != straight.tobytes()


class TestCreateRide:
    """Tests for the create_ride tool."""

    def test_create_ride_success(self, tools) -> None:
        """Test successful ride creation."""
        with patch.object(tools.api, 'create_ride') as mock_create, \
             patch.object(tools.api, 'place_track_piece') as mock_place, \
             patch.object(tools.api, 'get_coaster_state') as mock_snapshot:

            mock_create.return_value = {"rideId": 1}
            mock_place.return_value = {"success": True}
            candidate_state = {"validPieces": [0, 6]} # Flat, FlatToUp25
            history = {
                "history": [{"x": 67, "y": 66, "z": 14, "direction": 0, "trackType": 1, "nextX": 66, "nextY": 66, "nextZ": 14, "nextDirection": 0}]
            }

            mock_snapshot.return_value = {**candidate_state, **history, 'rideType': 52}
            result: Any = tools.create_ride(name="Test Coaster")

            assert isinstance(result, list)
            assert result[0]["success"] is True
            assert result[0]["ride_id"] == 1
            assert result[0]["ride_type"] == 52
            assert len(result[0]["pieces"]) == 1
            # The game classifies the first station piece as an EndStation.
            assert result[0]["pieces"][0]["trackType"] == "EndStation"
            valid_names = [p["name"] for p in result[0]["valid_pieces"]]
            assert "Flat" in valid_names
            assert "FlatToUp25" in valid_names
            assert "height_map" in result[0]
            mock_create.assert_called_once_with(
                ride_type=52,
                ride_object=65535,
                entrance_object=0,
                colour1=0,
                colour2=0,
                inspection_interval=2,
                name="Test Coaster",
            )
            mock_place.assert_called_once()


    def test_create_ride_station_failure_returns_ride_id(self, tools) -> None:
        from openrct2_mcp.api_client import APIError

        with patch.object(tools.api, 'create_ride', return_value={'rideId': 7}), \
             patch.object(tools.api, 'place_track_piece', side_effect=APIError('Location occupied')):
            result = tools.create_ride(name='Test Coaster')

        assert result['success'] is False
        assert result['ride_id'] == 7
        assert result['error'] == 'Location occupied'
        assert result['operation_outcome'] == 'rejected'
        assert 'Ride was created' in result['message']


class TestPlaceTrackSegment:
    """Tests for the place_track_segment tool."""

    def test_place_track_segment_success(self, tools) -> None:
        """Test successful track segment placement."""
        with patch.object(tools.api, 'get_valid_next_pieces') as mock_valid_next, \
             patch.object(tools.api, 'get_coaster_state') as mock_snapshot, \
             patch.object(tools.api, 'place_track_piece') as mock_place, \
             patch.object(tools.api, 'list_all_rides') as mock_list:

            # 1. Setup mocks
            mock_valid_next.return_value = {"validPieces": [0, 1], "position": {"x": 10, "y": 10, "z": 2, "direction": 0}}
            history = {
                "history": [{"x": 10, "y": 10, "z": 2, "direction": 0, "trackType": 0, "nextX": 11, "nextY": 10, "nextZ": 2, "nextDirection": 0}]
            }
            mock_list.return_value = [{"id": 1, "type": 52}]

            # 2. Setup mock for the actual placement
            mock_place.return_value = {
                "success": True,
                "nextEndpoint": {"x": 11, "y": 10, "z": 2, "direction": 0},
                "isCircuitComplete": False,
                "history": [{"x": 10, "y": 10, "z": 2, "direction": 0, "trackType": 0}]
            }

            # 3. Call the tool
            mock_snapshot.return_value = {**mock_valid_next.return_value, **history, 'rideType': 52}
            result: Any = tools.place_track_segment(
                ride_id=1,
                track_type="Flat"
            )

            assert isinstance(result, list)
            assert result[0]["success"] is True
            assert result[0]["ride_id"] == 1
            assert len(result[0]["pieces"]) == 1
            assert result[0]["pieces"][0]["trackType"] == "Flat"
            assert result[0]["current_endpoint"]["x"] == 11
            assert "height_map" in result[0]
            mock_place.assert_called_once()


    def test_place_track_segment_reports_endpoint_mismatch(self, tools) -> None:
        mismatch = {'predicted': {'x': 9}, 'actual': {'x': 11}}
        with patch.object(tools.api, 'get_valid_next_pieces', return_value={
            'validPieces': [0], 'position': {'x': 10, 'y': 20, 'z': 14, 'direction': 0},
        }), patch.object(tools.api, 'place_track_piece', return_value={'endpointPredictionMismatch': mismatch}), \
             patch.object(tools, '_get_ride_type', return_value=52), \
             patch.object(tools, 'get_coaster_state', return_value=[{'success': True}, 'image']):
            result = tools.place_track_segment(1, 'Flat')

        assert result[0]['endpoint_prediction_mismatches'] == [{'segment_index': 0, **mismatch}]

    @pytest.mark.parametrize('failure', ['complete', 'invalid', 'placement'])
    def test_place_track_segment_failure(self, failure: str, tools) -> None:
        from openrct2_mcp.api_client import APIError

        with patch.object(tools.api, 'get_valid_next_pieces') as valid, \
             patch.object(tools.api, 'place_track_piece') as place, \
             patch.object(tools, '_get_ride_type', return_value=52), \
             patch.object(tools, 'get_coaster_state', return_value=[{'success': True}, 'image']):
            valid.return_value = {
                'validPieces': [] if failure == 'invalid' else [0],
                'isCircuitComplete': failure == 'complete',
                'position': {'x': 10, 'y': 20, 'z': 14, 'direction': 0},
            }
            if failure == 'placement':
                place.side_effect = APIError('Location occupied')

            result = tools.place_track_segment(1, 'Flat')

            summary = result[0] if isinstance(result, list) else result
            assert summary['success'] is False
            assert summary['error_message'] == {
                'complete': 'Circuit is already complete',
                'invalid': 'Invalid track type at this position: Flat',
                'placement': 'Location occupied',
            }[failure]
            assert place.call_count == (1 if failure == 'placement' else 0)


class TestPlaceTrackSequence:
    def test_sequence_success(self, tools) -> None:
        with patch.object(tools.api, 'get_valid_next_pieces') as valid, \
             patch.object(tools.api, 'place_track_piece') as place, \
             patch.object(tools, '_get_ride_type', return_value=52), \
             patch.object(tools, 'get_coaster_state', return_value=[{'success': True}, 'image']) as final:
            valid.side_effect = [
                {'validPieces': [6], 'position': {'x': 10, 'y': 20, 'z': 14, 'direction': 0}},
                {'validPieces': [4], 'position': {'x': 9, 'y': 20, 'z': 15, 'direction': 0}},
            ]
            segments = [TrackSegment(track_type='FlatToUp25', has_chain_lift=True),
                        TrackSegment(track_type='Up25', has_chain_lift=True)]

            result = tools.place_track_sequence(1, segments)

            assert result == [{'success': True, 'operation_outcome': 'confirmed', 'execution_status': 'completed', 'state_status': 'available', 'placed_count': 2}, 'image']
            assert place.call_count == 2
            assert place.call_args_list[1].kwargs['tile_coordinate_x'] == 9
            assert place.call_args_list[1].kwargs['has_chain_lift'] is True
            final.assert_called_once_with(1, include_image=True, compact=False)

    def test_sequence_reports_mismatch_even_when_later_piece_fails(self, tools) -> None:
        from openrct2_mcp.api_client import APIError

        mismatch = {'predicted': {'x': 9}, 'actual': {'x': 11}}
        valid = {'validPieces': [0], 'position': {'x': 10, 'y': 20, 'z': 14, 'direction': 0}}
        with patch.object(tools.api, 'get_valid_next_pieces', return_value=valid), \
             patch.object(tools.api, 'place_track_piece', side_effect=[
                 {'endpointPredictionMismatch': mismatch}, APIError('Location occupied'),
             ]), patch.object(tools, '_get_ride_type', return_value=52), \
             patch.object(tools, 'get_coaster_state', return_value=[{'success': True}, 'image']):
            result = tools.place_track_sequence(1, [TrackSegment(track_type='Flat')] * 2)

        assert result[0]['success'] is False
        assert result[0]['placed_count'] == 1
        assert result[0]['failed_index'] == 1
        assert result[0]['endpoint_prediction_mismatches'] == [{'segment_index': 0, **mismatch}]

    @pytest.mark.parametrize('failure', ['invalid', 'placement', 'complete'])
    def test_sequence_stops_on_failure(self, failure: str, tools) -> None:
        from openrct2_mcp.api_client import APIError

        with patch.object(tools.api, 'get_valid_next_pieces') as valid, \
             patch.object(tools.api, 'place_track_piece') as place, \
             patch.object(tools, '_get_ride_type', return_value=52), \
             patch.object(tools, 'get_coaster_state', return_value=[{'success': True}, 'image']) as final:
            first = {'validPieces': [0], 'position': {'x': 10, 'y': 20, 'z': 14, 'direction': 0}}
            second = {'validPieces': [0] if failure == 'placement' else [],
                      'position': {'x': 9, 'y': 20, 'z': 14, 'direction': 0},
                      'isCircuitComplete': failure == 'complete'}
            valid.side_effect = [first, second]
            if failure == 'placement':
                place.side_effect = [None, APIError('Location occupied')]
            segments = [TrackSegment(track_type='Flat')] * 3

            result = tools.place_track_sequence(1, segments)

            assert result[0]['success'] is False
            assert result[0]['placed_count'] == 1
            assert result[0]['failed_index'] == 1
            assert result[0]['error_message'] == {
                'invalid': 'Invalid track type at this position: Flat',
                'placement': 'Location occupied',
                'complete': 'Circuit is already complete',
            }[failure]
            assert place.call_count == (2 if failure == 'placement' else 1)
            final.assert_called_once_with(1, include_image=True, compact=False)


class TestUndoLastPiece:
    """Tests for the undo_last_piece tool."""

    def test_undo_last_piece_success(self, tools) -> None:
        """Test successful undo."""
        with patch.object(tools.api, 'delete_last_track_piece') as mock_delete, \
             patch.object(tools.api, 'get_coaster_state') as mock_snapshot:

            mock_delete.return_value = {"success": True}
            candidate_state = {"validPieces": [0], "isCircuitComplete": False}
            history = {
                "history": [{"x": 67, "y": 66, "z": 14, "direction": 0, "trackType": 2, "nextX": 66, "nextY": 66, "nextZ": 14, "nextDirection": 0}]
            }

            mock_snapshot.return_value = {**candidate_state, **history, 'rideType': 52}
            result: Any = tools.undo_last_piece(ride_id=1)

            assert isinstance(result, list)
            assert result[0]["success"] is True
            assert len(result[0]["pieces"]) == 1
            assert "height_map" in result[0]
            mock_delete.assert_called_once_with(1, include_state=True)


class TestCoasterTools:
    """Tests for remaining coaster tools."""

    def test_place_entrance_exit(self, tools) -> None:
        with patch.object(tools.api, 'place_entrance_exit') as mock_place, \
             patch.object(tools.api, 'get_coaster_state') as mock_snapshot:

            mock_place.return_value = {"entrance": {"x": 1}, "exit": {"x": 2}}
            history = {"history": []}
            candidate_state = {"validPieces": []}

            mock_snapshot.return_value = {**candidate_state, **history, 'rideType': 52}
            result: Any = tools.place_entrance_exit(ride_id=1)
            assert isinstance(result, list)
            assert result[0]["success"] is True
            assert "entrance_exit" in result[0]
            assert "height_map" in result[0]

    def test_start_ride_test(self, tools, actions) -> None:
        with patch.object(tools.api, 'start_ride_test') as mock_test:
            mock_test.return_value = "Testing started"
            result: dict[str, Any] = actions['start_ride_test'](ride_id=1)
            assert result["success"] is True
            assert result["message"] == "Testing started"

    def test_get_ride_stats(self, tools) -> None:
        with patch.object(tools.api, 'get_ride_stats') as mock_stats:
            mock_stats.return_value = {"excitement": 5.0}
            result: dict[str, Any] = tools.get_ride_stats(ride_id=1)
            assert result["excitement"] == 5.0

    def test_check_track_segment_queries_without_placing(self, tools) -> None:
        with patch.object(tools.api, 'get_valid_next_pieces', return_value={
            'validPieces': [6], 'position': {'x': 10, 'y': 20, 'z': 14, 'direction': 0},
        }), patch.object(tools.api, 'place_track_piece', return_value={'placeable': False, 'error_message': 'Blocked'}) as place, \
             patch.object(tools, '_get_ride_type', return_value=52):
            result = tools.check_track_segment(1, 'FlatToUp25', has_chain_lift=True)

            assert result == {'placeable': False, 'error_message': 'Blocked'}
            assert place.call_args.kwargs['query'] is True
            assert place.call_args.kwargs['has_chain_lift'] is True

    def test_get_map_area(self, tools) -> None:
        with patch.object(tools.api, 'get_map_area', return_value={'tiles': []}) as area:
            assert tools.get_map_area(10, 20, 2) == {'tiles': []}
            area.assert_called_once_with(10, 20, 2)

    def test_get_track_catalog_identifies_supported_types(self, tools) -> None:
        with patch.object(tools.api, 'get_track_catalog', return_value=[
            {'type': 0, 'description': 'Straight'}, {'type': 999, 'description': 'Other'},
        ]):
            assert tools.get_track_catalog() == [
                {'type': 0, 'description': 'Straight', 'supported_name': 'Flat'},
                {'type': 999, 'description': 'Other', 'supported_name': None},
            ]
            assert tools.get_track_catalog(supported_only=True) == [
                {'type': 0, 'description': 'Straight', 'supported_name': 'Flat'},
            ]

    def test_set_ride_vehicles(self, tools, actions) -> None:
        with patch.object(tools.api, 'set_ride_vehicles', return_value={
            'ride_id': 1, 'setting': 'trains', 'value': 2,
        }) as set_vehicles:
            assert actions['set_ride_vehicles'](1, 'trains', 2) == {
                'success': True, 'operation_outcome': 'confirmed', 'execution_status': 'completed',
                'state_status': 'not_requested', 'ride_id': 1, 'setting': 'trains', 'value': 2,
            }
            set_vehicles.assert_called_once_with(1, 'trains', 2)

    def test_delete_ride(self, tools, actions) -> None:
        with patch.object(tools.api, 'delete_ride', return_value={'rideId': 1}) as delete:
            assert actions['delete_ride'](1) == {'success': True, 'ride_id': 1, 'operation_outcome': 'confirmed',
                                      'execution_status': 'completed', 'state_status': 'not_requested'}
            delete.assert_called_once_with(1)

    def test_get_plugin_info(self, tools) -> None:
        with patch.object(tools.api, 'get_plugin_info', return_value={'version': '0.19.0', 'protocol_version': 1}):
            assert tools.get_plugin_info() == {'version': '0.19.0', 'expected_version': '0.19.0', 'matches': True,
                                         'protocol_version': 1, 'expected_protocol_version': 1, 'protocol_compatible': True}

    def test_list_rides_failure_is_not_empty_list(self, tools) -> None:
        from openrct2_mcp.api_client import APIError

        with patch.object(tools.api, 'list_all_rides', side_effect=APIError('Disconnected')):
            assert tools.list_all_rides() == {'success': False, 'error': 'Disconnected'}

    def test_delete_all_rides(self, tools) -> None:
        with patch.object(tools.api, 'delete_all_rides') as mock_del:
            mock_del.return_value = "All rides deleted"
            result: dict[str, Any] = tools.delete_all_rides()
            assert result["success"] is True
            assert result["message"] == "All rides deleted"

    def test_list_all_rides(self, tools) -> None:
        with patch.object(tools.api, 'list_all_rides') as mock_list:
            mock_list.return_value = [{"id": 1, "name": "Coaster", "type": 52}]
            result: list[dict[str, Any]] = tools.list_all_rides()
            assert len(result) == 1
            # id/type are preserved (they're used as tool inputs) and the
            # human-readable name is added.
            assert result[0]["id"] == 1
            assert result[0]["type"] == 52
            assert result[0]["ride_type_name"] == "Wooden Roller Coaster"

    def test_candidate_status_reported_from_plugin(self, tools) -> None:
        with patch.object(tools.api, 'get_coaster_state', return_value={
            'validPieces': [], 'candidateStatus': 'unsupported_diagonal_endpoint', 'history': [], 'rideType': 52,
        }):
            result = tools.get_coaster_state(1)

        assert result[0]['valid_pieces'] == []
        assert result[0]['candidate_status'] == 'unsupported_diagonal_endpoint'

    def test_circuit_complete_reported_from_plugin(self, tools) -> None:
        """The plugin's isCircuitComplete flag must flow through to the state."""
        with patch.object(tools.api, 'get_coaster_state') as mock_snapshot:

            candidate_state = {"validPieces": [0], "isCircuitComplete": True}
            history = {
                "history": [{"x": 67, "y": 66, "z": 14, "direction": 0, "trackType": 2, "nextX": 61, "nextY": 66, "nextZ": 14, "nextDirection": 0}]
            }

            mock_snapshot.return_value = {**candidate_state, **history, 'rideType': 52}
            result: Any = tools.get_coaster_state(ride_id=1)
            assert isinstance(result, list)
            assert result[0]["is_circuit_complete"] is True


def test_missing_ride_type_prevents_placement(tools):
    with patch.object(tools.api, 'list_all_rides', return_value=[]), \
         patch.object(tools.api, 'place_track_piece') as place, \
         patch.object(tools, 'get_coaster_state', return_value={'success': False, 'error': 'Ride not found'}):
        result = tools.place_track_segment(7, 'Flat')

    assert result['success'] is False
    assert result['operation_outcome'] == 'rejected'
    assert result['error_message'] == 'Ride 7 not found'
    place.assert_not_called()


def test_undo_failure_is_not_reported_as_success(tools):
    from openrct2_mcp.api_client import APIError

    with patch.object(tools.api, 'delete_last_track_piece', side_effect=APIError('Ride must be closed')), \
         patch.object(tools, 'get_coaster_state', return_value=[{'success': True}, 'image']):
        result = tools.undo_last_piece(7)

    assert result[0]['success'] is False
    assert result[0]['operation_outcome'] == 'rejected'
    assert result[0]['error_message'] == 'Ride must be closed'


def test_confirmed_placement_with_failed_state_read_retains_outcome(tools):
    with patch.object(tools, '_place_track_segment', return_value={}), \
         patch.object(tools, '_get_ride_type', return_value=52), \
         patch.object(tools, 'get_coaster_state', return_value={'success': False, 'error': 'Disconnected'}):
        result = tools.place_track_segment(7, 'Flat')

    assert result['success'] is False
    assert result['operation_outcome'] == 'confirmed'
    assert result['state_error'] == 'Disconnected'
    assert result['execution_status'] == 'completed'
    assert result['state_status'] == 'unavailable'


def test_compact_snapshot_uses_one_request_and_skips_rendering(tools):
    with patch.object(tools.api, 'get_coaster_state', return_value={
        'history': [], 'rideType': 51, 'validPieces': [], 'layoutStatus': 'empty',
    }) as snapshot, patch('openrct2_mcp.coaster_state.generate_coaster_image') as render:
        result = tools.get_coaster_state(7, include_image=False, compact=True)

    assert result['success'] is True
    assert result['ride_type'] == 51
    assert result['piece_count'] == 0
    assert result['layout_status'] == 'empty'
    assert not {'pieces', 'height_map', 'track_elements'} & result.keys()
    snapshot.assert_called_once_with(7)
    render.assert_not_called()


def test_large_visualizations_are_bounded():
    from io import BytesIO
    from PIL import Image

    pieces = [
        {'x': x, 'y': y, 'z': 14, 'direction': 0, 'trackType': 0}
        for x, y in [(1, 1), (4095, 4095)]
    ]
    image = Image.open(BytesIO(generate_coaster_image(pieces, {}).data))
    elements = [{'x': p['x'], 'y': p['y'], 'z': p['z']} for p in pieces]

    assert max(image.size) <= 1600
    assert 'omitted' in generate_height_map(elements)


@pytest.mark.parametrize(('outcome', 'placed_count'), [('rejected', 0), ('unknown', 0), ('confirmed', 1)])
def test_sequence_distinguishes_rejection_transport_failure_and_post_placement_failure(outcome, placed_count, tools):
    from openrct2_mcp.api_client import APIError

    with patch.object(tools, '_get_ride_type', return_value=52), \
         patch.object(tools, '_place_track_segment', side_effect=APIError('Placement diagnostics failed', outcome=outcome)), \
         patch.object(tools, 'get_coaster_state', return_value=[{'success': True}, 'image']):
        result = tools.place_track_sequence(7, [TrackSegment(track_type='Flat')])

    assert result[0]['success'] is False
    assert result[0]['operation_outcome'] == outcome
    assert result[0]['placed_count'] == placed_count
    assert result[0]['failed_index'] == 0


def test_partial_entrance_placement_is_not_reported_as_complete(tools):
    with patch.object(tools.api, 'place_entrance_exit', return_value={
        'entrance': {'x': 10}, 'exit': None, 'warning': 'Could not place exit',
    }), patch.object(tools, 'get_coaster_state', return_value=[{'success': True}, 'image']):
        result = tools.place_entrance_exit(7)

    assert result[0]['success'] is False
    assert result[0]['operation_outcome'] == 'partial'
    assert result[0]['entrance_exit']['exit'] is None
    assert result[0]['error_message'] == 'Could not place exit'


def test_endpoint_view_returns_world_context_and_navigation_metadata(tools):

    snapshot = {'layoutStatus': 'complete', 'history': [
        {'x': 10, 'y': 10, 'z': 14, 'direction': 0, 'trackType': 2,
         'nextX': 9, 'nextY': 10, 'nextZ': 14, 'nextDirection': 0},
    ]}
    area = {'x': 9, 'y': 10, 'radius': 0, 'tiles': []}
    with patch.object(tools.api, 'get_coaster_state', return_value=snapshot) as state, \
         patch.object(tools.api, 'get_map_area', return_value=area) as map_area:
        summary, image = tools.get_coaster_view(7, radius=0)

    assert summary['success'] is True
    assert summary['view'] == 'endpoint'
    assert summary['current_endpoint'] == {'x': 9, 'y': 10, 'z': 14, 'direction': 0}
    assert summary['track_start'] == {'x': 10, 'y': 10, 'z': 14, 'direction': 0}
    assert summary['return_offset'] == {'x': 1, 'y': 0, 'z': 0}
    assert summary['map_area'] == area
    assert image.data.startswith(b'\x89PNG')
    state.assert_called_once_with(7)
    map_area.assert_called_once_with(9, 10, 0)


@pytest.mark.parametrize('compact', [False, True])
def test_elevation_view_uses_only_ride_snapshot(compact, tools):

    snapshot = {'layoutStatus': 'complete', 'history': [
        {'x': 10, 'y': 10, 'z': 14, 'direction': 0, 'trackType': 2,
         'nextX': 9, 'nextY': 10, 'nextZ': 14, 'nextDirection': 0},
        {'x': 9, 'y': 10, 'z': 14, 'direction': 0, 'trackType': 6,
         'nextX': 8, 'nextY': 10, 'nextZ': 15, 'nextDirection': 0},
    ]}
    with patch.object(tools.api, 'get_coaster_state', return_value=snapshot), \
         patch.object(tools.api, 'get_map_area') as map_area:
        summary, image = tools.get_coaster_view(7, view='elevation', compact=compact)

    assert summary['success'] is True
    assert summary['sample_count'] == 3
    assert summary['height_range'] == {'min': 14, 'max': 15}
    assert 'not distance' in summary['limitations']
    assert image.data.startswith(b'\x89PNG')
    map_area.assert_not_called()


@pytest.mark.parametrize('layout', ['empty', 'disconnected', 'ambiguous', 'truncated'])
def test_spatial_views_reject_unreliable_traversals(layout, tools):

    with patch.object(tools.api, 'get_coaster_state', return_value={'layoutStatus': layout, 'history': []}), \
         patch.object(tools.api, 'get_map_area') as map_area:
        result = tools.get_coaster_view(7)

    assert result['success'] is False
    assert 'connected layout' in result['error']
    map_area.assert_not_called()


def test_entrance_helper_retains_confirmed_progress_before_unknown_acknowledgement(tools):
    from openrct2_mcp.api_client import APIError

    details = {'confirmed_steps': 1, 'entrance_exit': {'entrance': {'x': 10}, 'exit': None}}
    with patch.object(tools.api, 'place_entrance_exit', side_effect=APIError('No result', outcome='unknown', details=details)), \
         patch.object(tools, 'get_coaster_state', return_value=[{'success': True, 'ride_id': 0}, 'image']):
        result = tools.place_entrance_exit(0)

    assert result[0]['success'] is False
    assert result[0]['operation_outcome'] == 'unknown'
    assert result[0]['execution_status'] == 'partial'
    assert result[0]['ride_id'] == 0
    assert result[0]['error_details'] == details


@pytest.mark.parametrize(('outcome', 'placed_count'), [('rejected', 1), ('unknown', 1), ('confirmed', 2)])
def test_sequence_reports_partial_progress_and_refreshes_state_after_failure(tools, outcome, placed_count):
    from openrct2_mcp.api_client import APIError

    snapshot = {'rideType': 52, 'history': [], 'validPieces': []}
    with patch.object(tools, '_get_ride_type', return_value=52), \
         patch.object(tools, '_place_track_segment', side_effect=[
             {'coasterState': snapshot}, APIError('Stopped', outcome=outcome),
         ]) as place, patch.object(tools.api, 'get_coaster_state', return_value=snapshot) as read:
        result = tools.place_track_sequence(0, [TrackSegment(track_type='Flat')] * 3, include_image=False)

    assert result['success'] is False
    assert result['operation_outcome'] == outcome
    assert result['execution_status'] == 'partial'
    assert result['state_status'] == 'available'
    assert result['placed_count'] == placed_count
    assert result['failed_index'] == 1
    assert place.call_count == 2
    read.assert_called_once_with(0)


def test_sequence_reuses_acknowledged_snapshots_without_skipping_native_endpoint_guards(tools):
    def piece(x):
        return {'x': x, 'y': 20, 'z': 14, 'direction': 0, 'trackType': 0,
                'nextX': x - 1, 'nextY': 20, 'nextZ': 14, 'nextDirection': 0}

    def snapshot(xs):
        return {'rideType': 52, 'layoutStatus': 'complete', 'validPieces': [0], 'pieceCount': len(xs),
                'position': {'x': xs[-1] - 1, 'y': 20, 'z': 14, 'direction': 0},
                'history': [piece(x) for x in xs]}

    before, first, final = snapshot([11]), snapshot([11, 10]), snapshot([11, 10, 9])
    with patch.object(tools, '_get_ride_type', return_value=52), \
         patch.object(tools.api, 'get_valid_next_pieces', return_value=before) as candidates, \
         patch.object(tools.api, 'place_track_piece', side_effect=[
             {'coasterState': first}, {'coasterState': final},
         ]) as place, patch.object(tools.api, 'get_coaster_state') as read:
        result = tools.place_track_sequence(0, [TrackSegment(track_type='Flat')] * 2,
                                            include_image=False, compact=True)

    assert result['success'] is True
    assert result['placed_count'] == 2 and result['piece_count'] == 3
    assert result['current_endpoint']['x'] == 8
    assert result['execution_status'] == 'completed'
    candidates.assert_called_once_with(0)
    read.assert_not_called()
    assert place.call_count == 2
    assert place.call_args_list[1].kwargs['expected_endpoint'] == first['position']
    assert place.call_args_list[1].kwargs['expected_piece_count'] == 2
    assert place.call_args_list[1].kwargs['include_state'] is True
    assert 'distance' not in final['position']
