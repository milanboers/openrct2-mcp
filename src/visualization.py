"""Read-only spatial views. These are observations, not clearance simulations."""

import io
import math
from typing import Any

from fastmcp.utilities.types import Image as MCPImage
from PIL import Image, ImageDraw

DIRECTIONS = ((-1, 0), (0, 1), (1, 0), (0, -1))
ENDPOINT_COLOR = (255, 220, 70)
START_COLOR = (90, 240, 150)


def png(image: Image.Image) -> MCPImage:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return MCPImage(data=buffer.getvalue(), format="png")


def draw_heading(
    draw: ImageDraw.ImageDraw, center: tuple[float, float], direction: int,
    color: tuple[int, int, int], length: float = 24,
) -> None:
    """Draw only supported cardinal headings, never mask a diagonal as cardinal."""
    if direction not in range(4):
        return
    dx, dy = DIRECTIONS[direction]
    x, y = center
    tip = (x + dx * length, y + dy * length)
    draw.line([center, tip], fill=color, width=3)
    draw.polygon([
        tip,
        (tip[0] - dx * 8 + dy * 5, tip[1] - dy * 8 - dx * 5),
        (tip[0] - dx * 8 - dy * 5, tip[1] - dy * 8 + dx * 5),
    ], fill=color)


def render_endpoint_view(
    area: dict[str, Any], ride_id: int, endpoint: dict[str, Any], start: dict[str, Any],
) -> MCPImage:
    """Draw a bounded neighbourhood, including observations at every height."""
    radius = area["radius"]
    min_x, min_y = area["x"] - radius, area["y"] - radius
    tile_size, margin, footer = 48, 40, 100
    extent = (2 * radius + 1) * tile_size
    image = Image.new("RGB", (max(480, extent + 2 * margin), extent + margin + footer), (28, 28, 32))
    draw = ImageDraw.Draw(image)

    def corner(x: int, y: int) -> tuple[int, int]:
        return margin + (x - min_x) * tile_size, margin + (y - min_y) * tile_size

    terrain_heights = [
        element["base_z"] for tile in area["tiles"] for element in tile["elements"]
        if element["type"] == "surface"
    ]
    low = min(terrain_heights, default=0)
    high = max(terrain_heights, default=0)
    for tile in area["tiles"]:
        x, y = corner(tile["x"], tile["y"])
        elements = [element for element in tile["elements"] if not element.get("is_ghost")]
        surface = next((element for element in elements if element["type"] == "surface"), None)
        if surface:
            shade = round(45 + 50 * (surface["base_z"] - low) / max(1, high - low))
            color = (shade, shade + 20, shade)
            if surface.get("water_height_raw", 0) > 0:
                color = (40, 75, 110)
            draw.rectangle([x, y, x + tile_size, y + tile_size], fill=color)
            suffix = "^" if surface.get("slope") else ""
            draw.text((x + 3, y + 3), f"{surface['base_z']:g}{suffix}", fill=(225, 225, 225))

        # Separate bands preserve overlapping categories rather than hiding
        # paths or other rides beneath the selected ride's footprint.
        categories = [
            ("path", (190, 165, 120), any(element["type"] == "footpath" for element in elements)),
            ("obj", (210, 140, 215), any(element["type"] not in ("surface", "footpath", "track") for element in elements)),
            ("other", (245, 140, 70), any(element["type"] == "track" and element.get("ride_id") != ride_id
                                       for element in elements)),
            ("ride", (100, 205, 240), any(element["type"] == "track" and element.get("ride_id") == ride_id
                                       for element in elements)),
        ]
        for index, (_, color, present) in enumerate(categories):
            if present:
                offset = 16 + index * 7
                draw.rectangle([x + 3, y + offset, x + tile_size - 3, y + offset + 4], fill=color)

    for index in range(2 * radius + 2):
        offset = margin + index * tile_size
        draw.line([(offset, margin), (offset, margin + extent)], fill=(100, 100, 100))
        draw.line([(margin, offset), (margin + extent, offset)], fill=(100, 100, 100))
        if index < 2 * radius + 1:
            draw.text((offset + 12, margin - 18), str(min_x + index), fill="white")
            draw.text((4, offset + 18), str(min_y + index), fill="white")

    for position, color, label in [(start, START_COLOR, "S"), (endpoint, ENDPOINT_COLOR, "C")]:
        if min_x <= position["x"] <= min_x + 2 * radius and min_y <= position["y"] <= min_y + 2 * radius:
            x, y = corner(position["x"], position["y"])
            center = (x + tile_size / 2, y + tile_size / 2)
            draw.ellipse([center[0] - 5, center[1] - 5, center[0] + 5, center[1] + 5], fill=color)
            draw_heading(draw, center, position["direction"], color, 19)
            same_tile = (start["x"], start["y"]) == (endpoint["x"], endpoint["y"])
            if not same_tile or label == "C":
                label = "S/C" if same_tile else label
                draw.text((x + tile_size - 6 * len(label) - 3, y + 2), label, fill=color)

    y = margin + extent + 10
    draw.text((margin, y), "C: endpoint heading   S: start / return heading", fill="white")
    draw.text((margin, y + 16), "Bands: path / object / other ride / selected ride", fill="white")
    draw.text((margin, y + 32), "Numbers: terrain base Z. ^: slope. Blue terrain: water.", fill="white")
    draw.text((margin, y + 48), "All heights shown in the data; this is not clearance.", fill="white")
    draw.text((margin, y + 64), "Unfilled tiles: no observations / outside map.", fill="white")
    return png(image)


def elevation_samples(history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Use next-connection heights after the first origin; drops have lower origins."""
    if not history:
        return []
    samples = [{"boundary": 0, "z": history[0]["z"]}]
    samples.extend({"boundary": index + 1, "z": piece["nextZ"]} for index, piece in enumerate(history))
    return samples


def render_elevation_view(samples: list[dict[str, Any]]) -> MCPImage:
    """Plot piece boundaries with equal spacing, not physical track length."""
    width, height = 1000, 360
    left, right, top, bottom = 65, 25, 35, 65
    image = Image.new("RGB", (width, height), (28, 28, 32))
    draw = ImageDraw.Draw(image)
    min_z = math.floor(min(sample["z"] for sample in samples)) - 1
    max_z = math.ceil(max(sample["z"] for sample in samples)) + 1
    count = len(samples) - 1

    def point(index: int, z: float) -> tuple[float, float]:
        return (left + index / max(1, count) * (width - left - right),
                height - bottom - (z - min_z) / (max_z - min_z) * (height - top - bottom))

    for tick in range(6):
        z = min_z + tick * (max_z - min_z) / 5
        _, y = point(0, z)
        draw.line([(left, y), (width - right, y)], fill=(70, 70, 70))
        draw.text((8, y - 5), f"{z:g}", fill="white")
    for index in sorted({round(tick * count / 5) for tick in range(6)}):
        x, _ = point(index, min_z)
        draw.text((x - 4, height - bottom + 10), str(index), fill="white")
    points = [point(sample["boundary"], sample["z"]) for sample in samples]
    if len(points) > 1:
        draw.line(points, fill=(100, 205, 240), width=3)
    for (x, y), color in [(points[0], START_COLOR), (points[-1], ENDPOINT_COLOR)]:
        draw.ellipse([x - 4, y - 4, x + 4, y + 4], fill=color)
    draw.text((left, 10), "Origin / connection height (Z units of 8 game coordinates)", fill="white")
    draw.text((left, height - 30), "Track-piece boundary index (not distance). Straight lines omit within-piece geometry.", fill="white")
    return png(image)
