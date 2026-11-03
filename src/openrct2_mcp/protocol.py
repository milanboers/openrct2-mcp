"""Compatibility requirements shared by diagnostics and mutation preflight."""

PLUGIN_VERSION = '0.13.0'
PROTOCOL_VERSION = 1
READ_ENDPOINTS = frozenset({
    'getPluginInfo', 'listAllRides', 'getAllTrackSegments', 'getMapArea', 'getCoasterState',
    'getValidNextPieces', 'getTrackHistory', 'getRideStats', 'previewTrackRemoval',
    'getLoadedRideObjects', 'getParkStatus', 'getRideStationAccess', 'queryTrackPiece',
    'getPathObjects', 'getPathArea',
})


def compatibility_error(info: dict) -> str | None:
    if (info.get('version') != PLUGIN_VERSION or type(info.get('protocol_version')) is not int
            or info['protocol_version'] != PROTOCOL_VERSION):
        return (f'Expected plugin {PLUGIN_VERSION} / protocol {PROTOCOL_VERSION}; '
                f'got {info.get("version")} / {info.get("protocol_version")}. '
                'Restart the game after installing the matching plugin.')
    return None
