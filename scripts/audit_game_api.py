"""Snapshot the pinned public API and render its reviewed coverage (no game required)."""

import argparse
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SURFACE = ROOT / 'docs/game-api-surface.json'
POLICY = ROOT / 'docs/game-api-policy.json'
REPORT = ROOT / 'docs/api-coverage.md'


def strip_comments(text):
    return re.sub(r'/\*.*?\*/|//[^\n]*', '', text, flags=re.S)


def ride_build_types(source):
    """Pinned native starting pieces; native trackplace does not enforce this UI choice."""
    root = source / 'src/openrct2/ride'
    definitions = {}
    for path in sorted((root / 'rtd').rglob('*.h')):
        text = strip_comments(path.read_text())
        for match in re.finditer(r'constexpr RideTypeDescriptor (\w+)\s*=\s*\{(.*?)\n\};', text, re.S):
            definitions[match[1]] = (path, match[2])
    table = (root / 'RideData.cpp').read_text().split('kRideTypeDescriptors[RIDE_TYPE_COUNT] = {', 1)[1].split('};', 1)[0]
    entries = re.findall(r'/\*\s*(RIDE_TYPE_\w+)\s*\*/\s*(\w+)', table)
    track_types = dict(re.findall(r'^\s*(\w+)\s*=\s*(\d+),', (root / 'ted/TrackElemType.h').read_text(), re.M))
    group_names = re.findall(r'^\s*(\w+)(?: = 0)?,', (root / 'ted/TrackGroup.h').read_text(), re.M)
    groups = {name: index for index, name in enumerate(group_names)}
    shared_flags = dict(re.findall(r'constexpr RtdFlags (kRtdFlags\w+) = \{([^}]+)\}',
                                   (root / 'RideData.h').read_text()))
    flat_sequences = {}
    for match in re.finditer(r'SequenceDescriptor k(FlatTrack\w+)Seq(\d+) = \{(.*?)\n    \};',
                             (root / 'ted/TED.FlatRide.h').read_text(), re.S):
        sides = [i for i, side in enumerate(('NE', 'SE', 'SW', 'NW'))
                 if 'SequenceFlag::entranceConnection' + side in match[3]]
        flat_sequences.setdefault(match[1][0].lower() + match[1][1:], {})[int(match[2])] = sides
    result = []
    for index, (symbol, descriptor) in enumerate(entries):
        if descriptor == 'kDummyRTD':
            continue
        path, body = definitions[descriptor]
        piece = re.search(r'\.StartTrackPiece = TrackElemType::(\w+)', body)[1]
        enabled = re.search(r'\.enabledTrackGroups = \{([^}]*)\}', body)
        group_ids = [groups[name] for name in re.findall(r'TrackGroup::(\w+)', enabled[1])] if enabled else []
        flags = body + ''.join(value for key, value in shared_flags.items() if re.search(r'\b' + key + r'\b', body))
        result.append({'ride_type': index, 'name': re.search(r'\.Name = "([^"]+)"', body)[1],
                       'track_type': int(track_types[piece]), 'track_name': piece,
                       'track_groups': group_ids,
                       'footprint_supported': piece.startswith('flatTrack') and 'RtdFlag::isFlatRide' in body,
                       'connection_sides': [sides for _, sides in sorted(flat_sequences.get(piece, {}).items())],
                       'has_entrance_and_exit': 'RtdFlag::hasEntranceAndExit' in flags,
                       'allow_reversed_trains': 'RtdFlag::allowReversedTrains' in flags,
                       'allow_multiple_circuits': 'RtdFlag::allowMultipleCircuits' in flags,
                       'allow_music': 'RtdFlag::allowMusic' in flags,
                       'is_shop_or_facility': 'RtdFlag::isShopOrFacility' in body,
                       'implementation': str(path.relative_to(source))})
    if not entries or not result:
        raise ValueError('Pinned native ride construction table was not found')
    return result


def snapshot(source):
    if '#define kOpenRCT2Version "0.5.7"' not in (source / 'src/openrct2/Version.h').read_text():
        raise ValueError('Expected OpenRCT2 0.5.7 source')
    if 'kPluginApiVersion = 124;' not in (source / 'src/openrct2/scripting/ScriptEngine.h').read_text():
        raise ValueError('Expected scripting API 124')
    sdk = source / 'distribution/scripting/openrct2.d.ts'
    engine = source / 'src/openrct2/scripting/ScriptEngine.cpp'
    text = sdk.read_text()
    clean = strip_comments(text)
    interfaces = {}
    # Declarations are pinned to this SDK's layout, not an unbounded TS parser.
    starts = list(re.finditer(r'^    interface (\w+)([^\n{]*)\{', clean, re.M))
    for start in starts:
        depth, end = 1, start.end()
        while depth:
            if clean[end] == '{':
                depth += 1
            elif clean[end] == '}':
                depth -= 1
            end += 1
        body = clean[start.end():end - 1]
        members = list(re.finditer(r'^        (readonly )?(\w+)\??(?:<[^\n>]*>)?\s*([:(])', body, re.M))
        entry = interfaces.setdefault(start[1], {'extends': start[2].strip(), 'members': []})
        for i, member in enumerate(members):
            signature = ' '.join(body[member.start():members[i + 1].start() if i + 1 < len(members) else len(body)].split())
            value = {'name': member[2], 'kind': 'method' if member[3] == '(' else 'property',
                     'readonly': bool(member[1]), 'signature': signature}
            if value not in entry['members']:
                entry['members'].append(value)
    cpp = engine.read_text()
    table = cpp[cpp.index('ActionNameToType ='):cpp.index('// clang-format on', cpp.index('ActionNameToType ='))]
    aliases = dict(re.findall(r'\{\s*"(\w+)"\s*,\s*GameCommand::(\w+)\s*\}', table))
    actions = {}
    unpublished = []
    headers = list((source / 'src/openrct2/actions').rglob('*Action.h'))
    for header in headers:
        h = header.read_text()
        command = re.search(r'GameActionBase<GameCommand::(\w+)>', h)
        cpp_path = header.with_suffix('.cpp')
        if not command or not cpp_path.exists():
            continue
        matching = [name for name, cmd in aliases.items() if cmd == command[1]]
        if not matching:
            unpublished.append(str(cpp_path.relative_to(source)))
            continue
        implementation = cpp_path.read_text()
        visitor = re.search(r'void \w+::AcceptParameters\([^)]*\)[^{]*\{(.*?)\n    \}', implementation, re.S)
        block = strip_comments(visitor[1]) if visitor else ''
        parameters = re.findall(r'visitor.Visit\("([^"]+)"', block)
        for coordinate in re.findall(r'visitor.Visit\((\w+)\)', block):
            typ = re.search(r'(CoordsXYZD|CoordsXYZ|CoordsXY|MapRange)\s+' + re.escape(coordinate) + r'\b', h)
            if not typ:
                raise ValueError(f'Unreviewed coordinate visitor: {cpp_path}: {coordinate}')
            parameters.extend({'CoordsXYZD': ['x', 'y', 'z', 'direction'], 'CoordsXYZ': ['x', 'y', 'z'],
                               'CoordsXY': ['x', 'y'], 'MapRange': ['x1', 'y1', 'x2', 'y2']}[typ[1]])
        for name in matching:
            actions[name] = {'command': command[1], 'implementation': str(cpp_path.relative_to(source)),
                             'parameters': sorted(parameters)}
    if actions.keys() != aliases.keys():
        raise ValueError(f'Missing action implementations: {aliases.keys() - actions.keys()}')
    return {'source_ref': 'OpenRCT2/OpenRCT2@v0.5.7', 'scripting_api': 124,
            'declarations_sha256': hashlib.sha256(sdk.read_bytes()).hexdigest(),
            'action_bindings_sha256': hashlib.sha256(engine.read_bytes()).hexdigest(),
            'globals': dict(re.findall(r'^    var (\w+): (\w+);', clean, re.M)),
            'functions': re.findall(r'^    function ([^\n]+)', clean, re.M),
            'type_aliases': sorted(set(re.findall(r'^    type (\w+)', clean, re.M))),
            'ride_build_types': ride_build_types(source),
            'ride_entry_flags': {name: 1 << index for index, name in enumerate(re.findall(
                r'^\s*(\w+),', (source / 'src/openrct2/ride/RideEntry.h').read_text().split(
                    'enum class RideEntryFlag : uint8_t', 1)[1].split('};', 1)[0], re.M))},
            'actions': dict(sorted(actions.items())), 'unpublished_actions': sorted(unpublished),
            'interfaces': dict(sorted(interfaces.items()))}


def validate_projection_types(surface, operations):
    # Enforce only names whose declarations ALL agree on a primitive shape.
    # Polymorphic names, aliases and complex types need reviewed source semantics.
    shapes = {}
    for interface in surface['interfaces'].values():
        for member in interface['members']:
            if member['kind'] != 'property':
                continue
            match = re.fullmatch(r'(?:readonly )?\w+\??:\s*(number|string|boolean)(\[\])?;', member['signature'])
            shape = match[1] + (match[2] or '') if match else None
            shapes.setdefault(member['name'], set()).add(shape)

    def validate(fields):
        for field in fields:
            if field.get('property') and not field.get('method') and 'bit_mask' not in field:
                name = field['property'].split('.')[-1]
                known = shapes.get(name, set())
                shape = field['type'].replace('integer', 'number')
                if shape == 'array':
                    shape = field.get('item_type', 'record').replace('integer', 'number') + '[]'
                if len(known) == 1 and None not in known and shape not in known:
                    raise ValueError(f'SDK primitive type mismatch for {name}: {shape} versus {known}')
            validate(field.get('fields', []))
    for operation in operations:
        validate(operation.get('readback', {}).get('fields', []))
        validate(operation.get('result_fields', []))


def render(surface, policy, operations):
    validate_projection_types(surface, operations)
    by_action = {}
    for op in operations:
        if op.get('action'):
            by_action.setdefault(op['action'], []).append(op['name'])
    if by_action.keys() - surface['actions'].keys():
        raise ValueError(f'Unknown native actions: {by_action.keys() - surface["actions"].keys()}')
    for op in operations:
        if not op.get('action'):
            continue
        fields = {a['action_field'] for a in op.get('arguments', [])} | op.get('constants', {}).keys()
        expected = set(surface['actions'][op['action']]['parameters'])
        if fields != expected:
            raise ValueError(f'{op["name"]}: visitor mismatch; missing {expected - fields}, extra {fields - expected}')
    customs = policy['custom_actions']
    excluded = policy['excluded_actions']
    if surface['actions'].keys() != by_action.keys() | customs.keys() | excluded.keys():
        raise ValueError('Every script-accessible action must have an explicit coverage decision')
    if set(excluded) & by_action.keys():
        raise ValueError('Excluded actions cannot also be generated')
    categories = {}
    for category, names in policy['interface_categories'].items():
        for name in names:
            if name in categories:
                raise ValueError(f'Duplicate interface decision: {name}')
            categories[name] = category
    if categories.keys() != surface['interfaces'].keys():
        raise ValueError(f'Unclassified interfaces: {surface["interfaces"].keys() - categories.keys()}')
    lines = ['# OpenRCT2 API coverage\n\n', policy['scope'] + '\n\n',
             f"- Reviewed source: **{surface['source_ref']}**, scripting API **{surface['scripting_api']}**.\n",
             f"- **{len(surface['actions'])}** script-accessible native action aliases, **{len(surface['interfaces'])}** SDK interfaces.\n",
             f"- **{len(operations)} generated tools** expose **{len(by_action)} native action families** plus read-only projections.\n",
             '- This is not a claim of every parameter/variant being supported or every tool being live-tested.\n',
             '- `game-api-surface.json` records every interface member/overload and the authoritative C++ action parameters.\n',
             '- `game-api-policy.json` records exclusions, custom coverage and review notes. Both ship in the source archive.\n\n',
             policy['contracts'] + '\n\n', '## Native action inventory\n\n',
             '| Script action | Coverage | Tools / reason |\n| --- | --- | --- |\n']
    for name in surface['actions']:
        url = f"https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/{surface['actions'][name]['implementation']}"
        if name in by_action:
            status = 'Generated'
            detail = ', '.join(f'`{t}`' for t in by_action[name])
            if name in policy['variant_notes']:
                detail += '. ' + policy['variant_notes'][name]
        elif name in customs:
            status, detail = 'Custom / partial', customs[name]
        else:
            status, detail = excluded[name]['status'], excluded[name]['reason']
        lines.append(f'| [`{name}`]({url}) | {status} | {detail} |\n')
    lines.extend(['\n## Global entry points\n\n', '| Global | Interface / policy |\n| --- | --- |\n'])
    for name, iface in surface['globals'].items():
        lines.append(f'| `{name}` | `{iface}` — {categories[iface]} |\n')
    for signature in surface['functions']:
        lines.append(f'| `{signature}` | Plugin infrastructure, intentionally excluded |\n')
    lines.append('\nType aliases (enums/unions) are retained by name in the snapshot and supply reviewed tool choices; they are not callable operations.\n')
    lines.extend(['\n## SDK interfaces\n\n',
                  'Read coverage is field-level, not blanket writable-object access. Members not listed as generated reads remain subject to the category policy. Inherited members are recorded on their declaring interface in the snapshot.\n\n',
                  '| Interface | Unique members | Classification | Generated reads / custom coverage |\n| --- | --- | --- | --- |\n'])
    argument_interfaces = {}
    for member in surface['interfaces']['Context']['members']:
        match = re.search(r'executeAction\(action: "(\w+)", args: (\w+)', member['signature'])
        if match:
            argument_interfaces.setdefault(match[2], []).append(match[1])
    read_fields = {}
    source_interface = {'ride': 'Ride', 'entity': 'Entity', 'park': 'Park', 'research': 'Research', 'date': 'GameDate',
                        'scenario': 'Scenario', 'context': 'Context', 'climate': 'Climate', 'objects': 'LoadedObject', 'entities': 'Entity', 'object': 'LoadedObject', 'object_manager': 'ObjectManager', 'tile': 'Tile'}
    for op in operations:
        if not op.get('readback'):
            continue
        source = op.get('target') or op.get('source') or 'ride'
        iface = {'guest': 'Guest', 'staff': 'BaseStaff', 'car': 'Car', 'balloon': 'Balloon', 'litter': 'Litter'}.get(
            op.get('entity_type'), source_interface.get(source))
        if iface:
            props = sorted({f.get('method') or f['property'].split('.')[0] for f in op['readback']['fields']})
            read_fields.setdefault(iface, []).append(f'`{op["name"]}`: ' + ', '.join(f'`{x}`' for x in props))
    for name, entry in surface['interfaces'].items():
        detail = '; '.join(read_fields.get(name, [])) or policy['custom_interfaces'].get(name, '—')
        for alias in argument_interfaces.get(name, []):
            status = ('generated: ' + ', '.join(by_action[alias]) if alias in by_action else
                      'custom/partial' if alias in customs else excluded[alias]['status'])
            detail += f'; arguments for `{alias}` ({status}, see native inventory)'
        lines.append(f'| `{name}` | {len({m["name"] for m in entry["members"]})} | {categories[name]} | {detail} |\n')
    lines.extend(['\n## Classification policies\n\n'])
    for category, reason in policy['category_reasons'].items():
        lines.append(f'- **{category}:** {reason}\n')
    lines.extend(['\n## Native actions not published to scripts\n\n',
                  'These implementations exist in the pinned source but have no fixed entry in `ActionNameToType`; the registry does not invent aliases.\n\n'])
    for path in surface['unpublished_actions']:
        lines.append(f'- `{path}`\n')
    lines.extend(['\n## Verification and maintenance\n\n', policy['verification'] + '\n'])
    return ''.join(lines)


def generate_report(operations, check=False):
    surface, policy = json.loads(SURFACE.read_text()), json.loads(POLICY.read_text())
    content = render(surface, policy, operations)
    if not REPORT.exists() or REPORT.read_text() != content:
        if check:
            return False
        REPORT.write_text(content)
    return True


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, help='pinned v0.5.7 source checkout; refresh the SDK snapshot')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.source:
        content = json.dumps(snapshot(args.source), indent=2) + '\n'
        if args.check and SURFACE.read_text() != content:
            raise SystemExit('Stale: docs/game-api-surface.json')
        if not args.check:
            SURFACE.write_text(content)
    ops = json.loads((ROOT / 'src/openrct2_mcp/actions.json').read_text())['operations']
    raise SystemExit(0 if generate_report(ops, args.check) else 1)
