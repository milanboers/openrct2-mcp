"""Public construction inputs shared by MCP tools and live smoke tests."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

class Endpoint(BaseModel):
    """Connection coordinates in tiles and height units of 8 game coordinates."""

    x: int
    y: int
    z: float
    direction: Literal[0, 1, 2, 3]


class RemovalTarget(Endpoint):
    model_config = ConfigDict(extra="forbid")

    track_type: int
    base_z_game: int
    piece_count: int = Field(ge=1)


class TrackSegment(BaseModel):
    """A single track piece and its placement options."""

    model_config = ConfigDict(extra="forbid")

    track_type: str
    has_chain_lift: bool = False
    brake_speed: int = Field(default=0, ge=0, le=255)
    seat_rotation: int = Field(default=0, ge=0, le=255)


class PathTile(BaseModel):
    """One caller-chosen flat path tile, in tiles and height units of 8."""

    model_config = ConfigDict(extra="forbid")

    x: int = Field(ge=0)
    y: int = Field(ge=0)
    z: int = Field(ge=0, le=254, multiple_of=2)
