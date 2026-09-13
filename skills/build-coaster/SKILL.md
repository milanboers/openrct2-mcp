---
name: build-coaster
description: Specialized guidance for building roller coasters in OpenRCT2 using the Ride Creation MCP server. Use when an agent needs to design, place track pieces, or complete a coaster circuit.
---

# OpenRCT2 Coaster Builder

This skill provides comprehensive procedural knowledge for building effective and valid roller coasters using the OpenRCT2 Ride Creation MCP server.

## 🛑 THE GOLDEN RULE 🛑
You **MUST ONLY** select a `track_type` that appears in the `valid_pieces` list of the **previous** tool response. If you ignore this list, the placement **will fail**.

## Ride Types

`create_ride` takes a numeric `ride_type`. The supported default is **52 = Wooden Roller Coaster** — the track validation is tuned for it, so always use it unless told otherwise.

| ID | Ride Type |
|----|-----------|
| 52 | Wooden Roller Coaster (default) |
| 51 | Twister Roller Coaster |
| 54 | Steel Wild Mouse |
| 0 | Spiral Roller Coaster |
| 1 | Stand-up Roller Coaster |
| 3 | Inverted Roller Coaster |
| 13 | Bobsleigh Coaster |
| 15 | Looping Roller Coaster |
| 17 | Mine Train Coaster |
| 19 | Corkscrew Roller Coaster |
| 44 | Vertical Drop Roller Coaster |
| 57 | Flying Roller Coaster |

Do **not** invent ride type numbers — use only the table above. The state returned by `create_ride` includes `ride_type_name`, so double-check it matches what the user asked for.

## Building Workflow (Follow the Cursor)

The server uses **Alignment Snapping**. You only select track types; coordinates are handled for you.

The server returns images and a text-based height map of the current layout. The numbers represent the height (Z-value). Use them! Analyze them!

### 1. The Station Sequence
`create_ride` places the **BeginStation** for you. Then:
1. **Middle pieces**: Place 2-4 **MiddleStation** pieces, heading straight out of the station.
2. **The Cap**: Place one **EndStation** piece — this is what enables normal track.

Only after the EndStation is in place can you lay normal track. The station length is flexible: the circuit is complete when the track returns to the station, whatever the station looks like.

### 2. Pitch Transitions (CRITICAL)
You cannot jump from Flat to Steep. You **MUST** use transition pieces:

| Start State | Target State | **Required Transition Piece** |
|-------------|--------------|-------------------------------|
| **Flat**    | **Up 25°**   | **`FlatToUp25`**              |
| **Up 25°**  | **Flat**     | **`Up25ToFlat`**              |
| **Flat**    | **Down 25°** | **`FlatToDown25`**            |
| **Down 25°**| **Flat**     | **`Down25ToFlat`**            |

*Example: To start a drop, you MUST place `FlatToDown25` before you can place `Down25`.*

### 3. The Lifthill
- **Size**: Build high enough so you can make a decent drop later.
- **Rule**: Set `has_chain_lift: true` for **EVERY** upward segment (`FlatToUp25` and `Up25`).
- **Sequence**: `FlatToUp25` -> `Up25` (Repeat) -> `Up25ToFlat`.

### 4. Navigation & Loop Closure
- **Spatial Data**: Check `current_endpoint.distance`.
- **Closure**: Steer back to `distance: {x: 0, y: 0, z: 0}`.
- **Banking**: ALWAYS bank your turns (`FlatToLeftBank`, `FlatToRightBank`) or the ride will be too intense.

## Working with an Existing Park

You can build a coaster from scratch **or continue one that already has track**. The server reads the track straight from the game, so loading a save with existing coasters works fine — pick the ride you want and keep building, or call `create_ride` for a new one anywhere on the map.

## When a Placement Fails

Even a piece from `valid_pieces` can be rejected if it would hit the ground, scenery, or existing track. The error message tells you why:

| Error | Likely cause | What to do |
|-------|--------------|------------|
| `Location occupied` | Building into the ground or existing track | `undo_last_piece` and adjust your line |
| `Invalid height` | Too high above or too deep below the ground | Raise or lower the layout, or `undo_last_piece` |
| `Not enough space` / `Path blocked` | Scenery or another ride is in the way | Change direction, or `undo_last_piece` |
| `Track piece not available for this ride type` | The piece isn't legal for this ride | Pick a different piece from `valid_pieces` |

After a failure the server returns the full state again — read `valid_pieces` and the height map, adjust, and retry. Don't retry the same piece at the same spot.

## Track Types Reference

### Basic Pieces
- `Flat`
- `BeginStation` (The first piece placed by `create_ride`)
- `MiddleStation`
- `EndStation`

### Slopes & Transitions
- **UP**: `FlatToUp25` (Transition) -> `Up25` (Slope) -> `Up25ToFlat` (Transition back to Flat)
- **STEEP UP**: `Up25ToUp60` (Transition) -> `Up60` (Steep Slope) -> `Up60ToUp25` (Transition back)
- **DOWN**: `FlatToDown25` (Transition) -> `Down25` (Slope) -> `Down25ToFlat` (Transition back to Flat)
- **STEEP DOWN**: `Down25ToDown60` (Transition) -> `Down60` (Steep Slope) -> `Down60ToDown25` (Transition back)

### Turns & Banking
- `LeftQuarterTurn5Tiles` / `RightQuarterTurn5Tiles`: Large Turn (Radius 5)
- `LeftQuarterTurn3Tiles` / `RightQuarterTurn3Tiles`: Small Turn (Radius 3)
- `FlatToLeftBank` / `FlatToRightBank`: Bank Start (Transition to Left/Right)
- `LeftBankToFlat` / `RightBankToFlat`: Bank End (Transition back to Flat)
- `BankedLeftQuarterTurn5Tiles` / `BankedRightQuarterTurn5Tiles`: Large Banked Turn
- `LeftBankedQuarterTurn3Tiles` / `RightBankedQuarterTurn3Tiles`: Small Banked Turn

## Navigation Heuristics

| Offset | Meaning | Corrective Action |
|--------|---------|-------------------|
| `distance.z > 0` | Too high | Use Down transitions (`FlatToDown25`) then Slopes (`Down25`). |
| `distance.z < 0` | Too low | You built too deep! `undo_last_piece`. |
| Large `x` or `y` | Far away | Turn towards the origin (`0, 0`). |

## Ratings (get_ride_stats)

After `start_ride_test`, `get_ride_stats` returns `excitement`, `intensity`, and `nausea` on a 0-100 scale. A good coaster roughly scores:

- **excitement** in the 60s-80s
- **intensity** around 40-60 (higher is more forceful, but too high feels rough)
- **nausea** as low as possible (under ~20)

If excitement is low, add hills, airtime, or a bigger drop. If intensity or nausea are too high, bank your turns more and keep the layout smoother.
