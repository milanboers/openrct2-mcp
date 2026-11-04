"""Compatibility requirements shared by diagnostics and mutation preflight."""

from ._action_client import READ_ENDPOINTS as REGISTERED_READ_ENDPOINTS

PLUGIN_VERSION = '0.19.0'
PROTOCOL_VERSION = 1
READ_ENDPOINTS = frozenset({
    'getPluginInfo', 'listAllRides', 'getAllTrackSegments', 'getMapArea', 'getCoasterState',
    'getValidNextPieces', 'getTrackHistory', 'getRideStats', 'previewTrackRemoval',
    'getLoadedRideObjects', 'getParkStatus', 'getRideStationAccess', 'queryTrackPiece',
    'getPathObjects', 'getPathArea', 'getRideFinances', 'getRideBuildOptions', 'getRideLayout',
}) | REGISTERED_READ_ENDPOINTS


def compatibility_error(info: dict) -> str | None:
    if (info.get('version') != PLUGIN_VERSION or type(info.get('protocol_version')) is not int
            or info['protocol_version'] != PROTOCOL_VERSION):
        return (f'Expected plugin {PLUGIN_VERSION} / protocol {PROTOCOL_VERSION}; '
                f'got {info.get("version")} / {info.get("protocol_version")}. '
                'Restart the game after installing the matching plugin.')
    return None
