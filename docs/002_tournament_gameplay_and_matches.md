Tournament Gameplay & Matches

Joining

Players may late‑join any Swiss tournament while it is active. They enter with 0 tournament points and are scheduled into the next round.

Minimum participants to start: 2 for any grade.

Time Controls

Tournament uses a single round timeout: round_timeout_seconds (applied to all matches in the round). Organizers may set different values per tournament and (optionally) per task difficulty in future.

Outcomes

Win: First accepted solution (100% tests) within timeout.

Timeout: No accepted solution when time expires. Treated as non‑draw for scoring: both receive a partial score (see 75‑percentile scoring), but Elo is not updated for timeout games.

Cheating reports: If cheating is confirmed against your opponent, your match score is recalculated according to anti‑cheat policy (see docs/08-anti-cheat.md).

Languages & Environment

Supported languages: clojure, cpp, csharp, dart, elixir, golang, haskell, java, js, kotlin, php, python, ruby, rust, swift, ts, zig.

Same task for both players in the match.
