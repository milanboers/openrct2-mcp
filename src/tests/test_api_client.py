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
                "isFromTrackDesign": False
            })

    def test_track_query_uses_normal_construction_mode(self, api_client: OpenRCT2API) -> None:
        with patch.object(api_client, '_send_request', return_value={'placeable': False}) as send:
            result = api_client.place_track_piece(
                ride_id=1, tile_coordinate_x=10, tile_coordinate_y=11, tile_coordinate_z=14,
                direction=0, track_type=0, ride_type=52, query=True,
            )

        assert result == {'placeable': False}
        assert send.call_args.args[0] == 'queryTrackPiece'
        assert send.call_args.args[1]['isFromTrackDesign'] is False

    def test_api_error_on_failure(self, api_client: OpenRCT2API) -> None:
        """Test that APIError is raised on API failure."""
        with patch.object(api_client, '_send_request') as mock_send:
            mock_send.side_effect = APIError("Connection failed")

            with pytest.raises(APIError) as exc_info:
                api_client.list_all_rides()

            assert str(exc_info.value) == "Connection failed"


@pytest.mark.parametrize('response', [b'not json\n', b'null\n', b'{}\n', b'', None])
def test_broken_response_discards_connection_without_retry(response):
    import socket

    client = OpenRCT2API()
    local, peer = socket.socketpair()
    local.settimeout(0.02)
    client._sock = local
    client._file_obj = local.makefile('r')
    try:
        if response:
            peer.sendall(response)
        if response == b'':
            peer.shutdown(socket.SHUT_WR)
        with pytest.raises(APIError) as failure:
            client.delete_ride(7)

        assert failure.value.outcome == 'unknown'
        assert client._sock is None
        assert client._file_obj is None
        assert peer.recv(4096).count(b'"deleteRide"') == 1
    finally:
        client._close_connection()
        peer.close()


def test_game_rejection_preserves_connection_and_error():
    import socket

    client = OpenRCT2API()
    local, peer = socket.socketpair()
    client._sock = local
    client._file_obj = local.makefile('r')
    try:
        peer.sendall(b'{"success":false,"error":"Ride must be closed"}\n')
        with pytest.raises(APIError, match='Ride must be closed') as failure:
            client.delete_ride(7)

        assert failure.value.outcome == 'rejected'
        assert client._sock is local
    finally:
        client._close_connection()
        peer.close()
