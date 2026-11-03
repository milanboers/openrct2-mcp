# OpenRCT2 Ride Creation MCP

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
- `place_track_sequence`: Place several segments in order, returning one final state and image. Stops at the first failure; earlier segments remain placed, and the failed segment may also have been placed. Inspect the final state before retrying. Each segment accepts `track_type`, `has_chain_lift`, `brake_speed`, and `seat_rotation`.
- `undo_last_piece`: Remove the terminal segment of a connected layout (not chronological undo). On a closed circuit with a begin station, removes the piece immediately before that station. Disconnected or ambiguous layouts are rejected.
- `get_coaster_state`: Get track history, actual track-element tiles and base heights, and a visualization. `candidate_status` explains when candidate generation is unavailable or the circuit is complete. `layout_status` reports disconnected or ambiguous track. Set `include_image: false, compact: true` for endpoint/candidate information without full history, occupancy or an image. The footprint is not collision-clearance data; the image's connecting lines are approximate.
- `place_entrance_exit`: Add entrance/exit to the station.
- `start_ride_test`: Start test mode for ratings.
- `close_ride`: Close a ride before editing track or changing vehicles.
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

## Using it

1. Start OpenRCT2 and load the **Sandbox** scenario (or your own).
2. Open your AI client in the workspace folder.
3. Tell the agent what you want, for example: *Use the build-coaster skill to build a wooden roller coaster, complete the circuit, and run a test ride.*

The agent walks through the tools — `create_ride`, `place_track_segment`, `get_coaster_state`, `place_entrance_exit`, `start_ride_test`, `get_ride_stats` — using the images and height maps the server returns to steer the coaster home.

## Tips

- The plugin's track validation is tuned for the **Wooden Roller Coaster** (the default ride type); other ride types work but may fail on some pieces.
- The station is placed at the same spot near the middle of the map, at ground level. That's why the sandbox is flat and empty — give the coaster room to roam.
- A candidate can still fail because of clearance or ride support. Read the game error and `candidate_status`; an empty candidate list can indicate unsupported geometry rather than a design dead end.
- You can build multiple coasters or continue a connected supported layout from a previous session. Disconnected layouts block implicit construction/removal. Arbitrary endpoint selection and multiple-station operation are not supported.
- To revise a tested coaster: `close_ride`, inspect state, edit, restore entrance/exit assignments with `place_entrance_exit` as needed, then `start_ride_test` again. OpenRCT2 may invalidate entrance/exit assignments after track edits.

## Outcomes and response size

Mutation responses include `operation_outcome`: `confirmed`, `rejected`, or `unknown`. Bulk demolition and incomplete entrance/exit placement can report `partial`. For a sequence, the outcome describes the failing segment (or `confirmed` when all succeeded), while `placed_count` counts acknowledged placements. Earlier pieces are never rolled back.

`success: false` with `operation_outcome: confirmed` can mean placement succeeded but endpoint inspection or the state refresh failed. `state_error` identifies a failed state refresh. On unknown outcomes, inspect the ride before retrying. The client never automatically resends mutations.

Default state responses retain the full history and image. Images are capped at 1600 pixels per side, and text occupancy grids over 4096 tiles are omitted. Use `get_coaster_state(ride_id, include_image=false, compact=true)` for smaller responses. Batches accept up to 256 segments.

## Compatibility and security

- Live-verified against OpenRCT2 **0.5.7**, scripting API **124**, with plugin **0.10.0**. Other versions are not yet verified.
- `get_plugin_info` reports the loaded version and protocol capabilities. `matches` checks the plugin release; `protocol_compatible` checks the wire protocol. Package release numbers and wire protocol versions are separate. The current protocol is `1`.
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

For the full MCP-to-game flow, load the bundled empty sandbox, unpause, and run:

```sh
uv run --locked python scripts/smoke_test.py --check-endpoints
```

The script asks for confirmation and refuses parks with existing rides. It checks plugin compatibility, verifies representative placements and removals in four temporary rotation-test rides (then deletes those rides), then builds a 41-piece circuit. It waits for moving trains and ratings, closes the ride, removes/replaces its terminal flat piece, restores entrances/exits, and retests. `--timeout` changes the 120-second wait for each test phase. Omit `--check-endpoints` to skip the temporary rides.

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