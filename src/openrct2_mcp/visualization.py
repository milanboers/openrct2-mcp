"""Read-only spatial views. These are observations, not clearance simulations."""

import io
import math
from typing import Any, Optional

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


def generate_coaster_image(
    history: list[dict[str, Any]], next_endpoint: dict[str, Any],
    track_elements: Optional[list[dict[str, Any]]] = None,
) -> MCPImage:
    """
    Generate a visual top-down representation of the coaster as an MCP ImageContent.
    """
    if not history:
        # Return a simple empty image
        img = Image.new("RGB", (100, 100), color=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return MCPImage(data=buf.getvalue(), format="png")

    points = []
    for p in history:
        points.append((p["x"], p["y"], p["z"], "P"))
    if next_endpoint and "x" in next_endpoint:
        points.append((next_endpoint["x"], next_endpoint["y"], next_endpoint["z"], "C"))

    bounds = points + [(e["x"], e["y"], e["z"], "T") for e in track_elements or []]
    min_x = min(p[0] for p in bounds)
    max_x = max(p[0] for p in bounds)
    min_y = min(p[1] for p in bounds)
    max_y = max(p[1] for p in bounds)

    padding = 2
    min_x -= padding
    max_x += padding
    min_y -= padding
    max_y += padding

    tile_size = min(40, 1600 / max(max_x - min_x + 1, max_y - min_y + 1))
    width = max(1, round((max_x - min_x + 1) * tile_size))
    height = max(1, round((max_y - min_y + 1) * tile_size))

    img_main = Image.new("RGB", (width, height), color=(40, 40, 40))
    draw = ImageDraw.Draw(img_main)

    # Function to convert tile coords to pixel coords in image (center of tile)
    def to_img_center(tx: int, ty: int) -> tuple[float, float]:
        return (
            (tx - min_x) * tile_size + tile_size // 2,
            (ty - min_y) * tile_size + tile_size // 2,
        )

    def to_img_topleft(tx: int, ty: int) -> tuple[float, float]:
        return (tx - min_x) * tile_size, (ty - min_y) * tile_size

    # Draw grid
    for x in range(min_x, max_x + 1):
        ix, _ = to_img_topleft(x, 0)
        draw.line([(ix, 0), (ix, height)], fill=(60, 60, 60))
    for y in range(min_y, max_y + 1):
        _, iy = to_img_topleft(0, y)
        draw.line([(0, iy), (width, iy)], fill=(60, 60, 60))

    # Actual track-element tiles are a footprint, not collision clearance.
    for element in track_elements or []:
        ix, iy = to_img_topleft(element["x"], element["y"])
        inset = min(2, tile_size / 4)
        draw.rectangle([ix + inset, iy + inset, ix + tile_size - inset, iy + tile_size - inset], fill=(70, 70, 90))

    # Determine height range for color scaling
    min_z_val = min(p[2] for p in points)
    max_z_val = max(p[2] for p in points)
    z_range = max(1, max_z_val - min_z_val)

    def get_color(z: int) -> tuple[int, int, int]:
        z_norm = (z - min_z_val) / z_range
        return (
            int(255 * z_norm),
            int(255 * (1 - z_norm)),
            int(255 * (1 - abs(0.5 - z_norm) * 2)),
        )

    # 1. Draw connecting lines first (the track itself)
    for i in range(len(points) - 1):
        p1 = points[i]
        p2 = points[i + 1]
        c1 = to_img_center(p1[0], p1[1])
        c2 = to_img_center(p2[0], p2[1])

        # Curved pieces need more than a straight line between tile origins.
        # Approximate their centreline using the entry and exit directions;
        # this is not an exact track footprint.
        piece = history[i] if i < len(history) else {}
        turn_types = {16, 17, 22, 23, 42, 43, 44, 45}
        line = [c1, c2]
        if piece.get("trackType") in turn_types and "nextDirection" in piece:
            directions = [(-1, 0), (0, 1), (1, 0), (0, -1)]
            start_direction = directions[piece["direction"] % 4]
            end_direction = directions[piece["nextDirection"] % 4]
            distance = max(abs(c2[0] - c1[0]), abs(c2[1] - c1[1])) * 0.55
            control1 = (c1[0] + start_direction[0] * distance, c1[1] + start_direction[1] * distance)
            control2 = (c2[0] - end_direction[0] * distance, c2[1] - end_direction[1] * distance)
            line = []
            for step in range(21):
                t = step / 20
                u = 1 - t
                line.append(tuple(round(u**3 * c1[j] + 3 * u**2 * t * control1[j]
                                        + 3 * u * t**2 * control2[j] + t**3 * c2[j]) for j in (0, 1)))
        draw.line(line, fill=get_color(p1[2]), width=12)
        draw.line(line, fill=(200, 200, 200), width=2)

    # 2. Draw nodes (boxes) on top
    for i, (px, py, pz, ptype) in enumerate(points):
        ix, iy = to_img_topleft(px, py)
        color = get_color(pz)

        # Border color
        outline = (255, 255, 255) if ptype == "C" else (150, 150, 150)
        if i == 0:
            outline = (0, 255, 0)  # Green for start

        # Draw a small box for the node
        box_size = min(10, tile_size / 4)
        cx, cy = to_img_center(px, py)
        draw.rectangle(
            [cx - box_size, cy - box_size, cx + box_size, cy + box_size],
            fill=color,
            outline=outline,
            width=2,
        )

        # Label with height (offset so it doesn't overlap the line)
        label = f"{pz}"
        if i == 0:
            label = f"S:{pz}"
        elif ptype == "C":
            label = f"C:{pz}"

        if tile_size >= 16:
            draw.text((ix + 2, iy + 2), label, fill=(255, 255, 255))

    draw_heading(draw, to_img_center(history[0]["x"], history[0]["y"]),
                 history[0]["direction"], (90, 240, 150), min(24, tile_size * 0.6))
    if next_endpoint and "direction" in next_endpoint:
        draw_heading(draw, to_img_center(next_endpoint["x"], next_endpoint["y"]),
                     next_endpoint["direction"], (255, 220, 70), min(24, tile_size * 0.6))

    buf_final = io.BytesIO()
    img_main.save(buf_final, format="PNG")
    return MCPImage(data=buf_final.getvalue(), format="png")


def generate_height_map(track_elements: Optional[list[dict[str, Any]]]) -> str:
    """Show actual track-element base heights, not collision clearance."""
    if track_elements is None:
        return "Track occupancy unavailable: update the OpenRCT2 plugin."
    if not track_elements:
        return "No track elements."

    grid: dict[tuple[int, int], set[float]] = {}
    for element in track_elements:
        grid.setdefault((element["x"], element["y"]), set()).add(element["z"])
    min_x = min(x for x, _ in grid)
    max_x = max(x for x, _ in grid)
    min_y = min(y for _, y in grid)
    max_y = max(y for _, y in grid)
    if (max_x - min_x + 1) * (max_y - min_y + 1) > 4096:
        return "Track occupancy grid omitted (over 4096 tiles). Use track_elements or get_map_area."
    labels = {key: "/".join(f"{z:g}" for z in sorted(heights)) for key, heights in grid.items()}
    width = max(4, max(len(label) for label in labels.values()) + 1, len(str(min_x)) + 1, len(str(max_x)) + 1)
    lines = ["Track-element base heights (not collision clearance):"]
    lines.append(" " * 5 + "".join(f"{x:>{width}}" for x in range(min_x, max_x + 1)))
    lines.append(" " * 5 + "-" * (width * (max_x - min_x + 1)))
    for y in range(min_y, max_y + 1):
        row = [f"{y:3} |"]
        row.extend(f"{labels.get((x, y), '.'):>{width}}" for x in range(min_x, max_x + 1))
        lines.append("".join(row))
    return "\n".join(lines)
