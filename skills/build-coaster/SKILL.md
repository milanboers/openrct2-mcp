---
name: build-coaster
description: Build, inspect, edit and test roller coasters in OpenRCT2 through the Ride Creation MCP server.
---

# OpenRCT2 Coaster Builder

Use the tools to implement the user's design. Track layout, station length,
banking, lift placement and rating targets are design choices, not fixed rules.

## Before building

- Confirm the intended park is loaded. Do not infer this from an empty ride list
  alone: park loading is asynchronous.
- Call `get_plugin_info` to check `matches`, `protocol_compatible`, `park_name`,
  `map_size`, and `game_paused`. A plugin update requires a game restart.
- Use `list_all_rides` to identify existing rides. Do not delete existing work
  unless the user asks.
- The tested default is `ride_type: 52` (Wooden Roller Coaster). Other known IDs
  include 51 (Twister), 54 (Steel Wild Mouse), 15 (Looping), 17 (Mine Train),
  19 (Corkscrew), 44 (Vertical Drop), 3 (Inverted), and 57 (Flying). Track support
  for these rides is not guaranteed. Do not guess ride type numbers.
- Inspect the intended station area with `get_map_area`. Coordinates are tiles,
  with `z` in units of 8 game coordinates. Directions are 0 west, 1 +y,
  2 east, 3 -y.

## Construction contract

`create_ride` places the first station piece. Extend it using station candidates
from the returned state. OpenRCT2 reclassifies begin/middle/end station pieces.
Station extensions stop being offered after the first non-station piece.

Select track names from the latest `valid_pieces`. Each candidate includes a
predicted endpoint. These are supported cardinal pieces with matching pitch and
banking, **not** guarantees of ride support or clearance. `ride_support: unknown`
is deliberate. Diagonal and inverted endpoints are not supported.

- Pitch changes require transitions: `FlatToUp25` before `Up25`,
  `Up25ToFlat` to level out, and the corresponding down transitions for drops.
- A chain lift uses `has_chain_lift: true` on its pieces, including transitions.
- `check_track_segment` asks the game whether a candidate fits without placing
  it. Success is not a reservation or proof of ride support/connectivity.
- `check_track_candidates` queries 1–32 independent alternatives at the same
  endpoint, not a hypothetical sequence. Inspect each item's `success` and
  `placeable`; top-level success means collection succeeded.
- Append actions recheck candidates, endpoint and piece count inside the plugin.
  Optional `expected_endpoint` checks against your prior observation (first
  piece only for a sequence). These guards are not atomic game transactions.
- `place_track_sequence` takes 1–256 segment objects and checks each against the
  current state. It stops on failure without rolling back previous placements.
- `current_endpoint` gives the construction position and direction. Its
  `distance` is relative to the track start. Matching coordinates alone does
  not prove closure: check `is_circuit_complete`, then test the ride.
- `endpoint_prediction_mismatches` means the game and prediction disagree.
  Use the actual state and inspect the discrepancy rather than trusting further
  predictions for that geometry.

## Reading state

`get_coaster_state` returns one game snapshot. Use `include_image: false` and
`compact: true` when only the endpoint, candidates and piece count are needed.
The default includes full history, occupancy and a top-down image. State-returning
mutations accept these same `include_image` and `compact` controls. Prefer compact,
image-free output for routine construction when a full view is unnecessary.

- Full state includes actual per-piece `options` and the selected `ride_object`.
  Compact and full state also include station building positions and explicit
  present/absent/unknown statuses; unknown does not establish presence.
  Null options are unavailable/inapplicable, not inferred defaults.
- `get_loaded_ride_objects` discovers loaded object identifiers and current
  indices. Pass a selected index as `ride_object` to `create_ride`; indices are
  park-specific. Per-type `research` status matches the object and ride type,
  and is invented/uninvented/unknown, not a guarantee of buildability or track
  support. Car limits are nominal, not effective-train guarantees.
- `candidate_status` explains unavailable candidates or circuit completion.
  An empty list may mean unsupported geometry, not that nothing can connect.
- `layout_status: disconnected`, `ambiguous`, or `truncated` blocks implicit
  editing. Curated appending cannot handle disconnected layouts or arbitrary endpoint selection.
  Use get_ride_layout / remove_track_piece only for explicit authorized removal;
  these tools do not automatically repair or reconnect the layout.
- `track_elements` and the text grid show actual element base heights, **not
  collision clearance**. Multiple heights on one tile are separated by `/`.
  Image lines are approximate. Images are bounded and large grids are omitted.
- `get_map_area` supplies nearby terrain and object heights. Empty occupancy
  does not establish that a track segment will fit.
- `get_coaster_view(view="endpoint", radius=4)` shows nearby terrain, slope/water
  indicators, paths, scenery and tracks. It returns the underlying `map_area`,
  including base/clearance heights at all levels. Use `compact=True` to reduce
  repeated terrain text, especially for larger radii. `terrain_summary` counts
  omitted instances of the most common flat, dry, non-ghost surface. All other
  elements retain coordinates and heights in `map_area.tiles`, including tracks,
  paths, scenery, ghosts and differing terrain. Empty tiles are omitted. Use the
  default `compact=False` for exact omitted terrain locations. The image always
  uses the full observations, omitting ghosts. Neither mode establishes
  clearance. Ride and map reads are separate observations.
- Yellow arrows mark the endpoint heading; green arrows mark the start/return
  heading. `S/C` means a shared tile. `return_offset` points from the endpoint to
  the start even when the start is outside the endpoint view. Both headings also
  appear on the default whole-coaster image.
- `get_coaster_view(view="elevation")` plots track-piece boundary index against
  sampled height. The first point is the track origin; subsequent points are
  next-connection heights. Equal spacing does not mean equal track length.
  Lines omit within-piece geometry. Do not infer clearance or G-forces from it.

## Errors and editing

Read `success`, `execution_status`, `state_status`, `operation_outcome`, and the
game error before deciding what to retry. `execution_status` describes overall
progress: completed, rejected, partial or unknown. `state_status` distinguishes
available/unavailable inspection from tools that did not request a state read.
A confirmed prefix followed by failure is partial execution even when the
failing action was rejected. Structured `error_details` preserve game errors
when available. `operation_outcome` describes the requested mutation (or failing segment
of a sequence), not whether the state refresh succeeded:

- `confirmed`: the game acknowledged the mutation. A later state read can still
  fail, in which case `state_error` describes that failure.
- `rejected`: the mutation was not performed. Earlier sequence pieces remain.
- `unknown`: communication or response handling failed. Inspect state before
  retrying. Never automatically resend a mutation.
- `partial`: bulk demolition had failures or only one entrance/exit was placed.
  Inspect the returned details and remaining park state.

`placed_count` counts confirmed sequence placements. `failed_index` identifies
where execution stopped. A confirmed action can still have failed endpoint
inspection, so these fields must be read together.

`undo_last_piece` is **endpoint removal, not chronological undo**. For an open
connected layout it removes the terminal piece. On a closed circuit with a
begin station it removes the piece immediately before that station. Without a
begin station, the traversal start is selected from map order. Inspect state
before removing anything. A rejected placement does not require an undo.

`preview_track_removal` identifies the exact terminal target without mutation.
Pass its `target` as `expected_target` to `remove_terminal_piece` (or
`undo_last_piece`) to reject a changed target/count. This does not reserve the
segment or prove the game will permit removal. It does not detect every interior
edit. `remove_terminal_piece` is the explicitly named alias, not historical undo.

Close the ride with `close_ride` before editing or changing vehicles. Closing
alone need not remove trains. Before substantial track revision, explicitly call
`reset_ride` on the closed, guest-free ride and check `vehicles_cleared`. This uses
the game's second-close behaviour, which can also clear crash/test state, without
removing track. A nonzero or unknown guest count is rejected. Never double-close
as a blind retry of an unknown outcome. After track
edits, OpenRCT2 may invalidate station entrance/exit assignments. Call
`place_entrance_exit` again as needed before testing. It preserves existing
buildings and chooses positions for missing ones near the first station, on
opposite sides. It stops on unknown acknowledgement rather than trying another
position. For control over access routes, prefer `place_station_building`:

- Choose `building: "entrance"` or `"exit"`, tile `x`, `y` and a direction facing
  station track (0 west, 1 +y, 2 east, 3 -y). Height comes from station 0.
- The target must face adjacent station track, perpendicular to its heading.
  Both buildings can occupy different tiles on the same side, avoiding an
  access point trapped inside a ground-level circuit.
- Require a closed, guest-free ride. Moving an existing building requires its
  exact `expected_position` from `get_ride_station_access`. A stale or missing
  guard rejects. The normal action can reset vehicles and change queue edges.
- Existing paths, buildings and scenery are not replaced or cleared. Check the
  resulting station/path observations; placement does not guarantee guest access.

Multiple-station operation is not supported.

## Testing and revision

1. Complete the intended circuit and place station buildings explicitly or with `place_entrance_exit`.
2. Call `start_ride_test`, then poll `get_ride_stats`.
3. Check pause state, moving trains and `ratings_available`. A closed circuit
   alone does not prove operation. Ratings are null until calculated.
4. Close the ride, explicitly reset vehicles when preparing for substantial
   revision, revise as needed, restore entrance/exit assignments and test
   again. Choose revisions based on the user's design goals and observed stats.

`get_ride_test_report` collects readiness checks and current telemetry without
starting, closing or unpausing anything. An optional 0–60 second window observes
movement (subject to client timeouts). `success` means the read succeeded;
`ready` means the evidence checks passed. Missing motion is not proof of a stall.
Station entrance/exit presence is checked, but guest path connectivity is not.
The report retains timed `observations` with head-car status, sprite position,
track-block location and raw G-forces when available. Sampling can miss peaks;
raw G-force values are not the decimal ride maxima. Do not infer a full speed or
force profile or a definite stall cause from these samples.

Use `get_ride_station_access` to inspect station buildings and bounded nearby
paths, including edges, slopes, height layers, queue assignments and ghosts.
`guest_access: unknown` is deliberate: adjacency does not establish connectivity.
`get_park_status` is a read-only park/objective/research summary, not a park-control
or independent objective-certification tool.

Ratings use the game's decimal scale (for example 6.52). Train velocities are
raw game values, not mph or km/h. `set_ride_vehicles` requests train/car counts;
the game may limit them. Instantiated car counts are reported in ride stats.

## Ride settings

`set_ride_name` renames through the normal game action and reads back the name.
`set_ride_inspection_interval` accepts named intervals from `every_10_minutes`
through `every_2_hours`, or `never`; `never` also clears the due-inspection flag.
It does not hire mechanics. `set_ride_minimum_waiting_time` and
`set_ride_maximum_waiting_time` accept 0–250 seconds and return both bounds: the
game may adjust the other bound to preserve minimum <= maximum. These stored
times do not enable loading/departure rules.

Use `get_ride_operating_settings` to discover current settings and nominal lift-speed
bounds. `set_ride_lift_hill_speed` uses mph and invalidates old ratings when changed.
`set_ride_circuit_count` accepts 1–20; its response is an acknowledged request,
not count readback (the scripting API has no getter). Multiple circuits reject
with cable lifts. Changing the count invalidates ratings.

`set_ride_operating_mode` is different: the engine requires a closed/non-broken
ride and checks mode support. Even setting the current mode resets construction
state, clears vehicles, removes riders and invalidates ratings. Inspect before
using it; do not use it as a blind recovery step.

`get_ride_maintenance_status` observes reliability/downtime, inspection and
breakdown/crash flags without dispatching mechanics or repairing anything.
`get_loaded_music_objects` discovers music indices for `set_ride_music_style`.
Style changes reset the tune but do not enable music; `set_ride_music_enabled`
controls the flag. Readback does not prove audible playback.

Name, inspection, waiting-time and music settings do not close/reset the ride. Check both
acknowledgement and `readback_matches_request`; confirmed but unavailable or
mismatching readback is not verified success. Never blindly retry unknown
outcomes. Settings do not change track or establish guest operation.

## Guest operation and checkpoints

Testing is not guest operation. Discover modern path objects with `get_path_objects`
and inspect paths with `get_path_area` and `get_ride_station_access`. Use
`place_path_tile` or `place_path_sequence` for authorized flat, elevated or sloped routes.
A path sequence takes 1–256 caller-chosen `{x, y, z, slope_direction?}` tiles, sharing surface,
railings and queue flag. It does not choose routes or require adjacency. It
stops on failure or unavailable readback without rollback: retain `placed_count`,
`placements` and `failed_index`, and inspect before retrying unknown outcomes.
`last_placement` is that action's observation, not a final route-wide snapshot. Existing paths
and scenery cannot be replaced or cleared; overhead track still requires game
clearance. The game updates neighbor edges and queue assignments. These effects
can extend beyond returned observations. For authorized removal, pass the exact
current observation to `remove_path_tile`; sloped/elevated paths are supported,
but ghosts and path additions are not. A matching observation is not a reservation.

Use `open_ride` for normal opening, then observe `get_ride_guest_report`. Customer
completion interpretation is validated only for wooden coasters on OpenRCT2
0.5.7. Counter progress does not trace individual guests or prove public-network
connectivity; no progress is not proof of an access failure. Inspect queue
assignment, reciprocal edges and the intended exit route separately. Do not
infer that any nearby non-queue path is connected to the park entrance.

`save_park(label)` requests a fresh UUID-named checkpoint, not an overwrite of a
chosen save path. The game's API does not confirm disk persistence: verify the
file before relying on it. Preserve the returned filename on an unknown outcome,
and never automatically repeat a save request. No tool here loads a park or
resets the game.

## Pricing and economics

Use `get_ride_finances` before changing prices. Raw money is **10 units per GBP**,
not cents; `price_raw=30` means GBP 3 before display-currency conversion.
`set_ride_price` requires the current stored `expected_price_raw` as a stale-value
guard. It rejects disabled money and locked admission pricing without changing
park rules. It does not require closing the ride. Item/photo/facility prices
require explicit `allow_shared_price_changes=True` because they may propagate
across the park. Inspect the reported price differences and readback; unknown or
confirmed-but-unreadable outcomes must not be blindly retried.

Hourly income/profit are game estimates, not lifetime revenue. Income subtracts
merchandise costs; profit also subtracts upkeep. Running cost is billed per
fortnight, with an hourly estimate of `x16`. `total_profit_raw` is a lifetime
counter; lifetime gross revenue is unavailable. Null fields do not mean zero,
and a few paid guests do not establish sustained profitability.

## Broader park tools

The server also exposes reviewed generated ride appearance/operation, park,
staff/guest, scenery and terrain primitives. Use the tool schemas and
[API coverage audit](../../docs/api-coverage.md), not arbitrary SDK property writes.
`create_unbuilt_ride` creates only a record, unlike station-building `create_ride`.
Generated `_game` coordinates are raw units (32/tile, Z=8/height unit); curated
coaster/path coordinates stay in tiles/height units. Patrol reads use tile indices.
Brake speed edits accept reviewed speed-setting types and encoded 0–30 values
(odd values round down), not arbitrary track IDs. Read back the actual element.
Water height zero is invalid; a valid height at/below land base removes water.
Pause toggles; ordinary speeds are 1–4. Editor ownership/entrance/spawn setup,
map resizing, raw guest-behaviour flags and debug speeds are excluded. Take a
file-verified checkpoint before destructive changes. These primitives do not
establish ride support, clearance, guest access, profitability or objective success.

## Current limits

Normal ride-type track groups are checked, but complete vehicle sprite compatibility remains unknown. Diagonals, inversions, arbitrary
endpoint insertion, multiple-station operation and general public-network pathfinding are not supported by this workflow. Keep design decisions with the agent. Normal
revision of track created for the current task is part of building, unless the
user limits it. Preserve pre-existing work and any protected track prefixes.
Ask before deleting pre-existing rides, discarding pre-existing park work, or
resetting the park.


## Other ride construction

Use `get_ride_build_options` to discover normal starting pieces, loaded/invented
objects and `footprint_supported`. For supported flat rides, shops and facilities,
use `create_unbuilt_ride`, then `place_ride_footprint` on the empty closed ride.
Use `get_ride_layout.connection_directions` for outward footprint connection sides.
`place_station_building` supports valid flat footprint edges and adjacent maze tiles;
shops/facilities use service paths instead. Maze type 20 uses `edit_maze_cell` with
caller-chosen half-tile coordinates and an expected current maze mask, not coaster
append tools. Read the tool contracts for build versus fill coordinates.

For paths, Z is the lower end and optional `slope_direction` points uphill (0 west,
1 +y, 2 east, 3 -y). A slope rises 2 height units; omit it for flat paths. Native
terrain, ownership, support and clearance checks apply. Existing paths at the same
base height and local scenery cannot be replaced. No routing is performed.

These workflows preserve separate construction, operation, customer and persistence
evidence. A carousel can operate with zero reported velocity. Do not apply coaster
closed-circuit/movement readiness assumptions to flat rides, mazes or shops.
See [player capabilities](../../docs/player-capabilities.md) for evidence and gaps.
