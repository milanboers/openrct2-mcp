"""The full pinned API has explicit, maintainable coverage decisions."""

import importlib.util
import json
from pathlib import Path
import re

from fastmcp import Client
import pytest

from openrct2_mcp.mcp_server import mcp

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('audit_game_api', ROOT / 'scripts/audit_game_api.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def documents():
    return (json.loads(audit.SURFACE.read_text()), json.loads(audit.POLICY.read_text()),
            json.loads((ROOT / 'src/openrct2_mcp/actions.json').read_text())['operations'])


def test_pinned_api_has_complete_decisions_and_matches_native_parameter_visitors():
    surface, policy, operations = documents()

    report = audit.render(surface, policy, operations)

    assert report == audit.REPORT.read_text()
    assert len(surface['actions']) == 81 and len(surface['interfaces']) == 255
    assert surface['globals']['map'] == 'GameMap'
    assert surface['functions'] == ['registerPlugin(metadata: PluginMetadata): void;']
    assert 'getRandom' in {m['name'] for m in surface['interfaces']['Context']['members']}
    assert {'ride', 'rideType', 'trackType', 'x', 'y', 'z', 'direction', 'brakeSpeed',
            'colour', 'seatRotation', 'trackPlaceFlags', 'isFromTrackDesign'} == set(surface['actions']['trackplace']['parameters'])
    assert not ({o.get('action') for o in operations} & policy['excluded_actions'].keys())


@pytest.mark.parametrize('change', ['new_action', 'new_interface', 'visitor_drift'])
def test_api_audit_rejects_unreviewed_surface_or_bindings(change):
    surface, policy, operations = documents()
    if change == 'new_action':
        surface['actions']['new_action'] = {'implementation': 'new.cpp', 'parameters': []}
    elif change == 'new_interface':
        surface['interfaces']['NewInterface'] = {'extends': '', 'members': []}
    else:
        surface['actions']['staffhire']['parameters'].append('newRequiredParameter')

    with pytest.raises(ValueError):
        audit.render(surface, policy, operations)


@pytest.mark.anyio
async def test_readme_inventory_matches_all_discoverable_tools():
    custom = json.loads((ROOT / 'docs/custom-tools.json').read_text())
    operations = documents()[2]
    async with Client(mcp) as client:
        tools = {tool.name for tool in await client.list_tools()}

    rows = re.findall(r'^\| `(\w+)` \|', (ROOT / 'README.md').read_text(), re.M)

    assert len(rows) == len(set(rows))
    assert set(rows) == tools == custom.keys() | {o['name'] for o in operations}
    assert not (custom.keys() & {o['name'] for o in operations})


def test_sdk_primitive_projection_drift_is_rejected():
    surface, policy, operations = documents()
    operation = next(op for op in operations if op['name'] == 'get_loaded_object_details')
    field = next(f for f in operation['readback']['fields'] if f['name'] == 'scenery_groups')
    field['item_type'] = 'integer'
    with pytest.raises(ValueError, match='SDK primitive type mismatch for sceneryGroups'):
        audit.render(surface, policy, operations)


@pytest.mark.parametrize(('version', 'api'), [('0.5.8', 124), ('0.5.7', 123)])
def test_source_refresh_rejects_wrong_engine_or_api(tmp_path, version, api):
    source = tmp_path / 'src/openrct2'
    (source / 'scripting').mkdir(parents=True)
    (source / 'Version.h').write_text(f'#define kOpenRCT2Version "{version}"')
    (source / 'scripting/ScriptEngine.h').write_text(f'kPluginApiVersion = {api};')

    with pytest.raises(ValueError, match='Expected'):
        audit.snapshot(tmp_path)
