# OpenRCT2 MCP

Build rides and paths, manage park operations, and inspect guests, staff, finances, research and terrain in OpenRCT2 through an MCP client. The in-game bridge uses normal game actions and returns observed state. The caller decides what to build or change.

![movie-1080p-final](https://github.com/user-attachments/assets/77bf232a-91c0-4205-a3c2-5c0bb3af9896)

Works with Claude Code, Codex, pi, opencode and other stdio MCP clients. Live-verified with **OpenRCT2 0.5.7 / scripting API 124 / plugin 0.19.0**.

## How it works

1. **In-game plugin** (`openrct2-mcp.js`) runs inside OpenRCT2, accepts local TCP requests and performs construction and park-management actions.
2. **MCP server** (Python) forwards tool calls to the plugin and returns game state, bounded observations and images.
3. **AI client** chooses construction and park-management actions, inspects results and decides what to change next. The server does not plan layouts or park strategy.

Handwritten construction workflows live in [`coaster_tools.py`](src/openrct2_mcp/coaster_tools.py), with snapshot formatting in [`coaster_state.py`](src/openrct2_mcp/coaster_state.py). [`mcp_server.py`](src/openrct2_mcp/mcp_server.py) composes the tool groups, enables strict input validation and closes the TCP client when the server lifespan ends.

A reviewed [action registry](src/openrct2_mcp/actions.json) generates typed Python bindings and plugin dispatch for ordinary ride, park, staff, scenery and terrain actions and observations. Construction and guarded workflows remain custom. The [player-capability matrix](docs/player-capabilities.md) distinguishes usable workflows, live evidence and remaining gaps. The [API coverage audit](docs/api-coverage.md) lists every native action and SDK interface, its coverage and exclusions.

## Tools

<!-- BEGIN GENERATED TOOL INVENTORY -->
- `buy_land_rights` — Buy rights offered for sale; does not grant arbitrary ownership.
- `check_track_candidates` — Query independent track alternatives without building.
- `check_track_segment` — Query one track piece without building.
- `clear_scenery` — Clear selected items: small scenery=1,large=2,paths=4,walls=8,path additions=16.
- `close_park` — Close the park to new arrivals; this does not evacuate existing guests.
- `close_ride` — Close a ride before editing track or vehicles.
- `create_ride` — Create a coaster and its first station piece.
- `create_unbuilt_ride` — Create only a native ride record, without track, station, name, buildings or paths.
- `delete_all_rides` — Demolish all rides.
- `delete_ride` — Permanently demolish one ride by ID, including its track and vehicles.
- `edit_maze_cell` — Build or fill a caller-chosen maze half-cell using the normal editor action.
- `fire_staff` — Permanently fire one staff member.
- `get_balloon_details` — Read a balloon entity and its native position in game coordinates.
- `get_calendar` — Read calendar/ticks; month 0=March, year starts at 1, month progress is 0-65535.
- `get_coaster_state` — Inspect layout, history, endpoint, candidates and track occupancy.
- `get_coaster_view` — View the endpoint surroundings or elevation profile.
- `get_entity_details` — Read entity identity/type and position.
- `get_game_state` — Read game mode, pause state and native speed.
- `get_guest_details` — Read native guest state (0-255 needs except energy/intensity/tolerance as specified by the SDK), cash in tenths GBP and favourite ride.
- `get_guest_flags` — Read all named peep flags exposed by the SDK.
- `get_guest_items` — Read guest possessions; voucher/photo-only attributes are null on other item types.
- `get_guest_thoughts` — Read native guest thoughts and freshness counters (not inferred intent).
- `get_installed_objects` — Read paged installed-object metadata without loading/unloading anything.
- `get_litter_details` — Read a litter entity and its native position in game coordinates.
- `get_loaded_music_objects` — List loaded music objects with park-local indices, identifiers and localized names.
- `get_loaded_object_details` — Read one loaded park-local object, common identity and applicable ride/scenery metadata.
- `get_loaded_objects` — List loaded object indices, identifiers and localized names for a selected object category.
- `get_loaded_ride_objects` — Discover loaded ride and vehicle objects.
- `get_map_area` — Inspect nearby terrain and objects.
- `get_map_tile` — Read one tile and up to 256 type-gated native element records, with elements_total.
- `get_monthly_expenditure` — Read up to 16 native monthly expenditure entries (index 0=current month).
- `get_park_awards` — Read actual park awards; does not grant awards or certify eligibility.
- `get_park_flags` — Read named park flags without changing scenario rules or money/research state.
- `get_park_guest_generation` — Read guest-generation settings/counters, not a guarantee of arrivals.
- `get_park_messages` — Read current/archived park news, native dates and subjects; does not post/delete messages.
- `get_park_status` — Read finances, guests, research and scenario status.
- `get_path_area` — Inspect path edges, heights and queue assignments.
- `get_path_objects` — Discover loaded path surfaces and railings.
- `get_plugin_info` — Diagnose connection and plugin/protocol compatibility.
- `get_research_items` — Read invented and uninvented research queues.
- `get_research_status` — Read research funding, progress and expected completion date.
- `get_ride_build_options` — Discover normal-play starting pieces, enabled track groups, loaded objects and research.
- `get_ride_finances` — Inspect prices, charging rules, upkeep and financial estimates/counters.
- `get_ride_guest_report` — Observe customer-counter progress.
- `get_ride_layout` — Inspect physical track elements and exact selections across connected/disconnected layouts, footprints and mazes.
- `get_ride_maintenance_status` — Read inspection interval (engine enum 0-6), reliability/downtime percentages, age in game months and due-inspection/broken-down/crashed flags.
- `get_ride_operating_settings` — Read current operating settings without changing the ride.
- `get_ride_station_access` — Inspect station buildings and nearby paths.
- `get_ride_stats` — Read ride status, ratings and train telemetry.
- `get_ride_test_report` — Inspect test readiness and optionally observe train movement.
- `get_ride_track_colours` — Read one track colour scheme (0-3).
- `get_ride_vehicle_colours` — Read one vehicle colour slot.
- `get_scenario_details` — Read scenario identity, description, status, objective type and completion metadata without changing success, objectives or time.
- `get_staff_details` — Read staff type, orders and basic peep state.
- `get_staff_flags` — Read all named peep flags exposed by the SDK.
- `get_staff_patrol_tiles` — Read a bounded page of staff patrol tiles as tile indices (not game coordinates), plus total count.
- `get_track_catalog` — List track descriptors, optionally only the server's supported subset.
- `get_vehicle_details` — Read a vehicle/car snapshot in raw game/API units.
- `get_weather` — Read current/future weather and temperature (native Celsius), not a forecast time guarantee.
- `hire_staff` — Hire staff.
- `list_all_rides` — List existing rides.
- `list_entities` — Page through native entities; IDs can disappear/recycle between calls.
- `lower_land` — Apply native land editing to a selected range; engine checks local authority, ownership, clearance and supports.
- `lower_water` — Change native water height across a range.
- `open_park` — Open the park to guests.
- `open_ride` — Open a ride through the game's normal status action.
- `place_banner` — Place banner.
- `place_entrance_exit` — Automatically place missing station entrance/exit buildings.
- `place_large_scenery` — Place large scenery.
- `place_path_addition` — Place/replace or remove a path addition (bin, bench, lamp, etc.).
- `place_path_sequence` — Build a caller-chosen flat/elevated/sloped path sequence, stopping on failure.
- `place_path_tile` — Build one flat, elevated or sloped modern path without replacement or local scenery clearing.
- `place_ride_footprint` — Build the normal footprint of an existing empty flat ride, shop or facility.
- `place_small_scenery` — Place small scenery.
- `place_station_building` — Place an entrance or exit at a chosen position, with a guard for relocation.
- `place_track_segment` — Place one track piece.
- `place_track_sequence` — Place a batch of track pieces, stopping at the first failure.
- `place_wall` — Place wall.
- `press_balloon` — Press/pop a balloon entity using the game action; entity must be a balloon.
- `preview_track_removal` — Identify the terminal piece before removal.
- `raise_land` — Apply native land editing to a selected range; engine checks local authority, ownership, clearance and supports.
- `raise_water` — Change native water height across a range.
- `remove_banner` — Remove the currently selected banner.
- `remove_large_scenery` — Remove the currently selected large scenery.
- `remove_path_addition` — Place/replace or remove a path addition (bin, bench, lamp, etc.).
- `remove_path_tile` — Remove a flat, elevated or sloped path using its exact current observation.
- `remove_small_scenery` — Remove the currently selected small scenery.
- `remove_station_building` — Remove the selected station entrance/exit through the native action.
- `remove_terminal_piece` — Remove the terminal piece with an optional stale-state guard.
- `remove_track_piece` — Remove a chosen whole track piece with a guarded live element selection.
- `remove_wall` — Remove the currently selected wall.
- `renew_ride` — Refurbish/renew an existing ride, not demolish it.
- `reset_ride` — Explicitly clear vehicles on a closed, guest-free ride.
- `save_park` — Request a fresh checkpoint, with disk persistence still to be verified.
- `set_banner_colour` — Recolour the currently selected banner.
- `set_game_speed` — Set normal player game speed (1=normal, 2-4=fast).
- `set_guest_name` — Rename one guest by entity ID.
- `set_land_height` — Set one land tile base height in units of 8 game coordinates and native corner-slope bits (0-31).
- `set_large_scenery_colour` — Recolour the currently selected large scenery.
- `set_park_entrance_fee` — Set entrance fee in tenths GBP (10 raw = GBP 1).
- `set_park_loan` — Set outstanding loan in tenths GBP.
- `set_park_name` — Rename the park (not its scenario).
- `set_research_funding` — Set research category bitmask (transport=1,gentle=2,coaster=4,thrill=8,water=16,shop=32,scenery=64) and spending.
- `set_ride_circuit_count` — Set the number of circuits through the normal game action (1-20, the normal engine range).
- `set_ride_departure_flags` — Replace the entire departure-settings byte.
- `set_ride_inspection_interval` — Set the mechanic inspection interval through the game's normal action.
- `set_ride_lift_hill_speed` — Set chain-lift speed in mph through the normal game action and read it back.
- `set_ride_maximum_waiting_time` — Set the maximum dispatch waiting time (0-250 seconds) and read back both bounds.
- `set_ride_minimum_waiting_time` — Set the minimum dispatch waiting time (0-250 seconds) and read back both bounds.
- `set_ride_music_enabled` — Enable or disable ride music through the normal game action and read back its flag.
- `set_ride_music_style` — Select a loaded music object through the normal game action and read back its index.
- `set_ride_name` — Rename an existing ride through the normal game action and read it back.
- `set_ride_operating_mode` — Change operating mode through the normal game action.
- `set_ride_operation_option` — Set the ride-specific operation option.
- `set_ride_price` — Set a guarded price through the game, with explicit consent for potentially shared prices.
- `set_ride_random_shop_colours` — Toggle random shop-item colours through the appearance action; applicability depends on the ride/shop.
- `set_ride_station_style` — Set a loaded station/entrance style object.
- `set_ride_track_colour` — Set one track colour channel in one of the four colour schemes.
- `set_ride_trains_reversed` — Set reversed trains through the vehicle action.
- `set_ride_vehicle_colour` — Set a vehicle colour slot/channel.
- `set_ride_vehicle_colour_scheme` — Set vehicle colour grouping.
- `set_ride_vehicle_object` — Select a compatible loaded ride vehicle object/preset.
- `set_ride_vehicles` — Set the proposed train count or cars per train using OpenRCT2's ride action.
- `set_sign_name` — Rename a scrolling sign or banner using the type-safe sign action.
- `set_sign_style` — Set scrolling wall/large-scenery sign colours, not standalone path-banner styles.
- `set_small_scenery_colour` — Recolour the currently selected small scenery.
- `set_staff_colour` — Change the uniform colour for all staff of a type and its future hires, not one individual.
- `set_staff_costume` — Select a loaded peep-animation costume.
- `set_staff_name` — Rename one staff by entity ID.
- `set_staff_orders` — Replace handyman/mechanic orders.
- `set_staff_patrol_area` — Edit a rectangular staff patrol area; clear_all clears the entire patrol.
- `set_surface_style` — Set loaded terrain surface/edge styles and colours.
- `set_track_brake_speed` — Set a selected brake/booster speed using the native encoded value 0-30 (two-unit storage resolution, odd values round down).
- `set_track_piece_colour_scheme` — Assign an existing track piece to a colour scheme.
- `set_wall_colour` — Recolour the currently selected wall.
- `set_water_height` — Set water height 2-254 in units of 8 game coordinates.
- `simulate_ride` — Request simulation status (not guest operation); ride-specific engine restrictions apply.
- `smooth_land` — Apply native land editing to a selected range; engine checks local authority, ownership, clearance and supports.
- `start_food_marketing_campaign` — Start a paid free-food/drink voucher campaign for a reviewed native food/drink item.
- `start_marketing_campaign` — Start a park-wide paid marketing campaign (free entry, half-price entry or park advertising).
- `start_ride_marketing_campaign` — Start a ride-specific paid marketing campaign.
- `start_ride_test` — Start the ride in test mode to calculate ratings.
- `toggle_game_pause` — Toggle pause once.
- `undo_last_piece` — Alias for terminal-piece removal, not chronological undo.
<!-- END GENERATED TOOL INVENTORY -->

## Setup

Requires OpenRCT2, [uv](https://docs.astral.sh/uv/) and an MCP-capable client.

### 1. Install the plugin and sandbox

Copy `openrct2-mcp.js` into your OpenRCT2 user directory's `plugin/` folder:

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

Add `--overwrite` to replace an existing copy. When upgrading from `ridecreation-api.js`, this also removes the old file so only one bridge loads. For manual installation, remove the old file yourself; do not leave both plugins installed. **Save your park and restart OpenRCT2 after updating the plugin**; a running game keeps its loaded code.

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
- Coaster appending supports a validated cardinal subset and one connected layout. Explicit guarded removal also supports interior/disconnected pieces and flat footprints. Arbitrary track insertion, diagonal/inverted construction and multiple-station operation remain unsupported.
- Paths support flat, elevated and sloped tiles without replacement or local scenery clearing. Flat rides, shops/facilities and mazes have dedicated construction workflows. Nearby paths and open status alone do not establish guest access; the existing guest-report completion flag remains wooden-coaster-specific.
- Default tools target ordinary play. Editor ownership/entrance/spawn setup, map resizing, raw guest-behaviour masks and debug speeds are excluded. Native validation alone does not establish normal UI availability; ride creation additionally enforces known research/object compatibility.
- Saving does not load a park or reset it. Preserve existing work and avoid concurrent edits to the same ride.

## Development checks

```sh
uv sync --locked --extra dev
uv run --locked pytest src/tests
uv run --locked python scripts/check_install.py
```

Bindings regenerate automatically during package builds, editable installs (`uv run` after registry edits), and plugin installation. No separate generation command is needed.

Node.js is required for the JavaScript contract tests. Stubbed tests do not replace live-game verification.

- [Detailed setup, tool contracts, troubleshooting and live checks](docs/reference.md)
- [Guest-operation smoke test](docs/reference.md#guest-operation-smoke-test): opt-in live checks for queue/exit routes, customer completion and a checkpoint in a fresh sandbox.

## Attribution

The plugin is based on the [OpenRCT2 Ride Creation API](https://openrct2plugins.org/plugin/R_kgDONuEl9w/openrct2-ridecreation-api).
