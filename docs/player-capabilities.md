# Ordinary-player capabilities

The target is useful **observe → act → verify** workflows under normal scenario
rules, not a count of native action aliases. Native actions sometimes omit UI,
research or object/type checks. No generic scripting, action flags, property writes,
cheat toggles or editor setup are exposed.

This matrix separates implemented contracts from evidence. “Live” means actual MCP
calls through the plugin on OpenRCT2 **0.5.7 / API 124**. It does not mean every
object, rotation or parameter variant was tested. Earlier 0.18 live evidence remains
relevant to unchanged tools; new construction workflows were checked with 0.19.
All tests used separate user-data directories and preserved the interactive park.
Final-plugin save/reload checks preserved the inspected track elements, stations
and tested path profile in all three test parks. Checkpoint files were independently
verified before the dedicated games were gracefully stopped. The interactive
`Luna Run` retained its exact 17-piece snapshot and was not upgraded/restarted.

## Construction and access

| Capability | Observe / act / verify | Coverage and evidence |
| --- | --- | --- |
| Research-aware ride creation | `get_ride_build_options`, loaded objects/research → `create_ride` or `create_unbuilt_ride` → layout/status | Creation and vehicle-object changes require an invented compatible loaded object. Unknown research rejects. Auto-selection chooses within that set. Source, unit and live unresearched rejection checks. Native creation alone does not enforce this. |
| Connected coaster construction | Coaster snapshot/candidates/queries → curated append/sequence → snapshot, test stats and customer report | Cardinal pitch/bank transitions, curves, lift and brakes. 74-piece fixture live-tested with ratings, moving trains and completed customers. Normal enabled groups are checked, not cheat-extra groups. Full vehicle sprite compatibility is not represented by groups alone. |
| Track inspection independent of traversal | `get_ride_layout` | Physical elements, totals, bounded pages, exact selectors, station buildings, connection directions and maze masks. Live flat footprints, disconnected track and maze. Not an ordered piece list or connectivity proof. |
| Interior/disconnected removal | Layout selection → `remove_track_piece` → layout | Closed, guest-free, vehicle-free guards. Exact non-ghost selection and unambiguous native selector, including station normalization and ride identity. Live interior removal split a temporary track into disconnected parts. Stale selection left it unchanged. |
| Multi-tile footprint removal | Layout sequence selection → `remove_track_piece` → layout | Any sequence can select the whole piece. Live removal of a rotated 9-element Twist footprint through non-origin sequence 6. No implicit demolition of the ride record. |
| Arbitrary insertion/reconnection | Layout/candidates available | **Missing.** Curated appending refuses disconnected layouts. Explicit removal does not imply arbitrary insertion, backward building, diagonal/inverted support or repair of every gap. Native `trackplace` alone does not enforce UI track-group/vehicle compatibility. |
| Flat rides | Build options → unbuilt record → `place_ride_footprint` → layout, station buildings, paths, opening and stats | 24 starting footprint types are pinned from native descriptors. Live Merry-Go-Round construction, edge-specific entrance/exit placement, queue, public exit route, opening, ratings and customer-counter increase. Twist placement/removal also live. Other footprint types have source/contract coverage, not blanket live operation evidence. |
| Shops and facilities | Build options → unbuilt record/footprint → service paths, opening, stats/finances | Live Burger Bar, Balloon Stall and Restrooms built, opened and showed customer counters increasing from zero. Service directions come from native sequence flags, including kiosk multi-side connectivity. Drink stalls, kiosks, ATMs and first aid share reviewed footprints but are not all live-validated. No-money testing does not prove sales receipts or profitability. |
| Maze build/fill | Unbuilt maze type 20 → `edit_maze_cell` → layout masks/stations | Native half-cell editor, not arbitrary mask replacement. Valid live ride/type/lifecycle checks precede unsafe native queries. Current affected-tile mask is guarded; neighboring wall changes are not atomically guarded. Live build, fill and rebuild in a normal money-enabled Crazy Castle copy, entrance/exit, queue/public routes, opening, ratings and customer-counter progress. Solvability is not inferred from placement alone. |
| Other special rides | Starting-piece and loaded-object observations | **Partial.** Tower bases, vertical extensions, golf holes, water/transport-specific layouts and every ride's operating workflow are not covered merely because creation/settings exist. |
| Multiple stations and transport routes | Station observations | **Missing complete workflow.** Current custom station-building placement requires one station. Low-level station removal/settings do not establish multi-station construction or operation. |
| Flat/elevated/sloped paths | Path objects/area → tile or explicit sequence → neighboring path observations | Caller chooses every tile. Slopes rise 2 height units toward the supplied direction. Native ownership, clearance, supports and cost rules apply. No replacement at the same base height or local scenery clearing. Live 14→16→14 elevated profile with reciprocal edges on the route used by the operating flat ride and shops. Water crossings/other support limits were not separately live-tested. |
| Sloped/elevated path removal | Exact current path observation → `remove_path_tile` → neighboring observations | Non-ghost, no path addition. Live sloped-path placement/removal. Neighbor edges/queue ownership can change beyond the selected tile. |
| Path replacement/layout masks | Path/element observations | **Missing.** No implicit resurfacing, queue conversion or raw edge/layout override. Existing additions must be dealt with explicitly before guarded path removal. |
| Station entrances/exits | Station access/layout connection directions → guarded placement/relocation → station/path observations | One station, chosen building/facing, closed/empty state and exact relocation guard. Native adjacency is not sufficient; station sides and footprint sequence sides are checked. Live coaster, flat ride and maze. Shops/facilities use service paths, not station buildings. Automatic opposite-side placement remains linear-station-only. |
| General public-network pathfinding | Bounded path edges/heights/queues and guest telemetry | **Not provided.** The agent chooses routes. Adjacency, opening and a customer counter do not certify the whole current network or trace individual guests. |

## Operation and park management

| Capability | Tools and evidence | Limits |
| --- | --- | --- |
| Ride operation | Close/test/open/simulate, modes, train proposals, dispatch, lift speed, circuits, music, appearance and inspection | Normal actions, no synthetic ratings. Native resets/invalidated ratings are documented. Reversal, circuits and music also check normal UI availability. Proposed/effective train lengths differ. Circuit and operation-option readback is unavailable. |
| Operational verification | Status, vehicle/head-car observations, ratings, customers and maintenance | The existing ready/completed-customer report is calibrated for wooden coasters, not a universal ride validator. A carousel can operate with zero vehicle velocity. Flat ride and maze live evidence uses their own stats/ratings/counters. Breakdowns still require mechanics; construction success is not sustained uptime. |
| Staff | Hire/fire, names, uniforms/costumes, orders, patrol areas and paged observations | Source/contract and earlier live checks. Auto-position acknowledgement does not prove access or repair. Native pickup/place/cancel is excluded for the ownership reason below. |
| Guests | Needs, cash, thoughts, items, named flags, favourite ride and position observations; naming and balloon interaction | No direct needs/cash/behaviour editing. Successful balloon popping still lacks live evidence. Guest rename semantics follow the ordinary game action, including game-recognized names. |
| Prices/accounting | Guarded ride prices, charging rules, upkeep, estimates, lifetime profit, monthly expenditure | Raw money is 10/GBP. Shared item/photo prices require consent. Gross lifetime revenue and full sharing attribution are unavailable. Earlier paid-coaster live checks established receipts, not sustained profitability. |
| Park finances | Entrance fee and loan actions with normal money/lock/loan-limit checks | No direct cash grant, admission-rule override or debt-limit bypass. Earlier money-enabled live checks. |
| Research and marketing | Category/funding choices, research queues/progress, park/ride/reviewed food campaigns | Normal costs and eligibility. No instant invention, queue rewriting or manufactured arrivals. Earlier live checks; campaign acknowledgement does not establish conversion. |
| Scenery, signs and path additions | Loaded-object/tile observations → named placement/removal/recolour/sign actions → reads | Normal clearance/ownership/cost rules. Some native actions clear permitted scenery or replace additions. No tile-inspector mutation. Earlier live checks are per subtype, not every installed object. |
| Terrain, water and purchasable rights | Tile/map/object observations → normal land/water/style/right actions → reads | No editor ownership grant. Native bulk ranges can clamp/skip or partially change elements. No per-tile atomicity or general undo. Earlier live ownership/height/water checks. |
| Calendar, weather, scenario, news and awards | Read-only snapshots/paged observations | No date/objective/award setters or claim of independently certified objective completion. |
| Time controls | State → speed 1–4 or one pause toggle → state | Normal player controls only. No debug speeds 5–8, tick/counter manipulation or automatic unpause. |
| Checkpoints | Fresh UUID save request → independent file existence/size/hash → reload verification | Saving returns no file-write result. No overwrite filename, load or restart escape hatch. An unbuilt record was absent after a live reload; empty-record persistence must not be assumed. Built track/footprints/paths need their own reload checks. |

## Deliberate exclusions and API limits

- **Editor/debug setup:** editor ownership, park entrance/spawn setup, map resizing,
  raw guest behaviour replacement and debug speeds are not registered. Read-only
  inspection of flags, tiles and objects remains useful without granting mutation.
- **Staff/guest pickup:** `peeppickup` shares the current player's held-peep slot.
  Pickup can cancel an existing pickup; cancel can act on the held peep rather than
  reliably on the supplied ID. Published `Player` exposes neither held-peep identity
  nor original pickup X. No safe exclusive-ownership/cancel contract is available.
  SDK prose says place=3 in one comment, while native place is 2; raw steps would
  be both state-unsafe and misleading.
- **Track designs:** native `trackdesign` consumes a process-global preloaded
  `_activeTrackDesign`. The public API has no asset loader or design identity
  observation. A coordinate-only wrapper cannot identify what it would place.
- **Load/quit:** the native action drives UI prompts/scene lifecycle, not a named
  saved-park loader with a completion acknowledgement. `saveGame` has no matching
  public load API. Loading/restarting remains an explicit operator workflow that
  protects unsaved work and verifies the reloaded park.
- **Tile inspector and synthetic results:** direct element rewriting, scenario
  setup, date changes, frozen ratings and administrative multiplayer actions are
  not ordinary scenario-playing tools, even when a native action accepts them.

## Maintenance and next gaps

- [API coverage](api-coverage.md) records source/SDK decisions for every native alias.
  `game-api-surface.json` also pins normal starting pieces, groups, connection sides,
  shared ride flags and vehicle flag masks. Upstream source refresh is explicit.
- Remaining consequential implementation work: safe arbitrary track insertion/
  reconnection, broader geometry, multi-station/special rides, and guarded path
  replacement. These need complete selection/availability contracts, not planners.
- More live variants are needed before claiming complete ride-type, scenery,
  bridge-support or guest-operation coverage. Tool discovery and a loaded object
  are not evidence that every workflow is usable.
