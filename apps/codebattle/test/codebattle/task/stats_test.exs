defmodule Codebattle.Task.StatsTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.Task.Stats

  test "returns aggregate solve statistics and a duration-ordered leaderboard" do
    task = insert(:task)
    fast_user = insert(:user, name: "fast", rating: 1500)
    slow_user = insert(:user, name: "slow", rating: 1200)

    fast_game = insert(:game, task: task, state: "game_over", duration_sec: 10)
    slow_game = insert(:game, task: task, state: "game_over", duration_sec: 30)
    _unfinished = insert(:game, task: task, state: "playing", duration_sec: 1)

    insert(:user_game, game: fast_game, user: fast_user, result: "won", lang: "elixir")
    insert(:user_game, game: slow_game, user: slow_user, result: "won", lang: "js")

    stats = Stats.get_stats(task.id)

    assert stats.games_count == 2
    assert stats.winners_count == 2
    assert stats.percentiles.count == 2
    assert stats.percentiles.p50 == 20.0
    assert Enum.map(stats.leaderboard, & &1.game_id) == [fast_game.id, slow_game.id]
    assert Enum.map(stats.leaderboard, & &1.lang) == ["elixir", "js"]
  end

  test "returns empty aggregate values when a task has no completed games" do
    assert %{
             games_count: 0,
             winners_count: 0,
             percentiles: %{count: 0, p10: nil, p30: nil, p50: nil, p75: nil, p95: nil},
             leaderboard: []
           } = Stats.get_stats(-1)
  end
end
