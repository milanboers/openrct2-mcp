"""Compose the OpenRCT2 MCP server and its CLI lifecycle."""

import argparse
from contextlib import ExitStack, asynccontextmanager
import os
import logging
from pathlib import Path

from fastmcp import FastMCP

from .api_client import OpenRCT2API
from ._action_tools import register_action_tools
from .coaster_tools import register_coaster_tools
from .construction_tools import register_construction_tools
from .coaster_state import format_coaster_state
from .models import TrackSegment
from .visualization import generate_coaster_image, generate_height_map
from .finance_tools import register_finance_tools
from .metrics import ResultMiddleware
from .park_tools import register_park_tools


def _new_server(api: OpenRCT2API, middleware: ResultMiddleware) -> FastMCP:
    @asynccontextmanager
    async def lifespan(server):
        try:
            yield {}
        finally:
            api.close()

    # FastMCP's default strict=False overrides even explicit Field/model strictness.
    server = FastMCP("Roller Coaster Creator", lifespan=lifespan, strict_input_validation=True)
    server.add_middleware(middleware)
    return server


def _register_tools(server: FastMCP, api: OpenRCT2API):
    coaster = register_coaster_tools(server, api)
    register_park_tools(server, lambda: api, coaster.get_ride_test_report)
    register_finance_tools(server, lambda: api)
    register_construction_tools(server, api)
    actions = register_action_tools(server, lambda: api)
    return coaster, actions


def create_server(api: OpenRCT2API | None = None, middleware: ResultMiddleware | None = None) -> FastMCP:
    """Create an independent server; its lifespan closes the supplied or owned client."""
    api = api if api is not None else OpenRCT2API()
    middleware = middleware if middleware is not None else ResultMiddleware()
    server = _new_server(api, middleware)
    _register_tools(server, api)
    return server


# Keep existing Python entry points while new integrations use create_server.
api_client = OpenRCT2API()
result_middleware = ResultMiddleware()
mcp = _new_server(api_client, result_middleware)
coaster_tools, _registered_actions = _register_tools(mcp, api_client)
create_ride = coaster_tools.create_ride
check_track_segment = coaster_tools.check_track_segment
check_track_candidates = coaster_tools.check_track_candidates
get_map_area = coaster_tools.get_map_area
get_coaster_view = coaster_tools.get_coaster_view
place_track_segment = coaster_tools.place_track_segment
place_track_sequence = coaster_tools.place_track_sequence
undo_last_piece = coaster_tools.undo_last_piece
preview_track_removal = coaster_tools.preview_track_removal
remove_terminal_piece = coaster_tools.remove_terminal_piece
get_coaster_state = coaster_tools.get_coaster_state
place_entrance_exit = coaster_tools.place_entrance_exit
reset_ride = coaster_tools.reset_ride
get_ride_stats = coaster_tools.get_ride_stats
get_ride_test_report = coaster_tools.get_ride_test_report
get_track_catalog = coaster_tools.get_track_catalog
get_loaded_ride_objects = coaster_tools.get_loaded_ride_objects
get_park_status = coaster_tools.get_park_status
get_ride_station_access = coaster_tools.get_ride_station_access
get_plugin_info = coaster_tools.get_plugin_info
delete_all_rides = coaster_tools.delete_all_rides
list_all_rides = coaster_tools.list_all_rides
close_ride = _registered_actions['close_ride']
start_ride_test = _registered_actions['start_ride_test']
delete_ride = _registered_actions['delete_ride']
set_ride_vehicles = _registered_actions['set_ride_vehicles']


def main() -> None:
    """Main entry point. Metrics are opt-in and never overwrite an existing run."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8080, help="local plugin TCP port (default: 8080)")
    parser.add_argument("--metrics-file", type=Path, default=os.environ.get("OPENRCT2_METRICS_FILE"),
                        help="new local JSONL metrics file, or OPENRCT2_METRICS_FILE")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    if not 1 <= args.port <= 65535:
        parser.error("port must be 1-65535")
    api = OpenRCT2API(port=args.port)
    middleware = ResultMiddleware()
    with ExitStack() as stack:
        if args.metrics_file:
            try:
                middleware.sink = stack.enter_context(args.metrics_file.open("x", encoding="utf-8"))
            except OSError as error:
                parser.error(f"Cannot create metrics file: {error}")
        try:
            create_server(api, middleware).run()
        except BaseException:
            # Do not certify an interrupted collection as complete.
            middleware.sink = None
            raise
        finally:
            middleware.finish_capture()


if __name__ == "__main__":
    main()
