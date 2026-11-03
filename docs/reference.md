# Detailed setup and tool reference

Build roller coasters in OpenRCT2 with your AI coding assistant. The agent plans the layout, an in-game plugin places the track piece by piece, and the server sends back the ride's state — including a height map and a top-down picture — so the agent can keep designing until the circuit is closed.

![movie-1080p-final](https://github.com/user-attachments/assets/77bf232a-91c0-4205-a3c2-5c0bb3af9896)

## How it works

Three pieces talk to each other:

1. **In-game plugin** (`ridecreation-api.js`) — runs inside OpenRCT2 and opens a small TCP server on port `8080`. It places track through game actions and reports authoritative ride state. Connection-shape filtering, ride-specific support and physical clearance are separate checks (see limitations below).
2. **MCP server** (Python, this repo) — a plain stdio MCP server. Its tools forward to the game over that TCP connection.
3. **Your AI client** — Claude Code, Codex, pi, opencode, or any stdio MCP client. It runs the MCP server, loads the `build-coaster` skill, and drives the whole thing.

## Tools

- `create_ride`: Create a new coaster and place the first station piece.
- `place_track_segment`: Add a track segment. `valid_pieces` lists supported cardinal types whose connection shape matches; it does not guarantee ride support or clearance. Diagonal and inverted track are not supported by this filter. Placement responses include `endpoint_prediction_mismatches` if the predicted and actual endpoints differ.
- `check_track_segment`: Ask the game whether a piece can be placed at the current endpoint without building it. The result is not a reservation or a guarantee of ride support or connectivity.
- `get_map_area`: Inspect nearby terrain and map elements within a bounded radius.
- `get_coaster_view`: Read-only spatial feedback. `view: "endpoint"` shows nearby terrain, water/slope indicators, paths, objects and tracks with endpoint/return headings. `view: "elevation"` plots sampled heights against track-piece boundary index, not physical distance.
- `place_track_sequence`: Place several segments in order, returning one final state and image. Stops at the first failure; earlier segments remain placed, and the failed segment may also have been placed. Inspect the final state before retrying. Each segment accepts `track_type`, `has_chain_lift`, `brake_speed`, and `seat_rotation`.
- `undo_last_piece`: Remove the terminal segment of a connected layout (not chronological undo). On a closed circuit with a begin station, removes the piece immediately before that station. Disconnected or ambiguous layouts are rejected.
- `get_coaster_state`: Get track history, actual track-element tiles and base heights, and a visualization. `candidate_status` explains when candidate generation is unavailable or the circuit is complete. `layout_status` reports disconnected or ambiguous track. Set `include_image: false, compact: true` for endpoint/candidate information without full history, occupancy or an image. The footprint is not collision-clearance data; the image's connecting lines are approximate.
- `place_entrance_exit`: Add entrance/exit to the station.
- `start_ride_test`: Start test mode for ratings.
- `close_ride`: Close a ride before editing track or changing vehicles.
- `reset_ride`: Explicitly clear vehicles on an already closed, guest-free ride before substantial editing. No track is removed.
- `get_ride_station_access`: Inspect station buildings and bounded nearby path edges, heights and queue assignments (not proof of connectivity).
- `get_park_status`: Read park finances, guests, date, research and scenario objective/status without changing anything.
- `get_path_objects` / `get_path_area`: Discover loaded modern path objects and inspect bounded path edges, heights, queues and ghosts.
- `place_path_tile` / `remove_path_tile`: Build flat ground-level paths or remove one using an exact observed-path guard. No replacement, slopes, bridges or scenery clearing.
- `open_ride`: Open a ride through a normal game action.
- `get_ride_guest_report`: Observe customer-counter progress, with explicit limits on completion and access interpretation.
- `save_park`: Request a fresh named checkpoint. File persistence remains unknown until verified on disk.
- `get_ride_stats`: Get test status, pause state, instantiated trains and car counts, ratings, speed, length, duration, G-forces, and drops. Closed rides may have no instantiated trains. Ratings use the game's decimal scale (e.g. 6.52) and are `null` until calculated; vehicle velocities are raw game values.
- `list_all_rides`: List existing rides.
- `get_track_catalog`: Inspect game track descriptors and which types the server supports. The catalog isn't filtered for the current ride.
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

A cheap read-only check of a fresh MCP connection is available:

```sh
uv run --locked python scripts/check_ready.py --expected-park sandbox --require-unpaused
```

Add `--require-empty` before a fresh benchmark, or `--port` for another local plugin instance. Exit `0` means ready, `1` means unmet readiness checks, and `2` means collection/input failure. This checks server registration, compatibility and park state, **not another AI session's tool allowlist**. No agent/model calls or park changes are made.

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

Both views require a complete traversal of a connected layout. Neither establishes clearance, ride support, speed or G-forces. The endpoint view includes objects at all heights; consult their base/clearance heights in `map_area`. Ride and map reads are separate, so the park can change between them. These views require the matching plugin; the current plugin release is `0.13.0`.

## Tips

- The plugin's track validation is tuned for the **Wooden Roller Coaster** (the default ride type); other ride types work but may fail on some pieces.
- The station is placed at the same spot near the middle of the map, at ground level. That's why the sandbox is flat and empty — give the coaster room to roam.
- A candidate can still fail because of clearance or ride support. Read the game error and `candidate_status`; an empty candidate list can indicate unsupported geometry rather than a design dead end.
- You can build multiple coasters or continue a connected supported layout from a previous session. Disconnected layouts block implicit construction/removal. Arbitrary endpoint selection and multiple-station operation are not supported.
- To revise a tested coaster: `close_ride`, inspect state, explicitly `reset_ride` when clearing trains for construction, edit, restore entrance/exit assignments with `place_entrance_exit` as needed, then `start_ride_test` again. OpenRCT2 may invalidate entrance/exit assignments after track edits.

## Guarded construction and revision

Append placement now resolves the endpoint inside the plugin, checks connection candidates again, and checks the endpoint and piece count observed by the Python client before submitting the game action. An optional `expected_endpoint` on single-piece or sequence placement also checks against the agent's previous observation (for a sequence, on its first piece).

`preview_track_removal` identifies the exact terminal segment without removing it. Pass its `target` as `expected_target` to `remove_terminal_piece` or the existing `undo_last_piece`. The latter remains an endpoint-removal alias, not chronological undo. A stale target/count is rejected before submitting removal.

These guards are not transactions or reservations. They cannot detect every interior edit and do not make OpenRCT2's asynchronous action execution atomic. Avoid concurrent construction on the same ride.

`check_track_candidates` queries 1–32 alternatives at the same observed endpoint, preserving each candidate's clearance result. It never treats the list as a hypothetical sequence. Changed before/after snapshots invalidate the batch; queries still do not prove ride-specific support or reserve space.

## Test reports and loaded objects

`get_ride_test_report(ride_id, observe_seconds=0)` combines layout/circuit checks, running/pause state, movement observations, ratings and game-reported telemetry. Use an observation window up to 60 seconds when needed (subject to your MCP client's timeout). It does not start, close, edit or unpause a ride. `success` means collection succeeded; `ready` means all observed readiness checks passed. Missing motion is not proof of a stall. Station entrance/exit presence is checked; guest path connectivity is not established.

`get_loaded_ride_objects(ride_type=52)` discovers loaded vehicle/ride objects and nominal car limits. Select an object by its identifier, then pass its current `index` as `ride_object` to `create_ride`. The default `65535` still asks the game to choose automatically. Indices can change between parks. Each object includes per-type `research` entries: `invented`, `uninvented` or `unknown`, matched by both object index and ride type. Null ride-type sentinels and duplicates are omitted. This is not a guarantee of buildability: track support, scenario restrictions and clearance remain separate.

Full coaster state includes the selected `ride_object` and per-piece `options` read from actual elements: chain lift, brake speed, seat rotation, colour scheme, inversion and cable-lift flags. `null` means unavailable or inapplicable, not an inferred zero/default. This is preparation for faithful export, not an arbitrary-layout recipe export/replay API.

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

## Flat paths, guests and checkpoints

The first path-construction scope is one flat ground level using modern path surface and railings objects. Inspect park-local indices with `get_path_objects`, then use `place_path_tile(x, y, z, surface_object, railings_object, is_queue=False)`. Coordinates are tiles, with Z in units of 8; path Z must be even. Ground must be flat and dry. Existing paths and scenery are not replaced or cleared. Sufficiently elevated track can remain overhead, subject to the game's clearance checks.

The game connects edges and assigns queue ownership. Placement returns neighboring path observations from before and after the action, including overlapping heights and ghosts. `remove_path_tile` requires the exact current path observation from `get_path_area`, and accepts only a single flat, non-ghost path without an addition. These checks are not reservations or transactions. Side effects can extend beyond the observed one-tile neighborhood, particularly queue reassignment. No automatic rollback is attempted.

`open_ride` uses the normal ride-status action. It does not prove access. `get_ride_guest_report(ride_id, observe_seconds=10)` retains test-readiness observations and reports customer-counter changes. Completion interpretation is validated only for wooden coasters on OpenRCT2 0.5.7: the counter increments in `Guest::onExitRide`. This does not trace individual guests or certify a route to the public network. Already-boarded guests may complete during an observation, and no progress can reflect demand, dispatch or breakdowns rather than inaccessible paths.

`save_park(label)` requests a checkpoint named `mcp-<label>-<fresh UUID>.park` in the game's save directory. Labels accept 1–48 ASCII letters, digits, underscores or hyphens, not paths or existing save filenames. UUID names and a session reuse guard avoid intentionally overwriting prior saves; the plugin cannot perform a filesystem-wide existence check. The save API returns void, so `file_written` remains `unknown` even after acknowledgement. Verify the file before relying on it. An unknown request retains its generated filename for inspection and is never automatically retried. Saving does not load a park or reset the game.

### Guest-operation calibration

In a fresh, unpaused bundled sandbox with the matching plugin:

```sh
uv run --locked python scripts/guest_smoke_test.py --output-dir /tmp/guest-calibration-1
```

The script asks for consent (`--yes` explicitly skips the prompt), refuses existing rides and reused output directories, builds a rated reference, connects explicit flat queue/exit routes to the sandbox's existing public-path anchor, checks reciprocal edges and queue assignment, opens the ride and observes customer completion. It requests a checkpoint and retains evidence and partial work on failure. It never resets the park, deletes existing rides, changes cash/research, or chooses an agent's design. `--port` selects another plugin instance and `--timeout` bounds construction testing and guest observation separately.

This is scripted calibration, not agent performance or scenario completion. It checks specific routes to a known anchor, not arbitrary park-wide pathfinding. A separate headless test instance with its own user-data directory and plugin port can preserve an existing interactive park. OpenRCT2's `--port` is its multiplayer port; change the local test plugin's listener port separately, then pass that port to the MCP scripts.

## Outcomes and response size

Mutation responses include `execution_status` (`completed`, `rejected`, `partial`, `unknown`) for overall progress, and `state_status` (`available`, `unavailable`, `not_requested`) for the subsequent inspection. `operation_outcome` retains the existing action-level meaning: `confirmed`, `rejected`, or `unknown`. Bulk demolition and incomplete entrance/exit placement can report `partial`. For a sequence, the outcome describes the failing segment (or `confirmed` when all succeeded), while `placed_count` counts acknowledged placements. Earlier pieces are never rolled back.

`success: false` with `operation_outcome: confirmed` can mean placement succeeded but endpoint inspection or the state refresh failed. `state_error` identifies a failed state refresh. On unknown outcomes, inspect the ride before retrying. The client never automatically resends mutations. A sequence with confirmed earlier pieces and a rejected/unknown next action has `execution_status: partial`. Creation followed by a failed station placement also reports partial progress and the created ride ID. Failed naming preserves the ride/station and reports `name_outcome` separately. Structured `error_details` preserve game codes/messages when available.

Default state responses retain the full history and image. Images are capped at 1600 pixels per side, and text occupancy grids over 4096 tiles are omitted. Use `get_coaster_state(ride_id, include_image=false, compact=true)` for smaller responses. Batches accept up to 256 segments.

State-returning mutations (`create_ride`, placement/sequence, removal, entrance/exit placement) accept the same `include_image` and `compact` controls. Existing defaults are unchanged. State-returning MCP tools also expose their summary as structured content, with existing text/image blocks retained.

## Optional local metrics

Start a dedicated server process for each trial with:

```sh
uv run --locked openrct2-mcp --metrics-file /tmp/coaster-trial-1.jsonl
```

Alternatively set `OPENRCT2_METRICS_FILE` in that server's environment. Files are created exclusively and never overwritten. Metrics record tool names, completion times, durations, outcomes, placement/query/removal counts and response sizes. They do **not** record arguments, conversations, error text, result bodies or image data, and are not uploaded. Recording failures disable metrics rather than masking an action result. A healthy server writes a completion marker when it exits normally. Close the client/server cleanly before evaluating metrics. Unfinished captures (including legacy files without a marker) are rejected by default; `evaluate_ride.py --allow-incomplete-metrics` explicitly accepts their recorded prefix and labels it `capture_complete: false`.

Counts cover that server process, not proven agent/ride ownership. Requested placements are distinct from confirmed placements; rejected placement requests include preflight rejection. Summed call duration is not elapsed trial time or token usage. The optional `--port` selects another local plugin port; the plugin itself still binds only to loopback.

## Agent benchmarks

`benchmarks/` contains prompts and versioned acceptance criteria for a working coaster, a compact footprint, and an excitement/intensity target. Run an agent against a brief in a fresh sandbox, then collect a read-only evaluation:

```sh
uv run --locked python scripts/evaluate_ride.py \
  --brief benchmarks/working-coaster.json --ride-id 0 \
  --agent-label "model-settings-run-1" --output /tmp/coaster-result.json
```

The evaluator observes movement, records ratings and actual track-element bounds, and preserves the brief and evidence in a JSON report. It does not build, start, close, unpause or delete anything, and refuses mixed evidence if the layout changes. Exit `0` means pass, `1` means failed acceptance checks, and `2` means invalid input or a collection error. Reports are never overwritten. See [benchmarks/README.md](../benchmarks/README.md) for the trial protocol and limitations. These are seed tasks, not model rankings. The bundled version-2 briefs require observed station entrance/exit presence; legacy version-1 briefs remain readable with their original criteria. Optional `--metrics-file /tmp/coaster-trial-1.jsonl` attaches process-level counts to the report. Known-passing construction inputs, an opt-in reference builder, and continuation/obstruction/rating-revision trial setups are documented in [benchmarks/README.md](../benchmarks/README.md).

## Compatibility and security

- Live-verified against OpenRCT2 **0.5.7**, scripting API **124**, with plugin **0.13.0**. Other versions are not yet verified.
- `get_plugin_info` reports the loaded version and protocol capabilities. `matches` checks the plugin release; `protocol_compatible` checks the wire protocol. Package release numbers and wire protocol versions are separate. The current protocol is `1`. The plugin requires scripting API 124 or newer; only the listed game version is live-verified.
- The plugin listens only on `127.0.0.1:8080`. It has **no authentication** and is intended for a trusted local machine. Do not expose or forward this port to other machines. Local processes can still invoke destructive endpoints.
- The listener limits buffered request data to 1 MiB. The Python client limits response lines to 16 MiB and discards broken/timed-out connections without automatically retrying commands.
- This version requires the matching updated plugin for coherent state snapshots. Restart the game after installing it. Restart/reload your MCP client after updating the Python server as required by that client.

## Development checks

Run the package tests with Python and Node.js installed:

```sh
uv sync --locked --extra dev
uv run --locked pytest src/tests
```

CI installs Node explicitly so JavaScript contract tests run. The tests cover the TCP/plugin contract against a stubbed game and an actual MCP client. They do not replace live-game verification.

The Python code uses a conventional `src/openrct2_mcp/` package. The console command remains `openrct2-mcp`. Runtime dependency bounds start at the versions used for verification and exclude untested future major versions; `uv.lock` pins the reproducible checkout environment. Pydantic is declared directly because the server and benchmark schema use it.

To verify distribution/install behaviour without a running game:

```sh
uv run --locked python scripts/check_install.py
```

This builds a source archive, builds a wheel from that archive, installs locked runtime dependencies and the wheel into a temporary isolated environment, and starts its actual console entry point through MCP from outside the checkout. With Node.js installed, it verifies registration, then runs a small construction/editing contract through the installed server and the source archive's plugin against a local stub. A unique stub identity is checked before any mutation, so it does not build in a running park. The check covers partial failures, stale guards, UTF-8, PNG responses and finalized metrics. This is protocol verification, not validation of OpenRCT2 physics or clearance. The wheel excludes tests; the source archive includes the plugin, skill, scenario, scripts and benchmarks. CI runs this check in its Python 3.10/3.12 matrix. The script cleans up its temporary build/install files.

For the full MCP-to-game flow, load the bundled empty sandbox, unpause, and run:

```sh
uv run --locked python scripts/smoke_test.py --check-endpoints --check-collisions --check-revision-api
```

The script asks for confirmation and refuses parks with existing rides. It checks plugin compatibility and the loaded, unpaused sandbox identity, verifies representative placements and removals in four temporary rotation-test rides (then deletes those rides), and checks same-ride collision rejection in another temporary ride, then builds a 42-piece circuit and checks both spatial views. It waits for moving trains and ratings, closes and explicitly resets the ride, removes/replaces its terminal flat piece, restores entrances/exits, and retests. `--timeout` changes the 120-second wait for each test phase. Omit `--check-endpoints` or `--check-collisions` to skip those optional checks. The collision regression expects the clearance status observed in OpenRCT2 0.5.7 and verifies both the query and rejected placement leave the track unchanged.

`--check-revision-api` creates and deletes only its own probe ride to verify loaded object selection, compact responses, alternative queries, stale append/removal guards, and chain/brake readback. It also reads a test report for the final coaster. `--metrics-file /tmp/smoke-run.jsonl` records that smoke server process (not an agent benchmark).

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