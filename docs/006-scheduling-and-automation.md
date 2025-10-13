Tournament Scheduling & Preemption

Daily/Hourly Rules (UTC)

Rookie: every hour except 16:00.

Challenger: daily at 16:00, unless preempted by a higher grade that day/week.

Weekly Slots (16:00 UTC)

Priority: grand_slam > masters > elite > pro.

In any given week, exactly one of pro/elite/masters/grand_slam runs at 16:00.

Canonical Weekly Pattern (per 12–13‑week season)

Weeks without special events alternate pro and elite as backbone, with masters approximately once per month (Thu). Example outline:

w1  Tue: pro
w2  Wed: elite
w3  Tue: pro
w4  Thu: masters
w5  Tue: pro
w6  Wed: elite
w7  Tue: pro
w8  Thu: masters
w9  Tue: pro
w10 Wed: elite
w11 Tue: pro
w12 21st: grand_slam
w13 Tue: pro (if present within season window)

Exact weekdays for masters/grand_slam follow the 21st constraint and season calendar; if a masters week is selected, no pro/elite that week. On a grand_slam week, only grand_slam at 16:00.

Deterministic Planner (Pseudo‑code)

input: season_start, season_end
for each day in [season_start, season_end]:
  if hour==16:00:
    if date == season_end (21st): schedule grand_slam
    else if is_thursday and is_monthly_slot and not special_week: schedule masters
    else if is_wednesday and is_biweekly_slot and not masters_week: schedule elite
    else if is_tuesday and not elite_week and not masters_week: schedule pro
    else: schedule challenger
  else:
    if hour != 16:00: schedule rookie hourly

biweekly_slot can be tracked as every second Wednesday in the season window.

monthly_slot for masters is the nearest Thursday not colliding with GS.

Preemption means the higher‑priority grade replaces challenger that day and replaces lower grades in that week as per rules.
