"""Spatial view contracts, independent of a running game."""

from io import BytesIO

from PIL import Image, ImageDraw
import pytest

from openrct2_mcp.visualization import draw_heading, elevation_samples, render_elevation_view, render_endpoint_view


def test_endpoint_view_preserves_overlapping_observations_and_ignores_ghosts():
    area = {'x': 10, 'y': 10, 'radius': 1, 'tiles': [
        {'x': 10, 'y': 10, 'elements': [
            {'type': 'surface', 'base_z': 14, 'slope': 1, 'water_height_raw': 0},
            {'type': 'footpath', 'base_z': 20},
            {'type': 'small_scenery', 'base_z': 14},
            {'type': 'track', 'base_z': 18, 'ride_id': 2},
            {'type': 'track', 'base_z': 22, 'ride_id': 1},
        ]},
        {'x': 9, 'y': 9, 'elements': [
            {'type': 'surface', 'base_z': 14, 'slope': 0, 'water_height_raw': 10},
            {'type': 'track', 'ride_id': 2, 'base_z': 14, 'is_ghost': True},
        ]},
    ]}
    endpoint = {'x': 11, 'y': 11, 'z': 22, 'direction': 2}
    start = {'x': 20, 'y': 20, 'z': 14, 'direction': 0}

    image = Image.open(BytesIO(render_endpoint_view(area, 1, endpoint, start).data))

    assert image.size == (480, 284)
    assert image.getpixel((92, 105)) == (190, 165, 120)  # path band
    assert image.getpixel((92, 112)) == (210, 140, 215)  # object band
    assert image.getpixel((92, 119)) == (245, 140, 70)  # other ride band
    assert image.getpixel((92, 126)) == (100, 205, 240)  # selected ride band
    assert image.getpixel((44, 72)) == (40, 75, 110)  # water, no ghost band
    assert image.getpixel((179, 160)) == (255, 220, 70)  # east-facing cursor arrow


def test_elevation_uses_connection_heights_instead_of_down_piece_origins():
    history = [
        {'z': 20, 'nextZ': 20},
        {'z': 19, 'nextZ': 19},  # FlatToDown25 origin is below its entry.
        {'z': 17, 'nextZ': 17},  # Down25 also has a lowered origin.
    ]

    samples = elevation_samples(history)
    image = Image.open(BytesIO(render_elevation_view(samples).data))

    assert samples == [{'boundary': 0, 'z': 20}, {'boundary': 1, 'z': 20},
                       {'boundary': 2, 'z': 19}, {'boundary': 3, 'z': 17}]
    assert image.size == (1000, 360)
    assert elevation_samples([]) == []


@pytest.mark.parametrize(('direction', 'tip'), [(0, (30, 50)), (1, (50, 70)), (2, (70, 50)), (3, (50, 30))])
def test_heading_matches_game_cardinal_directions(direction, tip):
    image = Image.new('RGB', (100, 100), 'black')

    draw_heading(ImageDraw.Draw(image), (50, 50), direction, (255, 220, 70), 20)

    assert image.getpixel(tip) == (255, 220, 70)


def test_heading_does_not_treat_diagonal_as_cardinal():
    image = Image.new('RGB', (100, 100), 'black')

    draw_heading(ImageDraw.Draw(image), (50, 50), 4, (255, 220, 70), 20)

    assert image.getbbox() is None
