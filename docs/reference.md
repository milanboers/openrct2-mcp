# Detailed setup and tool reference

Build roller coasters in OpenRCT2 with your AI coding assistant. The agent plans the layout, an in-game plugin places the track piece by piece, and the server sends back the ride's state — including a height map and a top-down picture — so the agent can keep designing until the circuit is closed.

![movie-1080p-final](https://github.com/user-attachments/assets/77bf232a-91c0-4205-a3c2-5c0bb3af9896)

## How it works

Three pieces talk to each other:

1. **In-game plugin** (`ridecreation-api.js`) — runs inside OpenRCT2 and opens a small TCP server on port `8080`. It places track through game actions and reports authoritative ride state. Connection-shape filtering, ride-specific support and physical clearance are separate checks (see limitations below).
2. **MCP server** (Python, this repo) — a plain stdio MCP server. Its tools forward to the game over that TCP connection.
3. **Your AI client** — Claude Code, Codex, pi, opencode, or any stdio MCP client. It runs the MCP server, loads the `build-coaster` skill, and drives the whole thing.

Python integrations can use `create_server(api)` from `openrct2_mcp.mcp_server` to construct independent applications. Each server uses the supplied client and closes it at lifespan exit. Existing module-level tool entry points remain available for compatibility; they are not dependencies of newly constructed servers.

## Tools

- `create_ride`: Create a new coaster and place the first station piece.
- `place_track_segment`: Add a track segment. `valid_pieces` lists supported cardinal types whose connection shape matches; it does not guarantee ride support or clearance. Diagonal and inverted track are not supported by this filter. Placement responses include `endpoint_prediction_mismatches` if the predicted and actual endpoints differ.
- `check_track_segment`: Ask the game whether a piece can be placed at the current endpoint without building it. The result is not a reservation or a guarantee of ride support or connectivity.
- `get_map_area`: Inspect nearby terrain and map elements within a bounded radius.
- `get_coaster_view`: Read-only spatial feedback. `view: "endpoint"` shows nearby terrain, water/slope indicators, paths, objects and tracks with endpoint/return headings. `view: "elevation"` plots sampled heights against track-piece boundary index, not physical distance.
- `place_track_sequence`: Place several segments in order, returning one final state and image. Stops at the first failure; earlier segments remain placed, and the failed segment may also have been placed. Inspect the final state before retrying. Each segment accepts `track_type`, `has_chain_lift`, `brake_speed`, and `seat_rotation`.
- `undo_last_piece`: Remove the terminal segment of a connected layout (not chronological undo). On a closed circuit with a begin station, removes the piece immediately before that station. Disconnected or ambiguous layouts are rejected.
- `get_coaster_state`: Get track history, actual track-element tiles and base heights, and a visualization. `candidate_status` explains when candidate generation is unavailable or the circuit is complete. `layout_status` reports disconnected or ambiguous track. Set `include_image: false, compact: true` for endpoint/candidate information without full history, occupancy or an image. The footprint is not collision-clearance data; the image's connecting lines are approximate.
- `place_station_building`: Choose an entrance or exit position, with a guard for moving an existing building.
- `place_entrance_exit`: Automatically add missing entrance/exit buildings to the station.
- `start_ride_test`: Start test mode for ratings.
- `close_ride`: Close a ride before editing track or changing vehicles.
- `reset_ride`: Explicitly clear vehicles on an already closed, guest-free ride before substantial editing. No track is removed.
- `get_ride_station_access`: Inspect station buildings and bounded nearby path edges, heights and queue assignments (not proof of connectivity).
- `get_park_status`: Read park finances, guests, date, research and scenario objective/status without changing anything.
- `get_ride_finances`: Read prices, charging restrictions and ride accounting, preserving unavailable values.
- `set_ride_price`: Set an active price with a stale-value guard and explicit consent for potentially shared prices.
- `get_path_objects` / `get_path_area`: Discover loaded modern path objects and inspect bounded path edges, heights, queues and ghosts.
- `place_path_tile` / `place_path_sequence`: Build flat/elevated/sloped modern paths, one tile or an explicit sequence. No routing, replacement or local scenery clearing.
- `remove_path_tile`: Remove a flat/elevated/sloped path using an exact observed-path guard.
- `open_ride`: Open a ride through a normal game action.
- `get_ride_guest_report`: Observe customer-counter progress, with explicit limits on completion and access interpretation.
- `save_park`: Request a fresh named checkpoint. File persistence remains unknown until verified on disk.
- `get_ride_stats`: Get test status, pause state, instantiated trains and car counts, ratings, speed, length, duration, G-forces, and drops. Closed rides may have no instantiated trains. Ratings use the game's decimal scale (e.g. 6.52) and are `null` until calculated; vehicle velocities are raw game values.
- `list_all_rides`: List existing rides.
- `get_track_catalog`: Inspect game track descriptors and which types the server supports. Set `supported_only=true` to omit unsupported types. The catalog isn't filtered for the current ride or endpoint.
- `set_ride_name`: Rename a ride and read back its name.
- `set_ride_inspection_interval`: Set a named inspection interval, with readback.
- `set_ride_minimum_waiting_time`: Set the minimum dispatch wait in seconds.
- `set_ride_maximum_waiting_time`: Set the maximum dispatch wait in seconds.
- `get_ride_operating_settings`: Read operating settings and nominal lift-speed limits.
- `get_ride_maintenance_status`: Read inspection/reliability/downtime and breakdown flags.
- `get_loaded_music_objects`: Discover loaded music objects.
- `set_ride_lift_hill_speed`: Set chain-lift speed in mph and invalidate old ratings.
- `set_ride_operating_mode`: Change a supported mode with the engine's construction reset.
- `set_ride_circuit_count`: Set an acknowledged requested circuit count.
- `set_ride_music_enabled`: Toggle the music flag and read it back.
- `set_ride_music_style`: Select a loaded music object and read back its index.
- `set_ride_vehicles`: Set the proposed train count or cars per train on a closed ride (the game may apply limits).
- `get_plugin_info`: Diagnose the connection, plugin/protocol compatibility, scripting API version, park name, map size and pause state.
- `delete_ride`: Demolish one ride by ID.
- `delete_all_rides`: Clear all rides.

## Prerequisites

- **OpenRCT2** (in-game plugins are enabled by default)
- **uv** — see [astral.sh/uv](https://docs.astral.sh/uv/)
- an MCP-capable AI client (Claude Code, Codex, pi, opencode, ...)

## Setup

### 1. Copy the plugin into OpenRCT2

Copy `ridecreation-api.js` into your OpenRCT2 `plugin` folder (create the folder if needed):

| OS | OpenRCT2 user folder |
| --- | --- |
| macOS | `~/Library/Application Support/OpenRCT2/` |
| Windows | `Documents/OpenRCT2/` |
| Linux | `~/.config/OpenRCT2/` |
| Linux (Flatpak) | `~/.var/app/io.openrct2.OpenRCT2/config/OpenRCT2/` |

So on macOS the file ends up at `~/Library/Application Support/OpenRCT2/plugin/ridecreation-api.js`.

Alternatively, use the installer with an explicit OpenRCT2 user directory:

```sh
uv run python scripts/install_plugin.py --user-dir "/path/to/OpenRCT2"
```

Pass `--overwrite` to replace an existing copy. The installer does not restart the game. Save your park and restart OpenRCT2 after copying: a running game keeps the old plugin loaded. Then check `get_plugin_info` from your MCP client.

### 2. Use the sandbox scenario

This repo includes a ready-made scenario in `scenarios/sandbox.park`. It's a flat, empty map with the Wooden Roller Coaster already available, so it works out of the box. Copy it into the `scenario` subfolder of the OpenRCT2 user folder from step 1.

Prefer your own map? Most scenarios work — two things make it easier:

- **The station spot**: `create_ride` defaults to tile (67, 66) at ground level — roughly the middle of a 128×128 map — so that tile needs to be flat and clear. You can pass custom `station_x/y/z` to use another location.
- **The Wooden Roller Coaster**: it's the default ride type and the track validation is tuned for it, so it needs to be researched or available in the scenario. Other ride types can work too, but some track pieces may fail to place.

### 3. Install the MCP server

Clone this repository, then:

```
uv sync
```

To check it works:

```
uv run openrct2-mcp
```

It just sits there until a client connects; stop it with Ctrl+C.

### 4. Connect your AI client

The MCP server is a normal stdio server: you point your client at it, ideally from a dedicated workspace folder. Keeping it in its own folder (instead of your everyday coding projects) keeps the game tooling scoped to this hobby and out of the way.

#### Claude Code

Create a workspace folder (e.g. `~/openrct2/`), and inside it a `.mcp.json`:

```json
{
  "mcpServers": {
    "openrct2-mcp": {
      "command": "uv",
      "args": ["--directory", "/path/to/openrct2-mcp", "run", "openrct2-mcp"],
      "type": "stdio"
    }
  }
}
```

Then run `claude` from that folder.

#### Codex

In the same workspace folder, create a `.codex/config.toml`:

```toml
[mcp_servers.openrct2-mcp]
command = "uv"
args = ["--directory", "/path/to/openrct2-mcp", "run", "openrct2-mcp"]
```

Then run `codex` from that folder. Codex only loads `.codex/` project config after you trust the project — approve the prompt when it appears. (Or add it to your user config instead with `codex mcp add openrct2-mcp -- uv --directory /path/to/openrct2-mcp run openrct2-mcp`.)

#### pi

Pi supports MCP natively. From the workspace folder, configure the server locally:

```sh
pi mcp add --local openrct2 -- uv --directory /path/to/openrct2-mcp run openrct2-mcp
```

Start pi and trust the project if prompted. If pi is already running, use `/reload` and trust the project if prompted.

#### opencode

In the same workspace folder, create an `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "openrct2-mcp": {
      "type": "local",
      "command": ["uv", "--directory", "/path/to/openrct2-mcp", "run", "openrct2-mcp"],
      "enabled": true
    }
  }
}
```

Then start opencode from that folder (and restart it after saving the config).

Other stdio MCP clients work the same way — point them at `uv --directory /path/to/openrct2-mcp run openrct2-mcp`.

### 5. Install the skill

The skill (`skills/build-coaster/SKILL.md`) tells the agent how to build a valid coaster: the station sequence, which transition pieces to use, and to only ever pick a track type from the `valid_pieces` list. Copy it into your client's skill folder:

- **Claude Code:** `.claude/skills/build-coaster/SKILL.md` inside your workspace.
- **Codex:** `.agents/skills/build-coaster/SKILL.md` inside your workspace (or `~/.agents/skills/build-coaster/` for all projects).
- **pi:** `.pi/skills/build-coaster/SKILL.md` inside your workspace (or `~/.pi/agent/skills/build-coaster/` for all projects).
- **opencode:** `.opencode/skills/build-coaster/SKILL.md` inside your workspace.

## Session readiness

Installing the plugin, restarting OpenRCT2, reloading the MCP server, and exposing tools to an agent are separate steps. A running game or MCP process keeps its loaded code. A subagent can also have a narrower tool allowlist than its parent. Verify `get_plugin_info` and the required game tools **in the session that will build**. For Pi subagents, a dedicated builder profile needs an explicit `mcp:openrct2` tool selection; the built-in coding worker does not inherit MCP tools.

Pi resolves a child's `mcp:` selection from the parent's current tool inventory. After adding tools, reconnect/reload the **parent** MCP connection before launching a child. A fresh child server can register new tools while its parent-resolved allowlist still excludes them. Check the parent's inventory as well as the child's actual exposed tools; a successful plugin handshake alone does not establish tool availability.

A cheap read-only check of a fresh MCP connection is available:

```sh
uv run --locked python scripts/check_ready.py --expected-park sandbox --require-unpaused
```

Add `--require-empty` before a fresh smoke test, or `--port` for another local plugin instance. Exit `0` means ready, `1` means unmet readiness checks, and `2` means collection/input failure. This checks server registration, compatibility and park state, **not another AI session's tool allowlist**. No agent/model calls or park changes are made.

Updated Python clients check the matching plugin release and protocol before the first mutation on each connection, and recheck after disconnection. A failed handshake rejects the requested mutation before sending it. Reads remain available for diagnostics. This does not retrofit safety checks into old clients or secure raw local TCP callers.

## Using it

1. Start OpenRCT2 and load the **Sandbox** scenario (or your own).
2. Open your AI client in the workspace folder.
3. Tell the agent what you want, for example: *Use the build-coaster skill to build a wooden roller coaster, complete the circuit, and run a test ride.*

The agent walks through the tools — `create_ride`, `place_track_segment`, `get_coaster_state`, `place_entrance_exit`, `start_ride_test`, `get_ride_stats` — using the images and height maps the server returns to steer the coaster home.

## Spatial views

`get_coaster_view(ride_id, view="endpoint", radius=4)` returns an image and the underlying bounded map observations. Radius is 0–8 tiles. Terrain numbers are base Z values, `^` marks sloped terrain, and blue terrain indicates water. Separate colored bands preserve overlapping paths, objects, other rides and the selected ride. Ghost objects remain in the data but are omitted from the image. Unfilled tiles have no observations or are outside the map.

Use `compact=True` for less endpoint text, especially at larger radii. `map_area.terrain_summary` records the observed tile count, the most common flat, dry, non-ghost surface, and how many matching surfaces were omitted. `map_area.tiles` retains every other element with its coordinates and heights, including all tracks, paths, scenery, ghosts and differing terrain. Tiles left empty after compaction are omitted too.

This is a summary, not an exact map of omitted terrain locations or a clearance guarantee. The image still uses the full observations. The default `compact=False` preserves the full data, and the option does not affect elevation views. Dense or varied areas can still produce large responses.

The yellow arrow marks the current endpoint heading. The green arrow marks the track start and its return heading. `S/C` means they share a tile. Structured `track_start`, `current_endpoint`, and `return_offset` remain available when the start is outside the view. The default whole-coaster image also shows these heading arrows.

`get_coaster_view(ride_id, view="elevation")` plots heights at track-piece boundaries. The first sample is the track origin, and subsequent samples use the game's next-connection heights (rather than the lowered origins of downward pieces). Equal X spacing does **not** mean equal track length, and lines omit geometry within a piece. The response includes the height range and sample count.

Both views require a complete traversal of a connected layout. Neither establishes clearance, ride support, speed or G-forces. The endpoint view includes objects at all heights; consult their base/clearance heights in `map_area`. Ride and map reads are separate, so the park can change between them. These views require the matching plugin; the current plugin release is `0.19.0`.

## Tips

- The plugin's track validation is tuned for the **Wooden Roller Coaster** (the default ride type); other ride types work but may fail on some pieces.
- The station is placed at the same spot near the middle of the map, at ground level. That's why the sandbox is flat and empty — give the coaster room to roam.
- A candidate can still fail because of clearance or ride support. Read the game error and `candidate_status`; an empty candidate list can indicate unsupported geometry rather than a design dead end.
- You can build multiple coasters or continue a connected supported layout from a previous session. Disconnected layouts block implicit construction/removal. Arbitrary endpoint selection and multiple-station operation are not supported.
- To revise a tested coaster: `close_ride`, inspect state, explicitly `reset_ride` when clearing trains for construction, edit, restore entrance/exit assignments with `place_entrance_exit` as needed, then `start_ride_test` again. OpenRCT2 may invalidate entrance/exit assignments after track edits.

## Guarded construction and revision

Tool inputs are validated strictly: integer IDs and coordinates must be JSON integers, not booleans, numeric strings or decimal numbers. Boolean options require JSON `true`/`false`, not strings. Construction models share the same bounds and strict types as the individual tools. Ride ID `0` remains valid.

Append placement now resolves the endpoint inside the plugin, checks connection candidates again, and checks the endpoint and piece count observed by the Python client before submitting the game action. An optional `expected_endpoint` on single-piece or sequence placement also checks against the agent's previous observation (for a sequence, on its first piece).

`preview_track_removal` identifies the exact terminal segment without removing it. Pass its `target` as `expected_target` to `remove_terminal_piece` or the existing `undo_last_piece`. The latter remains an endpoint-removal alias, not chronological undo. A stale target/count is rejected before submitting removal.

These guards are not transactions or reservations. They cannot detect every interior edit and do not make OpenRCT2's asynchronous action execution atomic. Avoid concurrent construction on the same ride.

Successful placement and removal can return the plugin's post-action snapshot directly, avoiding another full-map traversal for the response. Within a track sequence, the next piece can use the preceding acknowledged snapshot as its observation, but the plugin still rechecks candidates, endpoint and piece count before every append. This is not a cross-request cache. After a failed or unknown action, the tool requests fresh state rather than reusing an earlier snapshot.

`check_track_candidates` queries 1–32 alternatives at the same observed endpoint, preserving each candidate's clearance result. It never treats the list as a hypothetical sequence. Changed before/after snapshots invalidate the batch; queries still do not prove ride-specific support or reserve space.

## Test reports and loaded objects

`get_ride_test_report(ride_id, observe_seconds=0)` combines layout/circuit checks, running/pause state, movement observations, ratings and game-reported telemetry. Use an observation window up to 60 seconds when needed (subject to your MCP client's timeout). It does not start, close, edit or unpause a ride. `success` means collection succeeded; `ready` means all observed readiness checks passed. Missing motion is not proof of a stall. Station entrance/exit presence is checked; guest path connectivity is not established.

`get_loaded_ride_objects(ride_type=52)` discovers loaded vehicle/ride objects and nominal car limits. Select an object by its identifier, then pass its current `index` as `ride_object` to `create_ride`. The default `65535` still asks the game to choose automatically. Indices can change between parks. Each object includes per-type `research` entries: `invented`, `uninvented` or `unknown`, matched by both object index and ride type. Null ride-type sentinels and duplicates are omitted. This is not a guarantee of buildability: track support, scenario restrictions and clearance remain separate.

Full coaster state includes the selected `ride_object` and per-piece `options` read from actual elements: chain lift, brake speed, seat rotation, colour scheme, inversion and cable-lift flags. `null` means unavailable or inapplicable, not an inferred zero/default. This is preparation for faithful export, not an arbitrary-layout recipe export/replay API.

## Ride settings

These use normal game actions in a loaded normal park and do not change track.
Operating-mode changes perform a construction reset (see below).
Readback-capable setters return `requested`,
`observed_before`, `observed_after` and `readback_matches_request`.
`operation_outcome: confirmed` means the engine acknowledged the action, not that
readback succeeded. Unavailable or mismatching readback gives `success: false`
without undoing the confirmed action. Never blindly repeat an unknown mutation.

- `set_ride_name(ride_id, name)`: use a nonempty string. Game name restrictions
  still apply. Readback verifies the observed name.
- `set_ride_inspection_interval(ride_id, interval)`: `every_10_minutes`,
  `every_20_minutes`, `every_30_minutes`, `every_45_minutes`, `every_hour`,
  `every_2_hours` or `never`. Observed `inspection_interval` is the engine enum
  0–6 in that order, not a duration in seconds. `never` disables scheduled
  inspections and clears the due-inspection flag. This does not hire mechanics.
- `set_ride_minimum_waiting_time(ride_id, seconds)` and
  `set_ride_maximum_waiting_time(ride_id, seconds)`: integer 0–250 seconds.
  Raising the minimum above the maximum raises the maximum too; lowering the
  maximum below the minimum lowers the minimum too. Both observed bounds are
  returned as `minimum_waiting_time_seconds` / `maximum_waiting_time_seconds`.
  Loading and departure flags still control dispatch. Setting a time does not
  enable the corresponding waiting rule.

`get_ride_operating_settings` reads the current mode/departure flags as raw
engine values, waiting bounds in seconds, lift speed and nominal descriptor
limits in mph, and music settings. Limits are not guarantees: the engine checks
current rules, including cheats. It does not enumerate supported modes or infer
dispatch/playback. `get_ride_maintenance_status` reads the inspection enum (0–6),
reliability/downtime percentages, age in game months, and decoded due-inspection,
broken-down and crashed flags. It does not repair or dispatch mechanics.

Additional setters:

- `set_ride_lift_hill_speed(ride_id, speed_mph)`: integer 0–255 mph; read the
  ride-specific bounds first. The normal engine action validates its range.
  Changing speed invalidates test results/ratings, without closing/clearing trains.
- `set_ride_operating_mode(ride_id, mode)`: named engine modes, with support and
  closed/non-broken requirements checked by the engine. **Even setting the current
  mode invalidates ratings, clears vehicles and removes riders through the engine
  construction reset.** It is not a harmless scalar update. `mode_raw` readback
  is the engine enum and does not establish operation.
- `set_ride_circuit_count(ride_id, circuits)`: 1–20 (the normal engine range).
  Cable lifts reject multiple circuits. A change invalidates ratings. There is no
  scripting getter for this count, so the result is an acknowledged request, not
  verified count/laps. `state_status` remains `not_requested`.
- `set_ride_music_enabled(ride_id, enabled)`: boolean, with flag readback.
- `set_ride_music_style(ride_id, music_object)`: use an index from
  `get_loaded_music_objects`. The engine rejects unloaded indices. Changing style
  resets the tune but does not enable music. Neither setting proves audible playback.

`set_ride_vehicles` retains its existing proposed-count contract, not verified
train length. Close the ride first and inspect instantiated cars in ride stats.
Status actions retain their acknowledgement-only contract; use ride stats/test
reports to establish operation and guest reports to observe customers.

## Ride diagnostics and park observations

Coaster state includes station starts, lengths, entrances and exits, with explicit
`present` / `absent` / `unknown` position observations. Coordinates use the same
tiles and height units as construction. Unused station/null-coordinate sentinels
are not treated as buildings. Station geometry is included even in compact state.

`get_ride_station_access(ride_id, radius=2)` reads paths around station starts and
buildings, with radius 0–4. Observations retain overlapping heights, edge masks,
slopes, queue ride/station assignments, surface objects and ghosts. This is not a
pathfinder. Nearby paths do not establish a usable queue or exit route, and
`guest_access` remains `unknown`.

`get_ride_stats` now includes each head car's status, sprite position, current
track-block location/type/progress and `g_forces_raw`, when available. Velocities
and sampled G-forces retain raw API units (do not compare sampled G-forces
directly with decimal ride maxima). Sprite positions can be fractional tiles;
track-block locations are not necessarily normalized segment origins. Stats also
include game ticks, total customers and current guest count.

`get_ride_test_report` retains bounded `observations` with elapsed wall seconds and
full stats, in addition to the readiness summary. Sampling is roughly once per
second, not a complete physics trace. Peaks may be missed; a stationary head car
is not by itself evidence of a stall. Readiness requires station buildings but
still does not establish guest access.

OpenRCT2 distinguishes closing a running ride from closing an already closed
ride. The latter clears vehicles for construction. `reset_ride` makes that action
explicit, requiring an already closed ride with a known zero guest count. It
reports action acknowledgement separately from `vehicles_cleared`. Use it before
substantial track revision; stale trains can otherwise remain waiting in the
station after rebuilding. Reset can also clear crash/test state through the normal
game action. It is not an automatic recovery step or a retry of an unknown close.
The existing `close_ride` retains the game's second-close behaviour for compatibility.

`get_park_status` observes finances, guests, research, date and the scenario's
objective and game-reported completion status. It requires a loaded normal park.
Fields ending in `_raw` retain scripting API units; objective fields should only
be interpreted for their corresponding objective type. It does not advance time,
change finances/research, forecast success or independently certify completion.

## Station building placement

`place_station_building(ride_id, building, x, y, direction, expected_position=None)` places one `entrance` or `exit` at a caller-chosen tile. Direction faces **toward** the station: 0 west, 1 +y, 2 east, 3 -y. Height comes from the first station. For station track, the building faces adjacent station-0 track perpendicular to its heading. For flat footprints, the selected sequence must expose that connection side in the pinned native descriptor. Mazes accept adjacent maze track at the station height. Shops/facilities use service paths instead of entrance/exit buildings. Exactly one station is supported.

Both buildings can occupy different tiles on the same side of the station. This is useful when opposite-side placement would leave an entrance or exit inside a ground-level circuit. Existing paths, buildings and scenery at the target are not replaced or cleared. Track clearance remains the game's decision.

Edits require a closed ride with a known zero guest count. The normal game action can reset vehicles and change queue connections. Moving an existing building additionally requires its exact current `expected_position` (`x`, `y`, `z`, `direction`) from `get_ride_station_access`. A missing or stale guard rejects before mutation; the guard is not a reservation. No separate remove/rebuild or rollback is performed. Inspect after unknown outcomes before deciding whether to retry.

The result includes action cost in raw game units and bounded station/path observations before and after the action. Confirmed placement can have unavailable readback; inspect `operation_outcome` separately from `state_status`. Placement does not establish guest access.

`place_entrance_exit` remains a convenience helper. It preserves existing buildings, tries missing buildings on opposite sides of first-station track, and stops on unknown action acknowledgement rather than trying another position. A failure retains confirmed progress in `error_details`.

## Flat rides, shops, mazes and explicit track selection

`get_ride_build_options` returns pinned native starting pieces, enabled (not cheat-extra)
track groups, flat footprint support, connection sides and loaded objects with per-type
research. These facts are extracted from v0.5.7 descriptors and source-audited alongside
the SDK snapshot. They do not prove vehicle sprite support or placement clearance.

For a supported flat ride, shop or facility:

1. Choose a compatible **invented** object and ride type. There are 24 source-reviewed
   footprint types; availability depends on the loaded park and research.
2. Call `create_unbuilt_ride`, retaining `game_result.ride_id` (including zero).
3. Call `place_ride_footprint(ride_id, x, y, z, direction)`. It requires an empty,
   closed, guest-free, vehicle-free ride and selects only that type's normal footprint.
   Z is an even height in units of 8. The game can clear permitted scenery and charge
   normal construction costs. No implicit close/reset, retry, demolition or rollback.
4. Inspect `get_ride_layout`. `connection_directions` point **outward** from each
   sequence toward possible buildings/service paths. Most one-tile shops serve the
   path in their placement direction; information kiosks connect on every side.
5. For rides with station buildings, use caller-chosen `place_station_building`
   positions on valid sequence edges. The automatic `place_entrance_exit` helper
   remains limited to linear station track. Shops/facilities do not need buildings.
6. Build paths, open normally, and separately observe status, vehicles/ratings,
   customers and maintenance. Zero train velocity is normal for a rotating carousel.
   Coaster readiness/completion helpers are not generic flat-ride certification.

`get_ride_layout(ride_id, offset=0, limit=256)` scans physical track elements without
requiring a connected iterator. It returns total count, a bounded page, stations,
normalized vehicle IDs (native 65535 null IDs are not trains), exact `selection`
records and nullable maze masks. A multi-tile track piece has multiple elements.
Maze sequence is inapplicable/null and is not a valid linear removal selection.
Pagination has no stable cursor and does not reserve selections.

`remove_track_piece(ride_id, selection)` requires closed, guest-free, vehicle-free
state and an exact current non-ghost selector. It rejects ambiguous native selectors
and selections belonging to another ride, including normalized station-type
collisions. The selected element's base Z is in **raw game units**. Any sequence
can select a whole multi-tile piece. It can split a circuit into disconnected parts,
change stations/queues or remove an entire flat footprint. The before/after layouts
are 256-element prefixes with totals. It does not automatically reconnect anything;
curated appending remains unavailable while the layout is disconnected.

`edit_maze_cell` requires maze type 20 and validates the ride before calling native
code (the unguarded native action can dereference invalid rides). X/Y are raw game
units aligned to 16, Z is an even height in units of 8. `mode="build"` edits the
cursor half-cell. `mode="fill"` fills the **previous** half-cell, cursor minus 16
in `direction`, matching the native UI. Direction is 0 west, 1 +y, 2 east, 3 -y.
Pass the affected tile's current `expected_maze_entry` from the layout, or null
for a new tile. First placement is inferred from an empty layout, not a caller flag.
The guard covers that tile, not all neighboring wall changes. Native fill is enum
2. Staff pickup/place has a separate inconsistent SDK comment and remains excluded. Engine
costs, ownership and clearance apply; native edits can clear permitted scenery/walls.
No maze planner, solvability claim, hidden reset or rollback is provided.

See the [player-capability matrix](player-capabilities.md) for per-workflow evidence
and remaining gaps, rather than treating native alias counts as gameplay coverage.

## Ride finances and prices

`get_ride_finances(ride_id)` is read-only and works for rides, stalls and facilities. It reports:

- Active `prices` with stored `price_raw`, park-rule `effective_price_raw`, `charging_allowed` and `shared_price_status`. Index 0 is admission for a ride, otherwise a primary item/facility price. Index 1 is an active photo or secondary item. Hidden/inactive slots are not exposed.
- Money/admission rules: `no_money`, `free_park_entry`, `unlock_all_prices` and whether ride admission prices are unlocked. Paid park entry without unlocked ride pricing makes ride admission effectively free; item/photo pricing is separate.
- `running_cost_per_fortnight_raw`, plus the game's hourly equivalent (`x16`). These are game accounting periods, not wall-clock billing guarantees.
- `income_per_hour_estimate_raw` and `profit_per_hour_estimate_raw`, calculated from recent customers and refreshed about every 960 game ticks. **Income already subtracts merchandise costs**; profit also subtracts upkeep. Neither is a lifetime gross revenue counter or a prediction of future profitability.
- `total_profit_raw`, the engine's lifetime counter. `total_revenue_raw` is `null`: the scripting API does not expose lifetime gross revenue. Missing fields and undefined-money sentinels remain `null`, never invented as zero; `unavailable_fields` lists unavailable accounting fields.

Raw money uses **10 units per GBP**, not cents. For example, `price_raw=30` is GBP 3.00 before display-currency conversion. The tool does not convert the user's chosen display currency.

`set_ride_price(ride_id, price_raw, expected_price_raw, price_index=0, allow_shared_price_changes=False)` uses the normal `ridesetprice` action. The engine's price range is 0–200 raw units (GBP 0–20). Read the current stored price first and supply it as `expected_price_raw`; stale values reject before mutation. The guard is not a reservation. Price changes do not close/reset the ride or require it to be closed.

The wrapper rejects disabled-money mode, locked ride admission pricing and unknown/unavailable slots before sending an action. The engine action alone does not enforce all these charging restrictions, so an acknowledged stored price by itself is not proof that guests can be charged. The tools never change admission rules, cash, research or objectives.

Common-price flags are not exposed. Ordinary ride admission with no shop item cannot propagate, but item/photo/facility pricing requires explicit `allow_shared_price_changes=True`. This authorizes possible changes to other rides. The response returns bounded-by-park-size `observed_price_changes` for active, visible slots across the park, plus `price_change_observations_complete`. The engine may also update hidden photo-price slots; these are not included. Before/after differences do not rule out concurrent edits, and no differences do not prove that shared pricing is disabled.

Action acknowledgement, readback and price matching are separate: inspect `operation_outcome`, `state_status` and `stored_price_matches_request`. A confirmed action with missing or mismatched readback reports `success: false`; do not automatically resend it. No rollback is attempted.

These semantics were checked against OpenRCT2 0.5.7: [money units](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/core/Money.hpp), [ride accounting and effective admission prices](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/ride/Ride.cpp), and [price action/shared-price propagation](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/RideSetPriceAction.cpp).

## Paths, guests and checkpoints

Modern paths support flat, elevated and sloped construction. Inspect park-local indices with `get_path_objects`, then use `place_path_tile(x, y, z, surface_object, railings_object, is_queue=False, slope_direction=None)`. Coordinates are tiles. Z is the **lower end**, in units of 8, and must be even. A sloped tile rises **2 height units** toward `slope_direction` (0 west, 1 +y, 2 east, 3 -y). Null is flat. Native ownership, terrain, clearance, water, support and cost checks apply; passing coordinates does not bypass them. Existing paths at the same base height cannot be replaced (including ghosts), and local scenery is not cleared. Different path/track heights may coexist if native clearance permits. Directional wall-clearing flags and arbitrary edge/layout masks are not exposed.

`place_path_sequence(tiles, surface_object, railings_object, is_queue=False)` takes 1–256 explicit `{x, y, z, slope_direction?}` tiles. The entire input shape and height ranges are validated before the first action; terrain, object availability and game clearance are checked per tile when placing. All tiles share the path objects and queue flag. Tiles need not be adjacent; the tool does not route or certify connectivity. It stops on the first rejected/unknown action or unavailable readback, without retries or rollback.

`placed_count` and `placements` retain the confirmed prefix and per-tile costs. `failed_index` is zero-based. A confirmed tile with failed inspection still counts as placed; remaining tiles are not attempted. `last_placement` contains observations taken immediately after that confirmed action, not a final route-wide survey. Later actions can change earlier tiles' edges and queue assignments; inspect the route separately when needed.

The game connects edges and assigns queue ownership. Placement returns neighboring path observations from before and after the action, including overlapping heights and ghosts. `remove_path_tile` requires the exact current path observation from `get_path_area`, and accepts one non-ghost path without an addition, including sloped/elevated paths. These checks are not reservations or transactions. Side effects can extend beyond the observed one-tile neighborhood, particularly queue reassignment. No automatic rollback is attempted.

`open_ride` uses the normal ride-status action. It does not prove access. `get_ride_guest_report(ride_id, observe_seconds=10)` retains test-readiness observations and reports customer-counter changes. Completion interpretation is validated only for wooden coasters on OpenRCT2 0.5.7: the counter increments in `Guest::onExitRide`. This does not trace individual guests or certify a route to the public network. Already-boarded guests may complete during an observation, and no progress can reflect demand, dispatch or breakdowns rather than inaccessible paths.

`save_park(label)` supports normal play and scenario-editor park data (not editor UI steps). It requests a checkpoint named `mcp-<label>-<fresh UUID>.park` in the game's save directory. Labels accept 1–48 ASCII letters, digits, underscores or hyphens, not paths or existing save filenames. UUID names and a session reuse guard avoid intentionally overwriting prior saves; the plugin cannot perform a filesystem-wide existence check. The save API returns void, so `file_written` remains `unknown` even after acknowledgement. Verify the file before relying on it. An unknown request retains its generated filename for inspection and is never automatically retried. Saving does not load a park or reset the game. An unbuilt ride record was absent after a live save/reload; do not rely on persistence of an empty record without independently verifying it.

### Guest-operation smoke test

In a fresh, unpaused bundled sandbox with the matching plugin:

```sh
uv run --locked python scripts/guest_smoke_test.py --output-dir /tmp/guest-smoke-1
```

The script asks for consent (`--yes` explicitly skips the prompt), refuses existing rides and reused output directories, builds the fixed coaster in `scenarios/guest-coaster.json`, connects explicit flat queue/exit routes to the sandbox's existing public-path anchor, checks reciprocal edges and queue assignment, opens the ride and observes customer completion. It requests a checkpoint and retains logs and partial work on failure. It never resets the park, deletes existing rides, or changes cash/research. `--port` selects another plugin instance and `--timeout` bounds construction testing and guest observation separately.

For a **money-enabled copy** of the same empty sandbox, add `--price-raw 30` to verify paid rides. This refuses disabled-money or locked-admission parks before building. It sets the price through MCP, observes completed customers, an increase in the lifetime profit counter and a positive hourly income estimate. Financial snapshots are retained with the observations. It never enables money, changes charging rules or grants cash itself. An observed increase is evidence of receipts, not a gross-revenue ledger or proof of sustainable profitability; upkeep and delayed statistics matter.

This checks a known end-to-end workflow, not an automatic designer or general pathfinder. The fixture's geometry and station positions match this sandbox and its path routes; changing them requires updating and live-checking the routes too. Checkpoint acknowledgement alone does not verify the saved file.

A separate headless test instance with its own user-data directory and plugin port can preserve an existing interactive park. OpenRCT2's `--port` is its multiplayer port; change the local test plugin's listener port separately, then pass that port to the MCP scripts.

## Outcomes and response size

Mutation responses include `execution_status` (`completed`, `rejected`, `partial`, `unknown`) for overall progress, and `state_status` (`available`, `unavailable`, `not_requested`) for the subsequent inspection. `operation_outcome` retains the existing action-level meaning: `confirmed`, `rejected`, or `unknown`. Bulk demolition and incomplete entrance/exit placement can report `partial`. For a sequence, the outcome describes the failing segment (or `confirmed` when all succeeded), while `placed_count` counts acknowledged placements. Earlier pieces are never rolled back.

`success: false` with `operation_outcome: confirmed` can mean placement succeeded but endpoint inspection or the state refresh failed. `state_error` identifies a failed state refresh. On unknown outcomes, inspect the ride before retrying. The client never automatically resends mutations. A stopped sequence with acknowledged placements and unattempted pieces has `execution_status: partial`, including when its last action was confirmed but endpoint inspection failed. `completed` describes completion of the requested mutations, not success of every diagnostic read. Creation followed by a failed station placement also reports partial progress and the created ride ID. Failed naming preserves the ride/station and reports `name_outcome` separately. Structured `error_details` preserve game codes/messages when available.

Default state responses retain the full history and image. Images are capped at 1600 pixels per side, and text occupancy grids over 4096 tiles are omitted. Use `get_coaster_state(ride_id, include_image=false, compact=true)` for smaller responses. Batches accept up to 256 segments.

State-returning mutations (`create_ride`, placement/sequence, removal, entrance/exit placement) accept the same `include_image` and `compact` controls. Existing defaults are unchanged. State-returning MCP tools also expose their summary as structured content, with existing text/image blocks retained.

## Optional local metrics

For diagnostics, start the server with a new local metrics file:

```sh
uv run --locked openrct2-mcp --metrics-file /tmp/coaster-tools.jsonl
```

Alternatively set `OPENRCT2_METRICS_FILE`. Files are created exclusively and never overwritten. Metrics record tool names, completion times, durations, outcomes, placement/query/removal counts and response sizes. They do **not** record arguments, conversations, error text, result bodies or image data, and are not uploaded. Recording failures disable metrics rather than masking an action result.

A healthy server writes a completion marker on normal exit; interrupted captures can be incomplete. Counts cover that server process, not a specific ride. Requested placements are distinct from confirmed placements. Summed call duration is not elapsed session time or token usage. The optional `--port` selects another local plugin port; the plugin still binds only to loopback.

## Compatibility and security

- Live-verified against OpenRCT2 **0.5.7**, scripting API **124**, with plugin **0.19.0**. Other versions are not yet verified.
- `get_plugin_info` reports the loaded version and protocol capabilities. `matches` checks the plugin release; `protocol_compatible` checks the wire protocol. Package release numbers and wire protocol versions are separate. The current protocol is `1`. The plugin requires scripting API 124 or newer; only the listed game version is live-verified.
- The plugin listens only on `127.0.0.1:8080`. It has **no authentication** and is intended for a trusted local machine. Do not expose or forward this port to other machines. Local processes can still invoke destructive endpoints.
- The listener limits buffered request data to 1 MiB. The Python client limits response lines to 16 MiB and discards broken/timed-out connections without automatically retrying commands.
- This version requires the matching updated plugin for coherent state snapshots. Restart the game after installing it. Restart/reload your MCP client after updating the Python server as required by that client.

## Reviewed action registry

`src/openrct2_mcp/actions.json` defines 107 reviewed operations: 75 mutations
and 32 read-only observations (144 tools with the 37 custom workflows). Definitions contain names/descriptions, typed
arguments, fixed action/source mappings, response contracts and optional field
projections/readback. Enums, settings and flag masks are reviewed against OpenRCT2
0.5.7, not inferred from writable scripting properties.

Generation runs automatically:

- The Hatch build hook runs before wheel, source-distribution and editable builds.
- `uv` watches the registry, generators, audit inputs and hook as editable-build cache inputs.
  Editing a definition then using normal `uv run` commands refreshes bindings.
- `scripts/install_plugin.py` regenerates before copying the plugin, after
  validating the destination/overwrite guard. Prefer it over manually copying
  source files when developing registry changes.

Generated `_action_client.py`, `_action_tools.py` and the marked dispatch table in
`ridecreation-api.js` stay checked in. Installed servers use those ordinary Python
signatures, not runtime `exec` or reflection-based tool schemas. No generator runs
at installed-server startup. Build dependencies include Pydantic for definition
validation; installed servers do not need Hatchling.

The runtime accepts only reviewed endpoints/arguments/sources. Read-only transport
classification is generated too; observations never execute engine actions.
`get_plugin_info.registered_actions` lists all registry tool names, including reads.
Mutations retain independent acknowledgement/readback and no-retry contracts.

The generator can still be run directly for diagnostics:

```sh
uv run --locked --no-sync python scripts/generate_actions.py --check
```

CI checks that automatic generation does not leave checked-in outputs stale.
Tests exercise automatic builds from stale inputs, editable regeneration after
another edit, plugin installation, and the installed wheel's MCP/plugin contract.
Restart the game and reload the MCP client after installing a changed plugin.

The [full API audit](api-coverage.md) classifies all 81 native aliases and 255 SDK
interfaces, links input DTOs to action decisions, and records exact exclusions.
The README inventory is generated from the registry plus reviewed custom tool
summaries; it has one row per discoverable tool. Do not manually add generated
bindings or inventory rows. `docs/game-api-surface.json` pins source hashes,
member signatures and native visitor parameters. `docs/game-api-policy.json`
contains the reviewed scope and reasons. Refreshing upstream source is explicit;
normal builds need no network or OpenRCT2 installation.

### Generated operation contracts

- Ordinary ride, park, staff/guest, scenery and terrain primitives are
  individually named tools, not generic action/property setters. There is no
  autonomous route planner, park optimizer or rule/cheat selector.
- Inspect the tool's schema: `_game` coordinates are raw units (32/tile,
  Z=8/track-height unit), usually tile-aligned. Curated coaster/path coordinates
  remain tiles/height units. Land/water heights are 2–254 native height units.
  Water zero is rejected; a valid height at/below the land base removes water.
- `set_track_brake_speed` accepts eight reviewed speed-setting track names,
  not arbitrary track IDs. Encoded speeds are 0–30; odd values round down to
  the preceding even value. Inspect the actual track after changing it.
- `create_unbuilt_ride` creates a native record only. It does not place track or
  establish operability. `remove_station_building` is a separate native action;
  guarded placement/relocation remains custom.
- Staff patrol mutation coordinates are game units. Patrol observations return
  tile indices. Vehicle G-forces are explicitly raw values, not decimal G.
- Unpaged arrays are bounded 256-item prefixes. Available arrays include a total;
  unavailable nullable arrays do not invent a total. Paged reads have no stable
  cursor. IDs, indices and read snapshots are not reservations.
- Installed-object `version` is null because v0.5.7 does not register its declared
  getter. Scenery-group metadata contains identifier strings, not numeric indices.
  Type-gated tile projections avoid touching inapplicable native getters.
- `set_game_speed` exposes ordinary speeds 1–4 only. Native debug speeds 5–8 are
  excluded. Pause toggles once; read state before/after, not an idempotent recovery.
- Editor ownership, park entrance/spawn setup, map resizing and raw guest-behaviour
  replacement are no longer registered. Existing clients must reconnect after
  upgrading. These are not ordinary scenario-playing capabilities.
- Native creation does not enforce research or object/type compatibility itself.
  Creation now requires a known invented compatible loaded object; automatic
  object selection chooses from that set. Vehicle-object swaps enforce the same
  compatibility/research guard. Unknown research rejects rather than grants permission.
- Track placement/query also checks normal ride-type enabled groups and chain
  availability. Groups enabled only by the all-drawable-pieces cheat are excluded.
  Vehicle sprite compatibility is still not completely represented by these groups.
- Reversal respects normal ride-type availability and the vehicle's no-reverse flag.
  Multiple-circuit controls require their normal type/mode/train/station conditions.
  The native vehicle-array length reflects `numTrains` even before entities spawn;
  null slots must count for that guard, unlike instantiated-vehicle observations.
  Music controls require the normal ride-type flag. Native setting bounds alone
  do not establish that the UI exposes the corresponding control.
- Engine actions can reset vehicles/ratings, clear scenery or clamp ranges.
  Some intentionally provide acknowledgement only. Check native errors,
  `operation_outcome`, readback availability/matches and subsequent observations.
  Never retry unknown mutations or assume automatic rollback.

Construction, bulk demolition, guarded reset, pricing, paths, station placement
and curated multi-step observations remain custom where their invariants need it.
The audit records custom maze coverage, unsupported held-peep/track-design/lifecycle operations and
intentional cheat, infrastructure, administrative and synthetic-result exclusions.

## Development checks

Run the package tests with Python and Node.js installed:

```sh
uv sync --locked --extra dev
uv run --locked pytest src/tests
```

CI installs Node explicitly so JavaScript contract tests run. The tests cover the TCP/plugin contract against a stubbed game and an actual MCP client. They do not replace live-game verification.

The Python code uses a conventional `src/openrct2_mcp/` package. The console command remains `openrct2-mcp`. Runtime dependency bounds start at the versions used for verification and exclude untested future major versions; `uv.lock` pins the reproducible checkout environment. Pydantic is declared directly because the server and smoke-test fixture validation use it.

To verify distribution/install behaviour without a running game:

```sh
uv run --locked python scripts/check_install.py
```

This builds a source archive, builds a wheel from that archive, installs locked runtime dependencies and the wheel into a temporary isolated environment, and starts its actual console entry point through MCP from outside the checkout. With Node.js installed, it verifies registration, then runs a small construction/editing contract through the installed server and the source archive's plugin against a local stub. A unique stub identity is checked before any mutation, so it does not build in a running park. The check covers partial failures, stale guards, UTF-8, PNG responses and finalized metrics. This is protocol verification, not validation of OpenRCT2 physics or clearance. The wheel excludes tests; the source archive includes the plugin, skill, scenarios, scripts and detailed documentation. CI runs this check in its Python 3.10/3.12 matrix. The script cleans up its temporary build/install files.

For the full MCP-to-game flow, load the bundled empty sandbox, unpause, and run:

```sh
uv run --locked python scripts/smoke_test.py --check-endpoints --check-collisions --check-revision-api
```

The script asks for confirmation and refuses parks with existing rides. It checks plugin compatibility and the loaded, unpaused sandbox identity, verifies representative placements and removals in four temporary rotation-test rides (then deletes those rides), and checks same-ride collision rejection in another temporary ride, then builds a 42-piece circuit and checks both spatial views. It waits for moving trains and ratings, closes and explicitly resets the ride, removes/replaces its terminal flat piece, restores entrances/exits, and retests. `--timeout` changes the 120-second wait for each test phase. Omit `--check-endpoints` or `--check-collisions` to skip those optional checks. The collision regression expects the clearance status observed in OpenRCT2 0.5.7 and verifies both the query and rejected placement leave the track unchanged.

`--check-revision-api` creates and deletes only its own probe ride to verify loaded object selection, compact responses, alternative queries, stale append/removal guards, and chain/brake readback. It also reads a test report for the final coaster. `--metrics-file /tmp/smoke-run.jsonl` records that smoke server process.

The final coaster remains in the park. On failure, rides may remain for inspection. The script does not restart the game or delete pre-existing rides. Flatpak installations may require opening the scenario from within the OpenRCT2 user directory rather than directly from the repository.

## Current limitations

- Candidates cover a limited set of cardinal pieces. Ride-specific support is explicitly `unknown`, and a successful game query is not proof of support or connectivity.
- Diagonal/inverted geometry and special construction rules need further validation before coverage can expand.
- Editing assumes a single connected layout. Without a begin station, traversal starts from map order; endpoint removal is never historical undo.
- Entrance/exit placement targets the first station and does not build paths or establish guest access.
- Multiple clients or manual edits can change the park between a check and placement. Avoid concurrent construction on the same ride.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Failed to connect to OpenRCT2 API` | The game isn't running or the plugin isn't loaded. Start the game and load a scenario first. |
| `Connection refused` | The plugin uses port `8080`; if you set `RANDOM_PORT = true` in the plugin, set it back to `false`. |
| The agent keeps failing to place pieces | Make sure the scenario has flat ground where the station goes and the Wooden Roller Coaster available. |

## Plugin Attribution

The `ridecreation-api.js` plugin is a modified version of the [OpenRCT2 Ride Creation API](https://openrct2plugins.org/plugin/R_kgDONuEl9w/openrct2-ridecreation-api).