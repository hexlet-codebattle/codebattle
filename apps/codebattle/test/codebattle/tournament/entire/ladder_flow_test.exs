defmodule Codebattle.Tournament.Entire.LadderFlowTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers

  alias Codebattle.Game.Context, as: GameContext
  alias Codebattle.Tournament.Context, as: TournamentContext
  alias Codebattle.Tournament.Server
  alias Codebattle.Tournament.TournamentUserResult

  test "continuous matchmaking: finishing games triggers the next tick, no rematches, finishes" do
    tasks = insert_list(3, :task, level: "easy", base_score: 300, time_to_solve_sec: 70)
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
        "break_duration_seconds" => 0,
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

    # The finished leaderboard is persisted to tournament_user_results (regression:
    # ladder was missing from TournamentUserResult.upsert_results, so the leaderboard
    # came back empty and sync_players zeroed every player's place/score).
    leaderboard = TournamentUserResult.get_leaderboard(tournament.id)
    assert length(leaderboard) == 4
    assert Enum.map(leaderboard, & &1.place) == [1, 2, 3, 4]
    assert MapSet.new(leaderboard, & &1.user_id) == MapSet.new(users, & &1.id)

    # sync_players restores places/scores on the player structs from the leaderboard.
    assert tournament |> get_players() |> Enum.reject(& &1.is_bot) |> Enum.map(& &1.place) |> Enum.sort() ==
             [1, 2, 3, 4]
  end

  test "draining a wave early inserts a break before the next tick, then opens the next round" do
    tasks = insert_list(3, :task, level: "easy", base_score: 300, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-break", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    users = insert_list(4, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder break",
        "description" => "ladder break",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-break",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        # Next scheduled tick is far away (300s), so the early empty-pool drain triggers a break.
        "round_timeout_seconds" => 300,
        "break_duration_seconds" => 2,
        "rounds_limit" => "3",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    assert tournament.current_round_position == 0

    # Finish both round-0 games: the pool drains while the next tick is 300s away, so instead
    # of an immediate tick the tournament goes on break and does NOT open round 1 yet.
    finish_all_playing_matches(tournament)
    Process.sleep(400)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.break_state == "on"
    assert tournament.current_round_position == 0
    assert get_matches(tournament, "playing") == []

    # Once the break elapses, the tick opens round 1 and clears the break.
    Process.sleep(2_000)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.break_state == "off"
    assert tournament.current_round_position == 1
    assert length(get_matches(tournament, "playing")) == 2
  end

  test "the UI start_round event ends the break early and opens the next round" do
    tasks = insert_list(3, :task, level: "easy", base_score: 300, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-force", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    users = insert_list(4, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder force",
        "description" => "ladder force",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-force",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        # A long break so the test would never pass by waiting it out — only the forced tick advances.
        "round_timeout_seconds" => 300,
        "break_duration_seconds" => 600,
        "rounds_limit" => "3",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    finish_all_playing_matches(tournament)
    Process.sleep(400)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.break_state == "on"
    assert tournament.current_round_position == 0

    # The admin "Start round" button fires :start_round_force — it should skip the break.
    Server.handle_event(tournament.id, :start_round_force, %{})
    Process.sleep(200)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.break_state == "off"
    assert tournament.current_round_position == 1
    assert length(get_matches(tournament, "playing")) == 2
  end

  test "ladder tick timeout comes from task base_score while game timeout comes from time_to_solve_sec" do
    tasks = insert_list(3, :task, level: "easy", base_score: 90, time_to_solve_sec: 70)
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
        "round_timeout_seconds" => 300,
        "rounds_limit" => "5",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    [match | _] = get_matches(tournament, "playing")

    assert tournament.current_round_timeout_seconds == 90
    assert GameContext.get_game!(match.game_id).timeout_seconds == 70
  end

  test "fixed-time ladder uses round timeout for games and 3/4 round timeout for ticks" do
    tasks = insert_list(3, :task, level: "easy", base_score: 300, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-fixed-time", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    users = insert_list(4, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder fixed time",
        "description" => "ladder fixed time",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-fixed-time",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "timeout_mode" => "per_round_fixed",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 80,
        "rounds_limit" => "5",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    [match | _] = get_matches(tournament, "playing")

    assert tournament.timeout_mode == "per_round_fixed"
    assert tournament.current_round_timeout_seconds == 60
    assert GameContext.get_game!(match.game_id).timeout_seconds == 80
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
