"""Read-only MCP registration and park readiness checks."""

from .client_helpers import call_json, call_object
from .protocol import compatibility_error

REQUIRED_TOOLS = {
    'get_plugin_info', 'get_park_status', 'list_all_rides', 'create_ride', 'get_coaster_state',
    'place_track_sequence', 'check_track_candidates', 'preview_track_removal', 'remove_terminal_piece',
    'close_ride', 'reset_ride', 'start_ride_test', 'get_ride_test_report', 'get_coaster_view',
    'get_loaded_ride_objects', 'get_path_objects', 'get_path_area', 'place_path_tile',
    'remove_path_tile', 'open_ride', 'get_ride_guest_report', 'save_park',
}


async def inspect_readiness(client, expected_park=None, require_empty=False, require_unpaused=False):
    names = {tool.name for tool in await client.list_tools()}
    missing = sorted(REQUIRED_TOOLS - names)
    if missing:
        return {'ready': False, 'missing_tools': missing, 'tool_count': len(names)}
    info = await call_object(client, 'get_plugin_info')
    error = compatibility_error(info)
    if error:
        return {'ready': False, 'compatibility_error': error, 'plugin': info}
    park = await call_object(client, 'get_park_status')
    rides = await call_json(client, 'list_all_rides')
    checks = {
        'normal_park': park.get('game_mode') == 'normal',
        'expected_park': expected_park is None or park.get('park_name') == expected_park,
        'empty_if_requested': not require_empty or rides == [],
        'unpaused_if_requested': not require_unpaused or park.get('game_paused') is False,
    }
    return {'ready': all(checks.values()), 'checks': checks, 'tool_count': len(names),
            'plugin': info, 'park': park, 'rides': rides,
            'limitations': 'A fresh MCP connection is checked, not another AI session or its tool allowlist. No game changes were made.'}

