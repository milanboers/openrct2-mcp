# OpenRCT2 Ride Creation MCP

Build roller coasters in OpenRCT2 with an AI coding assistant. The agent designs the layout, an in-game plugin places track through normal game actions, and the MCP server returns authoritative state and images for the next decision.

![movie-1080p-final](https://github.com/user-attachments/assets/77bf232a-91c0-4205-a3c2-5c0bb3af9896)

Works with Claude Code, Codex, pi, opencode and other stdio MCP clients. Live-verified with **OpenRCT2 0.5.7 / scripting API 124 / plugin 0.14.0**.

## How it works

1. **In-game plugin** (`ridecreation-api.js`) runs inside OpenRCT2, accepts local TCP requests and places track through game actions.
2. **MCP server** (Python) forwards tool calls to the plugin and returns ride state, terrain observations and images.
3. **AI client** plans the layout, inspects results and decides what to build or revise next. The server does not design the coaster.

## Tools

| Tool | Purpose |
| --- | --- |
| `create_ride` | Create a coaster and its first station piece. |
| `place_track_segment` | Place one track piece. |
| `place_track_sequence` | Place a batch of track pieces, stopping at the first failure. |
| `check_track_segment` | Query one track piece without building. |
| `check_track_candidates` | Query independent track alternatives without building. |
| `get_coaster_state` | Inspect layout, history, endpoint, candidates and track occupancy. |
| `get_map_area` | Inspect nearby terrain and objects. |
| `get_coaster_view` | View the endpoint surroundings or elevation profile. |
| `preview_track_removal` | Identify the terminal piece before removal. |
| `remove_terminal_piece` | Remove the terminal piece with an optional stale-state guard. |
| `undo_last_piece` | Alias for terminal-piece removal, not chronological undo. |
| `place_station_building` | Place an entrance or exit at a chosen position, with a guard for relocation. |
| `place_entrance_exit` | Automatically place missing station entrance/exit buildings. |
| `get_ride_station_access` | Inspect station buildings and nearby paths. |
| `start_ride_test` | Start testing a ride to calculate ratings. |
| `get_ride_test_report` | Inspect test readiness and optionally observe train movement. |
| `get_ride_stats` | Read ride status, ratings and train telemetry. |
| `close_ride` | Close a ride before editing. |
| `reset_ride` | Explicitly clear vehicles on a closed, guest-free ride. |
| `get_loaded_ride_objects` | Discover loaded ride and vehicle objects. |
| `set_ride_vehicles` | Configure train count or cars per train on a closed ride. |
| `get_track_catalog` | List track descriptors, optionally only the server's supported subset. |
| `get_park_status` | Read finances, guests, research and scenario status. |
| `get_path_objects` | Discover loaded path surfaces and railings. |
| `get_path_area` | Inspect path edges, heights and queue assignments. |
| `place_path_tile` | Build one flat ground-level path tile. |
| `place_path_sequence` | Build a caller-chosen sequence of flat path tiles, stopping on failure. |
| `remove_path_tile` | Remove a flat path using its current observation. |
| `open_ride` | Open a ride through the normal game action. |
| `get_ride_guest_report` | Observe customer-counter progress. |
| `save_park` | Request a fresh checkpoint, with disk persistence still to be verified. |
| `get_plugin_info` | Diagnose connection and plugin/protocol compatibility. |
| `list_all_rides` | List existing rides. |
| `delete_ride` | Demolish one ride by ID. |
| `delete_all_rides` | Demolish all rides. |

## Setup

Requires OpenRCT2, [uv](https://docs.astral.sh/uv/) and an MCP-capable client.

### 1. Install the plugin and sandbox

Copy `ridecreation-api.js` into your OpenRCT2 user directory's `plugin/` folder:

| OS | OpenRCT2 user directory |
| --- | --- |
| macOS | `~/Library/Application Support/OpenRCT2/` |
| Windows | `Documents/OpenRCT2/` |
| Linux | `~/.config/OpenRCT2/` |
| Linux (Flatpak) | `~/.var/app/io.openrct2.OpenRCT2/config/OpenRCT2/` |

Or use the installer:

```sh
uv run python scripts/install_plugin.py --user-dir "/path/to/OpenRCT2"
```

Add `--overwrite` to replace an existing copy. **Save your park and restart OpenRCT2 after updating the plugin**; a running game keeps its loaded code.

Copy `scenarios/sandbox.park` into the user directory's `scenario/` folder. This provides a flat map with the Wooden Roller Coaster available. Load it in OpenRCT2 and unpause.

### 2. Install the server

From this checkout:

```sh
uv sync --locked
```

### 3. Connect your AI client

Use a dedicated workspace so the game tools stay separate from your coding projects.

**Claude Code:** create `.mcp.json` in that workspace:

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

**Codex:** create `.codex/config.toml` in the workspace:

```toml
[mcp_servers.openrct2-mcp]
command = "uv"
args = ["--directory", "/path/to/openrct2-mcp", "run", "openrct2-mcp"]
```

**pi:** configure it locally from the workspace:

```sh
pi mcp add --local openrct2 -- uv --directory /path/to/openrct2-mcp run openrct2-mcp
```

**opencode and other clients:** launch `uv --directory /path/to/openrct2-mcp run openrct2-mcp` as a local stdio server. See the [client configuration examples](docs/reference.md#4-connect-your-ai-client).

Trust the project when prompted. Restart/reload the MCP client after server updates. Subagents need their own MCP tool permissions; parent access does not imply child access.

### 4. Install the skill

Copy `skills/build-coaster/SKILL.md` into your workspace's client-specific location:

| Client | Skill path |
| --- | --- |
| Claude Code | `.claude/skills/build-coaster/SKILL.md` |
| Codex | `.agents/skills/build-coaster/SKILL.md` |
| pi | `.pi/skills/build-coaster/SKILL.md` |
| opencode | `.opencode/skills/build-coaster/SKILL.md` |

## Use it

Ask the agent:

> Use the build-coaster skill to build a wooden roller coaster, complete the circuit, add station buildings and test it. Inspect the ratings and train movement before calling it done.

Start with `get_plugin_info` to verify the loaded plugin. A fresh, read-only server/park check is also available:

```sh
uv run --locked python scripts/check_ready.py --expected-park sandbox --require-unpaused
```

This checks server registration and park readiness, not another agent session's tool allowlist.

## Safety and limits

- The plugin listens on **127.0.0.1:8080 without authentication**. Keep it local; callers can demolish rides. Do not expose or forward the port.
- Updated clients check plugin compatibility before mutations. Use the matching plugin and server; the plugin requires scripting API 124 or newer.
- A compatible connection shape or successful placement query does not prove ride support, clearance or operation. A closed circuit alone is not a working ride.
- Mutations are not transactions. On failures, earlier pieces remain and the last action may have an unknown outcome. Inspect before retrying; the client never automatically resends mutations.
- Track editing supports a validated cardinal subset and one connected layout. Diagonal/inverted geometry, arbitrary interior editing and multiple-station operation remain unsupported.
- Path construction is limited to flat, dry ground with no replacement or scenery clearing. Nearby paths, open status and moving trains do not establish guest access. Customer-completion interpretation is validated only for wooden coasters on the tested game version.
- Saving does not load a park or reset it. Preserve existing work and avoid concurrent edits to the same ride.

## Development checks

```sh
uv sync --locked --extra dev
uv run --locked pytest src/tests
uv run --locked python scripts/check_install.py
```

Node.js is required for the JavaScript contract tests. Stubbed tests do not replace live-game verification.

- [Detailed setup, tool contracts, troubleshooting and live checks](docs/reference.md)
- [Guest-operation smoke test](docs/reference.md#guest-operation-smoke-test): opt-in live checks for queue/exit routes, customer completion and a checkpoint in a fresh sandbox.

## Attribution

The plugin is based on the [OpenRCT2 Ride Creation API](https://openrct2plugins.org/plugin/R_kgDONuEl9w/openrct2-ridecreation-api).
