---
name: build-coaster
description: Specialized guidance for building roller coasters in OpenRCT2 using the Ride Creation MCP server. Use when an agent needs to design, place track pieces, or complete a coaster circuit.
---

# OpenRCT2 Coaster Builder

This skill provides comprehensive procedural knowledge for building effective and valid roller coasters using the OpenRCT2 Ride Creation MCP server.

## 🛑 THE GOLDEN RULE 🛑
You **MUST ONLY** select a `track_type` that appears in the `valid_pieces` list of the **previous** tool response. If you ignore this list, the placement **will fail**.

## Building Workflow (Follow the Cursor)

The server uses **Alignment Snapping**. You only select track types; coordinates are handled for you.

The server returns images and a text-based height map of the current layout. The numbers represent the height (Z-value). Use them! Analyze them!

### 1. The Station Sequence
A station must follow this exact sequence:
1. **Middle pieces**: Place 2-4 **MiddleStation** pieces.
2. **The Cap**: Place one **EndStation** piece to enable normal track.

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
