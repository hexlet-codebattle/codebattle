Codebattle: Competitive Programming Game

Codebattle (codebattle.hexlet.io) is a real‑time coding duel platform. Two players solve the same task in parallel; whoever solves it first wins the match.

The platform hosts Swiss‑system tournaments across several grades with a seasonal ranking model inspired by tennis.

Key Concepts

Match (Duel): 1v1, same task, first correct solution wins; otherwise ends by timeout.

Tournament (Swiss): Multiple rounds; in each round, players are paired vs players with similar cumulative score; no repeat pairings (unless unavoidable on round 1 bootstrap or via bot fill‑ins).

Tournament grades: open, rookie, challenger, pro, elite, masters, grand_slam — determine prestige, task pools, points, schedules, and limits.

Seasons: Four per year aligned to equinoxes/solstices. Season points reset each season; lifetime Elo never resets.

Languages: 16 supported — clojure, cpp, csharp, dart, elixir, golang, haskell, java, js, kotlin, php, python, ruby, rust, swift, ts, zig.
