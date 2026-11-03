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
The default includes full history, occupancy and a top-down image.

- `candidate_status` explains unavailable candidates or circuit completion.
  An empty list may mean unsupported geometry, not that nothing can connect.
- `layout_status: disconnected`, `ambiguous`, or `truncated` blocks implicit
  editing. Arbitrary disconnected layouts and endpoint selection are not
  supported. Resolve these in-game before continuing.
- `track_elements` and the text grid show actual element base heights, **not
  collision clearance**. Multiple heights on one tile are separated by `/`.
  Image lines are approximate. Images are bounded and large grids are omitted.
- `get_map_area` supplies nearby terrain and object heights. Empty occupancy
  does not establish that a track segment will fit.
- `get_coaster_view(view="endpoint", radius=4)` shows nearby terrain, slope/water
  indicators, paths, scenery and tracks. It returns the underlying `map_area`,
  including base/clearance heights at all levels. Ghosts are omitted from the
  image but retained in the data. Ride and map reads are separate observations.
- Yellow arrows mark the endpoint heading; green arrows mark the start/return
  heading. `S/C` means a shared tile. `return_offset` points from the endpoint to
  the start even when the start is outside the endpoint view. Both headings also
  appear on the default whole-coaster image.
- `get_coaster_view(view="elevation")` plots track-piece boundary index against
  sampled height. The first point is the track origin; subsequent points are
  next-connection heights. Equal spacing does not mean equal track length.
  Lines omit within-piece geometry. Do not infer clearance or G-forces from it.

## Errors and editing

Read `success`, `operation_outcome`, and the game error before deciding what to
retry. `operation_outcome` describes the requested mutation (or failing segment
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

Close the ride with `close_ride` before editing or changing vehicles. After track
edits, OpenRCT2 may invalidate station entrance/exit assignments. Call
`place_entrance_exit` again as needed before testing. This tool chooses positions
near the first station; it does not build connecting paths or guarantee guest
access. Multiple-station operation is not supported.

## Testing and revision

1. Complete the intended circuit and call `place_entrance_exit`.
2. Call `start_ride_test`, then poll `get_ride_stats`.
3. Check pause state, moving trains and `ratings_available`. A closed circuit
   alone does not prove operation. Ratings are null until calculated.
4. Close the ride, revise as needed, restore entrance/exit assignments and test
   again. Choose revisions based on the user's design goals and observed stats.

Ratings use the game's decimal scale (for example 6.52). Train velocities are
raw game values, not mph or km/h. `set_ride_vehicles` requests train/car counts;
the game may limit them. Instantiated car counts are reported in ride stats.

## Current limits

Ride-specific availability remains unknown. Diagonals, inversions, arbitrary
endpoint selection, multiple-station operation and guest path construction are
not supported by this workflow. Keep design decisions with the agent, and ask
the user before discarding park work or using destructive tools.
