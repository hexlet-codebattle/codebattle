defmodule Codebattle.Tournament.TimeoutModeTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers

  alias Codebattle.Game.Context, as: GameContext
  alias Codebattle.Tournament

  test "uses task timeout when round_timeout_seconds is nil" do
    task = insert(:task, level: "easy", time_to_solve_sec: 123)
    insert(:task_pack, name: "tp-task-timeout", task_ids: [task.id])

    creator = insert(:user)
    users = [insert(:user), insert(:user)]

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Task timeout tournament",
        "description" => "task timeout",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "tp-task-timeout",
        "creator" => creator,
        "break_duration_seconds" => 0,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "ranking_type" => "by_user",
        "type" => "swiss",
        "state" => "waiting_participants",
        "round_timeout_seconds" => nil,
        "rounds_limit" => "1",
        "players_limit" => 2
      })

    Tournament.Server.handle_event(tournament.id, :join, %{users: users})
    Tournament.Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = Tournament.Context.get(tournament.id)
    [match] = get_matches(tournament)
    game = GameContext.get_game!(match.game_id)

    assert game.timeout_seconds == 123
  end

  test "uses 300 seconds fallback when round_timeout_seconds and task timeout are nil" do
    task = insert(:task, level: "easy", time_to_solve_sec: nil)
    insert(:task_pack, name: "tp-task-timeout-fallback", task_ids: [task.id])

    creator = insert(:user)
    users = [insert(:user), insert(:user)]

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Task timeout fallback tournament",
        "description" => "task timeout fallback",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "tp-task-timeout-fallback",
        "creator" => creator,
        "break_duration_seconds" => 0,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "ranking_type" => "by_user",
        "type" => "swiss",
        "state" => "waiting_participants",
        "round_timeout_seconds" => nil,
        "rounds_limit" => "1",
        "players_limit" => 2
      })

    Tournament.Server.handle_event(tournament.id, :join, %{users: users})
    Tournament.Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = Tournament.Context.get(tournament.id)
    [match] = get_matches(tournament)
    game = GameContext.get_game!(match.game_id)

    assert game.timeout_seconds == 300
  end

  test "uses round timeout when round_timeout_seconds is set" do
    task = insert(:task, level: "easy", time_to_solve_sec: 123)
    insert(:task_pack, name: "tp-round-timeout", task_ids: [task.id])

    creator = insert(:user)
    users = [insert(:user), insert(:user)]

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Round timeout tournament",
        "description" => "round timeout",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "tp-round-timeout",
        "creator" => creator,
        "break_duration_seconds" => 0,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "ranking_type" => "by_user",
        "type" => "swiss",
        "state" => "waiting_participants",
        "round_timeout_seconds" => "240",
        "rounds_limit" => "1",
        "players_limit" => 2
      })

    Tournament.Server.handle_event(tournament.id, :join, %{users: users})
    Tournament.Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = Tournament.Context.get(tournament.id)
    [match] = get_matches(tournament)
    game = GameContext.get_game!(match.game_id)

    assert game.timeout_seconds == 240
  end
end
