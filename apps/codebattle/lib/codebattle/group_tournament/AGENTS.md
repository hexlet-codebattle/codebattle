# Group Tournament — Agent Notes

Map of the `Codebattle.GroupTournament` namespace and how the pieces fit
together at runtime. Skim this before touching anything in this directory.

For schema-level details (fields, validations, JSON serialization) read
[`group_tournament.ex`](group_tournament.ex) directly — it has the most
up-to-date field list. This file documents behaviour the schema does not.

## File layout

```
group_tournament/
├── group_tournament.ex      # Ecto schema + small predicates (seeding_round?/1, ranked?/1)
├── context.ex               # Public API: CRUD, listings, runs, leaderboard build
├── server.ex                # GenServer: tournament lifecycle, round timers
├── supervisor.ex            # DynamicSupervisor for live tournament servers
├── global_supervisor.ex     # Boot-time supervisor that registers `Codebattle.GroupTournament.Supervisor`
├── slice_runner.ex          # Slicing, seeding, slice runs, movement glue
├── scoring.ex               # Strategy resolver + behaviour for round_points
├── scoring/                 # DiagonalQuadratic, DiagonalLinear, GlobalLinear
├── movement.ex              # Strategy resolver + behaviour for inter-round slice reassignment
├── movement/                # MirroredCascade, GlobalRerank, NeighborLadder
└── leaderboard_store.ex     # Per-tournament ETS cache for the leaderboard
```

Related modules outside this directory that you will touch constantly:

- `Codebattle.GroupTask.Context` (`lib/codebattle/group_task/context.ex`) —
  owns the `UserGroupTournamentRun` table, calls the runner service, persists
  results, and broadcasts `group_tournament:run_updated`.
- `Codebattle.GroupTournamentPlayer` — per-tournament player row
  (`slice_index`, `seed_score`, `seed_duration_ms`, `total_score`,
  `last_round_place`, `consecutive_zero_rounds`, `state`).
- `Codebattle.GroupTournamentRoundScore` — `(group_tournament_id, user_id,
  round_position)` unique row holding `place`, `score`, `slice_index`, and
  the originating `run_id` for each round.
- `Codebattle.GroupTaskSolution` — the user's submitted source. Latest row
  per `(user_id, group_tournament_id)` is what gets sent to the runner.

## Tournament types

`type` ∈ `{"individual", "ranked"}` (validated in the changeset). The two
flows are very different — see the comparison at the bottom of this file.

`state` machine: `waiting_participants → active → finished` (or `canceled`).

## Round numbering

For a ranked tournament with `has_seed_round = true`:

- Round 1 = seeding round (submission window; no scoring per slice)
- Rounds 2..`rounds_count` = slice rounds

So `rounds_count = 6` means 1 seed + 5 slice rounds. `seeding_round?/1`
returns true iff `type == "ranked" && has_seed_round && current_round_position == 1`.

`apply_tournament_scoring/5` is intentionally a no-op for `kind: "seed"` —
seed scores live on `GroupTournamentPlayer.seed_score` + `seed_duration_ms`,
**not** on `total_score`. `total_score` accumulates from slice rounds only.

The UI labels are offset: round_position 1 → seed badge, round_position 2 →
"R1", round_position 3 → "R2", etc. See
`EvolutionPanel.jsx::buildRunTitles`.

## The seeding round (ranked + has_seed_round)

1. Round 1 starts. `perform_round_start/1` does **not** call `assign_slices`
   — there is nothing to slice yet because we have no seed scores.
2. While the round is open, every user submission triggers an off-the-record
   `kind: "user"` run via `run_user_submission_sync/2` (no bots, slice_index
   nil). This gives the player live feedback.
3. On `:finish_round` timer, `SliceRunner.run_seeding/1` fires one solo
   `kind: "seed"` run **per player** (no bots — they race the clock, not
   each other). Bots were removed because seed ranking is now done by score
   and submission time, not by bot-relative place.
4. Each seed run writes `seed_score`, `seed_duration_ms`, and
   `slice_ranking = -score * 1e12 + duration_ms` on the player row. The 1e12
   multiplier exists so submission durations (potentially hours of ms)
   cannot out-rank a one-point score gap.
5. `apply_post_seed_transitions/1` then calls `assign_slices` with
   `slice_strategy: "rating"` (ascending `slice_ranking`, nulls last). Best
   players end up in slice 0.
6. `SliceRunner.record_seed_round_scores/1` writes a `round_position: 1` row
   into `group_tournament_round_scores` per seeded player. **Place** there
   is the *global* rank across all seeded players, sorted by
   `(-seed_score, seed_duration_ms || 0)` — not per-slice rank. Without
   this call the leaderboard's R1 column would show seed scores bucketed by
   the player's *final* slice (because movement rewrites `slice_index`
   later).

## Slice rounds (round_position ≥ 2 in ranked, all rounds in individual)

1. `SliceRunner.run_all_slices/2` fans out one runner call per slice via
   `Task.async_stream` (concurrency configurable via
   `:codebattle, :group_tournament_slice_run_concurrency`, default 30).
2. Per slice: query players in `slice_index`, intersect with
   `GroupTaskSolution` rows for the tournament (players without a submission
   are silently skipped; an entirely-empty slice is `:skipped`).
3. `include_bots` is **true** only when the human population is below
   `slice_size` AND it is not the bottom slice. The bottom slice is exempt
   because it deliberately holds the remainder when player count doesn't
   divide evenly; bot fillers there would just add noise.
4. `GroupTaskContext.run_group_task/3` creates one `UserGroupTournamentRun`
   per human (sharing one `run_key`), invokes the runner, and updates each
   row in a single transaction. The transaction also runs
   `apply_tournament_scoring/5`.
5. Scoring ranks humans by **`(score desc, duration_ms asc)`** —
   deliberately ignoring the runner's `place` field — and dense-numbers
   them 1..N to compute `round_points` via the configured scoring strategy.
6. After the round, `apply_movement_transition/2` calls the configured
   movement strategy to recompute every player's `slice_index` for next
   round. `normalize_slice_sizes/4` then re-flows assignments so slices
   `0..slice_count-2` each hold exactly `slice_size` players and the
   bottom slice absorbs the remainder.

## `run_key` and per-user runs

One slice run = one `run_key` (UUID generated in
`GroupTaskContext.run_group_task/3`) shared by N `UserGroupTournamentRun`
rows, one per player. The runner is called once with all solutions; the
result's `summary.ranking` is the same on every row (so any row can serve
as the "representative" for `extract_round_results/1`), but each row holds
that player's own `score` and `duration_ms`.

Use `GroupTaskContext.list_run_results_by_run_key/2` to fetch the per-user
records — this is what `SliceRunner.build_round_results/3` uses to feed
movement, ensuring movement and scoring agree on placement.

## Duration semantics

`UserGroupTournamentRun.duration_ms` is **submission time**, not runner
execution time:

```
duration_ms = solution.inserted_at − tournament.started_at  (in ms, clamped ≥ 0)
```

Computed in `GroupTaskContext.submission_durations_by_user_id/2`, batch-
loaded once per `do_update_runs` call. The runner's own `duration_ms` in
the ranking payload is ignored when persisting.

If `tournament.started_at` is nil (older rows, factories that omit it),
`duration_ms` stays nil and the run sorts last within its score group via
the `@missing_duration_sentinel` (1e13). Test factories should set
`started_at` explicitly — see
`test/codebattle/group_tournament/integration_test.exs::build_ranked_tournament`.

`GroupTournamentPlayer.seed_duration_ms` is the same value at seed time,
copied from `run.duration_ms` in `SliceRunner.persist_seed/4`.

## Scoring strategies (`scoring.ex` + `scoring/`)

Pure modules implementing `round_points(slice_index, place, opts) :: integer`.
Resolver maps:

| Strategy name        | Module                                     |
| -------------------- | ------------------------------------------ |
| `diagonal_quadratic` | `Scoring.DiagonalQuadratic` (default)      |
| `diagonal_linear`    | `Scoring.DiagonalLinear`                   |
| `global_linear`      | `Scoring.GlobalLinear`                     |

`opts` always contains `slice_count`, `slice_size`, `max_score`, and
optional `place_weight`. Strategies must be pure — they never touch the DB.

## Movement strategies (`movement.ex` + `movement/`)

Pure modules implementing
`reassign([%{user_id, slice_index, place}], opts) :: [%{user_id, new_slice_index}]`.

| Strategy name       | Module                              |
| ------------------- | ----------------------------------- |
| `mirrored_cascade`  | `Movement.MirroredCascade` (default) |
| `global_rerank`     | `Movement.GlobalRerank`             |
| `neighbor_ladder`   | `Movement.NeighborLadder`           |

`apply_movement/2` runs the strategy then `normalize_slice_sizes/4`
guarantees slices 0..slice_count-2 hold exactly `slice_size` players, with
the bottom slice absorbing the remainder. Tied normalize keys break by
`(new_slice_index, original_slice_index, place, user_id)` so strategy
intent dominates and only size violations get corrected.

## GenServer lifecycle (`server.ex`)

- One process per live tournament, registered as
  `{:via, Codebattle.Registry, "group_tournament_srv:#{id}"}`.
- Started lazily by `Context.ensure_server_started/1`. The
  `Codebattle.GroupTournament.Supervisor` is a `DynamicSupervisor`.
- `schedule_start/2` arms the `:start_tournament` timer from `starts_at`
  unless `require_invitation: true` (then start is manual via
  `start_tournament/2` or `start_now/1`).
- `schedule_round_finish/3` arms `:finish_round` from
  `round_timeout_seconds + break_duration_seconds`. During the break,
  `last_round_started_at` is set to a *future* timestamp; the frontend
  reads that as intermission.
- Solution submission goes through `submit_solution/4` (sync) which inserts
  a `GroupTaskSolution` and then either sync-runs (`run_user_submission_sync`)
  or async-runs (`run_user_submission_async`) a debug pass for that player.
- Round finish triggers: `run_round` → `apply_post_round_transitions` →
  `LeaderboardStore.refresh` → broadcast. The post-round step is what
  decides seeding-vs-movement.

## Leaderboard (`leaderboard_store.ex`)

ETS-backed cache owned by the live tournament server. Rebuilt from
`Context.build_leaderboard/1` on init and after each round.

- Two ETS tables per tournament: `rows` (full entries) and `idx`
  (rank → user_id, pre-sorted).
- Reads (`list/1`, `top/2`, `window/3`, `rank/2`, `total/1`) fall back to
  recomputing from Postgres if the server isn't running. So calling
  `LeaderboardStore.top/2` on a cold tournament is always safe.
- The `rounds` map on each entry is keyed by integer `round_position` (1
  = seed) — `EvolutionPanel.jsx::getPlaceFor` uses this to map a run's
  badge to a place.

## API/UI plumbing

- Channel: `Codebattle.GroupTournamentChannel`
  (`lib/codebattle_web/channels/group_tournament_channel.ex`). On join it
  pushes the full state including `runs: list_runs |> Enum.map(&serialize_run/1)`.
- Each run includes `id, player_ids, kind, slice_index, round_position,
  status, result, score, duration_ms, inserted_at`. See
  `Context.serialize_run/1` and `serialize_run_details/2`.
- Real-time updates flow via `Codebattle.PubSub.broadcast(
  "group_tournament:run_updated", payload)` from `GroupTask.Context`. The
  channel forwards as-is; the frontend `Channel.js` middleware
  `camelizeKeys` the payload before dispatch, so `duration_ms` →
  `durationMs` in Redux.
- UI: `apps/codebattle/assets/js/widgets/pages/groupTournament/`. The Run
  tab is `EvolutionPanel.jsx`; tabs container is `MainPanel.jsx`;
  leaderboard is `Leaderboard.jsx`.

## Quick comparison: ranked vs individual

| Aspect              | `individual`                          | `ranked` (with `has_seed_round`)                |
| ------------------- | ------------------------------------- | ----------------------------------------------- |
| Seeding round       | none                                  | round 1 is submission-only window               |
| Slicing             | none (or one-shot at start)           | re-slice every round via movement strategy      |
| `total_score`       | `max(current, run_score)`             | sum of `round_points` across slice rounds       |
| Scoring strategy    | unused                                | `diagonal_*` / `global_linear`                  |
| Movement strategy   | unused                                | `mirrored_cascade` / `global_rerank` / `neighbor_ladder` |
| Bots in seed        | n/a                                   | **no** (one solo run per player)                |
| Bots in slice rounds| follows `include_bots` flag           | only when the slice is short *and* not the bottom slice |
| Round ranking       | n/a                                   | `(score desc, submission duration asc)`         |

## Testing notes

- `Codebattle.DataCase` plus `Codebattle.Factory` (`test/support/factory.ex`,
  `group_tournament_factory`) for the schema. Factory sets `starts_at` but
  **not** `started_at` — set it explicitly in fixtures that exercise
  duration (otherwise `duration_ms` stays nil and any `is_integer/1`
  assertion will fail).
- Runner is mocked by either `CodebattleWeb.FakeGroupTaskRunnerHttpClient`
  (single canned response) or `CodebattleWeb.DeterministicGroupTaskRunner`
  (per-user score map via
  `Application.put_env(:codebattle, :deterministic_runner_scores, ...)`).
- Integration coverage: `test/codebattle/group_tournament/integration_test.exs`
  is the end-to-end "seed → 3 slice rounds" test. If you change ranking,
  scoring, or movement, expect this file to need updates.
- Scoring/movement strategies each have unit tests under
  `test/codebattle/group_tournament/scoring/` and
  `test/codebattle/group_tournament/movement/`.

## Gotchas

- **Don't reorder `apply_slices` and `record_seed_round_scores`.** The
  latter reads `player.slice_index` and must run before any later movement
  step overwrites it. See the docstring on `record_seed_round_scores/1`.
- **`update_run` writes `duration_ms` from solution time, not runner time.**
  If you need runner wall-clock for diagnostics it's still in
  `run.result["summary"]["ranking"][i]["duration_ms"]`, but nothing reads
  it for scoring anymore.
- **Movement input must come from per-user runs, not the runner's `place`.**
  Otherwise ranks diverge from what `apply_tournament_scoring` records to
  `group_tournament_round_scores`. `build_round_results/3` already does
  this; just keep it that way.
- **Pending runs are inserted in the same transaction as creation.** A
  failed runner call still leaves the row at `status: "pending"` until
  `do_update_runs` flips it to `"error"`. Clients should treat "pending"
  as transient.
- **Slice 0 = top.** The "rating" strategy is ascending on `slice_ranking`,
  and `slice_ranking = -score * 1e12 + duration_ms`, so the highest-scoring
  player gets the smallest (most negative) ranking and lands in slice 0.
