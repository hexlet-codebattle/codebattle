Seasons, Grades, Points

Seasons

Season 0: Sep 21 – Dec 21
Season 1: Dec 21 – Mar 21
Season 2: Mar 21 – Jun 21
Season 3: Jun 21 – Sep 21

On each season end date (the 21st), we run a Grand Slam at 16:00 UTC.

Season Points reset each season.

Elo never resets (lifetime).

Grades

open — casual/unranked (no points; free task setups by users).

rookie — once per 4 hours (except 16:00 UTC);
should be 3 7 11 15 19 23  UTC
easy tasks;
grind‑friendly.

challenger — daily 16:00 UTC; backbone of the calendar.

pro — weekly Tuesday 16:00 UTC (preempted by higher grades in its week).

elite — bi‑weekly Wednesday 16:00 UTC (no pro that week).

masters — monthly Thursday 16:00 UTC (no pro/elite that week). Exactly one per day.

grand_slam — season finale on the 21st at 16:00 UTC (no pro/elite/masters that week).

Player Limits(players_limit)

rookie: 8
challenger: 16
pro: 32
elite: 64
masters: 128
grand_slam: 256

Rounds per Grade (rounds_limit)

rookie: 4 rounds
challenger: 6 rounds
pro: 8 rounds
elite: 10 rounds
masters: 12 rounds
grand_slam: 14 rounds


Task Provisioning

For masters & grand_slam: use task packs (task_provider: task_pack).

Naming: masters_s{season}_{year}_{N} (e.g., masters_s0_2025_1), grand_slam_s{season}_{year}.

For others: use existing tasks via task_provider: level, task_strategy: random.

Swiss always uses one task per round.

Season Points Distribution

For each finished tournament (grade ≠ open), we award Season Points by final place using these grade tables; all remaining participants (outside prize slots) receive 2 points each.

rookie: [8, 4, 2] (top‑3)

challenger: [16, 8, 4, 2] (top‑6)

pro: [128, 64, 32, 16, 8, 4, 2] (top‑7)

elite: [256, 128, 64, 32, 16, 8, 4, 2] (top‑8)

masters: [1024, 512, 256, 128, 64, 32, 16, 8, 4, 2] (top‑10)

grand_slam: [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2] (top‑11)

Prize points are not added on top of the participation points.

Season Leaderboard Tie‑Breakers

Total Season Points (desc)

Tournament wins in season (desc)

Tournament participations in season (desc)

Hall of Fame

Maintain a HoF for Season Champions and Grand Slam Champions (participants page optional later).
