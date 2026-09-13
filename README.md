# OpenRCT2 Ride Creation MCP

Build roller coasters in OpenRCT2 with your AI coding assistant. The agent plans the layout, an in-game plugin places the track piece by piece, and the server sends back the ride's state — including a height map and a top-down picture — so the agent can keep designing until the circuit is closed.

![movie-1080p-final](https://github.com/user-attachments/assets/77bf232a-91c0-4205-a3c2-5c0bb3af9896)

## How it works

Three pieces talk to each other:

1. **In-game plugin** (`ridecreation-api.js`) — runs inside OpenRCT2 and opens a small TCP server on port `8080`. It places track, validates every piece against the game rules, and reports the ride state.
2. **MCP server** (Python, this repo) — a plain stdio MCP server. Its tools forward to the game over that TCP connection.
3. **Your AI client** — Claude Code, Codex, pi (with pi-mcp-adapter), opencode, or any stdio MCP client. It runs the MCP server, loads the `build-coaster` skill, and drives the whole thing.

## Tools

- `create_ride`: Create a new coaster and place the first station piece.
- `place_track_segment`: Add a track segment (validates against game rules).
- `undo_last_piece`: Remove the last placed segment.
- `get_coaster_state`: Get the current authoritative state and visualization.
- `place_entrance_exit`: Add entrance/exit to the station.
- `start_ride_test`: Start test mode for ratings.
- `get_ride_stats`: Get intensity, excitement, and nausea ratings.
- `list_all_rides`: List existing rides.
- `delete_all_rides`: Clear all rides.

## Prerequisites

- **OpenRCT2** (in-game plugins are enabled by default)
- **uv** — see [astral.sh/uv](https://docs.astral.sh/uv/)
- an MCP-capable AI client (Claude Code, Codex, pi with pi-mcp-adapter, opencode, ...)

## Setup

### 1. Copy the plugin into OpenRCT2

Copy `ridecreation-api.js` into your OpenRCT2 `plugin` folder (create the folder if needed):

| OS | OpenRCT2 user folder |
| --- | --- |
| macOS | `~/Library/Application Support/OpenRCT2/` |
| Windows | `Documents/OpenRCT2/` |
| Linux | `~/.config/OpenRCT2/` |

So on macOS the file ends up at `~/Library/Application Support/OpenRCT2/plugin/ridecreation-api.js`.

### 2. Use the sandbox scenario

This repo includes a ready-made scenario in `scenarios/sandbox.park`. It's a flat, empty map with the Wooden Roller Coaster already available, so it works out of the box. Copy it into the `scenario` subfolder of the OpenRCT2 user folder from step 1.

Prefer your own map? Most scenarios work — two things make it easier:

- **The station spot**: `create_ride` puts the station at tile (67, 66) at ground level — roughly the middle of a 128×128 map — so that one tile needs to be flat and clear. You can pass custom `station_x/y/z` to `create_ride`, but the plugin assumes the default spot when checking if a circuit is complete, so it's easiest to use a map that's flat there.
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

#### pi (with pi-mcp-adapter)

Pi doesn't support MCP out of the box, but the popular [pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) adds it. Install the adapter and restart Pi:

```
pi install npm:pi-mcp-adapter
```

The adapter reads the standard `.mcp.json` file, so the exact same config as Claude Code above just works — if you already created `.mcp.json`, you're done.

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
- If the agent says a track piece is invalid, it ignored the `valid_pieces` list. Tell it to re-read the last tool response.
- The server reads the track straight from the game, so you can build **multiple coasters** in one session, **continue a coaster from a previous session**, or work on a save that already has coasters — just point the agent at the ride you want to keep building.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Failed to connect to OpenRCT2 API` | The game isn't running or the plugin isn't loaded. Start the game and load a scenario first. |
| `Connection refused` | The plugin uses port `8080`; if you set `RANDOM_PORT = true` in the plugin, set it back to `false`. |
| The agent keeps failing to place pieces | Make sure the scenario has flat ground where the station goes and the Wooden Roller Coaster available. |

## Plugin Attribution

The `ridecreation-api.js` plugin is a modified version of the [OpenRCT2 Ride Creation API](https://openrct2plugins.org/plugin/R_kgDONuEl9w/openrct2-ridecreation-api).