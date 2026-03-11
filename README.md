# OpenRCT2 Ride Creation MCP

An MCP server for creating roller coasters in OpenRCT2 using a stateless, coordinate-free approach. The server returns authoritative state including height maps and visual top-down representations.

![movie-1080p-final](https://github.com/user-attachments/assets/77bf232a-91c0-4205-a3c2-5c0bb3af9896)

## Tools
- `create_ride`: Create a new coaster and place the first station piece.
- `place_track_segment`: Add a track segment (validates against game rules).
- `undo_last_piece`: Remove the last placed segment.
- `get_coaster_state`: Get current authoritative state and visualization.
- `place_entrance_exit`: Add entrance/exit to the station.
- `start_ride_test`: Start test mode for ratings.
- `get_ride_stats`: Get intensity, excitement, and nausea ratings.
- `list_all_rides`: List existing rides.
- `delete_all_rides`: Clear all rides.

## Plugin Attribution
The `ridecreation-api.js` plugin is a modified version of the [OpenRCT2 Ride Creation API](https://openrct2plugins.org/plugin/R_kgDONuEl9w/openrct2-ridecreation-api).

## How to Use
1. **Install Plugin**: Copy `ridecreation-api.js` to your OpenRCT2 `plugin` folder.
2. **Launch OpenRCT2**: Ensure the game is running.
3. **Run MCP Server**:
   ```bash
   uv run openrct2-ride-mcp
   ```
4. **Use Skill**: There is a `SKILL.md` with some instructions on how to build a coaster.
