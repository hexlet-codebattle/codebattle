defmodule Codebattle.Tournament.Entire.SwissFlowTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers

  alias Codebattle.Tournament.Context, as: TournamentContext
  alias Codebattle.Tournament.Server
  alias Codebattle.Tournament.TournamentResult

  defp create_swiss(params) do
    tasks = insert_list(3, :task, level: "easy", base_score: 300, time_to_solve_sec: 70)
    insert(:task_pack, name: params.pack, task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    users = insert_list(4, :user)

    {:ok, tournament} =
      TournamentContext.create(
        Map.merge(
          %{
            "starts_at" => "2026-01-01T12:00",
            "name" => "Swiss flow",
            "description" => "swiss flow",
            "user_timezone" => "Etc/UTC",
            "level" => "easy",
            "task_pack_name" => params.pack,
            "creator" => creator,
            "task_provider" => "task_pack",
            "task_strategy" => "sequential",
            "type" => "swiss",
            "state" => "waiting_participants",
            "break_duration_seconds" => 1,
            "rounds_limit" => "3",
            "players_limit" => 4
          },
          params.extra
        )
      )

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})
    TournamentContext.get(tournament.id)
  end

  test "when every game of the round is over, the round finishes and the next one starts after the break" do
    tournament = create_swiss(%{pack: "swiss-flow", extra: %{"timeout_mode" => "per_task"}})
    assert tournament.current_round_position == 0
    assert length(get_matches(tournament, "playing")) == 2

    finish_all_playing_matches(tournament)
    Process.sleep(300)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.break_state == "on"

    # The round widget's counts: the two winners solved it, all four played (no bots).
    assert TournamentResult.get_round_solves(tournament) == [%{round_position: 0, solved: 2, players: 4}]

    Process.sleep(6_000)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.break_state == "off"
    assert tournament.current_round_position == 1
    assert length(get_matches(tournament, "playing")) == 2
  end

  test "a round with no games (everyone joined after it was paired) closes, and the next round pairs the newcomer" do
    tasks = insert_list(3, :task, level: "easy", base_score: 300, time_to_solve_sec: 70)
    insert(:task_pack, name: "swiss-empty", task_ids: Enum.map(tasks, & &1.id))
    creator = insert(:user)
    late = insert(:user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Swiss empty round",
        "description" => "swiss empty round",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "swiss-empty",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "swiss",
        "timeout_mode" => "per_task",
        "state" => "waiting_participants",
        "break_duration_seconds" => 1,
        "rounds_limit" => "3",
        "players_limit" => 4
      })

    # Started with nobody: round 0 has no games and nothing would ever close it.
    Server.handle_event(tournament.id, :start, %{user: creator})
    tournament = TournamentContext.get(tournament.id)
    assert tournament.state == "active"
    assert get_matches(tournament) == []

    # Someone joins mid-round: the empty round closes right away...
    Server.handle_event(tournament.id, :join, %{user: late})
    tournament = TournamentContext.get(tournament.id)
    assert tournament.break_state == "on"

    # ...and after the break the next round pairs them (with the bot).
    Process.sleep(6_000)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.break_state == "off"
    assert tournament.current_round_position == 1
    assert [%{player_ids: player_ids}] = get_matches(tournament, "playing")
    assert late.id in player_ids
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
