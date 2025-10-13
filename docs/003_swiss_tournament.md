Swiss Tournaments

Pairing

Round 1: random mixed seeding (shuffled), pair by adjacent order.

Subsequent rounds: sort by current tournament score (desc); pair within bands; no repeat pairings (tracked set). If odd participants, a bot fills the last unmatched player.


These are platform defaults and can be configured if needed.

One Task per Round

Every round features one task shared by all matches.

In‑Tournament Scoring (Score Strategy)

Default strategy: 75_percentile (a.k.a. "percentile‑based"):

For each task (round), compute base_score = 25th percentile of winners' duration_sec (faster → smaller time).

Winner scaling: winners get between 2× and 1× base_score linearly, mapping min winner time → 2×, max winner time → 1×.

Losers/partials: scale by result_percent/100 and by the same linear time factor. For pure timeout games, grant 0.5 × base_score × (result_percent/100).

The tournament table sums per‑round scores.

Tournament Table & Tie‑Breakers

Sorted by Total Score (desc).

Tie‑break: Total Duration (asc).

Finals & Places

Final places are taken from the sorted table after the last round.
