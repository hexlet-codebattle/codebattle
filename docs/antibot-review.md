# Fair play reports and evaluation

`/games/:id/ml` is a heuristic review aid, not a trained ML model or a cheating
verdict. The worker persists reports after games and can alert tournament
moderators. Scores do not automatically ban users.

## What changed after the production audit

The October 27, 2026 export contained 2,222 available non-site-bot reports, with
866 medium/high results, but no independently confirmed outcomes. It exposed
contradictory timing counters, missing batches in cached reports, legacy Enter
handling and inconsistent offsets. These are collection defects, not labels for
whether a player cheated. The export and scratch analysis live under ignored
`tmp/`; they are not application assets or test fixtures.

The earlier version-5 offline experiment reduced medium/high results to 264.
That measured alert volume only, using exported batches and cached code/history
features. Those figures do not describe the final version-6 scorer, and do not
establish precision, recall or a false-positive rate.

Report version 6 implements these changes:

- Code style, GPT-like phrases, comment ratios, missing backspaces, zero idle
  pauses, incomplete edit coverage, browser focus loss and missing telemetry do
  not add suspicion. Measurements can remain available for review. Incomplete
  coverage is explicitly a collection limitation.
- Overlapping edit rules use their maximum. Timing and blocked-paste support is
  capped at four points, below the review threshold of five. These weights are
  priorities, not calibrated probabilities.
- Modern version-3 collectors record bounded individual bulk-edit evidence with
  offsets and explanations from the corresponding editor change. A paste or
  undo elsewhere cannot explain that edit. Vim commands, IME composition,
  completions, indentation, undo and permitted self-paste are accounted for.
  Client-declared origins remain untrusted hints.
- Legacy edit counters are evaluated per collection window, with explanations
  limited to that window. They cannot identify the source of an individual edit.
  Server replay jumps remain review context; a client throttle does not prove
  that code was typed within 250 ms. Server diffs exclude unchanged code between
  separate edits.
- Reports persist structured evidence: stable code, category, weight, message,
  measurements and replay offset where available. Compatibility signal strings
  remain for existing consumers.

## Collection quality and competitive evidence

Version 2 introduced first/last key offsets; aggregation includes pauses between
windows. Version 3 adds collector-session IDs, batch sequence numbers and edit
records. A database uniqueness constraint makes retries of an identified batch
idempotent. Missing sequences and multiple sessions are limitations, never
positive suspicion. Legacy batches without identities remain supported.

Timing is checked for contradictory samples, interval ordering, pause counts,
missing boundaries, overlaps, session changes and offsets beyond game duration.
Unreliable timing is excluded from rhythm scoring. Missing optional fields stay
absent; they are not silently converted into measured zeroes. Unavailable timing
metrics display as unavailable.

Competitive code and replay history stop at the first completion marker, including
submission code that arrived before the final throttled editor update. Finished
non-tournament give-ups also close this boundary. Later practice edits are not
used as the competitive solution. The report stores that solution and language,
so cached pages display the same code that was analyzed.

Only complete telemetry windows ending within the known competitive duration are
used. Duration is recorded in whole seconds; its last partial second is allowed.
A window crossing the boundary is excluded as a whole rather than attributing its
aggregate counters to competitive play. Excluded windows and incomplete coverage
are shown as limitations when retained telemetry is available; an entirely
missing competitive sample shows insufficient telemetry.

Finished caches include batch count, maximum ID, game state and duration. Every
read checks the snapshot and requires a current report for each eligible player.
Late flushes, lower-ID transactions committing late and changes from playing to
finished invalidate reports. Live reports recompute even without new batches.
Writes after an analysis read are detected on the next read.

## Moderator decisions and evaluation

Admins and moderators can append a review on the report page with one of:
`confirmed_assistance` (confirmed unauthorized assistance), `legitimate`, or
`inconclusive`. A reason is required; a replay offset is optional. Records retain
the reviewer, timestamp, detector version and report snapshot. Re-analysis does
not overwrite decisions. Decisions are distinct from user complaints and solution
approval; their reasons are only sent to moderators.

Run the read-only evaluation command inside the dev container:

```sh
./bin/dev mix codebattle.antibot.evaluate
```

It starts only the database reader and registry, without application workers,
and uses a read-only, repeatable-read transaction. It recomputes the current rules
against the latest decision for each player/game in finished games,
without persisting reports or broadcasting alerts. It reports confusion counts,
precision, recall, false-positive rate, inconclusive/missing cases and language/
collector cohorts. Undefined rates are null. These metrics describe the reviewed
sample; selection bias and repeated players still matter. Without labels the
command does not claim accuracy.

For a silent historical report backfill, invoke
`Codebattle.Game.BotDetection.analyze_and_persist(game_id)` for a bounded set of
finished games. The worker path can broadcast tournament alerts and should not
be used for a silent audit.

## Rollout and ML

Apply all additive report/review migrations before deploying the application.
Deploy the collector and scorer together; old clients remain supported. Monitor
missing/legacy/inconsistent telemetry separately from score and alert counts.
Review low-scoring games as well as flagged games to measure missed detections.

Build independently reviewed examples covering mobile/IME, Vim, completions,
undo, self-paste, reconnects, slow networks and known injection/autotyper cases.
Do not turn complaints, existing heuristic scores or practice bots into cheating
labels. Split future ML datasets by player and reserve a later time period for
drift evaluation. Compare candidates with these rules on the same held-out cases,
set a moderator workload and false-positive target, and run models in shadow mode
before using them for alerts. Keep replay review and avoid automatic bans from
scores alone.
