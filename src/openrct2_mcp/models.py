"""Strict public construction inputs shared by MCP tools and live smoke tests."""

from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field

RideId = Annotated[int, Field(strict=True, ge=0, le=65534)]
RideType = Annotated[int, Field(strict=True, ge=0, le=255)]
ObjectIndex = Annotated[int, Field(strict=True, ge=0, le=65534)]
TileCoordinate = Annotated[int, Field(strict=True, ge=0, le=1000)]
TrackHeight = Annotated[int, Field(strict=True, ge=0, le=254)]
PathHeight = Annotated[int, Field(strict=True, ge=0, le=254, multiple_of=2)]
Direction = Annotated[int, Field(strict=True, ge=0, le=3)]
Byte = Annotated[int, Field(strict=True, ge=0, le=255)]


class Endpoint(BaseModel):
    """Connection coordinates in tiles and height units of 8 game coordinates."""

    model_config = ConfigDict(strict=True, allow_inf_nan=False)

    x: TileCoordinate
    y: TileCoordinate
    z: float
    direction: Direction


class RemovalTarget(Endpoint):
    model_config = ConfigDict(extra="forbid")

    track_type: int = Field(ge=0, le=65534)
    base_z_game: int = Field(ge=0, le=2040, multiple_of=8)
    piece_count: int = Field(ge=1)


class TrackSegment(BaseModel):
    """A single track piece and its placement options."""

    model_config = ConfigDict(extra="forbid", strict=True)

    track_type: str
    has_chain_lift: bool = False
    brake_speed: Byte = 0
    seat_rotation: Byte = 0


class PathTile(BaseModel):
    """One caller-chosen path tile. Slopes rise 2 height units toward slope_direction."""

    model_config = ConfigDict(extra="forbid", strict=True)

    x: TileCoordinate
    y: TileCoordinate
    z: PathHeight
    slope_direction: Optional[Direction] = None


class TrackElementSelection(BaseModel):
    """Exact physical element selector from get_ride_layout, not an endpoint."""

    model_config = ConfigDict(extra="forbid", strict=True)

    x: TileCoordinate
    y: TileCoordinate
    base_z_game: int = Field(ge=0, le=2040, multiple_of=8)
    direction: Direction
    track_type: int = Field(ge=0, le=65534)
    sequence: int = Field(ge=0, le=255)
