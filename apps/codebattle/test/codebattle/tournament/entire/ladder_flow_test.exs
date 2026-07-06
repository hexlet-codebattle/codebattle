defmodule Codebattle.Tournament.Entire.LadderFlowTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers

  alias Codebattle.Game.Context, as: GameContext
  alias Codebattle.Tournament.Context, as: TournamentContext
  alias Codebattle.Tournament.Server

  test "continuous matchmaking: finishing games triggers the next tick, no rematches, finishes" do
    tasks = insert_list(3, :task, level: "easy", time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-flow", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    users = insert_list(4, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder flow",
        "description" => "ladder flow",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-flow",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 300,
        "rounds_limit" => "2",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    # Round 0: everyone paired, two games, each on the task's own clock (per_task).
    tournament = TournamentContext.get(tournament.id)
    assert tournament.current_round_position == 0
    round0 = get_matches(tournament, "playing")
    assert length(round0) == 2
    [%{game_id: gid} | _] = round0
    assert GameContext.get_game!(gid).timeout_seconds == 70

    # Finish both round-0 games. When the pool empties, the early tick opens round 1
    # and pairs the idle players with fresh (non-rematch) opponents.
    finish_all_playing_matches(tournament)
    Process.sleep(400)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.current_round_position == 1
    round1 = get_matches(tournament, "playing")
    assert length(round1) == 2

    # No human pair repeats across the two rounds.
    keys =
      tournament
      |> get_matches()
      |> Enum.map(&Enum.sort(&1.player_ids))

    assert length(keys) == length(Enum.uniq(keys))
    assert MapSet.size(MapSet.new(tournament.played_pair_ids)) == 4

    # Finish round-1 games: ticks are exhausted (rounds_limit == 2) and the pool drains,
    # so the tournament finishes.
    finish_all_playing_matches(tournament)
    Process.sleep(400)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.state == "finished"
  end

  test "fast finishers get re-matched on the scheduled tick while a slow game is still playing" do
    tasks = insert_list(3, :task, level: "easy", time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-fast", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    users = insert_list(4, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder fast",
        "description" => "ladder fast",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-fast",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 1,
        "rounds_limit" => "5",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    [fast_match, slow_match] = get_matches(tournament, "playing")

    # Finish only ONE of the two round-0 games, leaving the other still "playing".
    finish_match(tournament, fast_match)
    # Wait past the 1s scheduled tick interval.
    Process.sleep(1_500)

    tournament = TournamentContext.get(tournament.id)

    # The scheduled tick re-matched the two idle finishers into a new round while the
    # slow game keeps running untouched.
    assert tournament.current_round_position >= 1
    assert Enum.any?(get_matches(tournament), &(&1.game_id == slow_match.game_id and &1.state == "playing"))
    assert get_matches(tournament, "playing") != []
  end

  defp finish_all_playing_matches(tournament) do
    tournament
    |> get_matches("playing")
    |> Enum.each(&finish_match(tournament, &1))
  end

  defp finish_match(tournament, match) do
    user = Codebattle.User.get!(hd(match.player_ids))
    win_active_match(tournament, user, %{opponent_percent: 0, duration_sec: 30})
  end
end
