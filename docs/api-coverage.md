# OpenRCT2 API coverage

This audits the **whole published v0.5.7 scripting surface**, but the capability target is **ordinary scenario play**, not every callable action. Native validation alone does not establish player legitimacy. Editor setup, debug speeds, whole guest behaviour masks and rule bypasses are excluded from the MCP inventory. No arbitrary execute-action, scripting, action flags, file paths or writable-object escape hatch is exposed.

- Reviewed source: **OpenRCT2/OpenRCT2@v0.5.7**, scripting API **124**.
- **81** script-accessible native action aliases, **255** SDK interfaces.
- **107 generated tools** expose **53 native action families** plus read-only projections.
- This is not a claim of every parameter/variant being supported or every tool being live-tested.
- `game-api-surface.json` records every interface member/overload and the authoritative C++ action parameters.
- `game-api-policy.json` records exclusions, custom coverage and review notes. Both ship in the source archive.

## Shared contracts

- Normal engine actions only. Native validation remains authoritative; no retry, automatic rollback or implicit cheat toggling. Destructive hints are conservative.
- Raw coordinate tools use **32 game units/tile** and **8 game units/track-height unit**. Land/water height and slope/style arguments explicitly retain native units. Existing coaster/path tools keep their documented tile/height units.
- Money is **10 raw units/GBP**. Costs/accounting values are not display-currency cents.
- An acknowledgement does not establish readback, persistence, operation, guest access, route connectivity or objective progress. Bulk range actions may clamp/skip tiles or have native partial effects.
- Read snapshots do not reserve IDs or provide stale guards. Pagination has no stable cursor. Available array fields include `*_total` (null/unavailable arrays do not invent a count); unpaged arrays are at most 256-item prefixes.
- `set_game_speed` is **1-based**, with player speeds **1–4** exposed. Native debug speeds 5–8 are excluded. The pinned SDK prose is stale. Pause is a toggle, not an idempotent setter.
- Native type names/indices, loaded objects, research status and placement clearance remain distinct. `create_unbuilt_ride` creates only a record; `create_ride` retains the curated station workflow.
- Gameplay mutations require normal mode. Read-only diagnostics may inspect other scenes. Editor ownership, entrance/spawn setup and map resizing are deliberately not registered. Checkpoint saving can preserve editor park data without granting editor mutation tools.
- A native alias being generated does not mean all of its subtypes/variants are exposed. See notes below.
- Patrol tile **reads are tile indices** (`x_tile`/`y_tile`); patrol range mutations use raw game coordinates. Native representations are deliberately not conflated.
- `InstalledObject.version` is declared by the SDK but not registered by the v0.5.7 native binding; installed-object reads report null rather than inventing a version.
- `save_park` supports normal play and scenario-editor park data, not title/track-design scenes or preservation of editor UI steps. Scenery-group metadata contains identifier strings, not loaded numeric indices.
- Normal ride creation and vehicle-object selection require invented compatible loaded objects. Native creation does not itself enforce research/type compatibility. Source-pinned normal track groups exclude cheat-extra groups; they are not complete vehicle sprite compatibility. Reversal, circuit controls and music also check their ordinary UI availability.
- Native starting pieces, footprint connection sides, shared ride flags and vehicle flag masks are pinned from v0.5.7 source alongside this SDK snapshot. See [player capabilities](player-capabilities.md) for workflow evidence and gaps.

## Native action inventory

| Script action | Coverage | Tools / reason |
| --- | --- | --- |
| [`balloonpress`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/general/BalloonPressAction.cpp) | Generated | `press_balloon` |
| [`bannerplace`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/BannerPlaceAction.cpp) | Generated | `place_banner` |
| [`bannerremove`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/BannerRemoveAction.cpp) | Generated | `remove_banner` |
| [`bannersetcolour`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/BannerSetColourAction.cpp) | Generated | `set_banner_colour` |
| [`bannersetname`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/BannerSetNameAction.cpp) | Excluded alias | Native query downcasts a banner-pool element without checking it is a banner; wall/large-sign IDs can crash. `set_sign_name` covers ordinary nonempty renaming safely via `signsetname`, but not every exact linked-name semantic. |
| [`bannersetstyle`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/BannerSetStyleAction.cpp) | Essential custom guard | Native query dereferences asBanner before confirming the element type. Needs a banner-ID-to-live-element type/ownership guard, not merely an integer ID enum. |
| [`cheatset`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/cheats/CheatSetAction.cpp) | Intentionally excluded | Bypasses game rules or manufactures money/guests/research/results. No arbitrary cheat selector or counter editor. |
| [`clearscenery`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/terraform/ClearAction.cpp) | Generated | `clear_scenery` |
| [`footpathadditionplace`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/footpath/FootpathAdditionPlaceAction.cpp) | Generated | `place_path_addition` |
| [`footpathadditionremove`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/footpath/FootpathAdditionRemoveAction.cpp) | Generated | `remove_path_addition` |
| [`footpathlayoutplace`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/footpath/FootpathLayoutPlaceAction.cpp) | Custom / partial | Not exposed directly. Modern paths use footpathplace; no arbitrary edge masks or layout overrides. |
| [`footpathplace`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/footpath/FootpathPlaceAction.cpp) | Custom / partial | place_path_tile / place_path_sequence: caller-chosen flat, elevated or sloped modern paths. Loaded-object and no-replacement guards, normal clearance/ownership/cost rules, bounded before/after path observations. Slopes rise 2 height units toward slope_direction; no routing or hidden planner. |
| [`footpathremove`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/footpath/FootpathRemoveAction.cpp) | Custom / partial | remove_path_tile: exact current observation of one non-ghost path, including slopes/elevation. Additions remain excluded; neighbor changes are reported. |
| [`gamesetspeed`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/general/GameSetSpeedAction.cpp) | Generated | `set_game_speed` |
| [`guestsetflags`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/peep/GuestSetFlagsAction.cpp) | Outside ordinary play | Replaces the complete guest behaviour bitmask, including cheat/debug behaviours. The published SDK does not expose the complete raw mask for a lossless tracking-only update. |
| [`guestsetname`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/peep/GuestSetNameAction.cpp) | Generated | `set_guest_name` |
| [`landbuyrights`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/park/LandBuyRightsAction.cpp) | Generated | `buy_land_rights` |
| [`landlower`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/terraform/LandLowerAction.cpp) | Generated | `lower_land` |
| [`landraise`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/terraform/LandRaiseAction.cpp) | Generated | `raise_land` |
| [`landsetheight`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/terraform/LandSetHeightAction.cpp) | Generated | `set_land_height` |
| [`landsetrights`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/park/LandSetRightsAction.cpp) | Outside ordinary play | Editor ownership assignment bypasses ordinary land purchasing. Use buy_land_rights for rights actually offered for sale. |
| [`landsmooth`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/terraform/LandSmoothAction.cpp) | Generated | `smooth_land` |
| [`largesceneryplace`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/LargeSceneryPlaceAction.cpp) | Generated | `place_large_scenery` |
| [`largesceneryremove`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/LargeSceneryRemoveAction.cpp) | Generated | `remove_large_scenery` |
| [`largescenerysetcolour`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/LargeScenerySetColourAction.cpp) | Generated | `set_large_scenery_colour` |
| [`loadorquit`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/general/LoadOrQuitAction.cpp) | Essential lifecycle logic | Native loadorquit controls UI prompts and scene lifecycle, not a named save loader. The published SDK has saveGame but no matching path/asset-identity load API. A raw request can discard unsaved work without verified completion/reconnection. Checkpoint saving remains available; loading/restarting stays an operator workflow. |
| [`mapchangesize`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/general/MapChangeSizeAction.cpp) | Outside ordinary play | Map-size editing is not an ordinary scenario-playing action. Shrinking can irreversibly destroy rides and access. No default editor/debug mutation capability. |
| [`mazeplacetrack`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/MazePlaceTrackAction.cpp) | Essential custom guard | Native query can dereference GetRide before checking null and does not ensure maze type/closed-empty state. Maze masks/half-tile edits also need valid live ride/element selection, not the coaster endpoint contract. |
| [`mazesettrack`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/MazeSetTrackAction.cpp) | Custom / partial | edit_maze_cell: maze-type, bounds, half-tile/height, closed/guest-free/vehicle-free guards before native queries (which otherwise can dereference an invalid ride). Build/fill only; the caller chooses each cell and direction. Wall changes to adjacent cells are observed, not atomic guards. |
| [`networkmodifygroup`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/network/NetworkModifyGroupAction.cpp) | Intentionally excluded | Shared-server administration/permissions are outside local park-operation scope. Would change other users rather than just park state. |
| [`parkentranceplace`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/park/ParkEntrancePlaceAction.cpp) | Outside ordinary play | Editor/sandbox-only world setup, not ordinary scenario play. Existing park entrances and guest spawns are not exposed for mutation. |
| [`parkentranceremove`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/park/ParkEntranceRemoveAction.cpp) | Outside ordinary play | Editor/sandbox-only world setup, not ordinary scenario play. Existing park entrances and guest spawns are not exposed for mutation. |
| [`parkmarketing`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/park/ParkMarketingAction.cpp) | Generated | `start_marketing_campaign`, `start_ride_marketing_campaign`, `start_food_marketing_campaign`. Park campaigns, existing-ride campaigns and reviewed food/drink voucher items are separately typed. Does not prove target suitability, access, sales, redemption or arrivals. |
| [`parksetdate`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/park/ParkSetDateAction.cpp) | Intentionally excluded | Directly rewrites scenario time instead of advancing simulation, invalidating objective/accounting interpretation. Calendar reads and normal speed/pause are covered. |
| [`parksetentrancefee`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/park/ParkSetEntranceFeeAction.cpp) | Generated | `set_park_entrance_fee` |
| [`parksetloan`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/park/ParkSetLoanAction.cpp) | Generated | `set_park_loan` |
| [`parksetname`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/park/ParkSetNameAction.cpp) | Generated | `set_park_name` |
| [`parksetparameter`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/park/ParkSetParameterAction.cpp) | Generated | `close_park`, `open_park`. Open/closed state only. Other scenario success/state parameters are intentionally excluded. |
| [`parksetresearchfunding`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/park/ParkSetResearchFundingAction.cpp) | Generated | `set_research_funding` |
| [`pausetoggle`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/general/PauseToggleAction.cpp) | Generated | `toggle_game_pause` |
| [`peeppickup`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/peep/PeepPickupAction.cpp) | Essential lifecycle logic | The public Player interface exposes no held-peep identity or original pickup X. Native pickup can cancel an existing player pickup, and cancel acts on the currently held peep rather than reliably on the supplied ID. A wrapper cannot safely establish exclusive ownership or lossless cancellation with this API; no raw steps are exposed. |
| [`peepspawnplace`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/peep/PeepSpawnPlaceAction.cpp) | Outside ordinary play | Editor/sandbox-only world setup, not ordinary scenario play. Existing park entrances and guest spawns are not exposed for mutation. |
| [`playerkick`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/network/PlayerKickAction.cpp) | Intentionally excluded | Remote-player moderation is shared-server administration, not local park operation. |
| [`playersetgroup`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/network/PlayerSetGroupAction.cpp) | Intentionally excluded | Changes shared-server permissions; no administrative escape hatch. |
| [`ridecreate`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/RideCreateAction.cpp) | Generated | `create_unbuilt_ride`. Creates only a record. Invented compatible object selection is checked before the native action; empty records are not assumed durable. Footprint/maze/curated station construction are separate workflows. |
| [`ridedemolish`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/RideDemolishAction.cpp) | Generated | `delete_ride`, `renew_ride` |
| [`rideentranceexitplace`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/RideEntranceExitPlaceAction.cpp) | Custom / partial | `place_station_building`, `place_entrance_exit`: native query does not establish valid station adjacency/guest safety. Custom station selection, closed/empty checks, facing, exact relocation guard and readback are essential. |
| [`rideentranceexitremove`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/RideEntranceExitRemoveAction.cpp) | Generated | `remove_station_building` |
| [`ridefreezerating`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/RideFreezeRatingAction.cpp) | Intentionally excluded | Writes synthetic/frozen ratings instead of measuring a tested ride. |
| [`ridesetappearance`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/RideSetAppearanceAction.cpp) | Generated | `set_ride_track_colour`, `set_ride_vehicle_colour`, `set_ride_vehicle_colour_scheme`, `set_ride_station_style`, `set_ride_random_shop_colours`. Track main/additional/support colours, vehicle body/trim/tertiary colours, colour-scheme mode and loaded station style. Index meaning is native and scheme-dependent. |
| [`ridesetcolourscheme`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/RideSetColourSchemeAction.cpp) | Generated | `set_track_piece_colour_scheme` |
| [`ridesetname`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/RideSetNameAction.cpp) | Generated | `set_ride_name` |
| [`ridesetprice`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/RideSetPriceAction.cpp) | Custom / partial | `set_ride_price`: active slots, actual park charging rules, stale-value guard and explicit shared-price consent. Plain scalar generation would miss cross-ride changes. |
| [`ridesetsetting`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/RideSetSettingAction.cpp) | Generated | `set_ride_inspection_interval`, `set_ride_minimum_waiting_time`, `set_ride_maximum_waiting_time`, `set_ride_lift_hill_speed`, `set_ride_operating_mode`, `set_ride_circuit_count`, `set_ride_music_enabled`, `set_ride_music_style`, `set_ride_departure_flags`, `set_ride_operation_option`. Covers departure mask, min/max waits, inspection, music/style, lift speed, mode, circuits and mode-dependent operation option. Arbitrary ride-type changes are intentionally excluded. Mode changes reset riders/vehicles/results even when unchanged; circuits/operation option have acknowledgement only because the SDK has no getter. |
| [`ridesetstatus`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/RideSetStatusAction.cpp) | Generated | `close_ride`, `start_ride_test`, `open_ride`, `simulate_ride`. Closed, test, open and simulation are covered. Operation still requires separate movement/ratings/customer observations. |
| [`ridesetvehicle`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/ride/RideSetVehicleAction.cpp) | Generated | `set_ride_vehicles`, `set_ride_vehicle_object`, `set_ride_trains_reversed`. Train count, cars/train, loaded vehicle object and reversal. Engine may constrain effective trains; object swaps/reversal require closed ride and invalidate/reset state. |
| [`scenariosetsetting`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/general/ScenarioSetSettingAction.cpp) | Intentionally excluded | Rewrites scenario setup, finances and rule/objective-related interpretation. Normal park actions and editor ownership/entrance work are covered; arbitrary scenario-setting overrides are not. |
| [`signsetname`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/SignSetNameAction.cpp) | Generated | `set_sign_name`. Empty-name behavior can automatically link to the closest ride; ordinary nonempty names unlink that association. |
| [`signsetstyle`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/SignSetStyleAction.cpp) | Generated | `set_sign_style` |
| [`smallsceneryplace`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/SmallSceneryPlaceAction.cpp) | Generated | `place_small_scenery` |
| [`smallsceneryremove`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/SmallSceneryRemoveAction.cpp) | Generated | `remove_small_scenery` |
| [`smallscenerysetcolour`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/SmallScenerySetColourAction.cpp) | Generated | `set_small_scenery_colour` |
| [`stafffire`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/peep/StaffFireAction.cpp) | Generated | `fire_staff` |
| [`staffhire`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/peep/StaffHireNewAction.cpp) | Generated | `hire_staff` |
| [`staffsetcolour`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/peep/StaffSetColourAction.cpp) | Generated | `set_staff_colour` |
| [`staffsetcostume`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/peep/StaffSetCostumeAction.cpp) | Generated | `set_staff_costume`. Requires a currently loaded peep-animation object, avoiding an unchecked native object dereference. Native staff-type checks still apply. |
| [`staffsetname`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/peep/StaffSetNameAction.cpp) | Generated | `set_staff_name` |
| [`staffsetorders`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/peep/StaffSetOrdersAction.cpp) | Generated | `set_staff_orders` |
| [`staffsetpatrolarea`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/peep/StaffSetPatrolAreaAction.cpp) | Generated | `set_staff_patrol_area` |
| [`surfacesetstyle`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/terraform/SurfaceSetStyleAction.cpp) | Generated | `set_surface_style` |
| [`tilemodify`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/general/TileModifyAction.cpp) | Outside ordinary play | The tile inspector is debug/editor manipulation, not ordinary construction. Even structurally guarded tile writes would bypass normal placement rules. Read-only tile inspection remains available. |
| [`trackdesign`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/track/TrackDesignAction.cpp) | Essential custom lifecycle | Native trackdesign consumes a process-global _activeTrackDesign. The published Context/TrackIterator/ObjectManager interfaces provide no loader or identity/readback for .td6/.td4 design assets. Coordinates alone cannot identify the design being placed. No arbitrary file loader or global-state escape hatch. |
| [`trackplace`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/track/TrackPlaceAction.cpp) | Custom / partial | Curated coaster append tools plus place_ride_footprint for source-reviewed flat rides, shops and facilities on an empty closed ride. No arbitrary track-type placement: native trackplace does not fully enforce UI ride/track-group compatibility. |
| [`trackremove`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/track/TrackRemoveAction.cpp) | Custom / partial | Terminal removal plus remove_track_piece with an exact current element selection, ride identity, closed/guest-free/vehicle-free guards and before/after whole-ride observations. Interior/disconnected removal is explicit, not chronological undo. |
| [`tracksetbrakespeed`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/track/TrackSetBrakeSpeedAction.cpp) | Generated | `set_track_brake_speed`. Restricted to the eight native speed-setting types (named enum), speed 0–30 with two-unit storage resolution. The native action alone does not reject other track kinds, which could overwrite shared union data. This essential safety guard is declarative, not a custom handler. |
| [`wallplace`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/WallPlaceAction.cpp) | Generated | `place_wall` |
| [`wallremove`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/WallRemoveAction.cpp) | Generated | `remove_wall` |
| [`wallsetcolour`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/scenery/WallSetColourAction.cpp) | Generated | `set_wall_colour` |
| [`waterlower`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/terraform/WaterLowerAction.cpp) | Generated | `lower_water` |
| [`waterraise`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/terraform/WaterRaiseAction.cpp) | Generated | `raise_water` |
| [`watersetheight`](https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.7/src/openrct2/actions/terraform/WaterSetHeightAction.cpp) | Generated | `set_water_height`. Height is 2–254 in units of 8 game coordinates. Zero is rejected; selecting a valid height at or below land base removes water. Native storage quantization still applies. |

## Global entry points

| Global | Interface / policy |
| --- | --- |
| `cheats` | `Cheats` — Administrative / unsafe mutation |
| `console` | `Console` — Plugin / presentation infrastructure |
| `context` | `Context` — Game state / observations |
| `date` | `GameDate` — Game state / observations |
| `map` | `GameMap` — Game world / custom selection |
| `network` | `Network` — Administrative / unsafe mutation |
| `park` | `Park` — Game state / observations |
| `scenario` | `Scenario` — Game state / observations |
| `climate` | `Climate` — Game state / observations |
| `profiler` | `Profiler` — Plugin / presentation infrastructure |
| `objectManager` | `ObjectManager` — Object metadata |
| `titleSequenceManager` | `TitleSequenceManager` — Plugin / presentation infrastructure |
| `ui` | `Ui` — Plugin / presentation infrastructure |
| `pluginManager` | `PluginManager` — Plugin / presentation infrastructure |
| `registerPlugin(metadata: PluginMetadata): void;` | Plugin infrastructure, intentionally excluded |

Type aliases (enums/unions) are retained by name in the snapshot and supply reviewed tool choices; they are not callable operations.

## SDK interfaces

Read coverage is field-level, not blanket writable-object access. Members not listed as generated reads remain subject to the category policy. Inherited members are recorded on their declaring interface in the snapshot.

| Interface | Unique members | Classification | Generated reads / custom coverage |
| --- | --- | --- | --- |
| `ActionLocationArgs` | 6 | Value / action contract | — |
| `Award` | 5 | Game state / observations | — |
| `Balloon` | 1 | Game state / observations | `get_balloon_details`: `colour`, `id`, `type`, `x`, `y`, `z` |
| `BalloonPressArgs` | 1 | Value / action contract | —; arguments for `balloonpress` (generated: press_balloon, see native inventory) |
| `BannerCreateActionResult` | 1 | Value / action contract | — |
| `BannerElement` | 8 | Game world / custom selection | `get_map_tile`: generated type-gated native fields, raw IDs/sentinels. No direct setters. Curated construction/path/station reads retain their stricter normalization contracts. |
| `BannerObject` | 0 | Object metadata | — |
| `BannerPlaceArgs` | 6 | Value / action contract | —; arguments for `bannerplace` (generated: place_banner, see native inventory) |
| `BannerRemoveArgs` | 4 | Value / action contract | —; arguments for `bannerremove` (generated: remove_banner, see native inventory) |
| `BannerSetColourArgs` | 5 | Value / action contract | —; arguments for `bannersetcolour` (generated: set_banner_colour, see native inventory) |
| `BannerSetNameArgs` | 2 | Value / action contract | —; arguments for `bannersetname` (Excluded alias, see native inventory) |
| `BannerSetStyleArgs` | 3 | Value / action contract | —; arguments for `bannersetstyle` (Essential custom guard, see native inventory) |
| `BaseStaff` | 12 | Game state / observations | `get_staff_details`: `animation`, `animationLength`, `animationOffset`, `availableAnimations`, `availableCostumes`, `binsEmptied`, `colour`, `costume`, `destination`, `direction`, `energy`, `energyTarget`, `gardensWatered`, `guestsEntertained`, `id`, `lawnsMown`, `litterSwept`, `name`, `orders`, `patrolArea`, `ridesFixed`, `ridesInspected`, `staffType`, `type`, `vandalsStopped`, `x`, `y`, `z`; `get_staff_flags`: `getFlag`; `get_staff_patrol_tiles`: `patrolArea` |
| `BaseTileElement` | 8 | Game world / custom selection | `get_map_tile`: generated type-gated native fields, raw IDs/sentinels. No direct setters. Curated construction/path/station reads retain their stricter normalization contracts. |
| `ButtonDesc` | 6 | Plugin / presentation infrastructure | — |
| `ButtonWidget` | 5 | Plugin / presentation infrastructure | — |
| `CaptureOptions` | 7 | Plugin / presentation infrastructure | Native file/image capture is not exposed; existing coaster view is an in-memory bounded MCP visualization. |
| `Car` | 29 | Game state / observations | `get_vehicle_details`: `acceleration`, `bankRotation`, `colours`, `currentStation`, `gForces`, `guests`, `id`, `isCrashed`, `isReversed`, `mass`, `nextCarOnRide`, `nextCarOnTrain`, `numSeats`, `poweredAcceleration`, `poweredMaxSpeed`, `previousCarOnRide`, `remainingDistance`, `ride`, `rideObject`, `spin`, `spriteType`, `status`, `subposition`, `trackLocation`, `trackProgress`, `type`, `vehicleObject`, `velocity`, `x`, `y`, `z` |
| `CarTrackLocation` | 1 | Value / action contract | — |
| `CheatSetArgs` | 3 | Value / action contract | —; arguments for `cheatset` (Intentionally excluded, see native inventory) |
| `Cheats` | 28 | Administrative / unsafe mutation | — |
| `CheckboxDesc` | 4 | Plugin / presentation infrastructure | — |
| `CheckboxWidget` | 3 | Plugin / presentation infrastructure | — |
| `ClearSceneryArgs` | 1 | Value / action contract | —; arguments for `clearscenery` (generated: clear_scenery, see native inventory) |
| `Climate` | 3 | Game state / observations | `get_weather`: `current`, `future`, `type` |
| `ColourPickerDesc` | 3 | Plugin / presentation infrastructure | — |
| `ColourPickerWidget` | 2 | Plugin / presentation infrastructure | — |
| `Configuration` | 4 | Plugin / presentation infrastructure | — |
| `Console` | 3 | Plugin / presentation infrastructure | — |
| `Context` | 24 | Game state / observations | `set_game_speed`: `gameSpeed`; `get_game_state`: `apiVersion`, `gameSpeed`, `mode`, `paused` |
| `CoordsXY` | 2 | Value / action contract | — |
| `CoordsXYZ` | 1 | Value / action contract | — |
| `CoordsXYZD` | 1 | Value / action contract | — |
| `CrashParticleLaunchData` | 5 | Value / action contract | — |
| `CrashedVehicleColour` | 2 | Value / action contract | — |
| `CrashedVehicleParticle` | 7 | Game state / observations | — |
| `CustomDesc` | 2 | Plugin / presentation infrastructure | — |
| `CustomWidget` | 1 | Plugin / presentation infrastructure | — |
| `DropdownDesc` | 4 | Plugin / presentation infrastructure | — |
| `DropdownWidget` | 4 | Plugin / presentation infrastructure | — |
| `EndTitleSequenceCommand` | 1 | Plugin / presentation infrastructure | — |
| `Entertainer` | 2 | Game state / observations | `get_staff_details` exposes nullable role-specific work counters. |
| `Entity` | 6 | Game state / observations | `set_staff_name`: `name`; `set_guest_name`: `name`; `set_staff_orders`: `orders`; `list_entities`: `id`, `type`, `x`, `y`, `z`; `get_entity_details`: `id`, `type`, `x`, `y`, `z` |
| `EntranceElement` | 8 | Game world / custom selection | `get_map_tile`: generated type-gated native fields, raw IDs/sentinels. No direct setters. Curated construction/path/station reads retain their stricter normalization contracts. |
| `FileBrowseDesc` | 4 | Plugin / presentation infrastructure | — |
| `FollowTitleSequenceCommand` | 2 | Plugin / presentation infrastructure | — |
| `FoodDrinkVoucher` | 2 | Game state / observations | — |
| `FootpathAdditionObject` | 0 | Object metadata | — |
| `FootpathAdditionPlaceArgs` | 4 | Value / action contract | —; arguments for `footpathadditionplace` (generated: place_path_addition, see native inventory) |
| `FootpathAdditionRemoveArgs` | 3 | Value / action contract | —; arguments for `footpathadditionremove` (generated: remove_path_addition, see native inventory) |
| `FootpathElement` | 18 | Game world / custom selection | `get_map_tile`: generated type-gated native fields, raw IDs/sentinels. No direct setters. Curated construction/path/station reads retain their stricter normalization contracts. |
| `FootpathLayoutPlaceArgs` | 8 | Value / action contract | —; arguments for `footpathlayoutplace` (custom/partial, see native inventory) |
| `FootpathPlaceArgs` | 9 | Value / action contract | —; arguments for `footpathplace` (custom/partial, see native inventory) |
| `FootpathRemoveArgs` | 3 | Value / action contract | —; arguments for `footpathremove` (custom/partial, see native inventory) |
| `FootpathSurfaceObject` | 1 | Object metadata | — |
| `GForces` | 2 | Value / action contract | — |
| `GameActionArgs` | 1 | Value / action contract | — |
| `GameActionEventArgs` | 6 | Value / action contract | — |
| `GameActionResult` | 6 | Value / action contract | Normal acknowledgement, native error details and reviewed optional IDs; acknowledgement is separate from readback. |
| `GameDate` | 7 | Game state / observations | `get_calendar`: `day`, `month`, `monthProgress`, `monthsElapsed`, `ticksElapsed`, `year`, `yearsElapsed` |
| `GameMap` | 12 | Game world / custom selection | `get_map_area`, `list_all_rides`, coaster/path/station observations, generated paged entities. Native live entity/tile lookup is used internally; no cursor is returned. |
| `GameSetSpeedArgs` | 1 | Value / action contract | —; arguments for `gamesetspeed` (generated: set_game_speed, see native inventory) |
| `GraphicsContext` | 18 | Plugin / presentation infrastructure | — |
| `GroupBoxDesc` | 2 | Plugin / presentation infrastructure | — |
| `GroupBoxWidget` | 2 | Plugin / presentation infrastructure | — |
| `Guest` | 32 | Game state / observations | `get_guest_details`: `animation`, `animationLength`, `animationOffset`, `availableAnimations`, `balloonColour`, `cash`, `destination`, `direction`, `energy`, `energyTarget`, `favouriteRide`, `happiness`, `happinessTarget`, `hatColour`, `hunger`, `id`, `isInPark`, `isLost`, `lostCountdown`, `mass`, `maxIntensity`, `minIntensity`, `name`, `nausea`, `nauseaTarget`, `nauseaTolerance`, `thirst`, `toilet`, `trousersColour`, `tshirtColour`, `type`, `umbrellaColour`, `x`, `y`, `z`; `get_guest_flags`: `getFlag`; `get_guest_thoughts`: `thoughts`; `get_guest_items`: `items` |
| `GuestGenerationArgs` | 1 | Value / action contract | — |
| `GuestItem` | 1 | Game state / observations | `get_guest_items`: type and applicable voucher/photo fields. |
| `GuestPhoto` | 2 | Game state / observations | — |
| `GuestSetFlagsArgs` | 2 | Value / action contract | —; arguments for `guestsetflags` (Outside ordinary play, see native inventory) |
| `GuestSetNameArgs` | 2 | Value / action contract | —; arguments for `guestsetname` (generated: set_guest_name, see native inventory) |
| `Handyman` | 5 | Game state / observations | `get_staff_details` exposes nullable role-specific work counters. |
| `IDisposable` | 1 | Plugin / presentation infrastructure | — |
| `ImageAnimation` | 7 | Plugin / presentation infrastructure | — |
| `ImageIndexRange` | 2 | Plugin / presentation infrastructure | — |
| `ImageInfo` | 9 | Plugin / presentation infrastructure | — |
| `ImageManager` | 8 | Plugin / presentation infrastructure | — |
| `InstalledObject` | 9 | Object metadata | — |
| `LabelDesc` | 3 | Plugin / presentation infrastructure | — |
| `LabelWidget` | 3 | Plugin / presentation infrastructure | — |
| `LandBuyRightsArgs` | 5 | Value / action contract | —; arguments for `landbuyrights` (generated: buy_land_rights, see native inventory) |
| `LandLowerArgs` | 7 | Value / action contract | —; arguments for `landlower` (generated: lower_land, see native inventory) |
| `LandRaiseArgs` | 7 | Value / action contract | —; arguments for `landraise` (generated: raise_land, see native inventory) |
| `LandSetHeightArgs` | 4 | Value / action contract | —; arguments for `landsetheight` (generated: set_land_height, see native inventory) |
| `LandSetRightsArgs` | 6 | Value / action contract | —; arguments for `landsetrights` (Outside ordinary play, see native inventory) |
| `LandSmoothArgs` | 8 | Value / action contract | —; arguments for `landsmooth` (generated: smooth_land, see native inventory) |
| `LargeSceneryElement` | 9 | Game world / custom selection | `get_map_tile`: generated type-gated native fields, raw IDs/sentinels. No direct setters. Curated construction/path/station reads retain their stricter normalization contracts. |
| `LargeSceneryObject` | 1 | Object metadata | — |
| `LargeSceneryObjectTile` | 6 | Object metadata | — |
| `LargeSceneryPlaceArgs` | 8 | Value / action contract | —; arguments for `largesceneryplace` (generated: place_large_scenery, see native inventory) |
| `LargeSceneryRemoveArgs` | 5 | Value / action contract | —; arguments for `largesceneryremove` (generated: remove_large_scenery, see native inventory) |
| `LargeScenerySetColourArgs` | 8 | Value / action contract | —; arguments for `largescenerysetcolour` (generated: set_large_scenery_colour, see native inventory) |
| `ListViewColumn` | 8 | Plugin / presentation infrastructure | — |
| `ListViewDesc` | 10 | Plugin / presentation infrastructure | — |
| `ListViewItemSeparator` | 2 | Plugin / presentation infrastructure | — |
| `ListViewWidget` | 9 | Plugin / presentation infrastructure | — |
| `Listener` | 5 | Plugin / presentation infrastructure | — |
| `Litter` | 2 | Game state / observations | `get_litter_details`: `creationTick`, `id`, `litterType`, `type`, `x`, `y`, `z` |
| `LoadOrQuitArgs` | 2 | Value / action contract | —; arguments for `loadorquit` (Essential lifecycle logic, see native inventory) |
| `LoadScenarioTitleSequenceCommand` | 2 | Plugin / presentation infrastructure | — |
| `LoadTitleSequenceCommand` | 2 | Plugin / presentation infrastructure | — |
| `LoadedImageObject` | 2 | Object metadata | Common identity through loaded-object tools; sprite/image buffers are presentation-only. |
| `LoadedObject` | 6 | Object metadata | `get_loaded_music_objects`: `identifier`, `index`, `name`; `get_loaded_objects`: `identifier`, `index`, `name`; `get_loaded_object_details`: `capacity`, `carsPerFlatRide`, `description`, `flags`, `height`, `identifier`, `index`, `legacyIdentifier`, `maxCarsInTrain`, `maxHeight`, `minCarsInTrain`, `name`, `price`, `removalPrice`, `rideType`, `sceneryGroups`, `shopItem`, `shopItemSecondary`, `tiles`, `type` |
| `LocationTitleSequenceCommand` | 3 | Plugin / presentation infrastructure | — |
| `MapChangeSizeArgs` | 4 | Value / action contract | —; arguments for `mapchangesize` (Outside ordinary play, see native inventory) |
| `MapRange` | 2 | Value / action contract | — |
| `MazePlaceTrackArgs` | 5 | Value / action contract | —; arguments for `mazeplacetrack` (Essential custom guard, see native inventory) |
| `MazeSetTrackArgs` | 7 | Value / action contract | —; arguments for `mazesettrack` (custom/partial, see native inventory) |
| `Mechanic` | 3 | Game state / observations | `get_staff_details` exposes nullable role-specific work counters. |
| `MoneyEffect` | 1 | Game state / observations | — |
| `Network` | 16 | Administrative / unsafe mutation | — |
| `NetworkAuthenticateEventArgs` | 4 | Administrative / unsafe mutation | — |
| `NetworkChatEventArgs` | 1 | Administrative / unsafe mutation | — |
| `NetworkEventArgs` | 1 | Administrative / unsafe mutation | — |
| `NetworkModifyGroupArgs` | 5 | Value / action contract | —; arguments for `networkmodifygroup` (Intentionally excluded, see native inventory) |
| `NetworkStats` | 2 | Administrative / unsafe mutation | — |
| `ObjectManager` | 6 | Object metadata | `get_installed_objects`: `installedObjects` |
| `Park` | 32 | Game state / observations | `set_park_name`: `name`; `set_park_entrance_fee`: `entranceFee`; `set_park_loan`: `bankLoan`, `cash`; `get_park_guest_generation`: `guestGenerationProbability`, `guestInitialCash`, `guestInitialHappiness`, `guestInitialHunger`, `guestInitialThirst`, `guests`, `parkSize`, `suggestedGuestMaximum`, `totalAdmissions`, `totalIncomeFromAdmissions`; `get_park_flags`: `getFlag`; `get_park_messages`: `messages`; `get_park_awards`: `awards`; `get_monthly_expenditure`: `getMonthlyExpenditure` |
| `ParkCalculateGuestCapArgs` | 1 | Value / action contract | — |
| `ParkEntrancePlaceArgs` | 5 | Value / action contract | —; arguments for `parkentranceplace` (Outside ordinary play, see native inventory) |
| `ParkEntranceRemoveArgs` | 3 | Value / action contract | —; arguments for `parkentranceremove` (Outside ordinary play, see native inventory) |
| `ParkMarketingArgs` | 3 | Value / action contract | —; arguments for `parkmarketing` (generated: start_marketing_campaign, start_ride_marketing_campaign, start_food_marketing_campaign, see native inventory) |
| `ParkMessage` | 8 | Game state / observations | — |
| `ParkMessageDesc` | 3 | Plugin / presentation infrastructure | — |
| `ParkSetDateArgs` | 3 | Value / action contract | —; arguments for `parksetdate` (Intentionally excluded, see native inventory) |
| `ParkSetEntranceFeeArgs` | 1 | Value / action contract | —; arguments for `parksetentrancefee` (generated: set_park_entrance_fee, see native inventory) |
| `ParkSetLoanArgs` | 1 | Value / action contract | —; arguments for `parksetloan` (generated: set_park_loan, see native inventory) |
| `ParkSetNameArgs` | 1 | Value / action contract | —; arguments for `parksetname` (generated: set_park_name, see native inventory) |
| `ParkSetParameterArgs` | 2 | Value / action contract | —; arguments for `parksetparameter` (generated: close_park, open_park, see native inventory) |
| `ParkSetResearchFundingArgs` | 2 | Value / action contract | —; arguments for `parksetresearchfunding` (generated: set_research_funding, see native inventory) |
| `PathConnection` | 9 | Game world / custom selection | — |
| `PathNavigationOptions` | 4 | Game world / custom selection | — |
| `PathNavigator` | 5 | Game world / custom selection | — |
| `PatrolArea` | 5 | Game state / observations | `get_staff_patrol_tiles` / staff snapshot reads, `set_staff_patrol_area` native add/remove/clear. |
| `PauseToggleArgs` | 0 | Value / action contract | —; arguments for `pausetoggle` (generated: toggle_game_pause, see native inventory) |
| `Peep` | 8 | Game state / observations | Guest/staff details expose inherited fields; named flags are read-only projections, full guest flag mask uses native guestsetflags. |
| `PeepPickupArgs` | 6 | Value / action contract | —; arguments for `peeppickup` (Essential lifecycle logic, see native inventory) |
| `PeepSpawnPlaceArgs` | 4 | Value / action contract | —; arguments for `peepspawnplace` (Outside ordinary play, see native inventory) |
| `Player` | 8 | Administrative / unsafe mutation | — |
| `PlayerGroup` | 3 | Administrative / unsafe mutation | — |
| `PlayerKickArgs` | 1 | Value / action contract | —; arguments for `playerkick` (Intentionally excluded, see native inventory) |
| `PlayerSetGroupArgs` | 2 | Value / action contract | —; arguments for `playersetgroup` (Intentionally excluded, see native inventory) |
| `PluginManager` | 1 | Plugin / presentation infrastructure | — |
| `PluginMetadata` | 8 | Plugin / presentation infrastructure | — |
| `PngPixelData` | 3 | Plugin / presentation infrastructure | — |
| `ProfiledFunction` | 7 | Plugin / presentation infrastructure | — |
| `Profiler` | 5 | Plugin / presentation infrastructure | — |
| `RawPixelData` | 5 | Plugin / presentation infrastructure | — |
| `Research` | 11 | Game state / observations | `set_research_funding`: `funding`, `progress`; `get_research_status`: `expectedDay`, `expectedItem`, `expectedMonth`, `funding`, `lastResearchedItem`, `priorities`, `progress`, `stage`; `get_research_items`: `inventedItems`, `uninventedItems` |
| `RestartTitleSequenceCommand` | 1 | Plugin / presentation infrastructure | — |
| `Ride` | 54 | Game state / observations | `set_ride_inspection_interval`: `inspectionInterval`; `set_ride_name`: `name`; `set_ride_minimum_waiting_time`: `maximumWaitingTime`, `minimumWaitingTime`; `set_ride_maximum_waiting_time`: `maximumWaitingTime`, `minimumWaitingTime`; `set_ride_lift_hill_speed`: `liftHillSpeed`, `maxLiftHillSpeed`, `minLiftHillSpeed`; `set_ride_operating_mode`: `mode`, `status`; `set_ride_music_enabled`: `flags`; `set_ride_music_style`: `music`; `get_ride_operating_settings`: `departFlags`, `flags`, `liftHillSpeed`, `maxLiftHillSpeed`, `maximumWaitingTime`, `minLiftHillSpeed`, `minimumWaitingTime`, `mode`, `music`, `name`, `status`; `get_ride_maintenance_status`: `age`, `downtime`, `flags`, `inspectionInterval`, `reliability`; `set_ride_departure_flags`: `departFlags`; `set_ride_station_style`: `stationStyle`; `get_ride_track_colours`: `colourSchemes`; `get_ride_vehicle_colours`: `vehicleColours` |
| `RideCreateActionResult` | 1 | Value / action contract | — |
| `RideCreateArgs` | 6 | Value / action contract | —; arguments for `ridecreate` (generated: create_unbuilt_ride, see native inventory) |
| `RideDemolishArgs` | 2 | Value / action contract | —; arguments for `ridedemolish` (generated: delete_ride, renew_ride, see native inventory) |
| `RideEntranceExitPlaceArgs` | 6 | Value / action contract | —; arguments for `rideentranceexitplace` (custom/partial, see native inventory) |
| `RideEntranceExitRemoveArgs` | 5 | Value / action contract | —; arguments for `rideentranceexitremove` (generated: remove_station_building, see native inventory) |
| `RideFreezeRatingArgs` | 3 | Value / action contract | —; arguments for `ridefreezerating` (Intentionally excluded, see native inventory) |
| `RideObject` | 21 | Object metadata | `get_loaded_ride_objects`, generated object details; metadata car limits are not effective train length. |
| `RideObjectVehicle` | 28 | Object metadata | — |
| `RideRatingsCalculateArgs` | 4 | Value / action contract | — |
| `RideResearchItem` | 4 | Plugin / presentation infrastructure | — |
| `RideSetAppearanceArgs` | 4 | Value / action contract | —; arguments for `ridesetappearance` (generated: set_ride_track_colour, set_ride_vehicle_colour, set_ride_vehicle_colour_scheme, set_ride_station_style, set_ride_random_shop_colours, see native inventory) |
| `RideSetColourSchemeArgs` | 6 | Value / action contract | —; arguments for `ridesetcolourscheme` (generated: set_track_piece_colour_scheme, see native inventory) |
| `RideSetNameArgs` | 2 | Value / action contract | —; arguments for `ridesetname` (generated: set_ride_name, see native inventory) |
| `RideSetPriceArgs` | 3 | Value / action contract | —; arguments for `ridesetprice` (custom/partial, see native inventory) |
| `RideSetSettingArgs` | 3 | Value / action contract | —; arguments for `ridesetsetting` (generated: set_ride_inspection_interval, set_ride_minimum_waiting_time, set_ride_maximum_waiting_time, set_ride_lift_hill_speed, set_ride_operating_mode, set_ride_circuit_count, set_ride_music_enabled, set_ride_music_style, set_ride_departure_flags, set_ride_operation_option, see native inventory) |
| `RideSetStatusArgs` | 2 | Value / action contract | —; arguments for `ridesetstatus` (generated: close_ride, start_ride_test, open_ride, simulate_ride, see native inventory) |
| `RideSetVehicleArgs` | 4 | Value / action contract | —; arguments for `ridesetvehicle` (generated: set_ride_vehicles, set_ride_vehicle_object, set_ride_trains_reversed, see native inventory) |
| `RideStation` | 6 | Game world / custom selection | `get_ride_station_access` and coaster snapshots normalize null/sentinel positions and preserve building presence uncertainty. |
| `RideVoucher` | 2 | Game state / observations | — |
| `RlePixelData` | 4 | Plugin / presentation infrastructure | — |
| `RotateTitleSequenceCommand` | 2 | Plugin / presentation infrastructure | — |
| `RowColumn` | 2 | Plugin / presentation infrastructure | — |
| `SaveGameOptions` | 1 | Plugin / presentation infrastructure | `save_park`: fresh UUID filename, acknowledgement only, independent disk verification required. |
| `Scenario` | 9 | Game state / observations | `get_scenario_details`: `companyValueRecord`, `completedBy`, `completedCompanyValue`, `details`, `filename`, `name`, `objective`, `parkRatingWarningDays`, `status` |
| `ScenarioFile` | 8 | Plugin / presentation infrastructure | — |
| `ScenarioObjective` | 7 | Game state / observations | — |
| `ScenarioSelectDesc` | 1 | Plugin / presentation infrastructure | — |
| `ScenarioSetSettingArgs` | 2 | Value / action contract | —; arguments for `scenariosetsetting` (Intentionally excluded, see native inventory) |
| `SceneryGroupObject` | 1 | Object metadata | — |
| `SceneryObject` | 1 | Object metadata | — |
| `SceneryResearchItem` | 3 | Plugin / presentation infrastructure | — |
| `ScreenCoordsXY` | 2 | Plugin / presentation infrastructure | — |
| `ScreenSize` | 2 | Plugin / presentation infrastructure | — |
| `Security` | 2 | Game state / observations | `get_staff_details` exposes nullable role-specific work counters. |
| `ShortcutDesc` | 4 | Plugin / presentation infrastructure | — |
| `SignSetNameArgs` | 2 | Value / action contract | —; arguments for `signsetname` (generated: set_sign_name, see native inventory) |
| `SignSetStyleArgs` | 4 | Value / action contract | —; arguments for `signsetstyle` (generated: set_sign_style, see native inventory) |
| `SmallSceneryElement` | 8 | Game world / custom selection | `get_map_tile`: generated type-gated native fields, raw IDs/sentinels. No direct setters. Curated construction/path/station reads retain their stricter normalization contracts. |
| `SmallSceneryObject` | 4 | Object metadata | — |
| `SmallSceneryPlaceArgs` | 9 | Value / action contract | —; arguments for `smallsceneryplace` (generated: place_small_scenery, see native inventory) |
| `SmallSceneryRemoveArgs` | 5 | Value / action contract | —; arguments for `smallsceneryremove` (generated: remove_small_scenery, see native inventory) |
| `SmallScenerySetColourArgs` | 8 | Value / action contract | —; arguments for `smallscenerysetcolour` (generated: set_small_scenery_colour, see native inventory) |
| `Socket` | 7 | Plugin / presentation infrastructure | — |
| `SpeedTitleSequenceCommand` | 2 | Plugin / presentation infrastructure | — |
| `SpinnerDesc` | 5 | Plugin / presentation infrastructure | — |
| `SpinnerWidget` | 2 | Plugin / presentation infrastructure | — |
| `SpriteGroup` | 2 | Object metadata | — |
| `SpriteGroups` | 35 | Object metadata | — |
| `StaffFireArgs` | 1 | Value / action contract | —; arguments for `stafffire` (generated: fire_staff, see native inventory) |
| `StaffHireArgs` | 4 | Value / action contract | —; arguments for `staffhire` (generated: hire_staff, see native inventory) |
| `StaffHireNewActionResult` | 1 | Value / action contract | — |
| `StaffSetColourArgs` | 2 | Value / action contract | —; arguments for `staffsetcolour` (generated: set_staff_colour, see native inventory) |
| `StaffSetCostumeArgs` | 2 | Value / action contract | —; arguments for `staffsetcostume` (generated: set_staff_costume, see native inventory) |
| `StaffSetNameArgs` | 2 | Value / action contract | —; arguments for `staffsetname` (generated: set_staff_name, see native inventory) |
| `StaffSetOrdersArgs` | 2 | Value / action contract | —; arguments for `staffsetorders` (generated: set_staff_orders, see native inventory) |
| `StaffSetPatrolAreaArgs` | 6 | Value / action contract | —; arguments for `staffsetpatrolarea` (generated: set_staff_patrol_area, see native inventory) |
| `SurfaceElement` | 10 | Game world / custom selection | `get_map_tile`: generated type-gated native fields, raw IDs/sentinels. No direct setters. Curated construction/path/station reads retain their stricter normalization contracts. |
| `SurfaceSetStyleArgs` | 6 | Value / action contract | —; arguments for `surfacesetstyle` (generated: set_surface_style, see native inventory) |
| `TextBoxDesc` | 4 | Plugin / presentation infrastructure | — |
| `TextBoxWidget` | 5 | Plugin / presentation infrastructure | — |
| `TextInputDesc` | 5 | Plugin / presentation infrastructure | — |
| `Thought` | 5 | Game state / observations | `get_guest_thoughts`: type/item/freshness counters; localized UI text rendering omitted. |
| `Tile` | 8 | Game world / custom selection | `get_map_tile`: `elements`, `numElements` |
| `TileModifyArgs` | 5 | Value / action contract | —; arguments for `tilemodify` (Outside ordinary play, see native inventory) |
| `TileSelection` | 2 | Game world / custom selection | — |
| `TitleSequence` | 14 | Plugin / presentation infrastructure | — |
| `TitleSequenceManager` | 2 | Plugin / presentation infrastructure | — |
| `TitleSequencePark` | 3 | Plugin / presentation infrastructure | — |
| `Tool` | 3 | Plugin / presentation infrastructure | — |
| `ToolDesc` | 8 | Plugin / presentation infrastructure | — |
| `ToolEventArgs` | 5 | Value / action contract | — |
| `TrackColour` | 3 | Value / action contract | — |
| `TrackDesignArgs` | 4 | Value / action contract | —; arguments for `trackdesign` (Essential custom lifecycle, see native inventory) |
| `TrackElement` | 15 | Game world / custom selection | `get_map_tile`: generated type-gated native fields, raw IDs/sentinels. No direct setters. Curated construction/path/station reads retain their stricter normalization contracts. |
| `TrackIterator` | 6 | Game world / custom selection | Consumed by authoritative connected coaster snapshots, not exposed as a stateful handle. |
| `TrackPlaceArgs` | 12 | Value / action contract | —; arguments for `trackplace` (custom/partial, see native inventory) |
| `TrackRemoveArgs` | 6 | Value / action contract | —; arguments for `trackremove` (custom/partial, see native inventory) |
| `TrackSegment` | 36 | Game world / custom selection | `get_track_catalog`, compatible candidates and descriptor-backed cardinal geometry. Descriptor/subposition rendering samples are not a promise of supported placement. |
| `TrackSegmentElement` | 0 | Game world / custom selection | — |
| `TrackSetBrakeSpeedArgs` | 5 | Value / action contract | —; arguments for `tracksetbrakespeed` (generated: set_track_brake_speed, see native inventory) |
| `TrackSubposition` | 3 | Game world / custom selection | — |
| `Ui` | 21 | Plugin / presentation infrastructure | — |
| `VehicleColour` | 3 | Value / action contract | — |
| `VehicleCrashArgs` | 2 | Value / action contract | — |
| `Viewport` | 10 | Plugin / presentation infrastructure | — |
| `ViewportDesc` | 1 | Plugin / presentation infrastructure | — |
| `ViewportWidget` | 2 | Plugin / presentation infrastructure | — |
| `Voucher` | 2 | Game state / observations | — |
| `WaitTitleSequenceCommand` | 2 | Plugin / presentation infrastructure | — |
| `WallElement` | 9 | Game world / custom selection | `get_map_tile`: generated type-gated native fields, raw IDs/sentinels. No direct setters. Curated construction/path/station reads retain their stricter normalization contracts. |
| `WallObject` | 0 | Object metadata | — |
| `WallPlaceArgs` | 8 | Value / action contract | —; arguments for `wallplace` (generated: place_wall, see native inventory) |
| `WallRemoveArgs` | 4 | Value / action contract | —; arguments for `wallremove` (generated: remove_wall, see native inventory) |
| `WallSetColourArgs` | 7 | Value / action contract | —; arguments for `wallsetcolour` (generated: set_wall_colour, see native inventory) |
| `WaterLowerArgs` | 4 | Value / action contract | —; arguments for `waterlower` (generated: lower_water, see native inventory) |
| `WaterRaiseArgs` | 4 | Value / action contract | —; arguments for `waterraise` (generated: raise_water, see native inventory) |
| `WaterSetHeightArgs` | 3 | Value / action contract | —; arguments for `watersetheight` (generated: set_water_height, see native inventory) |
| `WeatherState` | 2 | Game state / observations | — |
| `WidgetBase` | 10 | Plugin / presentation infrastructure | — |
| `WidgetBaseDesc` | 9 | Plugin / presentation infrastructure | — |
| `Window` | 18 | Plugin / presentation infrastructure | — |
| `WindowDesc` | 18 | Plugin / presentation infrastructure | — |
| `WindowTabDesc` | 2 | Plugin / presentation infrastructure | — |
| `ZoomTitleSequenceCommand` | 2 | Plugin / presentation infrastructure | — |

## Classification policies

- **Game state / observations:** Fixed scalar, flag, indexed-colour, nested-record and paged-array projections cover gameplay data. Ordinary mutations use named game actions instead of direct setters. Simulation-only overrides (guest needs/cash/animation/forced position, manual breakdowns, artificial awards, scenario completion, research invention lists) are intentionally not writable. UI-only animation sprite generation and localized thought rendering remain presentation APIs. Message creation/removal and user-authored formatting need a separate bounded content/identity contract; news/award reads are covered.
- **Game world / custom selection:** Generated `get_map_tile` covers type-gated native element fields (including scenery colours/text and applicable maze/speed data). Curated map/path/station/track observations cover applicable live world elements; supported track iteration is consumed into authoritative snapshots. Direct element insertion/removal/raw bytes/setters can invalidate rides and queues and require custom invariants. Stateful path navigators/iterators need lifetime/selection handling, not serialization of a native cursor. Arbitrary entity creation/removal/movement and crash-particle launch likewise need typed initialization, ownership and lifecycle safeguards.
- **Object metadata:** Loaded-object lists/details and installed-object pagination are generated. Ride object metadata/research and modern paths also have custom observations. Paths, image buffers, sprite groups and render-only vehicle internals are intentionally omitted. Loading/unloading objects requires in-use references/research/compatibility and lifecycle guards before it can be exposed safely.
- **Value / action contract:** These are DTOs, coordinate records, events or action argument/result declarations, not extra callable APIs. Applicable fields are consumed by the corresponding generated/custom contracts. The JSON snapshot retains exact declarations, including stale SDK action arguments; C++ AcceptParameters is authoritative for mutation bindings.
- **Plugin / presentation infrastructure:** Plugin registration/actions/hooks/timers/storage/configuration, UI/windows/widgets/tools/viewport, image allocation/drawing, profiler, console/legacy commands, networking sockets and title-sequence/file management are intentionally excluded. They enable arbitrary code/resources/UI/files rather than ordinary park play, or require asynchronous callback/resource lifetimes. MCP uses its own transport, schema, image projection and narrowly guarded UUID save workflow.
- **Administrative / unsafe mutation:** Cheat state and network/player administration are intentionally outside scope. No rule bypass, shared-server permission edits, player secrets, chat sending or raw console/script escape hatch.

## Native actions not published to scripts

These implementations exist in the pinned source but have no fixed entry in `ActionNameToType`; the registry does not invent aliases.

- `src/openrct2/actions/general/CustomAction.cpp`
- `src/openrct2/actions/ride/RideSetVisibilityAction.cpp`
- `src/openrct2/actions/scenery/ScenerySetRestrictedAction.cpp`

## Verification and maintenance

The report, README inventory and bindings regenerate during normal wheel/sdist/editable builds and plugin installation. Automated checks require every native alias and interface to have a decision, compare action fields/constants with the C++ visitor snapshot, check unambiguous primitive SDK projection types, reject unsafe schemas and check generated freshness. Aliases, polymorphic types and native getter exceptions still require source review.

To refresh the upstream snapshot intentionally: `python scripts/audit_game_api.py --source /path/to/OpenRCT2-0.5.7`. The engine version and scripting API are checked. Review source hashes, visitor parameters and interface classifications. `--check` never writes. Normal generation never downloads source or introspects a running game.

### Live verification scope

- Tested through actual MCP stdio clients and the v0.5.7/API 124 game, not just TCP calls or mocks.
- Positive checks cover the newly generated ride settings/appearance/record operations, staff lifecycle/patrol, guest naming/flags, park controls/research/marketing, speed/pause, scenery/signs/path additions, terrain/water, unshifted resize, editor ownership/entrance/spawn actions and available observations. Loaded-object details were checked across all 69 walls in the fixture after correcting scenery-group identifiers to strings.
- A separate money-enabled, entry-charged fixture verified entrance-fee readback, exact borrowing/repayment cash changes and marketing expenditure while paused. Its setup changed money/charging rules only, preserving starting cash, loan, research and objective; those setup switches are not exposed as tools. This is not evidence of sustained profitability.
- The fixed 74-piece coaster retained its exact track pieces/options, completed testing with observed train motion and ratings 5.08/6.38/3.42, and produced a file-verified checkpoint. A separate temporary brake fixture verified odd speed 13 reads back as 12, then only that temporary ride was demolished.
- Scenario-editor checks used a real editor window (headless `edit` remained in title mode and was rejected before mutation). Park-data checkpoints were file-verified; editor UI steps/resumption are not certified.
- No live free-balloon/litter fixture was available. Balloon pressing was checked for rejection on the wrong entity, not successful popping. Balloon/litter subtype observations remain source/schema tested, not positively live-verified. Earlier generated controls retain their prior live regression evidence. These checks do not cover every enum, ride, object, map size, climate, native failure or multiplayer race.

Source/schema validation must not be described as successful placement, persistence, guest access or operation. Generated acknowledgements and their limits remain visible even for live-tested tools.

0.19 ordinary-play review removes editor ownership/entrance/spawn setup, map resizing, whole guest behaviour replacement and debug speeds from registration. New footprint/shop/facility, elevated/sloped path, selected-removal and maze workflows have source/contract and isolated full-MCP live evidence. These are not claims of complete player capability coverage; see [player capabilities](player-capabilities.md).
