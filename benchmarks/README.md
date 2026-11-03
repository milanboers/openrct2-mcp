# Agent coaster benchmarks

These are seed briefs and acceptance checks, not a calibrated ranking of models.
They evaluate the resulting ride. They do not launch agents, choose a layout,
create goals, enforce budgets, or collect agent conversations/tool logs.

## Briefs

| Brief | Task |
| --- | --- |
| `working-coaster.json` | Complete and operate a wooden coaster inside a broad footprint. |
| `compact-coaster.json` | Operate a wooden coaster inside a smaller footprint that requires planning the station location. |
| `rated-coaster.json` | Meet the broad footprint plus excitement >= 3.0 and intensity <= 8.0. |

Rating thresholds are experiment targets, not general definitions of a good
coaster. Each JSON file contains the agent prompt and versioned acceptance
criteria. Change both together when defining a new task. Unknown fields and
invalid bounds are rejected instead of silently ignored.

## Run a trial

1. Save any park work you want to keep, then load a fresh bundled sandbox and
   unpause it. Confirm that the intended park is loaded. Never discard someone
   else's work just to run a benchmark.
2. Start a fresh agent conversation with the same MCP server and build skill.
   Give it the `prompt` from one brief. Keep the client, model settings, starting
   park and any time/tool budget consistent across runs. The evaluator does not
   enforce those conditions.
3. After the agent finishes, note its ride ID. Leave the ride testing or open
   and the game unpaused. Do not edit while collecting evidence.
4. Evaluate it, for example:

   ```sh
   uv run --locked python scripts/evaluate_ride.py \
     --brief benchmarks/working-coaster.json \
     --ride-id 0 \
     --agent-label "model-and-settings-run-1" \
     --output /tmp/working-coaster-run-1.json
   ```

The evaluator makes only `get_plugin_info`, `get_coaster_state`, and
`get_ride_stats` calls. It will not start, close, edit, unpause, or delete
anything. It refuses a mismatched plugin or park name and refuses to score if
the layout changes during observation.

It observes velocities for 10 seconds by default. Use `--observe-seconds` from
1 to 300 to change the window; keep it consistent across compared trials. A
short window can miss movement while a train waits in the station. Missing
motion fails that observation, not a proof that the ride can never operate.

## Results

The JSON report contains the exact brief, each acceptance check, measurements,
plugin information, observation time, and state/stat evidence. An explicit
`--agent-label` identifies the run; the evaluator never guesses which model
built the ride. `--output` creates a new file and refuses to overwrite one.
Without it, the JSON goes to stdout.

Exit codes:
- `0`: all acceptance checks passed.
- `1`: evidence was collected, but at least one check failed.
- `2`: invalid input or evidence could not be collected consistently.

Checks cover connected layout, ride type, closed circuit, actual track-element
tile bounds, calculated ratings, unpaused operation and observed movement.
Optional excitement/intensity thresholds use the game's decimal scale.
Footprint checks are not clearance checks. Guest access, path connections and
entrance/exit presence are not independently inspected. Prompt compliance and
preservation of unrelated park work still need manual review.

Tool-call counts and rejected placements are `null`, not zero: collecting them
would require a separate trace source. Do not compare those metrics until a
consistent collection method exists. Repeated agent trials and a wider set of
fixtures are needed before drawing conclusions about model performance.
