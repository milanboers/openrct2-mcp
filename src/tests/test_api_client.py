"""Unit tests for the API client."""

import pytest
from unittest.mock import patch, MagicMock
from typing import Any, Generator

from api_client import OpenRCT2API, APIError


class TestOpenRCT2API:
    """Tests for the OpenRCT2API class."""

    @pytest.fixture
    def api_client(self) -> OpenRCT2API:
        """Create an API client instance."""
        return OpenRCT2API(host="localhost", port=8080)

    def test_create_ride_minimal(self, api_client: OpenRCT2API) -> None:
        """Test creating a ride with minimal params."""
        with patch.object(api_client, '_send_request') as mock_send:
            mock_send.return_value = {"rideId": 1}

            result: dict[str, Any] = api_client.create_ride()

            assert result == {"rideId": 1}
            # Should only send colours as they have defaults
            mock_send.assert_called_once_with("createRide", {
                "colour1": 0,
                "colour2": 0
            })

    def test_create_ride_full(self, api_client: OpenRCT2API) -> None:
        """Test creating a ride with full params."""
        with patch.object(api_client, '_send_request') as mock_send:
            mock_send.return_value = {"rideId": 1}

            result: dict[str, Any] = api_client.create_ride(
                ride_type=52,
                name="My Coaster",
                ride_object=15,
                entrance_object=0
            )

            assert result == {"rideId": 1}
            mock_send.assert_called_once_with("createRide", {
                "rideType": 52,
                "name": "My Coaster",
                "rideObject": 15,
                "entranceObject": 0,
                "colour1": 0,
                "colour2": 0
            })

    def test_place_track_piece(self, api_client: OpenRCT2API) -> None:
        """Test placing a track piece."""
        with patch.object(api_client, '_send_request') as mock_send:
            mock_send.return_value = {
                "success": True,
                "nextEndpoint": {"x": 10, "y": 10, "z": 2, "direction": 0}
            }

            result: dict[str, Any] = api_client.place_track_piece(
                ride_id=1,
                tile_coordinate_x=10,
                tile_coordinate_y=10,
                tile_coordinate_z=2,
                direction=0,
                track_type=0,
                ride_type=52
            )

            assert result["success"] is True
            mock_send.assert_called_once_with("placeTrackPiece", {
                "ride": 1,
                "tileCoordinateX": 10,
                "tileCoordinateY": 10,
                "tileCoordinateZ": 2,
                "direction": 0,
                "trackType": 0,
                "rideType": 52,
                "colour": 0,
                "brakeSpeed": 0,
                "seatRotation": 0,
                "trackPlaceFlags": 0,
                "isFromTrackDesign": True
            })

    def test_api_error_on_failure(self, api_client: OpenRCT2API) -> None:
        """Test that APIError is raised on API failure."""
        with patch.object(api_client, '_send_request') as mock_send:
            mock_send.side_effect = APIError("Connection failed")

            with pytest.raises(APIError) as exc_info:
                api_client.list_all_rides()

            assert str(exc_info.value) == "Connection failed"
