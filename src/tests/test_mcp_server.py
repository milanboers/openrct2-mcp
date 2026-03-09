"""Unit tests for the MCP server tools (Stateless)."""

import pytest
from unittest.mock import patch, MagicMock
from typing import Any

from mcp_server import (
    create_ride,
    place_track_segment,
    undo_last_piece,
    get_coaster_state,
    place_entrance_exit,
    start_ride_test,
    get_ride_stats,
    delete_all_rides,
    list_all_rides,
    api_client
)


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
                "history": [{"x": 67, "y": 66, "z": 14, "direction": 0, "trackType": 2, "nextX": 66, "nextY": 66, "nextZ": 14, "nextDirection": 0}]
            }
            mock_list.return_value = [{"id": 1, "type": 52}]

            result: Any = create_ride(name="Test Coaster")

            assert isinstance(result, list)
            assert result[0]["success"] is True
            assert result[0]["ride_id"] == 1
            assert result[0]["ride_type"] == 52
            assert len(result[0]["pieces"]) == 1
            assert result[0]["pieces"][0]["trackType"] == "BeginStation"
            assert "Flat" in result[0]["valid_pieces"]
            assert "FlatToUp25" in result[0]["valid_pieces"]
            assert "height_map" in result[0]
            mock_create.assert_called_once()
            mock_place.assert_called_once()


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
            mock_hist.side_effect = [
                {"history": []},
                {"history": [{"x": 10, "y": 10, "z": 2, "direction": 0, "trackType": 0, "nextX": 11, "nextY": 10, "nextZ": 2, "nextDirection": 0}]}
            ]
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


class TestUndoLastPiece:
    """Tests for the undo_last_piece tool."""

    def test_undo_last_piece_success(self) -> None:
        """Test successful undo."""
        with patch.object(api_client, 'delete_last_track_piece') as mock_delete, \
             patch.object(api_client, 'get_valid_next_pieces') as mock_valid, \
             patch.object(api_client, 'list_all_rides') as mock_list:

            mock_delete.return_value = {
                "success": True,
                "nextEndpoint": {"x": 10, "y": 10, "z": 2, "direction": 0},
                "history": []
            }
            mock_valid.return_value = {"validPieces": [0]}
            mock_list.return_value = [{"id": 1, "type": 52}]

            result: Any = undo_last_piece(ride_id=1)

            assert isinstance(result, list)
            assert result[0]["success"] is True
            assert len(result[0]["pieces"]) == 0
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

    def test_delete_all_rides(self) -> None:
        with patch.object(api_client, 'delete_all_rides') as mock_del:
            mock_del.return_value = "All rides deleted"
            result: dict[str, Any] = delete_all_rides()
            assert result["success"] is True
            assert result["message"] == "All rides deleted"

    def test_list_all_rides(self) -> None:
        with patch.object(api_client, 'list_all_rides') as mock_list:
            mock_list.return_value = [{"id": 1}]
            result: list[dict[str, Any]] = list_all_rides()
            assert len(result) == 1
