"""Unit tests for the MCP server tools (Stateless)."""

import pytest
from unittest.mock import patch, MagicMock
from typing import Any

from mcp_server import (
    create_ride,
    generate_coaster_image,
    generate_height_map,
    check_track_segment,
    get_map_area,
    place_track_segment,
    place_track_sequence,
    TrackSegment,
    undo_last_piece,
    get_coaster_state,
    place_entrance_exit,
    start_ride_test,
    get_ride_stats,
    delete_all_rides,
    delete_ride,
    get_plugin_info,
    set_ride_vehicles,
    get_track_catalog,
    list_all_rides,
    api_client
)


def test_height_map_uses_element_tiles_and_preserves_crossing_heights() -> None:
    elements = [{'x': 10, 'y': 11, 'z': 14}, {'x': 10, 'y': 11, 'z': 18},
                {'x': 12, 'y': 11, 'z': 15.5}]

    result = generate_height_map(elements)

    assert '10' in result and '12' in result
    assert '14/18' in result and '15.5' in result
    assert 'not collision clearance' in result
    assert generate_height_map(None) == 'Track occupancy unavailable: update the OpenRCT2 plugin.'


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

    def test_create_ride_success(self) -> None:
        """Test successful ride creation."""
        with patch.object(api_client, 'create_ride') as mock_create, \
             patch.object(api_client, 'place_track_piece') as mock_place, \
             patch.object(api_client, 'get_valid_next_pieces') as mock_valid, \
             patch.object(api_client, 'get_track_history') as mock_hist, \
             patch.object(api_client, 'list_all_rides') as mock_list:

            mock_create.return_value = {"rideId": 1}
            mock_place.return_value = {"success": True}
            mock_valid.return_value = {"validPieces": [0, 6]} # Flat, FlatToUp25
            mock_hist.return_value = {
                "history": [{"x": 67, "y": 66, "z": 14, "direction": 0, "trackType": 1, "nextX": 66, "nextY": 66, "nextZ": 14, "nextDirection": 0}]
            }
            mock_list.return_value = [{"id": 1, "type": 52}]

            result: Any = create_ride(name="Test Coaster")

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


    def test_create_ride_station_failure_returns_ride_id(self) -> None:
        from api_client import APIError

        with patch.object(api_client, 'create_ride', return_value={'rideId': 7}), \
             patch.object(api_client, 'place_track_piece', side_effect=APIError('Location occupied')):
            result = create_ride(name='Test Coaster')

        assert result['success'] is False
        assert result['ride_id'] == 7
        assert result['error'] == 'Location occupied'
        assert 'outcome may be unknown' in result['message']


class TestPlaceTrackSegment:
    """Tests for the place_track_segment tool."""

    def test_place_track_segment_success(self) -> None:
        """Test successful track segment placement."""
        # Use patch.object on api_client since we import it from mcp_server
        with patch.object(api_client, 'get_valid_next_pieces') as mock_valid_next, \
             patch.object(api_client, 'get_track_history') as mock_hist, \
             patch.object(api_client, 'place_track_piece') as mock_place, \
             patch.object(api_client, 'list_all_rides') as mock_list:

            # 1. Setup mocks
            mock_valid_next.return_value = {"validPieces": [0, 1], "position": {"x": 10, "y": 10, "z": 2, "direction": 0}}
            mock_hist.return_value = {
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
            result: Any = place_track_segment(
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


    @pytest.mark.parametrize('failure', ['complete', 'invalid', 'placement'])
    def test_place_track_segment_failure(self, failure: str) -> None:
        from api_client import APIError

        with patch.object(api_client, 'get_valid_next_pieces') as valid, \
             patch.object(api_client, 'place_track_piece') as place, \
             patch('mcp_server._get_ride_type', return_value=52), \
             patch('mcp_server.get_coaster_state', return_value=[{'success': True}, 'image']):
            valid.return_value = {
                'validPieces': [] if failure == 'invalid' else [0],
                'isCircuitComplete': failure == 'complete',
                'position': {'x': 10, 'y': 20, 'z': 14, 'direction': 0},
            }
            if failure == 'placement':
                place.side_effect = APIError('Location occupied')

            result = place_track_segment(1, 'Flat')

            summary = result[0] if isinstance(result, list) else result
            assert summary['success'] is False
            assert summary['error_message'] == {
                'complete': 'Circuit is already complete',
                'invalid': 'Invalid track type at this position: Flat',
                'placement': 'Location occupied',
            }[failure]
            assert place.call_count == (1 if failure == 'placement' else 0)


class TestPlaceTrackSequence:
    def test_sequence_success(self) -> None:
        with patch.object(api_client, 'get_valid_next_pieces') as valid, \
             patch.object(api_client, 'place_track_piece') as place, \
             patch('mcp_server._get_ride_type', return_value=52), \
             patch('mcp_server.get_coaster_state', return_value=[{'success': True}, 'image']) as final:
            valid.side_effect = [
                {'validPieces': [6], 'position': {'x': 10, 'y': 20, 'z': 14, 'direction': 0}},
                {'validPieces': [4], 'position': {'x': 9, 'y': 20, 'z': 15, 'direction': 0}},
            ]
            segments = [TrackSegment(track_type='FlatToUp25', has_chain_lift=True),
                        TrackSegment(track_type='Up25', has_chain_lift=True)]

            result = place_track_sequence(1, segments)

            assert result == [{'success': True, 'placed_count': 2}, 'image']
            assert place.call_count == 2
            assert place.call_args_list[1].kwargs['tile_coordinate_x'] == 9
            assert place.call_args_list[1].kwargs['has_chain_lift'] is True
            final.assert_called_once_with(1)

    @pytest.mark.parametrize('failure', ['invalid', 'placement', 'complete'])
    def test_sequence_stops_on_failure(self, failure: str) -> None:
        from api_client import APIError

        with patch.object(api_client, 'get_valid_next_pieces') as valid, \
             patch.object(api_client, 'place_track_piece') as place, \
             patch('mcp_server._get_ride_type', return_value=52), \
             patch('mcp_server.get_coaster_state', return_value=[{'success': True}, 'image']) as final:
            first = {'validPieces': [0], 'position': {'x': 10, 'y': 20, 'z': 14, 'direction': 0}}
            second = {'validPieces': [0] if failure == 'placement' else [],
                      'position': {'x': 9, 'y': 20, 'z': 14, 'direction': 0},
                      'isCircuitComplete': failure == 'complete'}
            valid.side_effect = [first, second]
            if failure == 'placement':
                place.side_effect = [None, APIError('Location occupied')]
            segments = [TrackSegment(track_type='Flat')] * 3

            result = place_track_sequence(1, segments)

            assert result[0]['success'] is False
            assert result[0]['placed_count'] == 1
            assert result[0]['failed_index'] == 1
            assert result[0]['error_message'] == {
                'invalid': 'Invalid track type at this position: Flat',
                'placement': 'Location occupied',
                'complete': 'Circuit is already complete',
            }[failure]
            assert place.call_count == (2 if failure == 'placement' else 1)
            final.assert_called_once_with(1)


class TestUndoLastPiece:
    """Tests for the undo_last_piece tool."""

    def test_undo_last_piece_success(self) -> None:
        """Test successful undo."""
        with patch.object(api_client, 'delete_last_track_piece') as mock_delete, \
             patch.object(api_client, 'get_valid_next_pieces') as mock_valid, \
             patch.object(api_client, 'get_track_history') as mock_hist, \
             patch.object(api_client, 'list_all_rides') as mock_list:

            mock_delete.return_value = {"success": True}
            mock_valid.return_value = {"validPieces": [0], "isCircuitComplete": False}
            mock_hist.return_value = {
                "history": [{"x": 67, "y": 66, "z": 14, "direction": 0, "trackType": 2, "nextX": 66, "nextY": 66, "nextZ": 14, "nextDirection": 0}]
            }
            mock_list.return_value = [{"id": 1, "type": 52}]

            result: Any = undo_last_piece(ride_id=1)

            assert isinstance(result, list)
            assert result[0]["success"] is True
            assert len(result[0]["pieces"]) == 1
            assert "height_map" in result[0]
            mock_delete.assert_called_once_with(1)


class TestCoasterTools:
    """Tests for remaining coaster tools."""

    def test_place_entrance_exit(self) -> None:
        with patch.object(api_client, 'place_entrance_exit') as mock_place, \
             patch.object(api_client, 'get_track_history') as mock_hist, \
             patch.object(api_client, 'get_valid_next_pieces') as mock_valid, \
             patch.object(api_client, 'list_all_rides') as mock_list:
            
            mock_place.return_value = {"entrance": {"x": 1}, "exit": {"x": 2}}
            mock_hist.return_value = {"history": []}
            mock_valid.return_value = {"validPieces": []}
            mock_list.return_value = [{"id": 1, "type": 52}]

            result: Any = place_entrance_exit(ride_id=1)
            assert isinstance(result, list)
            assert result[0]["success"] is True
            assert "entrance_exit" in result[0]
            assert "height_map" in result[0]

    def test_start_ride_test(self) -> None:
        with patch.object(api_client, 'start_ride_test') as mock_test:
            mock_test.return_value = "Testing started"
            result: dict[str, Any] = start_ride_test(ride_id=1)
            assert result["success"] is True
            assert result["message"] == "Testing started"

    def test_get_ride_stats(self) -> None:
        with patch.object(api_client, 'get_ride_stats') as mock_stats:
            mock_stats.return_value = {"excitement": 5.0}
            result: dict[str, Any] = get_ride_stats(ride_id=1)
            assert result["excitement"] == 5.0

    def test_check_track_segment_queries_without_placing(self) -> None:
        with patch.object(api_client, 'get_valid_next_pieces', return_value={
            'validPieces': [6], 'position': {'x': 10, 'y': 20, 'z': 14, 'direction': 0},
        }), patch.object(api_client, 'place_track_piece', return_value={'placeable': False, 'error_message': 'Blocked'}) as place, \
             patch('mcp_server._get_ride_type', return_value=52):
            result = check_track_segment(1, 'FlatToUp25', has_chain_lift=True)

            assert result == {'placeable': False, 'error_message': 'Blocked'}
            assert place.call_args.kwargs['query'] is True
            assert place.call_args.kwargs['has_chain_lift'] is True

    def test_get_map_area(self) -> None:
        with patch.object(api_client, 'get_map_area', return_value={'tiles': []}) as area:
            assert get_map_area(10, 20, 2) == {'tiles': []}
            area.assert_called_once_with(10, 20, 2)

    def test_get_track_catalog_identifies_supported_types(self) -> None:
        with patch.object(api_client, 'get_track_catalog', return_value=[
            {'type': 0, 'description': 'Straight'}, {'type': 999, 'description': 'Other'},
        ]):
            assert get_track_catalog() == [
                {'type': 0, 'description': 'Straight', 'supported_name': 'Flat'},
                {'type': 999, 'description': 'Other', 'supported_name': None},
            ]

    def test_set_ride_vehicles(self) -> None:
        with patch.object(api_client, 'set_ride_vehicles', return_value={
            'ride_id': 1, 'setting': 'trains', 'value': 2,
        }) as set_vehicles:
            assert set_ride_vehicles(1, 'trains', 2) == {
                'success': True, 'ride_id': 1, 'setting': 'trains', 'value': 2,
            }
            set_vehicles.assert_called_once_with(1, 'trains', 2)

    def test_delete_ride(self) -> None:
        with patch.object(api_client, 'delete_ride', return_value={'rideId': 1}) as delete:
            assert delete_ride(1) == {'success': True, 'ride_id': 1}
            delete.assert_called_once_with(1)

    def test_get_plugin_info(self) -> None:
        with patch.object(api_client, 'get_plugin_info', return_value={'version': '0.5.0'}):
            assert get_plugin_info() == {'version': '0.5.0', 'expected_version': '0.5.0', 'matches': True}

    def test_list_rides_failure_is_not_empty_list(self) -> None:
        from api_client import APIError

        with patch.object(api_client, 'list_all_rides', side_effect=APIError('Disconnected')):
            assert list_all_rides() == {'success': False, 'error': 'Disconnected'}

    def test_delete_all_rides(self) -> None:
        with patch.object(api_client, 'delete_all_rides') as mock_del:
            mock_del.return_value = "All rides deleted"
            result: dict[str, Any] = delete_all_rides()
            assert result["success"] is True
            assert result["message"] == "All rides deleted"

    def test_list_all_rides(self) -> None:
        with patch.object(api_client, 'list_all_rides') as mock_list:
            mock_list.return_value = [{"id": 1, "name": "Coaster", "type": 52}]
            result: list[dict[str, Any]] = list_all_rides()
            assert len(result) == 1
            # id/type are preserved (they're used as tool inputs) and the
            # human-readable name is added.
            assert result[0]["id"] == 1
            assert result[0]["type"] == 52
            assert result[0]["ride_type_name"] == "Wooden Roller Coaster"

    def test_circuit_complete_reported_from_plugin(self) -> None:
        """The plugin's isCircuitComplete flag must flow through to the state."""
        with patch.object(api_client, 'get_valid_next_pieces') as mock_valid, \
             patch.object(api_client, 'get_track_history') as mock_hist, \
             patch.object(api_client, 'list_all_rides') as mock_list:

            mock_valid.return_value = {"validPieces": [0], "isCircuitComplete": True}
            mock_hist.return_value = {
                "history": [{"x": 67, "y": 66, "z": 14, "direction": 0, "trackType": 2, "nextX": 61, "nextY": 66, "nextZ": 14, "nextDirection": 0}]
            }
            mock_list.return_value = [{"id": 1, "type": 52}]

            result: Any = get_coaster_state(ride_id=1)
            assert isinstance(result, list)
            assert result[0]["is_circuit_complete"] is True
