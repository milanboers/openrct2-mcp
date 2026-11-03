# OpenRCT2 testing

- To test plugin changes in-game, copy `ridecreation-api.js` to the OpenRCT2 user data `plugin/` directory and restart the game. A running game keeps the previously loaded plugin. User data paths vary by operating system and installation; see the README and verify the local installation.
- `scenarios/sandbox.park` is a bundled empty scenario suitable for testing. Starting a fresh sandbox or restarting can lose unsaved work. Check with the user before discarding park changes. OpenRCT2 may prompt to save on exit; don't force-kill it without explicit permission to discard changes.
- Use MCP tools to test the full client-to-game flow, not just the TCP API. After changing client configuration or the tool inventory, reload/reconnect the MCP client and verify the tools actually exposed to the session. A fresh child server does not guarantee its parent-resolved tool allowlist is current.
- Plugin startup and park loading are asynchronous. The TCP listener may respond before the park has finished loading, so an initially empty ride list alone doesn't prove the park is empty. Confirm the intended park is loaded before making changes.
- For coaster construction, follow `skills/build-coaster/SKILL.md` and the returned `valid_pieces`. After starting a test, check `get_ride_stats`; a closed circuit alone doesn't prove a ride is operational.
