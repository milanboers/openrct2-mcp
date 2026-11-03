# Agent coaster benchmarks

These are seed briefs and acceptance checks, not a calibrated ranking of models.
They evaluate the resulting ride. They do not launch agents, choose a layout,
create goals, enforce budgets, or collect agent conversations. Optional server
metrics collect counts and timing, not arguments, response bodies or images.

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
Footprint checks are not clearance checks. The bundled version-2 briefs also require observed station entrance/exit presence. Legacy
version-1 briefs retain their original criteria. Guest path access is not
established. Prompt compliance and unregistered park work still need manual review.

Tool-call counts and rejected placements remain `null` unless you explicitly
attach server metrics. Start a fresh server per trial with
`openrct2-mcp --metrics-file /tmp/trial-1.jsonl` (or set
`OPENRCT2_METRICS_FILE` in that server's environment), then add
`--metrics-file /tmp/trial-1.jsonl` to `evaluate_ride.py`. Use a new path per run.
Close that trial server cleanly before collecting its metrics. The report includes an aggregate, `capture_complete`, and a SHA-256 of the metrics source. Healthy shutdown writes a completion marker with the recorded call count. Unfinished or legacy captures are rejected by default. Use `--allow-incomplete-metrics` only when you intentionally want an explicitly incomplete prefix; do not compare it with complete trials. Malformed records and inconsistent completion markers are always rejected.

Metrics count requested/confirmed placements, rejected placement requests,
unknown placement outcomes, removals, query candidates, blocked queries,
call durations and response sizes. Preflight rejections count as rejected
requests, not proven game-action rejections. Counts cover the server process;
the evaluator cannot prove that the file belongs to this agent or ride. A
smoke-test metrics run is not an agent trial. Durations are not token usage or
elapsed trial time. Do not compare trials with different collection scopes.

## Reference validation

`references/` contains explicit construction inputs for every brief, separate
from the prompts. These are **not** arbitrary-ride exports or agent instructions.
They establish that the briefs are achievable with the current supported tools.
On OpenRCT2 0.5.7 / scripting API 124 / plugin 0.11.0, using the loaded object
`rct2.ride.ptct1`:

| Reference | Pieces | Excitement | Intensity | Nausea |
| --- | --- | --- | --- | --- |
| Working | 42 | 0.28 | 0.30 | 0.17 |
| Compact | 42 | 0.28 | 0.30 | 0.17 |
| Rated | 74 | 5.07 | 6.32 | 3.43 |

The compact reference's actual footprint is x=55..79, y=71..76. Ratings are
observed calibration values, not guaranteed across versions/configurations.
Object identifiers are resolved to loaded indices each run. Recorded validation
includes actual footprint bounds and a SHA-256 of normalized construction
inputs; tests catch fixture edits that leave this calibration record stale.
Rebuild and reevaluate modified references before updating their record.

To build and grade a reference in a prepared sandbox:

```sh
uv run --locked python scripts/build_reference.py \
  --brief benchmarks/rated-coaster.json \
  --reference benchmarks/references/rated-coaster.json \
  --output /tmp/rated-reference.json
```

This command asks for construction confirmation (`--yes` for explicit
noninteractive confirmation). It adds one ride and leaves it testing. It never
resets the park or deletes rides. Inputs and object availability are checked
before creation; game placement can still fail partway. Partial builds remain
for inspection, with the ride ID in the error. Reports are never overwritten.
Use a fresh sandbox for reproducible calibration; existing obstructions can
reject the build. Do not give reference layouts to agents in a normal trial.

## Recovery and revision trials

Three manifests in `fixtures/` define explicit starting conditions, separate from
the agent briefs and reference solutions:

| Fixture | Starting condition | Required preservation |
| --- | --- | --- |
| `continue-coaster` | Eight pieces of an unfinished coaster | All eight pieces |
| `obstructed-coaster` | The same prefix plus a separate obstructing station | Prefix and obstruction ride |
| `revise-coaster` | A working, low-excitement coaster already testing | First three station pieces and the same ride ID |

Load a fresh, unpaused sandbox, then prepare one fixture:

```sh
uv run --locked python scripts/prepare_trial.py \
  --fixture benchmarks/fixtures/obstructed-coaster.json \
  --output-dir /tmp/obstruction-trial-1
```

The command asks for consent (`--yes` explicitly skips the prompt). It verifies
plugin compatibility, normal game mode, intended park, pause state, an empty ride
list and the required loaded object before creating rides. It never resets the
park or demolishes anything. Output directories are reserved exclusively before
construction and are never reused. Partial failures retain created rides and
report their IDs, including partial creation IDs; interruptions can leave work
that needs inspection before retrying.

Give a fresh agent only the `prompt` from the generated `brief.json`, the normal
skill and MCP tools. Keep `setup.json`, fixture manifests and reference recipes
out of its prompt. Setup evidence records initial pieces, protected rides,
starting ratings and IDs. Setup calls are not agent-trial metrics.

After the agent finishes, evaluate the target ID printed by preparation:

```sh
uv run --locked python scripts/evaluate_ride.py \
  --brief /tmp/obstruction-trial-1/brief.json \
  --setup /tmp/obstruction-trial-1/setup.json \
  --ride-id 1 --agent-label "model-settings-run-1" \
  --output /tmp/obstruction-trial-1/result.json
```

Use the actual target ID, not necessarily `1`. With `--setup`, evaluation also
compares the protected prefix and registered obstacle rides, rejects a mismatched
brief/target and refuses changing protected evidence during collection. A missing
or changed obstacle fails preservation. Without `--setup`, only the ordinary ride
criteria are graded. Snapshot comparisons cannot detect every transient edit or
prove the absence of changes to unregistered work.

All three setups were live-calibrated on OpenRCT2 0.5.7 / API 124 / plugin 0.12.0,
completing to 74 pieces while retaining their required prefixes and obstacles:

| Fixture | Completed excitement / intensity / nausea |
| --- | --- |
| Continuation | 5.07 / 6.32 / 3.43 |
| Obstruction | 5.17 / 6.32 / 3.43 |
| Revision | 5.07 / 6.32 / 3.43 (initial excitement 0.28) |

Calibration used reference inputs, not independent agent design. These values
establish feasibility, not model quality or guaranteed ratings. Manifest
validation records include normalized input/reference hashes; revalidate changed
inputs. The revision calibration exposed a real second-close/reset requirement:
use `close_ride`, then explicit `reset_ride` before substantial reconstruction,
restore entrances/exits and retest. Closing once did not clear the old train and
the rebuilt layout stayed waiting at the station without ratings.

## First agent baseline

Start with one explicitly approved, time-bounded exploratory attempt using a
lower-cost model. Inspect its trace and distinguish infrastructure failures,
agent design decisions and missing tool information before deciding whether
another run is worthwhile. Do not automatically escalate to an expensive model.
Larger batches belong to a separately budgeted reliability study, not routine
feature development. Keep settings, budgets and evidence collection consistent
when comparing runs.

Keep per-run reports, model settings, costs and traces under `benchmarks/runs/`
(ignored by Git), or outside the checkout. Tracked `results/` contains only
curated, model-independent scripted calibration summaries. Individual agent
attempts are not model rankings or success-rate estimates.

Before spending on a run, use `scripts/check_ready.py` for a fresh read-only
server/plugin/park check, and verify the actual agent's MCP tool allowlist. The
script cannot certify another running session. Recovery fixtures remain available
for separately approved trials. Record whether failures concern closure,
clearance/support, operation, ratings, revision or state handling.

## Guest-operation calibration

`scripts/guest_smoke_test.py` is an opt-in scripted calibration for the bundled
sandbox, separate from these agent briefs. It checks explicit flat queue and exit
routes, queue ownership, normal opening and customer completion, and requests a
fresh checkpoint. It records evidence in a new output directory, refuses existing
rides, and never resets the park or deletes work. It does not demonstrate agent
performance, arbitrary public-network connectivity, financial management or
scenario objective completion. See the main README for invocation and limits.

`results/guest-operation-calibration.json` records the plugin 0.13.0 calibration:
74 pieces, 5.07/6.32/3.43 ratings, six completed customers, verified path edges and
queue ownership, stale-removal rejection, and a checkpoint verified on disk and
reloaded successfully. The existing interactive park was unchanged. The full
local trace and saved park are not bundled with this concise result summary.

## Guest-use agent brief

`guest-coaster.json` asks for one working wooden coaster and flat queue/exit
connections to the prepared 150×150 sandbox's known public-path anchor. There is
no excitement target. The agent chooses the layout and declares its routes as
`{"ride_id": 0, "entrance_route": [[x, y], ...], "exit_route": [[x, y], ...]}`.
Each route starts on the external path tile by its building and ends at
`[146, 67]`; building tiles are excluded. Coordinates are integer tile indices,
all path routes use Z=14, and unavailable routes remain empty rather than guessed.

The ordinary `evaluate_ride.py` checks only coaster acceptance, not guest use.
For guest acceptance, preserve a pre-agent `setup.json` with the observed
`plugin`, `park`, empty `rides` list and exact `anchor` path record, then use:

```sh
uv run --locked python scripts/evaluate_guest_ride.py \
  --setup /tmp/guest-trial/setup.json --routes /tmp/guest-trial/routes.json \
  --ride-id ACTUAL_ID --output /tmp/guest-trial/result.json
```

The collector is read-only, refuses an existing result, and checks actual path
edges, building-facing geometry, queue assignment, anchor preservation and the
coaster criteria. It takes a fresh customer baseline after the agent stops and
observes for up to 240 seconds, requiring additional completed customers while
the final layout and observed paths stay stable. Existing lifetime customers
alone cannot pass. It skips the long wait for an incomplete or closed ride.
Exit codes are 0 for pass, 1 for acceptance failure, and 2 for collection/input
failure. Individual guest trajectories and general pathfinding remain unproven.

The evaluator was live-calibrated against the saved scripted park and observed
22 additional customers. A fresh child server can register new tools while its
parent-resolved allowlist still excludes them. Reconnect/reload the parent MCP
inventory before resolving another child's tool allowlist, then check actual
child exposure before construction. Infrastructure failures are excluded from
design-performance results. No automatic retry or model escalation follows one.
