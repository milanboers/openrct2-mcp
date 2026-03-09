"""TCP client for communicating with OpenRCT2 Ride Creation API using persistent connections."""

import socket
import json
import logging
import io
from typing import Any, Optional

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Exception raised when API request fails."""

    pass


class OpenRCT2API:
    """Persistent TCP client for OpenRCT2 Ride Creation API."""

    DEFAULT_HOST = "localhost"
    DEFAULT_PORT = 8080

    def __init__(self, host: str = DEFAULT_HOST, port: int = DEFAULT_PORT):
        self.host = host
        self.port = port
        self._sock: Optional[socket.socket] = None
        self._file_obj: Optional[io.TextIOWrapper] = None

    def _get_connection(self, timeout: float = 5.0) -> socket.socket:
        """Establish or return existing connection."""
        if self._sock:
            try:
                # Check if socket is still alive
                self._sock.send(b"")
                return self._sock
            except socket.error:
                self._close_connection()

        try:
            self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self._sock.settimeout(timeout)
            self._sock.connect((self.host, self.port))
            # makefile returns a file-like object for the socket
            self._file_obj = self._sock.makefile("r")  # type: ignore
            return self._sock
        except socket.error as e:
            self._close_connection()
            raise APIError(f"Failed to connect to OpenRCT2 API: {e}")

    def _close_connection(self) -> None:
        """Cleanly close the socket."""
        if self._file_obj:
            try:
                self._file_obj.close()
            except Exception:
                pass
        if self._sock:
            try:
                self._sock.close()
            except Exception:
                pass
        self._sock = None
        self._file_obj = None

    def _send_request(
        self,
        endpoint: str,
        params: Optional[dict[str, Any]] = None,
        timeout: float = 5.0,
    ) -> Any:
        """Send a JSON request and wait for response."""
        message = json.dumps({"endpoint": endpoint, "params": params or {}}) + "\n"

        try:
            sock = self._get_connection(timeout)
            sock.sendall(message.encode("utf-8"))

            if self._file_obj is None:
                raise APIError("Connection not established")

            response_line = self._file_obj.readline()
            if not response_line:
                self._close_connection()
                raise APIError("Empty response (connection closed by server)")

            result = json.loads(response_line)
            if not result.get("success", False):
                raise APIError(result.get("error", "Unknown API error"))

            payload = result.get("payload", {})
            return payload

        except (socket.timeout, socket.error) as e:
            self._close_connection()
            raise APIError(f"API communication error: {e}")
        except json.JSONDecodeError as e:
            raise APIError(f"Failed to decode API response: {e}")

    def create_ride(
        self,
        ride_type: Optional[int] = None,
        ride_object: Optional[int] = None,
        entrance_object: Optional[int] = None,
        colour1: int = 0,
        colour2: int = 0,
        inspection_interval: Optional[int] = None,
        name: Optional[str] = None,
    ) -> dict[str, Any]:
        """Create a new ride. Parameters are optional to allow for API-side discovery."""
        params: dict[str, Any] = {
            "colour1": colour1,
            "colour2": colour2,
        }
        if ride_type is not None:
            params["rideType"] = ride_type
        if ride_object is not None:
            params["rideObject"] = ride_object
        if entrance_object is not None:
            params["entranceObject"] = entrance_object
        if inspection_interval is not None:
            params["inspectionInterval"] = inspection_interval
        if name is not None:
            params["name"] = name

        result = self._send_request("createRide", params)
        if not isinstance(result, dict):
            raise APIError("Unexpected response format from createRide")
        return result

    def place_track_piece(
        self,
        ride_id: int,
        tile_coordinate_x: int,
        tile_coordinate_y: int,
        tile_coordinate_z: int,
        direction: int,
        track_type: int,
        ride_type: int,
        colour: int = 0,
        brake_speed: int = 0,
        seat_rotation: int = 0,
        track_place_flags: int = 0,
        is_from_track_design: bool = True,
        has_chain_lift: Optional[bool] = None,
    ) -> dict[str, Any]:
        """Place a track piece."""
        params = {
            "ride": ride_id,
            "tileCoordinateX": tile_coordinate_x,
            "tileCoordinateY": tile_coordinate_y,
            "tileCoordinateZ": tile_coordinate_z,
            "direction": direction,
            "trackType": track_type,
            "rideType": ride_type,
            "colour": colour,
            "brakeSpeed": brake_speed,
            "seatRotation": seat_rotation,
            "trackPlaceFlags": track_place_flags,
            "isFromTrackDesign": is_from_track_design,
        }
        if has_chain_lift is not None:
            params["hasChainLift"] = has_chain_lift

        result = self._send_request("placeTrackPiece", params)
        if not isinstance(result, dict):
            raise APIError("Unexpected response format from placeTrackPiece")
        return result

    def get_valid_next_pieces(self, ride_id: int) -> dict[str, Any]:
        """Get valid next track pieces."""
        result = self._send_request("getValidNextPieces", {"rideId": ride_id})
        if not isinstance(result, dict):
            raise APIError("Unexpected response format from getValidNextPieces")
        return result

    def get_track_history(self, ride_id: int) -> dict[str, Any]:
        """Get the full track history."""
        result = self._send_request("getTrackHistory", {"rideId": ride_id})
        if not isinstance(result, dict):
            raise APIError("Unexpected response format from getTrackHistory")
        return result

    def list_all_rides(self) -> list[dict[str, Any]]:
        """List all rides."""
        result = self._send_request("listAllRides")
        if not isinstance(result, list):
            raise APIError("Unexpected response format from listAllRides")
        # Ensure elements are dicts
        return [item for item in result if isinstance(item, dict)]

    def delete_last_track_piece(self, ride_id: int) -> dict[str, Any]:
        """Delete the last placed track piece."""
        result = self._send_request("deleteLastTrackPiece", {"rideId": ride_id})
        if not isinstance(result, dict):
            raise APIError("Unexpected response format from deleteLastTrackPiece")
        return result

    def place_entrance_exit(self, ride_id: int) -> dict[str, Any]:
        """Place entrance and exit for a ride's station."""
        result = self._send_request("placeEntranceExit", {"rideId": ride_id})
        if not isinstance(result, dict):
            raise APIError("Unexpected response format from placeEntranceExit")
        return result

    def start_ride_test(self, ride_id: int) -> Any:
        """Start the ride in test mode."""
        return self._send_request("startRideTest", {"rideId": ride_id})

    def get_ride_stats(self, ride_id: int) -> dict[str, Any]:
        """Get ride statistics."""
        result = self._send_request("getRideStats", {"rideId": ride_id})
        if not isinstance(result, dict):
            raise APIError("Unexpected response format from getRideStats")
        return result

    def delete_all_rides(self) -> Any:
        """Delete all rides."""
        return self._send_request("deleteAllRides")
